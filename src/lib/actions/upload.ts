'use server';

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { s3Client } from '@/lib/aws/s3-client';
import { dynamoClient } from '@/lib/aws/dynamo-client';
import { nanoid } from 'nanoid';

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];
const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

export async function generatePresignedUrl(
  fileName: string,
  fileType: string,
  fileSize: number,
) {
  // Check required env vars at call time (not module load) for clear error messages
  const RAW_BUCKET = process.env.S3_RAW_BUCKET;
  const TABLE_NAME = process.env.DYNAMODB_TABLE;
  if (!RAW_BUCKET) return { error: 'Server config error: S3_RAW_BUCKET env var not set' };
  if (!TABLE_NAME) return { error: 'Server config error: DYNAMODB_TABLE env var not set' };

  // Validate input
  if (fileSize > MAX_SIZE) {
    return { error: 'File exceeds 2GB limit' };
  }
  if (!ALLOWED_TYPES.includes(fileType)) {
    return { error: `Unsupported file type: ${fileType}. Allowed: mp4, mov, webm, mkv` };
  }

  const videoId = nanoid();
  const s3Key = `uploads/${videoId}/${fileName}`;

  try {
    // Generate presigned URL (5 min expiry)
    const command = new PutObjectCommand({
      Bucket: RAW_BUCKET,
      Key: s3Key,
      ContentType: fileType,
    });
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Write initial metadata to DynamoDB
    const now = new Date().toISOString();
    await dynamoClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `VIDEO#${videoId}`,
          SK: 'META',
          videoId,
          fileName,
          fileType,
          fileSize,
          s3Key,
          status: 'uploading',
          createdAt: now,
          updatedAt: now,
          GSI1PK: 'VIDEO',
          GSI1SK: now,
        },
      }),
    );

    return { presignedUrl, videoId, s3Key };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Presign error:', message);
    return { error: `Upload failed: ${message}` };
  }
}
