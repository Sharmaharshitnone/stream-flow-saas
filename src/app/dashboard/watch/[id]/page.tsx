'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import HLS from 'hls.js';
import Link from 'next/link';
import { getVideo, VideoItem } from '@/lib/actions/videos';

const TERMINAL_STATES = new Set(['ready', 'upload_failed', 'process_failed']);

export default function WatchPage() {
  const params = useParams();
  const videoId = params.id as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HLS | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const fetchVideo = async () => {
      try {
        const result = await getVideo(videoId);
        if (!result) {
          setError('Video not found');
          stopPolling();
          return;
        }
        setVideo(result);

        // Load HLS stream if ready
        if (result.status === 'ready' && result.hlsUrl && videoRef.current) {
          loadHlsStream(result.hlsUrl);
        }

        // Stop polling once in a terminal state — no more DynamoDB reads
        if (TERMINAL_STATES.has(result.status)) {
          stopPolling();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video');
        stopPolling();
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
    intervalRef.current = setInterval(fetchVideo, 10000); // 10s while processing
    return stopPolling;
  }, [videoId]);

  const loadHlsStream = (hlsUrl: string) => {
    if (!videoRef.current) return;

    if (HLS.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new HLS();
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);

      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest loaded, starting playback');
      });

      hls.on(HLS.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case HLS.ErrorTypes.NETWORK_ERROR:
              setError('Network error loading video');
              break;
            case HLS.ErrorTypes.MEDIA_ERROR:
              setError('Media error during playback');
              break;
            default:
              setError('Failed to load video');
          }
        }
      });
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoRef.current.src = hlsUrl;
    } else {
      setError('HLS playback not supported in this browser');
    }
  };

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  const statusLabel: Record<string, string> = {
    ready: '✓ Ready',
    processing: '⏳ Processing',
    uploading: '⬆️ Uploading',
    pending: '⌛ Pending',
    upload_failed: '✗ Upload Failed',
    process_failed: '✗ Process Failed',
  };

  const statusColor: Record<string, string> = {
    ready: '#10b981',
    processing: '#f59e0b',
    uploading: '#3b82f6',
    pending: '#6b7280',
    upload_failed: '#ef4444',
    process_failed: '#ef4444',
  };

  return (
    <div>
      <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '24px', display: 'inline-block' }}>
        ← Back to Videos
      </Link>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
          ⏳ Loading...
        </div>
      ) : error ? (
        <div
          style={{
            padding: '24px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: 'var(--radius)',
          }}
        >
          {error}
        </div>
      ) : !video ? (
        <div
          style={{
            padding: '24px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius)',
          }}
        >
          Video not found
        </div>
      ) : (
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '24px' }}>{video.fileName}</h1>

          {/* Video Player */}
          {video.status === 'ready' ? (
            <div style={{ marginBottom: '32px' }}>
              <video
                ref={videoRef}
                controls
                style={{
                  width: '100%',
                  maxWidth: '800px',
                  borderRadius: 'var(--radius)',
                  background: '#000',
                  marginBottom: '16px',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                padding: '96px 32px',
                background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.1), rgba(168, 85, 247, 0.1))',
                borderRadius: 'var(--radius)',
                textAlign: 'center',
                marginBottom: '32px',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🎬</div>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Video is {video.status === 'processing' ? 'being processed' : `in ${video.status} state`}
              </p>
              <p style={{ color: 'var(--text-muted)' }}>
                {video.status === 'processing'
                  ? 'This may take a few minutes. You can close this page and return later.'
                  : 'Please check back soon.'}
              </p>
            </div>
          )}

          {/* Info */}
          <div
            style={{
              padding: '24px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</p>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    background: statusColor[video.status],
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}
                >
                  {statusLabel[video.status]}
                </div>
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>File Size</p>
                <p>{(video.fileSize / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Uploaded</p>
                <p>{new Date(video.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Share info */}
          {video.status === 'ready' && (
            <div
              style={{
                marginTop: '24px',
                padding: '16px',
                background: 'rgba(108, 92, 231, 0.05)',
                borderRadius: 'var(--radius)',
                borderLeft: '4px solid #6c5ce7',
              }}
            >
              <p style={{ fontSize: '0.9rem' }}>
                ✓ Video is ready to watch! The stream is globally distributed via CloudFront CDN.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
