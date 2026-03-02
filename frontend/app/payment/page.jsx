'use client';
import { useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function PaymentFlow() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handlePayment = () => {
    setLoading(true);
    // Simulate Stripe payment
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1500);
  };

  return (
    <ProtectedRoute>
      <div className="container" style={{ maxWidth: '600px', paddingBottom: '60px' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          {step === 1 ? (
            <>
              <h2>Agent Verification Payment</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                Complete your profile verification by paying the one-time processing fee of €10.
              </p>
              
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '24px', borderRadius: '12px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span>Verification Fee</span>
                  <span>€10.00</span>
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

              <button className="button" style={{ width: '100%', padding: '16px' }} onClick={handlePayment} disabled={loading}>
                {loading ? 'Processing...' : 'Pay with Stripe'}
              </button>
            </>
          ) : (
             <>
               <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
               <h2>Payment Successful</h2>
               <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                 Your verification request is now pending admin review. You will be notified once complete.
               </p>
               <button className="button secondary" onClick={() => window.location.href = '/'}>
                 Return Home
               </button>
             </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
