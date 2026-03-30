import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface PricingData {
  plans: Record<string, { monthly: number; yearly: number }>;
  credits_per_plan: Record<string, number>;
  credit_packs: Array<{ id: string; credits: number; price_cents: number; label: string }>;
}

export default function Pricing() {
  const { user, login } = useAuth();
  const [data, setData] = useState<PricingData | null>(null);

  useEffect(() => {
    fetch('/api/pricing').then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <a href="/" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>PixelCut</a>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '1rem' }}>Simple Pricing</h1>
        <p style={{ color: 'var(--text-muted)' }}>Start free. Upgrade when you need more.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {/* Free */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontWeight: 700 }}>Free</h3>
          <p style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>$0</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{data.credits_per_plan.free} credits/month</p>
          <a href="/editor" style={{ display: 'block', marginTop: '1rem', padding: '0.5rem', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: '8px', color: 'var(--text)' }}>Get Started</a>
        </div>

        {/* Pro */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '1.5rem', border: '2px solid var(--primary)' }}>
          <h3 style={{ fontWeight: 700, color: 'var(--primary)' }}>Pro</h3>
          <p style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>${(data.plans.pro.monthly / 100).toFixed(2)}<span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>/mo</span></p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{data.credits_per_plan.pro} credits/month</p>
          <button onClick={login} style={{ display: 'block', width: '100%', marginTop: '1rem', padding: '0.5rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600 }}>Upgrade</button>
        </div>

        {/* Premium */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ fontWeight: 700 }}>Premium</h3>
          <p style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>${(data.plans.premium.monthly / 100).toFixed(2)}<span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>/mo</span></p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{data.credits_per_plan.premium} credits/month</p>
          <button onClick={login} style={{ display: 'block', width: '100%', marginTop: '1rem', padding: '0.5rem', background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600 }}>Upgrade</button>
        </div>
      </div>

      {/* Credit Packs */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontWeight: 700 }}>Need More Credits?</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Buy credit packs — no subscription required.</p>
      </div>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {data.credit_packs.map((pack) => (
          <div key={pack.id} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '1rem 1.5rem', border: '1px solid var(--border)', textAlign: 'center' }}>
            <p style={{ fontWeight: 700 }}>{pack.label}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 800 }}>${(pack.price_cents / 100).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
