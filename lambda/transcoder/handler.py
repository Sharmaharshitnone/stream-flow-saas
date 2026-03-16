"""
StreamFlow Video Transcoder — AWS Lambda Handler

Triggered by S3 ObjectCreated events on the raw bucket.
Downloads raw video, transcodes to HLS + thumbnail using FFmpeg,
uploads output to processed bucket, updates DynamoDB status.

Note: For Free Tier, we use a lightweight approach. FFmpeg is invoked
via subprocess (bundled in the same zip or as a Lambda Layer).
For the initial MVP without a custom FFmpeg layer, the function
copies the raw file as-is and generates basic metadata — this lets
us prove the full pipeline works end-to-end within Free Tier before
adding real transcoding.
"""

import os
import json
import subprocess
import shutil
import boto3
import logging
from urllib.parse import unquote_plus
from datetime import datetime, timezone

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

RAW_BUCKET = os.environ['S3_RAW_BUCKET']
PROCESSED_BUCKET = os.environ['S3_PROCESSED_BUCKET']


def handler(event, context):
    """S3 ObjectCreated event handler."""
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = unquote_plus(record['s3']['object']['key'])
        size = record['s3']['object'].get('size', 0)

        log_structured("INFO", "Processing started", video_key=key, file_size=size)

        # Extract videoId from key: uploads/{videoId}/{filename}
        parts = key.split('/')
        if len(parts) < 3:
            log_structured("ERROR", "Invalid key format", video_key=key)
            continue

        video_id = parts[1]

        try:
            # Update status: processing
            update_status(video_id, 'processing')

            # Download raw video to /tmp
            input_path = f'/tmp/input_{video_id}'
            log_structured("INFO", "Downloading raw file", video_id=video_id)
            s3.download_file(bucket, key, input_path)

            # Create output directory
            output_dir = f'/tmp/output_{video_id}'
            os.makedirs(output_dir, exist_ok=True)

            # Check if ffmpeg is available (from Layer)
            ffmpeg_path = find_ffmpeg()

            if ffmpeg_path:
                # Full HLS transcoding
                log_structured("INFO", "FFmpeg found, transcoding to HLS", video_id=video_id)
                transcode_to_hls(ffmpeg_path, input_path, output_dir)
                extract_thumbnail(ffmpeg_path, input_path, output_dir)
            else:
                # Fallback: copy raw file as "processed" (MVP mode)
                log_structured("WARN", "FFmpeg not found, using passthrough mode", video_id=video_id)
                original_name = parts[-1]
                shutil.copy2(input_path, f'{output_dir}/{original_name}')

            # Upload all output files to processed bucket
            output_prefix = f'videos/{video_id}'
            upload_directory(output_dir, PROCESSED_BUCKET, output_prefix)

            # Determine output manifest/file path
            has_hls = os.path.exists(f'{output_dir}/playlist.m3u8')
            if has_hls:
                manifest_key = f'{output_prefix}/playlist.m3u8'
            else:
                original_name = parts[-1]
                manifest_key = f'{output_prefix}/{original_name}'

            thumbnail_path = f'{output_dir}/thumbnail.jpg'
            thumb_key = f'{output_prefix}/thumbnail.jpg' if os.path.exists(thumbnail_path) else ''

            # Update DynamoDB: ready
            update_status(video_id, 'ready', {
                'hlsManifestKey': manifest_key,
                'thumbnailKey': thumb_key,
                'processedAt': now_iso(),
            })

            log_structured("INFO", "Processing completed", video_id=video_id)

        except Exception as e:
            log_structured("ERROR", "Processing failed", video_id=video_id, error=str(e))
            update_status(video_id, 'process_failed', {
                'errorMessage': str(e)[:500],
            })
            raise  # Re-raise for DLQ capture

        finally:
            cleanup_tmp(video_id)

    return {'statusCode': 200, 'body': 'OK'}


def find_ffmpeg():
    """Locate FFmpeg binary (Lambda Layer or system)."""
    paths = ['/opt/bin/ffmpeg', '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']
    for p in paths:
        if os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    # Check PATH
    result = subprocess.run(['which', 'ffmpeg'], capture_output=True, text=True)
    if result.returncode == 0:
        return result.stdout.strip()
    return None


