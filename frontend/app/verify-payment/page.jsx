'use client';

import API_URL from '../../lib/api.js';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import ProtectedRoute from '../../components/ProtectedRoute';

const ShieldIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
  </svg>
);

import { Suspense } from 'react';

export default function VerifyPayment() {
  return (
    <Suspense fallback={<div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>Loading payment details...</div>}>
      <VerifyPaymentContent />
    </Suspense>
  );
}

function VerifyPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, latestVerificationEvent } = useAppContext();

  const propertyId = searchParams.get('propertyId');
  const propertyName = searchParams.get('propertyName') || 'Property';
  const ownerId = searchParams.get('ownerId');

  const { user } = useAppContext();
  const currentUserId = user?.id || user?._id || null;

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = pay, 2 = success
  const [error, setError] = useState('');
  const [requestInfo, setRequestInfo] = useState(null);

  const steps = ['pending', 'accepted', 'in_progress', 'verified'];
  const activeStatus = requestInfo?.verificationStatus || 'pending';
  const activeIndex = Math.max(steps.indexOf(activeStatus), 0);

  useEffect(() => {
    if (!requestInfo?.bookingId || !latestVerificationEvent?.payload) return;

    const payload = latestVerificationEvent.payload;
    if (payload.bookingId !== requestInfo.bookingId) return;

    if (payload.verificationStatus) {
      setRequestInfo(prev => prev ? ({ ...prev, verificationStatus: payload.verificationStatus }) : prev);
    }

    if (payload.assignedAgent) {
      setRequestInfo(prev => prev ? ({ ...prev, assignedAgent: payload.assignedAgent }) : prev);
    }
  }, [latestVerificationEvent, requestInfo?.bookingId]);

  if (currentUserId && ownerId && currentUserId === ownerId) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <h2>You cannot verify your own property.</h2>
        <button onClick={() => router.back()} className="button" style={{ marginTop: '16px' }}>Go Back</button>
      </div>
    );
  }

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Create verification request in backend
      const res = await fetch(`${API_URL}/api/verification/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ propertyId })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create verification request');
      }

      setRequestInfo({
        bookingId: data.bookingId,
        verificationStatus: data.verificationStatus || 'pending',
        notifiedAgents: data.notifiedAgents || 0,
        assignedAgent: null
      });
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!propertyId) {
    return (
      <ProtectedRoute>
        <div className="container" style={{ maxWidth: '600px', paddingBottom: '60px', textAlign: 'center', paddingTop: '80px' }}>
          <h2>Invalid Request</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>No property specified for verification.</p>
          <button className="button secondary" onClick={() => router.push('/rooms')}>Browse Listings</button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container" style={{ maxWidth: '600px', paddingBottom: '60px' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          {step === 1 ? (
            <>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                <ShieldIcon />
              </div>
              <h2>Property Verification Payment</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
                Verify <strong>{decodeURIComponent(propertyName)}</strong>
              </p>
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                marginBottom: '24px', fontSize: '0.82rem', color: 'var(--text-muted)',
                wordBreak: 'break-all'
              }}>
                Property ID: {propertyId}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '24px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span>Verification Fee</span>
                  <span style={{ fontWeight: '600' }}>€10.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <span>Tax (Included)</span>
                  <span>€0.00</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  <span>Total</span>
                  <span>€10.00</span>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginBottom: '16px', justifyContent: 'center' }}>
                  {error}
                </div>
              )}

              <button
                className="button"
                style={{ width: '100%', padding: '16px' }}
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? (
                  <><span className="btn-spinner"></span> Processing...</>
                ) : (
                  'Pay & Request Verification'
                )}
              </button>

              <button
                className="button secondary"
                style={{ width: '100%', marginTop: '12px', padding: '12px' }}
                onClick={() => router.back()}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                <CheckIcon />
              </div>
              <h2>Payment Successful!</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                Your verification request for <strong>{decodeURIComponent(propertyName)}</strong> has been submitted to nearby agents.
              </p>
              <div className="badge badge-success" style={{ marginBottom: '16px', padding: '8px 16px', fontSize: '0.85rem' }}>
                Status: {activeStatus.replace('_', ' ').toUpperCase()}
              </div>

              <div style={{ marginBottom: '24px', textAlign: 'left', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Booking ID: {requestInfo?.bookingId}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '8px' }}>
                  {steps.map((status, index) => {
                    const done = index <= activeIndex;
                    const label = status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1);
                    return (
                      <div key={status} style={{
                        padding: '9px 8px',
                        textAlign: 'center',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        background: done ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)',
                        color: done ? '#10b981' : 'var(--text-muted)',
                        border: done ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border)'
                      }}>
                        {label}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Nearby agents notified: <strong style={{ color: 'var(--text)' }}>{requestInfo?.notifiedAgents || 0}</strong>
                </div>

                {requestInfo?.assignedAgent && (
                  <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#10b981' }}>
                    Assigned Agent: <strong>{requestInfo.assignedAgent.name || requestInfo.assignedAgent.email}</strong>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="button" onClick={() => router.push(`/rooms/${propertyId}`)}>
                  View Property
                </button>
                <button className="button secondary" onClick={() => router.push('/rooms')}>
                  Browse Listings
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
