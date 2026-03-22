'use client';

import API_URL from '../../lib/api.js';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function BecomeAgent() {
  const router = useRouter();
  const { token } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    agentType: 'Professional',
    idType: 'Passport', idNumber: '', university: '', matricNumber: ''
  });
  
  const [files, setFiles] = useState({});

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setFiles({ ...files, [e.target.name]: e.target.files[0] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const data = new FormData();
    Object.keys(form).forEach(key => data.append(key, form[key]));
    Object.keys(files).forEach(key => data.append(key, files[key]));

    try {
      const res = await fetch(`${API_URL}/api/agents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });
      if (res.ok) {
        setMessage('Application submitted. Your verification status is now pending admin review.');
        router.push('/agent-dashboard');
      } else {
        const err = await res.json();
        alert(err.message || 'Registration failed');
      }
    } catch (error) {
      alert('Network error');
    }
    setLoading(false);
  };

  return (
    <ProtectedRoute>
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="glass-card animate-fade-in">
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="badge badge-accent" style={{ marginBottom: '16px' }}>Join the Network</div>
          <h2>Become an Agent</h2>
          <p style={{ color: 'var(--text-muted)' }}>Submit your details once. After admin approval, your agent dashboard unlocks automatically.</p>
        </div>

        {message && (
          <div className="badge badge-success" style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', marginBottom: '24px' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-2">
          {/* Common Fields */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Agent Profile</h4>
          </div>
          
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Agent Type</label>
            <select name="agentType" value={form.agentType} onChange={handleChange}>
              <option value="Professional">Professional</option>
              <option value="Student">Student</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <div style={{ padding: '14px 18px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)' }}>Profile Data Auto-filled</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Your name, email, phone, date of birth, and address from your account profile will be used automatically — no need to re-enter them.</div>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ marginTop: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Verification Documents</h4>
          </div>

          {form.agentType === 'Professional' ? (
            <>
              <div className="form-group">
                <label>ID Type</label>
                <select name="idType" value={form.idType} onChange={handleChange}>
                  <option value="Passport">Passport</option>
                  <option value="National ID">National ID</option>
                  <option value="Driver License">Driver&apos;s License</option>
                </select>
              </div>
              <div className="form-group">
                <label>ID Number</label>
                <input name="idNumber" required onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>ID Proof Front</label>
                <input type="file" name="idFront" required accept="image/*" onChange={handleFileChange} />
              </div>
              <div className="form-group">
                <label>ID Proof Back</label>
                <input type="file" name="idBack" required accept="image/*" onChange={handleFileChange} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Selfie</label>
                <input type="file" name="selfie" required accept="image/*" onChange={handleFileChange} />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>University Name</label>
                <input name="university" required onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Matriculation Number</label>
                <input name="matricNumber" required onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>ID Proof</label>
                <input type="file" name="studentIDPhoto" required accept="image/*" onChange={handleFileChange} />
              </div>
              <div className="form-group">
                <label>Selfie</label>
                <input type="file" name="selfie" required accept="image/*" onChange={handleFileChange} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Student Certificate</label>
                <input type="file" name="studentCertificate" required accept="image/*,application/pdf" onChange={handleFileChange} />
              </div>
            </>
          )}

          <div style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
            <button type="submit" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} disabled={loading}>
              {loading ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ProtectedRoute>
  );
}
