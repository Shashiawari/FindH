'use client';

import API_URL from '../../lib/api.js';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '../../context/AppContext';

export default function Signup() {
  const { loginUser, user } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const [step, setStep] = useState(1); // 1: details, 2: OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', date_of_birth: '',
    address1: '', postal_code: '', city: '', state: '', country: ''
  });
  const [otp, setOtp] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Step 1: send OTP (only email needed)
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/otp/send`, {
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

  // Step 2: verify OTP + send all profile fields
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, ...form }),
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

  const inputStyle = { width: '100%' };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '75vh', paddingTop: '48px', paddingBottom: '60px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '560px', padding: '48px 40px' }}>
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

              {/* Full Name */}
              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label>Full Name</label>
                <input type="text" name="name" required value={form.name} onChange={handleChange} placeholder="e.g. John Smith" style={inputStyle} />
              </div>

              {/* Email */}
              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label>Email Address</label>
                <input type="email" name="email" required value={form.email} onChange={handleChange} style={inputStyle} />
              </div>

              {/* Password */}
              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label>Password</label>
                <input type="password" name="password" required minLength={6} value={form.password} onChange={handleChange} style={inputStyle} />
              </div>

              {/* Phone + DOB */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Phone Number</label>
                <input type="tel" name="phone" required value={form.phone} onChange={handleChange} placeholder="+1 234 567 890" style={inputStyle} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Date of Birth</label>
                <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} style={inputStyle} />
              </div>

              {/* Address */}
              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label>Street Address</label>
                <input type="text" name="address1" value={form.address1} onChange={handleChange} placeholder="e.g. 12 Main Street" style={inputStyle} />
              </div>

              {/* City + State */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>City</label>
                <input type="text" name="city" required value={form.city} onChange={handleChange} style={inputStyle} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>State / Province</label>
                <input type="text" name="state" value={form.state} onChange={handleChange} style={inputStyle} />
              </div>

              {/* Country + Postal Code */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Country</label>
                <input type="text" name="country" required value={form.country} onChange={handleChange} style={inputStyle} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Postal Code</label>
                <input type="text" name="postal_code" value={form.postal_code} onChange={handleChange} placeholder="e.g. 10001" style={inputStyle} />
              </div>

            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '24px', padding: '16px' }} className="button">
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
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem', padding: '16px', width: '100%' }}
              />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '16px' }}>
              Sent to <strong>{form.email}</strong>. Check your inbox.
            </p>
            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '8px', padding: '16px' }} className="button">
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>
            <button type="button" onClick={() => setStep(1)} style={{ width: '100%', marginTop: '12px', background: 'transparent', color: 'var(--text-muted)', padding: '12px' }} className="button">
              ← Back & Edit Details
            </button>
          </form>
        )}
      </div>
    </div>
  );
}