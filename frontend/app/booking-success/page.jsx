'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="glass-card" style={{ textAlign: 'center', maxWidth: '500px', width: '100%' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 style={{ marginBottom: '16px' }}>Booking Successful!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
          Your payment was processed successfully. The agent will contact you shortly.
          <br /><br />
          {sessionId && <span style={{ fontSize: '0.9rem' }}>Session ID: {sessionId}</span>}
        </p>
        <Link href="/" className="button" style={{ display: 'inline-block', padding: '12px 24px' }}>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function BookingSuccess() {
  return (
    <Suspense fallback={<div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>Loading...</div>}>
      <BookingSuccessContent />
    </Suspense>
  );
}

