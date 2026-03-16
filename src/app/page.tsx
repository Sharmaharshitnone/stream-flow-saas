import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '40px',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(108, 92, 231, 0.15) 0%, transparent 60%)',
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '16px' }}>⚡</div>
      <h1 style={{
        fontSize: '3.5rem',
        fontWeight: 800,
        letterSpacing: '-2px',
        lineHeight: 1.1,
        marginBottom: '16px',
        background: 'linear-gradient(135deg, #6c5ce7 0%, #a855f7 50%, #e4e4ef 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        StreamFlow
      </h1>
      <p style={{
        fontSize: '1.2rem',
        color: 'var(--text-secondary)',
        maxWidth: '500px',
        lineHeight: 1.6,
        marginBottom: '40px',
      }}>
        Event-driven serverless video processing.
        Upload, transcode, and deliver globally.
      </p>

      <div style={{ display: 'flex', gap: '16px' }}>
        <Link href="/dashboard" className="btn btn-primary" style={{ fontSize: '1rem', padding: '14px 32px' }}>
          Open Dashboard
        </Link>
        <Link
          href="https://github.com/Sharmaharshitnone/stream-flow-saas"
          className="btn btn-secondary"
          style={{ fontSize: '1rem', padding: '14px 32px' }}
          target="_blank"
        >
          GitHub ↗
        </Link>
      </div>

      <div style={{
        marginTop: '80px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        maxWidth: '700px',
        width: '100%',
      }}>
        {[
          { icon: '📦', title: 'Direct S3 Upload', desc: 'Presigned URLs, multipart support' },
          { icon: '⚙️', title: 'Lambda Transcoding', desc: 'FFmpeg HLS, adaptive bitrate' },
          { icon: '🌐', title: 'CloudFront CDN', desc: 'Edge-cached global delivery' },
        ].map((f) => (
          <div key={f.title} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{f.icon}</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>{f.title}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '60px',
        padding: '16px 24px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Tech Stack:</strong>{' '}
        Next.js · AWS Lambda (Python) · S3 · DynamoDB · CloudFront · Terraform
      </div>
    </div>
  );
}
