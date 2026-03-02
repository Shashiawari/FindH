'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';

export default function AdminLogin() {
  const { loginAdmin } = useAppContext();
  
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, password }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('Server response invalid');
      }

      if (!res.ok) {
        throw new Error(data.message || 'Admin login failed');
      }

      // 🔐 Store secure Admin Context token
      loginAdmin(data);
      router.push('/admin/dashboard');

    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '75vh' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '48px 40px', borderTop: '4px solid #ef4444' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ color: '#ef4444' }}>System Administrator</h2>
          <p style={{ color: 'var(--text-muted)' }}>Authorized personnel only.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Admin ID</label>
            <input type="text" required value={adminId} onChange={(e) => setAdminId(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Master Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '16px', padding: '16px', background: '#ef4444', color: 'white' }}>
            {loading ? 'Authenticating...' : 'Enter System'}
          </button>
        </form>
      </div>
    </div>
  );
}
