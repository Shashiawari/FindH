'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';

const TAB_CONFIG = [
  { id: 'requests', label: '📋 Requests', icon: '📋' },
  { id: 'rooms', label: '🏠 My Rooms', icon: '🏠' },
  { id: 'earnings', label: '💰 Earnings', icon: '💰' },
  { id: 'settings', label: '⚙️ Settings', icon: '⚙️' },
];

export default function ProfilePage() {
  const { user, token, logoutUser } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'requests');
  const [profile, setProfile] = useState(null);
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    fetch('http://localhost:5000/api/profile', { headers })
      .then(r => r.json())
      .then(d => {
        setProfile(d);
        setSettings({ address1: d.address1 || '', city: d.city || '', state: d.state || '', country: d.country || '', phone: d.phone || '' });
      })
      .catch(console.error);
  }, [token]);

  const fetchTab = useCallback(async (tab) => {
    if (tabData[tab] !== undefined) return;
    setTabLoading(true);
    const endpointMap = { requests: '/api/profile/requests', rooms: '/api/profile/rooms', earnings: '/api/profile/earnings' };
    const ep = endpointMap[tab];
    if (!ep) { setTabLoading(false); return; }
    try {
      const res = await fetch(`http://localhost:5000${ep}`, { headers });
      const data = await res.json();
      const safeData = tab === 'earnings'
        ? (data && typeof data === 'object' ? data : { total: 0, verifications: [] })
        : (Array.isArray(data) ? data : []);
      setTabData(p => ({ ...p, [tab]: safeData }));
    } catch { setTabData(p => ({ ...p, [tab]: tab === 'earnings' ? { total: 0, verifications: [] } : [] })); }
    finally { setTabLoading(false); }
  }, [tabData, token]);

  useEffect(() => { fetchTab(activeTab); }, [activeTab]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveStatus('');
    try {
      const res = await fetch('http://localhost:5000/api/profile/settings', { method: 'PUT', headers, body: JSON.stringify(settings) });
      setSaveStatus(res.ok ? 'saved' : 'error');
    } catch { setSaveStatus('error'); }
    finally { setSavingSettings(false); setTimeout(() => setSaveStatus(''), 3000); }
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';
  const agentActive = profile?.agentStatus === 'Verified';

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* ── PROFILE HERO ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '40px', padding: '28px 32px', background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border)', flexWrap: 'wrap' }}
      >
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: '800', color: '#fff', flexShrink: 0, boxShadow: 'var(--shadow-primary)' }}>
          {initial}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ marginBottom: 0 }}>{user?.name || user?.email || 'My Profile'}</h2>
            {user?.user_code && (
              <span className="badge badge-primary" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{user.user_code}</span>
            )}
            {agentActive && <span className="badge badge-success">✓ Verified Agent</span>}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{user?.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {!agentActive && (
            <Link href="/agent" className="button" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>
              + Become an Agent
            </Link>
          )}
          <button onClick={() => { logoutUser?.(); router.push('/'); }} className="btn-ghost button" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>
            Sign Out
          </button>
        </div>
      </motion.div>

      {/* ── TABS ── */}
      <div className="tab-list" style={{ marginBottom: '28px' }}>
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {tabLoading ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '14px' }} />)}
            </div>
          ) : (
            <>
              {/* ── REQUESTS ── */}
              {activeTab === 'requests' && (
                <div>
                  {(tabData.requests || []).length === 0 ? (
                    <EmptyState icon="📭" title="No verification requests yet" sub="When tenants book you as an agent, their requests appear here." />
                  ) : (
                    <div style={{ display: 'grid', gap: '14px' }}>
                      {(tabData.requests || []).map((r, i) => (
                        <motion.div key={r.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div>
                              <h4 style={{ marginBottom: '4px' }}>{r.listings?.title || 'Property'}</h4>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                                Tenant: {r.users?.email} {r.users?.user_code && <span style={{ color: 'var(--primary)', fontWeight: '700' }}>· {r.users.user_code}</span>}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                              <span className={`badge ${r.payment_status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                                {r.payment_status || 'Pending'}
                              </span>
                              {r.payment_status === 'Paid' && (
                                <Link href={`/profile/upload-docs/${r.id}`} className="button" style={{ padding: '8px 16px', fontSize: '0.83rem' }}>
                                  Upload Docs →
                                </Link>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── MY ROOMS ── */}
              {activeTab === 'rooms' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: 0 }}>My Listed Rooms</h3>
                    <Link href="/upload" className="button" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>+ New Listing</Link>
                  </div>
                  {(tabData.rooms || []).length === 0 ? (
                    <EmptyState icon="🏠" title="No rooms listed" sub="Post your first room listing." cta={<Link href="/upload" className="button">Post a Room</Link>} />
                  ) : (
                    <div style={{ display: 'grid', gap: '14px' }}>
                      {(tabData.rooms || []).map((r, i) => (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div>
                              <h4 style={{ marginBottom: '4px' }}>{r.title}</h4>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>📍 {r.city}, {r.country}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <span className={`badge ${r.status === 'Active' ? 'badge-success' : 'badge-muted'}`}>{r.status}</span>
                              <span style={{ fontWeight: '700', color: 'var(--primary)' }}>${r.cold_rent}/mo</span>
                              <Link href={`/rooms/${r.id}`} style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '600' }}>View →</Link>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── EARNINGS ── */}
              {activeTab === 'earnings' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                    <div className="stat-card">
                      <div className="stat-label">Verifications Completed</div>
                      <div className="stat-value text-gradient">{tabData.earnings?.total ?? 0}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Estimated Earnings</div>
                      <div className="stat-value" style={{ color: 'var(--accent)' }}>${(tabData.earnings?.total ?? 0) * 20}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Agent Status</div>
                      <div style={{ marginTop: '8px' }}>
                        <span className={`badge ${agentActive ? 'badge-success' : 'badge-muted'}`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                          {agentActive ? '✓ Active' : 'Pending KYC'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {(tabData.earnings?.verifications || []).length > 0 && (
                    <div className="glass-card">
                      <h3 style={{ marginBottom: '20px' }}>Completed Verifications</h3>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {tabData.earnings.verifications.map((v, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', background: 'var(--surface-2)', borderRadius: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem' }}>{v.listings?.title || 'Property'}</span>
                            <span className="badge badge-success">Verified</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── SETTINGS ── */}
              {activeTab === 'settings' && (
                <div className="glass-card" style={{ maxWidth: '620px' }}>
                  <h3 style={{ marginBottom: '24px' }}>Profile Settings</h3>
                  <form onSubmit={handleSaveSettings}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {[
                        { key: 'address1', label: 'Address', placeholder: 'Street address', span: 2 },
                        { key: 'city', label: 'City', placeholder: 'City' },
                        { key: 'state', label: 'State', placeholder: 'State/Province' },
                        { key: 'country', label: 'Country', placeholder: 'Country' },
                        { key: 'phone', label: 'Phone', placeholder: '+1 234 567 890' },
                      ].map(({ key, label, placeholder, span }) => (
                        <div key={key} className="form-group" style={{ gridColumn: span ? `1 / -1` : 'auto', marginBottom: 0 }}>
                          <label>{label}</label>
                          <input
                            type="text" placeholder={placeholder}
                            value={settings[key] || ''}
                            onChange={e => setSettings(p => ({ ...p, [key]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '24px' }}>
                      <button type="submit" disabled={savingSettings} className="button">
                        {savingSettings ? 'Saving...' : 'Save Changes'}
                      </button>
                      {saveStatus === 'saved' && <span className="badge badge-success">✓ Saved</span>}
                      {saveStatus === 'error' && <span className="badge badge-danger">Save failed</span>}
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ icon, title, sub, cta }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      style={{ textAlign: 'center', padding: '60px 40px', background: 'var(--surface)', borderRadius: '18px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '14px' }}>{icon}</div>
      <h3 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: cta ? '20px' : 0 }}>{sub}</p>
      {cta}
    </motion.div>
  );
}
