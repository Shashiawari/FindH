'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminProtectedRoute from '../../../components/AdminProtectedRoute';

const TABS = [
  { id: 'kyc', label: '👤 KYC Verification', short: 'KYC' },
  { id: 'listings', label: '🏠 Listings', short: 'Listings' },
  { id: 'apps', label: '📋 Property Applications', short: 'Applications' },
  { id: 'stats', label: '📊 Stats', short: 'Stats' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('kyc');
  const [data, setData] = useState({ kyc: [], listings: [], apps: [], stats: {} });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const getToken = () => sessionStorage.getItem('adminToken');
  const getHeaders = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

  useEffect(() => { fetchTab(activeTab); }, [activeTab]);

  const fetchTab = async (tab) => {
    setLoading(true);
    try {
      const eps = { kyc: '/api/admin/agents/kyc/pending', listings: '/api/admin/listings', apps: '/api/admin/properties/applications', stats: '/api/admin/bookings/stats' };
      const res = await fetch(`http://localhost:5000${eps[tab]}`, { headers: getHeaders() });
      if (res.ok) {
        const d = await res.json();
        setData(prev => ({ ...prev, [tab]: d }));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const doAction = async (tab, endpoint, method, id, body = null) => {
    setActionLoading(id);
    try {
      const res = await fetch(`http://localhost:5000/api/admin/${endpoint}`, { method, headers: getHeaders(), body: body ? JSON.stringify(body) : undefined });
      if (res.ok) { fetchTab(tab); }
      else { const e = await res.json(); alert(e.message); }
    } catch { alert('Network error'); }
    finally { setActionLoading(null); }
  };

  const openDoc = async (path) => {
    if (!path) return alert('Document not available');
    try {
      const res = await fetch(`http://localhost:5000/api/files/${encodeURIComponent(path)}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const { signedUrl } = await res.json();
      window.open(signedUrl, '_blank');
    } catch { alert('Failed to open document'); }
  };

  const DocButton = ({ path, label }) => path ? (
    <div style={{ display: 'flex', flex: '0 1 120px', flexDirection: 'column', gap: '4px' }}>
      <button onClick={() => openDoc(path)} style={{ padding: '8px 10px', fontSize: '0.75rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: 'var(--primary)', borderRadius: '8px', cursor: 'pointer', boxShadow: 'none', fontWeight: '600' }}>
        📄 View
      </button>
      <button onClick={async () => {
        const r = await fetch(`http://localhost:5000/api/files/${encodeURIComponent(path)}`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const { signedUrl } = await r.json();
        const a = document.createElement('a'); a.href = signedUrl; a.download = label; a.click();
      }} style={{ padding: '6px 10px', fontSize: '0.72rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', boxShadow: 'none' }}>
        ⬇ Download
      </button>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)', textAlign: 'center' }}>{label}</span>
    </div>
  ) : (
    <div style={{ flex: '0 1 120px', padding: '20px 8px', border: '1px dashed var(--border)', borderRadius: '8px', textAlign: 'center', color: 'var(--danger)', fontSize: '0.7rem' }}>
      Not<br />Uploaded
    </div>
  );

  return (
    <AdminProtectedRoute>
      <div className="container" style={{ paddingBottom: '80px' }}>
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          style={{ marginBottom: '36px' }}>
          <div className="badge badge-warning" style={{ marginBottom: '10px' }}>Admin Control Panel</div>
          <h1 style={{ marginBottom: '6px' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>FindH verification & management system</p>
        </motion.div>

        {/* TABS */}
        <div className="tab-list" style={{ marginBottom: '32px', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`tab-btn${activeTab === t.id ? ' active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

            {loading ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '14px' }} />)}
              </div>
            ) : (
              <>
                {/* ── KYC TAB ── */}
                {activeTab === 'kyc' && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {data.kyc.length === 0 && <EmptyAdmin icon="🎉" msg="No agents pending KYC verification." />}
                    {data.kyc.map((agent, i) => (
                      <motion.div key={agent.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                <h3 style={{ marginBottom: 0, fontSize: '1.1rem' }}>{agent.name}</h3>
                                {agent.user_code && <span className="badge badge-primary" style={{ fontFamily: 'monospace' }}>{agent.user_code}</span>}
                                <span className="badge badge-muted">{agent.agent_type}</span>
                              </div>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                                📧 {agent.email} · 📞 {agent.phone} · 📍 {agent.city}, {agent.country}
                              </p>
                            </div>
                            <span className="badge badge-warning">⏳ Pending KYC</span>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '16px', marginBottom: '18px' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px', fontWeight: '600' }}>KYC Documents</p>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              <DocButton path={agent.selfie} label="Selfie" />
                              <DocButton path={agent.id_front} label="ID Front" />
                              <DocButton path={agent.id_back} label="ID Back" />
                              <DocButton path={agent.student_certificate} label="Student Cert" />
                              <DocButton path={agent.student_id_photo} label="Student ID" />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => doAction('kyc', `agents/kyc/${agent.id}/approve`, 'PUT', agent.id)} disabled={actionLoading === agent.id} className="button btn-success" style={{ padding: '10px 20px' }}>
                              ✅ Approve
                            </button>
                            <button onClick={() => doAction('kyc', `agents/kyc/${agent.id}/reject`, 'POST', agent.id)} disabled={actionLoading === agent.id} className="button btn-danger" style={{ padding: '10px 20px' }}>
                              ❌ Reject
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* ── LISTINGS TAB ── */}
                {activeTab === 'listings' && (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {data.listings.length === 0 && <EmptyAdmin icon="🏠" msg="No listings found." />}
                    {data.listings.map((l, i) => (
                      <motion.div key={l.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <h4 style={{ marginBottom: '4px' }}>{l.title}</h4>
                              <span className={`badge ${l.status === 'Active' ? 'badge-success' : 'badge-muted'}`}>{l.status}</span>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', margin: 0 }}>📍 {l.address1}, {l.city} · €{l.cold_rent}/mo · {l.users?.email}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {l.status !== 'Active' && <button onClick={() => doAction('listings', `listings/${l.id}/status`, 'PUT', l.id, { status: 'Active' })} className="button btn-success" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>Activate</button>}
                            {l.status === 'Active' && <button onClick={() => doAction('listings', `listings/${l.id}/status`, 'PUT', l.id, { status: 'Paused' })} className="button" style={{ padding: '8px 14px', fontSize: '0.82rem', background: 'var(--warning)' }}>Pause</button>}
                            <button onClick={() => { if (confirm('Delete this listing?')) doAction('listings', `listings/${l.id}`, 'DELETE', l.id); }} className="button btn-danger" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>Delete</button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* ── APPLICATIONS TAB ── */}
                {activeTab === 'apps' && (
                  <div style={{ display: 'grid', gap: '18px' }}>
                    {data.apps.length === 0 && <EmptyAdmin icon="📋" msg="No pending property applications." />}
                    {data.apps.map((app, i) => (
                      <motion.div key={app.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                              <h3 style={{ marginBottom: '4px', fontSize: '1rem' }}>
                                Agent: {app.agents?.name}
                                {app.agents?.user_code && <span className="badge badge-primary" style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '0.72rem' }}>{app.agents.user_code}</span>}
                              </h3>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '2px 0' }}>
                                🏠 {app.listings?.title} · {app.listings?.address1}, {app.listings?.city}
                              </p>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', margin: 0 }}>
                                👤 Booked by: {app.tenant_email}
                                {app.tenant_user_code && <span style={{ color: 'var(--primary)', fontWeight: '700', marginLeft: '6px' }}>{app.tenant_user_code}</span>}
                              </p>
                            </div>
                            <span className={`badge ${app.verification_status === 'approved' ? 'badge-success' : app.verification_status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                              {(app.verification_status || 'pending').toUpperCase()}
                            </span>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px', fontWeight: '600' }}>Property Documents</p>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              <DocButton path={app.ownership_proof} label="Ownership Proof" />
                              <DocButton path={app.rental_agreement} label="Rental Agrmnt" />
                              <DocButton path={app.electricity_bill} label="Elec. Bill" />
                              <DocButton path={app.property_registration} label="Registration" />
                            </div>
                          </div>

                          {app.verification_status !== 'approved' ? (
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button onClick={() => doAction('apps', `properties/applications/${app.id}/approve`, 'PUT', app.id)} disabled={actionLoading === app.id} className="button btn-success" style={{ padding: '10px 20px' }}>
                                ✅ Approve Verification
                              </button>
                              <button onClick={() => { const r = prompt('Rejection reason:'); if (r) doAction('apps', `properties/applications/${app.id}/reject`, 'POST', app.id, { reason: r }); }} disabled={actionLoading === app.id} className="button btn-danger" style={{ padding: '10px 20px' }}>
                                ❌ Reject
                              </button>
                            </div>
                          ) : (
                            <div className="alert alert-success">✔ Approved — Tenant can now access verified documents</div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* ── STATS TAB ── */}
                {activeTab === 'stats' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                      {[
                        { label: 'Total Bookings', value: data.stats?.totalBookings ?? 0, color: 'var(--primary)' },
                        { label: 'Paid Bookings', value: data.stats?.paidBookings ?? 0, color: 'var(--accent)' },
                        { label: 'Pending KYC', value: data.stats?.pendingKyc ?? 0, color: 'var(--warning)' },
                        { label: 'Verified Agents', value: data.stats?.verifiedAgents ?? 0, color: 'var(--secondary)' },
                      ].map((s, i) => (
                        <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="stat-card">
                          <div className="stat-label">{s.label}</div>
                          <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="glass-card">
                      <h3 style={{ marginBottom: '20px' }}>Recent Bookings</h3>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date</th><th>Tenant</th><th>Agent</th><th>Property</th><th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.stats?.bookings || []).map(b => (
                            <tr key={b.id}>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{new Date(b.created_at).toLocaleDateString()}</td>
                              <td>
                                <div style={{ fontSize: '0.88rem' }}>{b.users?.email}</div>
                                {b.users?.user_code && <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: '700' }}>{b.users.user_code}</div>}
                              </td>
                              <td>
                                <div style={{ fontSize: '0.88rem' }}>{b.agents?.name}</div>
                                {b.agents?.user_code && <div style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>{b.agents.user_code}</div>}
                              </td>
                              <td style={{ fontSize: '0.88rem' }}>{b.listings?.title}</td>
                              <td><span className={`badge ${b.payment_status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>{b.payment_status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </AdminProtectedRoute>
  );
}

function EmptyAdmin({ icon, msg }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '60px 40px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
      <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{icon}</div>
      <p style={{ color: 'var(--text-muted)' }}>{msg}</p>
    </motion.div>
  );
}