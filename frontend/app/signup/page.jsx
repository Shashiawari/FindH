'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '../../context/AppContext';

export default function Signup() {
  const { loginUser } = useAppContext();
  const router = useRouter();

  const [step, setStep] = useState(1); // 1: details, 2: OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '', password: '',
    address1: '', city: '', state: '', country: ''
  });
  const [otp, setOtp] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          otp,
          address1: form.address1,
          city: form.city,
          state: form.state,
          country: form.country
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      loginUser(data);
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '75vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '48px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2>{step === 1 ? 'Create Account' : 'Verify Email'}</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {step === 1 ? 'Start your journey with FindH' : `Enter the OTP sent to ${form.email}`}
          </p>
        </div>

        {error && <div style={{ color: '#ef4444', textAlign: 'center', marginBottom: '16px', padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Email Address</label>
                <input type="email" name="email" required value={form.email} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Password</label>
                <input type="password" name="password" required minLength={6} value={form.password} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Street Address</label>
                <input name="address1" value={form.address1} onChange={handleChange} placeholder="e.g. 12 Main Street" />
              </div>
              <div className="form-group">
                <label>City</label>
                <input name="city" required value={form.city} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>State</label>
                <input name="state" value={form.state} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Country</label>
                <input name="country" required value={form.country} onChange={handleChange} />
              </div>
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '16px', padding: '16px' }} className="button">
              {loading ? 'Sending OTP...' : 'Continue →'}
            </button>
            <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)' }}>
              Already have an account? <Link href="/login" style={{ color: 'var(--primary)' }}>Login</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label>OTP Code</label>
              <input
                type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem', padding: '16px' }}
              />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '16px', padding: '16px' }} className="button">
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>
            <button type="button" onClick={() => setStep(1)} style={{ width: '100%', marginTop: '12px', background: 'transparent', color: 'var(--text-muted)', padding: '12px' }} className="button">
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}