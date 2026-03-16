'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { listVideos, VideoItem } from '@/lib/actions/videos';

const TERMINAL_STATES = new Set(['ready', 'upload_failed', 'process_failed']);

export default function DashboardPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const result = await listVideos(50);
        setVideos(result);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load videos');
        return [];
      } finally {
        setLoading(false);
      }
    };

    fetchVideos().then((result) => {
      // Only poll if at least one video is still in a transitional state
      const hasPending = result.some((v) => !TERMINAL_STATES.has(v.status));
      if (hasPending) {
        intervalRef.current = setInterval(async () => {
          const updated = await fetchVideos();
          const stillPending = updated.some((v) => !TERMINAL_STATES.has(v.status));
          if (!stillPending && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }, 15000); // 15s — reduces DynamoDB reads vs constant 5s polling
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const statusBadgeColor: Record<string, string> = {
    ready: '#10b981',
    processing: '#f59e0b',
    uploading: '#3b82f6',
    pending: '#6b7280',
    upload_failed: '#ef4444',
    process_failed: '#ef4444',
  };

  const statusLabel: Record<string, string> = {
    ready: '✓ Ready',
    processing: '⏳ Processing',
    uploading: '⬆️ Uploading',
    pending: '⌛ Pending',
    upload_failed: '✗ Upload Failed',
    process_failed: '✗ Process Failed',
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Videos</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {videos.length} video{videos.length !== 1 ? 's' : ''} uploaded
        </p>
      </div>

      <Link href="/dashboard/upload" className="btn btn-primary" style={{ marginBottom: '32px' }}>
        ⬆️ Upload New Video
      </Link>

      {error && (
        <div
          style={{
            padding: '16px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: 'var(--radius)',
            marginBottom: '24px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
          ⏳ Loading videos...
        </div>
      ) : videos.length === 0 ? (
        <div
          style={{
            padding: '64px 32px',
            textAlign: 'center',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius)',
            border: '1px dashed var(--border)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🎬</div>
          <p style={{ color: 'var(--text-secondary)' }}>No videos yet. Start by uploading one!</p>
          <Link href="/dashboard/upload" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Upload Your First Video
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {videos.map((video) => (
            <Link
              key={video.videoId}
              href={`/dashboard/watch/${video.videoId}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                className="card"
                style={{
                  cursor: video.status === 'ready' ? 'pointer' : 'default',
                  opacity: video.status === 'ready' ? 1 : 0.75,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (video.status === 'ready') {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.1), rgba(168, 85, 247, 0.1))',
                    borderRadius: 'calc(var(--radius) - 2px)',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                  }}
                >
                  {video.status === 'ready' && video.thumbnailUrl ? '🎥' : '📹'}
                </div>

                {/* Info */}
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {video.fileName}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  {(video.fileSize / 1024 / 1024).toFixed(1)} MB
                </p>

                {/* Status Badge */}
                <div
                  style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    background: statusBadgeColor[video.status],
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {statusLabel[video.status]}
                </div>

                {/* Created date */}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px' }}>
                  {new Date(video.createdAt).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
