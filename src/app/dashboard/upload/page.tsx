'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { generatePresignedUrl } from '@/lib/actions/upload';

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
  const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Allowed: MP4, MOV, AVI, MKV');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size: 2GB');
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      // Step 1: Get presigned URL from Next.js Server Action
      const result = await generatePresignedUrl(
        file.name,
        file.type,
        file.size,
      );

      if ('error' in result) {
        setError(result.error || 'Failed to generate upload URL');
        return;
      }

      const { presignedUrl, videoId } = result;

      // Step 2: Upload file to S3 using presigned URL
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          setSuccess(`✓ Video uploaded! Processing will begin shortly.`);
          setProgress(100);
          setTimeout(() => {
            router.push(`/dashboard/watch/${videoId}`);
          }, 1500);
        } else {
          setError(`Upload failed: ${xhr.status} ${xhr.statusText}`);
        }
      };

      xhr.onerror = () => {
        setError('Network error during upload');
      };

      xhr.onabort = () => {
        setError('Upload cancelled');
      };

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Upload Video</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Upload a video to start transcoding. Max 2GB, supports MP4, MOV, AVI, MKV.
        </p>
      </div>

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

      {success && (
        <div
          style={{
            padding: '16px',
            background: '#dcfce7',
            color: '#166534',
            borderRadius: 'var(--radius)',
            marginBottom: '24px',
          }}
        >
          {success}
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: '64px 32px',
          border: `2px dashed ${isDragging ? 'var(--border-focus)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'background-color 0.2s, border-color 0.2s',
          background: isDragging ? 'rgba(108, 92, 231, 0.05)' : 'transparent',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📹</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '8px' }}>
          Drag and drop your video
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          or click to select a file
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          MP4, MOV, AVI, MKV • Up to 2GB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,.mov,.avi,.mkv"
        onChange={handleFileInput}
        disabled={uploading}
        style={{ display: 'none' }}
      />

      {/* Progress Bar */}
      {uploading && (
        <div style={{ marginTop: '32px' }}>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.9rem' }}>Uploading...</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{progress}%</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              background: 'var(--bg-card)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #6c5ce7, #a855f7)',
                transition: 'width 0.1s',
              }}
            />
          </div>
        </div>
      )}

      {/* Tips */}
      <div
        style={{
          marginTop: '48px',
          padding: '32px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>ℹ️ How it works</h3>
        <ol style={{ color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: '20px' }}>
          <li>Upload your video file (direct to S3, no server involved)</li>
          <li>Lambda automatically transcodes to adaptive bitrate HLS</li>
          <li>CloudFront serves optimized streams globally</li>
          <li>Watch on any device with HLS playback support</li>
        </ol>
      </div>
    </div>
  );
}
