import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';

export default function Editor() {
  const { user, login } = useAuth();
  const { credits, refresh: refreshCredits } = useCredits();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setOriginalImage(reader.result as string);
    reader.readAsDataURL(file);
    setProcessedImage(null);
    setError(null);
  };

  const handleRemoveBg = async () => {
    if (!fileInputRef.current?.files?.[0]) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image_file', fileInputRef.current.files[0]);
      formData.append('size', 'auto');

      const res = await fetch('/api/remove-bg', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Processing failed' }));
        throw new Error(err.error || 'Processing failed');
      }

      const blob = await res.blob();
      setProcessedImage(URL.createObjectURL(blob));
      refreshCredits();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;
    const a = document.createElement('a');
    a.href = processedImage;
    a.download = 'removed-bg.png';
    a.click();
  };

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <a href="/" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>PixelCut</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {credits && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {credits.total_available} credits
            </span>
          )}
          {user ? (
            <span style={{ fontSize: '0.875rem' }}>{user.name}</span>
          ) : (
            <button onClick={login} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.875rem' }}>
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius)',
          padding: '3rem',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '1.5rem',
          background: 'var(--bg-card)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          📸 Click or drag to upload image
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          JPG, PNG, WebP, HEIC — up to 25MB
        </p>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#2d1215', border: '1px solid var(--danger)', borderRadius: '8px', marginBottom: '1rem', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Images side by side */}
      {originalImage && (
        <div style={{ display: 'grid', gridTemplateColumns: processedImage ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Original</p>
            <img src={originalImage} alt="original" style={{ width: '100%', borderRadius: '8px' }} />
          </div>
          {processedImage && (
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Result</p>
              <div style={{ background: bgColor, borderRadius: '8px', padding: '4px' }}>
                <img src={processedImage} alt="processed" style={{ width: '100%', borderRadius: '6px' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {originalImage && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleRemoveBg}
            disabled={loading}
            style={{
              padding: '0.75rem 2rem',
              background: loading ? 'var(--bg-elevated)' : 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              fontSize: '1rem',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '⏳ Processing…' : '✂️ Remove Background'}
          </button>

          {processedImage && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>BG:</label>
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
                {['#ffffff', '#ff0000', '#0000ff', '#00ff00', 'transparent'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setBgColor(c)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: bgColor === c ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: c === 'transparent' ? 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 12px 12px' : c,
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>

              <button
                onClick={handleDownload}
                style={{
                  padding: '0.75rem 2rem',
                  background: 'var(--success)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              >
                ⬇️ Download
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