def transcode_to_hls(ffmpeg_path, input_path, output_dir):
    """Transcode video to HLS with adaptive bitrate."""
    cmd = [
        ffmpeg_path, '-i', input_path,
        '-preset', 'fast',
        '-g', '48', '-sc_threshold', '0',

        # 720p
        '-map', '0:v:0', '-map', '0:a:0?',
        '-s:v:0', '1280x720', '-b:v:0', '2800k',
        '-c:v:0', 'libx264', '-c:a:0', 'aac', '-b:a:0', '128k',

        # 480p
        '-map', '0:v:0', '-map', '0:a:0?',
        '-s:v:1', '854x480', '-b:v:1', '1400k',
        '-c:v:1', 'libx264', '-c:a:1', 'aac', '-b:a:1', '96k',

        # HLS
        '-f', 'hls',
        '-hls_time', '6',
        '-hls_list_size', '0',
        '-hls_segment_filename', f'{output_dir}/segment_%v_%03d.ts',
        '-master_pl_name', 'playlist.m3u8',
        '-var_stream_map', 'v:0,a:0 v:1,a:1',
        f'{output_dir}/stream_%v.m3u8',
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg HLS failed: {result.stderr[:500]}")


def extract_thumbnail(ffmpeg_path, input_path, output_dir):
    """Extract thumbnail at 2 seconds."""
    cmd = [
        ffmpeg_path, '-i', input_path,
        '-ss', '00:00:02',
        '-vframes', '1',
        '-q:v', '2',
        '-y',
        f'{output_dir}/thumbnail.jpg',
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        log_structured("WARN", "Thumbnail extraction failed", error=result.stderr[:200])


def upload_directory(local_dir, bucket, prefix):
    """Upload all files in directory to S3."""
    for root, _, files in os.walk(local_dir):
        for file_name in files:
            local_path = os.path.join(root, file_name)
            relative_path = os.path.relpath(local_path, local_dir)
            s3_key = f'{prefix}/{relative_path}'

            content_type = get_content_type(file_name)
            extra_args = {'ContentType': content_type}

            # Set aggressive caching for immutable segments
            if file_name.endswith('.ts'):
                extra_args['CacheControl'] = 'max-age=31536000, immutable'
            elif file_name.endswith('.jpg') or file_name.endswith('.png'):
                extra_args['CacheControl'] = 'max-age=31536000, immutable'

            s3.upload_file(local_path, bucket, s3_key, ExtraArgs=extra_args)


def update_status(video_id, status, extra=None):
    """Update video status in DynamoDB."""
    update_expr = 'SET #status = :status, updatedAt = :now'
    expr_values = {
        ':status': status,
        ':now': now_iso(),
    }
    expr_names = {'#status': 'status'}

    if extra:
        for key, value in extra.items():
            update_expr += f', {key} = :{key}'
            expr_values[f':{key}'] = value

    table.update_item(
        Key={'PK': f'VIDEO#{video_id}', 'SK': 'META'},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
    )


def get_content_type(filename):
    ext_map = {
        '.m3u8': 'application/vnd.apple.mpegurl',
        '.ts': 'video/MP2T',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.webm': 'video/webm',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
    }
    ext = os.path.splitext(filename)[1].lower()
    return ext_map.get(ext, 'application/octet-stream')


def log_structured(level, message, **kwargs):
    entry = json.dumps({"level": level, "message": message, "service": "streamflow-transcoder", **kwargs})
    if level == "ERROR":
        logger.error(entry)
    elif level == "WARN":
        logger.warning(entry)
    else:
        logger.info(entry)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def cleanup_tmp(video_id):
    for path in [f'/tmp/input_{video_id}', f'/tmp/output_{video_id}']:
        if os.path.exists(path):
            if os.path.isdir(path):
                shutil.rmtree(path, ignore_errors=True)
            else:
                try:
                    os.remove(path)
                except OSError:
                    pass
