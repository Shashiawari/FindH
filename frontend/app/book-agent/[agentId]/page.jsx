'use client';

import API_URL from '../../../lib/api.js';
import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';

function BookAgentInner({ params }) {
  const unwrappedParams = React.use(params);
  const { agentId } = unwrappedParams;
  const searchParams = useSearchParams();
  const listingId = searchParams.get('listingId');

  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('confirm'); // confirm | paying | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();
  const { token } = useAppContext();

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    fetch(`${API_URL}/api/agents/${agentId}`)
      .then(r => r.json())
      .then(setAgent)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [agentId, token, router]);

  const handlePay = async () => {
    if (!listingId) { setErrorMsg('No property selected.'); setStep('error'); return; }
    setStep('paying');
    try {
      // 1. Create booking
      const bkRes = await fetch(`${API_URL}/api/bookings/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agentId, listingId })
      });
      const bkData = await bkRes.json();
      if (!bkRes.ok) throw new Error(bkData.message || 'Booking failed');

      // 2. Mock pay
      const mpRes = await fetch(`${API_URL}/api/bookings/mock-pay/${bkData.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const mpData = await mpRes.json();
      if (!mpRes.ok) throw new Error(mpData.message || 'Payment failed');

      setStep('success');
      // Auto-redirect after 2.5s
      setTimeout(() => router.push(`/booking-success?session_id=${bkData.id}&mock=true`), 2500);
    } catch (err) {
      setErrorMsg(err.message);
      setStep('error');
    }
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', paddingTop: '100px', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!agent) return <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>Agent not found. <a href="/rooms" style={{ color: 'var(--primary)' }}>Go back</a></div>;

  const bookingFee = agent.agentType === 'Professional' ? '$50.00' : '$20.00';

  return (
    <div className="container" style={{ paddingBottom: '80px', paddingTop: '60px', display: 'flex', justifyContent: 'center' }}>
      <div className="glass-card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>

        {/* ── SUCCESS ───────────────────────────────── */}
        {step === 'success' && (
          <div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg></div>
            <h2 style={{ marginBottom: '8px' }}>Booking Confirmed!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              <strong>{agent.name}</strong> has been booked. They will visit the property and upload verification documents shortly.
            </p>
            <div style={{ padding: '14px 16px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', color: '#10b981', fontSize: '0.9rem', marginBottom: '24px' }}>
              Redirecting to your booking summary...
            </div>
            <button onClick={() => router.push(`/rooms/${listingId}`)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
              ← Back to Room
            </button>
          </div>
        )}

        {/* ── ERROR ─────────────────────────────────── */}
        {step === 'error' && (
          <div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg></div>
            <h2 style={{ marginBottom: '8px' }}>Booking Failed</h2>
            <p style={{ color: '#ef4444', marginBottom: '24px', background: 'rgba(239,68,68,0.08)', padding: '12px 16px', borderRadius: '10px' }}>{errorMsg}</p>
            <button onClick={() => setStep('confirm')} className="button">Try Again</button>
          </div>
        )}

        {/* ── PAYING (LOADING) ─────────────────────── */}
        {step === 'paying' && (
          <div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}><span className="btn-spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', borderColor: 'rgba(99,102,241,0.2)', borderTopColor: 'var(--primary)' }}></span></div>
            <h2 style={{ marginBottom: '8px' }}>Processing Payment...</h2>
            <p style={{ color: 'var(--text-muted)' }}>Creating your booking and confirming payment (mock). Please wait.</p>
            <div style={{ marginTop: '24px', height: '4px', background: 'var(--surface)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--primary)', borderRadius: '4px', animation: 'progressBar 2s linear infinite' }} />
            </div>
          </div>
        )}

        {/* ── CONFIRM ──────────────────────────────── */}
        {step === 'confirm' && (
          <div>
            <h2 style={{ marginBottom: '24px' }}>Confirm Booking</h2>

            {/* Agent Card */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '20px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '1.3rem', flexShrink: 0 }}>
                {agent.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {agent.name} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>{agent.agentType} · {agent.city}, {agent.country}</p>
              </div>
            </div>

            {/* Price */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', marginBottom: '28px', fontSize: '1.1rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Verification Fee</span>
              <span style={{ fontWeight: '800', fontSize: '1.4rem', color: 'var(--primary)' }}>{bookingFee}</span>
            </div>

            <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', color: '#f59e0b', fontSize: '0.82rem', marginBottom: '24px', textAlign: 'left' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> <strong>Mock Payment Mode</strong> — No real charge. Stripe integration pending.
            </div>

            <button
              onClick={handlePay}
              className="button"
              style={{ width: '100%', padding: '16px', fontSize: '1rem' }}
            >
              Confirm & Pay (Mock)
            </button>
            <button onClick={() => router.back()} style={{ marginTop: '12px', width: '100%', padding: '12px', background: 'none', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes progressBar { 0% { width: 0%; margin-left: 0; } 50% { width: 70%; } 100% { width: 0%; margin-left: 100%; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      `}</style>
    </div>
  );
}

export default function BookAgent({ params }) {
  return (
    <Suspense fallback={<div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>Loading...</div>}>
      <BookAgentInner params={params} />
    </Suspense>
  );
}
