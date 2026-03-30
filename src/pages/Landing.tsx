import { useAuth } from '../hooks/useAuth';

export default function Landing() {
  const { user, login } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        PixelCut
      </h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '480px', textAlign: 'center', marginBottom: '2rem' }}>
        Remove image backgrounds instantly with AI. Professional photo editing made simple.
      </p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <a
          href="/editor"
          style={{
            padding: '0.75rem 2rem',
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: 'var(--radius)',
            fontWeight: 600,
            fontSize: '1rem',
            textDecoration: 'none',
          }}
        >
          Try Free →
        </a>
        {!user && (
          <button
            onClick={login}
            style={{
              padding: '0.75rem 2rem',
              background: 'var(--bg-elevated)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              fontSize: '1rem',
            }}
          >
            Sign In
          </button>
        )}
      </div>

      <div style={{ marginTop: '4rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        ✨ 1 free use without sign-up &bull; No credit card required
      </div>
    </div>
  );
}
