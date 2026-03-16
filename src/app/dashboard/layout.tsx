'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '240px',
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          padding: '32px 16px',
          position: 'fixed',
          height: '100vh',
          overflowY: 'auto',
          zIndex: 40,
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '1.5rem' }}>⚡</div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>StreamFlow</div>
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link
            href="/dashboard"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              color: 'inherit',
              fontSize: '0.9rem',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            📹 Videos
          </Link>
          <Link
            href="/dashboard/upload"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              color: 'inherit',
              fontSize: '0.9rem',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ⬆️ Upload
          </Link>
          <a
            href="https://github.com/Sharmaharshitnone/stream-flow-saas"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              color: 'inherit',
              fontSize: '0.9rem',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            🔗 GitHub
          </a>
        </nav>

        <div
          style={{
            marginTop: '32px',
            padding: '16px',
            background: 'var(--bg)',
            borderRadius: 'var(--radius)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: 'var(--text-secondary)' }}>Status:</strong>
          Connected to AWS us-east-1
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '240px', flex: 1, padding: '32px' }}>
        {children}
      </main>
    </div>
  );
}
