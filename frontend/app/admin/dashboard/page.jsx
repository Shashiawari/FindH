'use client';

import API_URL from '../../../lib/api.js';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminProtectedRoute from '../../../components/AdminProtectedRoute';
import { doFetch, doAction, ConfirmModal, DetailModal, Pagination, EmptyAdmin, ActionBtn, DataTableWrap, getToken, getHeaders } from './components';

const SIDEBAR = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'listings', label: 'Listings', icon: '🏠' },
  { id: 'verifications', label: 'Verifications', icon: '🛡️' },
  { id: 'kyc', label: 'KYC', icon: '📋' },
  { id: 'apps', label: 'Applications', icon: '📁' },
  { id: 'tickets', label: 'Support', icon: '🎫' },
  { id: 'queries', label: 'Contacts', icon: '💬' },
  { id: 'payments', label: 'Payments', icon: '💳' },
  { id: 'database', label: 'Database', icon: '🗄️' },
  { id: 'activity', label: 'Activity Log', icon: '📝' },
  { id: 'emergency', label: 'Emergency', icon: '🚨' },
];

const PER_PAGE = 15;

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalResults, setGlobalResults] = useState(null);
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // DB Manager state
  const [dbTable, setDbTable] = useState('users');
  const [dbData, setDbData] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);

  // Emergency state
  const [settings, setSettings] = useState({});

  useEffect(() => { fetchTab(tab); setPage(1); setSearch(''); }, [tab]);

  const fetchTab = async (t) => {
    setLoading(true);
    try {
      const eps = {
        overview: '/api/admin/dashboard/stats',
        users: `/api/admin/users${search ? `?search=${search}` : ''}`,
        listings: '/api/admin/listings',
        verifications: '/api/admin/verification-requests',
        kyc: '/api/admin/agents/kyc/pending',
        apps: '/api/admin/properties/applications',
        tickets: '/api/admin/support-tickets',
        queries: '/api/admin/contact-queries',
        payments: '/api/admin/payments',
        activity: '/api/admin/activity-log',
        emergency: '/api/admin/settings',
      };
      if (eps[t]) {
        const d = await doFetch(eps[t]);
        setData(prev => ({ ...prev, [t]: d }));
        if (t === 'emergency') setSettings(d);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAction = async (path, method, id, refreshTab, body) => {
    setActionLoading(id);
    try { await doAction(path, method, body); fetchTab(refreshTab); }
    catch (err) { alert(err.message); }
    finally { setActionLoading(null); setConfirm(null); }
  };

  const confirmAction = (title, msg, onConfirm) => setConfirm({ title, message: msg, onConfirm });

  // Global search
  const doGlobalSearch = async () => {
    if (!globalSearch || globalSearch.length < 2) { setGlobalResults(null); return; }
    try {
      const d = await doFetch(`/api/admin/search?q=${encodeURIComponent(globalSearch)}`);
      setGlobalResults(d);
    } catch { setGlobalResults(null); }
  };

  // DB Manager
  const fetchDbTable = async (t) => {
    setDbLoading(true);
    try { const d = await doFetch(`/api/admin/db/${t}`); setDbData(d); }
    catch (err) { console.error(err); setDbData([]); }
    finally { setDbLoading(false); }
  };

  useEffect(() => { if (tab === 'database') fetchDbTable(dbTable); }, [dbTable, tab]);

  const exportCSV = async (t) => {
    const res = await fetch(`${API_URL}/api/admin/db/${t}/export`, { headers: getHeaders() });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${t}_export.csv`; a.click();
  };

  // Search users
  const searchUsers = async () => {
    setLoading(true);
    try {
      const d = await doFetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
      setData(prev => ({ ...prev, users: d }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Doc viewer
  const openDoc = async (path) => {
    if (!path) return alert('Document not available');
    try {
      const { signedUrl } = await doFetch(`/api/files/${encodeURIComponent(path)}`);
      window.open(signedUrl, '_blank');
    } catch { alert('Failed to open document'); }
  };

  const downloadDoc = async (path) => {
    if (!path) return alert('Document not available');
    try {
      const { signedUrl } = await doFetch(`/api/files/${encodeURIComponent(path)}`);
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = path.split('/').pop() || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch { alert('Failed to download document'); }
  };

  // Paginate helper
  const paginate = (arr) => {
    if (!Array.isArray(arr)) return [];
    const start = (page - 1) * PER_PAGE;
    return arr.slice(start, start + PER_PAGE);
  };

  const stats = data.overview || {};
  const STAT_CARDS = [
    { label: 'Total Users', value: stats.total_users, tab: 'users', color: '#6366f1' },
    { label: 'Total Agents', value: stats.total_agents, tab: 'kyc', color: '#8b5cf6' },
    { label: 'Total Listings', value: stats.total_listings, tab: 'listings', color: '#3b82f6' },
    { label: 'Pending Verifications', value: stats.pending_verifications, tab: 'verifications', color: '#f59e0b' },
    { label: 'Applications', value: stats.total_applications, tab: 'apps', color: '#10b981' },
    { label: 'Support Tickets', value: stats.total_tickets, tab: 'tickets', color: '#ef4444' },
    { label: 'Contact Queries', value: stats.total_queries, tab: 'queries', color: '#06b6d4' },
    { label: 'Total Revenue', value: `€${stats.total_revenue || 0}`, tab: 'payments', color: '#22c55e' },
  ];

  return (
    <AdminProtectedRoute>
      <div className="admin-layout">

        {/* SIDEBAR */}
        <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 12 }}>🔑 Super Admin</div>
            {/* Global Search */}
            <div style={{ display: 'flex', gap: 4 }}>
              <input className="search-input" placeholder="Search..." value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doGlobalSearch()}
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem' }} />
              <button onClick={doGlobalSearch} style={{ padding: '8px 10px', fontSize: '0.8rem', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>🔍</button>
            </div>
            {globalResults && (
              <div style={{ marginTop: 8, fontSize: '0.78rem', background: 'var(--surface-2)', borderRadius: 8, padding: 8, maxHeight: 200, overflowY: 'auto' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Results:</div>
                {globalResults.users?.map(u => <div key={u.id} style={{ cursor: 'pointer', padding: '2px 0' }} onClick={() => { setDetail({ title: 'User', data: u }); }}>👤 {u.email}</div>)}
                {globalResults.listings?.map(l => <div key={l.id} style={{ cursor: 'pointer', padding: '2px 0' }} onClick={() => { setTab('listings'); setGlobalResults(null); }}>🏠 {l.title}</div>)}
                {globalResults.tickets?.map(t => <div key={t.id} style={{ cursor: 'pointer', padding: '2px 0' }} onClick={() => { setTab('tickets'); setGlobalResults(null); }}>🎫 {t.subject}</div>)}
                {[...globalResults.users||[], ...globalResults.listings||[], ...globalResults.tickets||[]].length === 0 && <div style={{ color: 'var(--text-muted)' }}>No results</div>}
              </div>
            )}
          </div>
          <nav style={{ padding: '8px 0', flex: 1, overflowY: 'auto' }}>
            {SIDEBAR.map(s => (
              <button key={s.id} onClick={() => { setTab(s.id); setSidebarOpen(false); }}
                className={`admin-sidebar-item${tab === s.id ? ' active' : ''}`}>
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* MOBILE TOGGLE */}
        <button className="admin-mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '✕' : '☰'} Menu
        </button>

        {/* SIDEBAR OVERLAY */}
        {sidebarOpen && <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* MAIN */}
        <main className="admin-main">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

              {loading ? (
                <div style={{ display: 'grid', gap: 16 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 14 }} />)}</div>
              ) : (<>

                {/* ═══ OVERVIEW ═══ */}
                {tab === 'overview' && (
                  <>
                    <h2 style={{ marginBottom: 24 }}>Dashboard Overview</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                      {STAT_CARDS.map(c => (
                        <div key={c.label} className="stat-card" style={{ cursor: 'pointer', borderTop: `3px solid ${c.color}` }}
                          onClick={() => setTab(c.tab)}>
                          <div className="stat-label">{c.label}</div>
                          <div className="stat-value" style={{ color: c.color }}>{c.value ?? 0}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ═══ USERS ═══ */}
                {tab === 'users' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                      <h2>Users Management</h2>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input placeholder="Search email, name..." value={search} onChange={e => setSearch(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && searchUsers()}
                          style={{ padding: '8px 14px', fontSize: '0.85rem', width: 220 }} />
                        <button onClick={searchUsers} style={{ padding: '8px 14px', fontSize: '0.82rem' }} className="button">Search</button>
                      </div>
                    </div>
                    {(!data.users || data.users.length === 0) ? <EmptyAdmin icon="👥" msg="No users found." /> : (
                      <>
                        <DataTableWrap>
                          <thead><tr><th>User</th><th>Code</th><th>Role</th><th>City</th><th>Created</th><th>Actions</th></tr></thead>
                          <tbody>
                            {paginate(data.users).map(u => (
                              <tr key={u.id}>
                                <td><div style={{ fontWeight: 600 }}>{u.name || 'N/A'}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div></td>
                                <td><span className="badge badge-muted">{u.user_code}</span></td>
                                <td><span className={`badge ${u.role === 'agent' ? 'badge-accent' : u.role === 'admin' ? 'badge-danger' : 'badge-primary'}`}>{u.role}</span></td>
                                <td style={{ fontSize: '0.85rem' }}>{u.city || 'N/A'}</td>
                                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    <ActionBtn label="View" small onClick={() => setDetail({ title: 'User Details', data: u })} />
                                    <ActionBtn label="Suspend" variant="btn-warning" small disabled={actionLoading === u.id}
                                      onClick={() => confirmAction('Suspend User', `Suspend ${u.email}?`, () => handleAction(`/api/admin/users/${u.id}/suspend`, 'PUT', u.id, 'users'))} />
                                    <ActionBtn label="Delete" variant="btn-danger" small disabled={actionLoading === u.id}
                                      onClick={() => confirmAction('Delete User', `Permanently delete ${u.email}?`, () => handleAction(`/api/admin/users/${u.id}`, 'DELETE', u.id, 'users'))} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </DataTableWrap>
                        <Pagination total={data.users.length} page={page} perPage={PER_PAGE} onChange={setPage} />
                      </>
                    )}
                  </>
                )}

                {/* ═══ LISTINGS ═══ */}
                {tab === 'listings' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                      <h2>Property Listings</h2>
                      <span className="badge badge-primary">{data.listings?.length || 0} Total</span>
                    </div>
                    {(!data.listings || data.listings.length === 0) ? <EmptyAdmin icon="🏠" msg="No listings." /> : (
                      <>
                        <DataTableWrap>
                          <thead><tr><th>Property</th><th>Rent</th><th>Status</th><th>Verified</th><th>Actions</th></tr></thead>
                          <tbody>
                            {paginate(data.listings).map(l => (
                              <tr key={l.id}>
                                <td><div style={{ fontWeight: 600 }}>{l.title}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.city}, {l.country}</div></td>
                                <td style={{ fontWeight: 600 }}>€{l.warm_rent}</td>
                                <td><span className={`badge ${l.status === 'Active' ? 'badge-success' : l.status === 'Featured' ? 'badge-accent' : 'badge-warning'}`}>{l.status}</span></td>
                                <td>{l.is_verified ? <span className="badge badge-success">✔ Verified</span> : <span className="badge badge-muted">No</span>}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    <ActionBtn label="View" small onClick={() => setDetail({ title: 'Listing', data: l })} />
                                    <ActionBtn label="Feature" variant="btn-accent" small onClick={() => handleAction(`/api/admin/listings/${l.id}/feature`, 'PUT', l.id, 'listings')} />
                                    <ActionBtn label={l.is_verified ? 'Unverify' : 'Verify'} small
                                      onClick={() => handleAction(`/api/admin/listings/${l.id}/${l.is_verified ? 'unverify' : 'verify'}`, 'PUT', l.id, 'listings')} />
                                    <ActionBtn label="Delete" variant="btn-danger" small
                                      onClick={() => confirmAction('Delete Listing', 'Permanently delete?', () => handleAction(`/api/admin/listings/${l.id}`, 'DELETE', l.id, 'listings'))} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </DataTableWrap>
                        <Pagination total={data.listings.length} page={page} perPage={PER_PAGE} onChange={setPage} />
                      </>
                    )}
                  </>
                )}

                {/* ═══ VERIFICATIONS ═══ */}
                {tab === 'verifications' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                      <h2>Verification Requests</h2>
                      <span className="badge badge-primary">{data.verifications?.length || 0} Total</span>
                    </div>
                    {(!data.verifications || data.verifications.length === 0) ? <EmptyAdmin icon="🛡️" msg="No verification requests." /> : (
                      <DataTableWrap>
                        <thead><tr><th>Property</th><th>User</th><th>Email</th><th>Phone</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                        <tbody>
                          {paginate(data.verifications).map(v => (
                            <tr key={v.id}>
                              <td><div style={{ fontWeight: 600 }}>{v.property_name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{v.property_id}</div></td>
                              <td style={{ fontSize: '0.85rem' }}>{v.user_name || 'N/A'}</td>
                              <td style={{ fontSize: '0.85rem' }}>{v.user_email}</td>
                              <td style={{ fontSize: '0.85rem' }}>{v.user_phone || 'N/A'}</td>
                              <td><span className={`badge ${v.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{v.payment_status}</span></td>
                              <td><span className={`badge ${v.verification_status === 'completed' ? 'badge-success' : v.verification_status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{v.verification_status}</span></td>
                              <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{new Date(v.request_date).toLocaleDateString()}</td>
                              <td>
                                {v.verification_status === 'pending' && (
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <ActionBtn label="Complete" variant="btn-success" small disabled={actionLoading === v.id}
                                      onClick={() => handleAction(`/api/admin/verification-requests/${v.id}/status`, 'PUT', v.id, 'verifications', { status: 'completed' })} />
                                    <ActionBtn label="Reject" variant="btn-danger" small disabled={actionLoading === v.id}
                                      onClick={() => handleAction(`/api/admin/verification-requests/${v.id}/status`, 'PUT', v.id, 'verifications', { status: 'rejected' })} />
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </DataTableWrap>
                    )}
                  </>
                )}

                {/* ═══ KYC ═══ */}
                {tab === 'kyc' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                      <h2>Pending KYC Reviews</h2>
                      <span className="badge badge-primary">{data.kyc?.length || 0} Pending</span>
                    </div>
                    {(!data.kyc || data.kyc.length === 0) ? <EmptyAdmin icon="✅" msg="All agents verified!" /> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {data.kyc.map(a => {
                          const kycDocs = [
                            ['Selfie', a.selfie],
                            ['ID Proof Front', a.id_front],
                            ['ID Proof Back', a.id_back],
                            ['Student Certificate', a.student_certificate],
                            ['Student ID Photo', a.student_id_photo],
                          ];

                          return (
                            <div key={a.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                              <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <div>
                                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>Agent KYC</div>
                                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{a.name || a.user_id}</div>
                                </div>
                                <span className="badge badge-warning">Pending</span>
                              </div>

                              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
                                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
                                  <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px' }}>Agent</div>
                                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '8px' }}>{a.name || 'N/A'}</div>
                                  <div style={{ display: 'grid', gap: '8px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                                    <div><strong style={{ color: 'var(--text)' }}>Agent ID:</strong> {a.id || 'N/A'}</div>
                                    <div><strong style={{ color: 'var(--text)' }}>Email:</strong> {a.email || 'N/A'}</div>
                                    <div><strong style={{ color: 'var(--text)' }}>Type:</strong> {a.agent_type || 'N/A'}</div>
                                    {a.phone && <div><strong style={{ color: 'var(--text)' }}>Phone:</strong> {a.phone}</div>}
                                  </div>
                                </div>

                                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
                                  <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px' }}>Profile Details</div>
                                  <div style={{ display: 'grid', gap: '8px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                                    <div><strong style={{ color: 'var(--text)' }}>Location:</strong> {[a.address1, a.city, a.state, a.country].filter(Boolean).join(', ') || 'N/A'}</div>
                                    {a.id_type && <div><strong style={{ color: 'var(--text)' }}>ID Type:</strong> {a.id_type}</div>}
                                    {a.id_number && <div><strong style={{ color: 'var(--text)' }}>ID Number:</strong> {a.id_number}</div>}
                                    {a.university && <div><strong style={{ color: 'var(--text)' }}>University:</strong> {a.university}</div>}
                                    {a.matric_number && <div><strong style={{ color: 'var(--text)' }}>Matric No:</strong> {a.matric_number}</div>}
                                  </div>
                                </div>

                                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
                                  <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px' }}>Documents</div>
                                  <div style={{ display: 'grid', gap: '10px' }}>
                                    {kycDocs.map(([label, path]) => (
                                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 12px', flexWrap: 'wrap', background: '#fff' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{label}</span>
                                        {path ? (
                                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button onClick={() => openDoc(path)} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>View</button>
                                            <button onClick={() => downloadDoc(path)} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>Download</button>
                                          </div>
                                        ) : (
                                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not uploaded</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <ActionBtn label="View" onClick={() => setDetail({ title: 'Agent KYC', data: a })} />
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <ActionBtn label="Approve" variant="btn-success" disabled={actionLoading === a.id}
                                    onClick={() => handleAction(`/api/admin/agents/kyc/${a.id}/approve`, 'PUT', a.id, 'kyc')} />
                                  <ActionBtn label="Reject" variant="btn-danger" disabled={actionLoading === a.id}
                                    onClick={() => confirmAction('Reject KYC', 'This will delete agent data.', () => handleAction(`/api/admin/agents/kyc/${a.id}/reject`, 'POST', a.id, 'kyc'))} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* ═══ APPLICATIONS ═══ */}
                {tab === 'apps' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                      <h2>Property Applications</h2>
                      <span className="badge badge-primary">{data.apps?.length || 0} Total</span>
                    </div>
                    {(!data.apps || data.apps.length === 0) ? <EmptyAdmin icon="📋" msg="No applications." /> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {paginate(data.apps).map(app => {
                          const docItems = [
                            ['Ownership Proof', app.ownership_proof],
                            ['Rental Agreement', app.rental_agreement],
                            ['Electricity Bill', app.electricity_bill],
                            ['Registration', app.property_registration],
                          ];
                          const status = app.verification_status || 'pending';

                          return (
                            <div key={app.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                              <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <div>
                                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>Property Application</div>
                                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{app.listings?.title || 'Untitled Property'}</div>
                                </div>
                                <span className={`badge ${status === 'approved' ? 'badge-success' : status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </span>
                              </div>

                              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
                                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
                                  <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px' }}>Agent</div>
                                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '8px' }}>{app.agents?.name || 'N/A'}</div>
                                  <div style={{ display: 'grid', gap: '8px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                                    <div><strong style={{ color: 'var(--text)' }}>Agent ID:</strong> {app.agents?.user_code || 'N/A'}</div>
                                    <div><strong style={{ color: 'var(--text)' }}>Email:</strong> {app.agents?.email || 'N/A'}</div>
                                    {app.agents?.phone && <div><strong style={{ color: 'var(--text)' }}>Phone:</strong> {app.agents.phone}</div>}
                                  </div>
                                </div>

                                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
                                  <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px' }}>Property</div>
                                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '8px' }}>{app.listings?.title || 'N/A'}</div>
                                  <div style={{ display: 'grid', gap: '8px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                                    <div><strong style={{ color: 'var(--text)' }}>Location:</strong> {[app.listings?.address1, app.listings?.city].filter(Boolean).join(', ') || 'N/A'}</div>
                                    <div><strong style={{ color: 'var(--text)' }}>Tenant:</strong> {app.tenant_email || 'N/A'}</div>
                                    {app.tenant_user_code && <div><strong style={{ color: 'var(--text)' }}>Tenant ID:</strong> {app.tenant_user_code}</div>}
                                  </div>
                                </div>

                                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
                                  <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px' }}>Documents</div>
                                  <div style={{ display: 'grid', gap: '10px' }}>
                                    {docItems.map(([label, path]) => (
                                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 12px', flexWrap: 'wrap', background: '#fff' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{label}</span>
                                        {path ? (
                                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button onClick={() => openDoc(path)} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>View</button>
                                            <button onClick={() => downloadDoc(path)} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>Download</button>
                                          </div>
                                        ) : (
                                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not uploaded</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                                  Payment: <strong style={{ color: 'var(--text)' }}>{app.payment_status || 'N/A'}</strong>
                                </div>
                                {status === 'pending' && (
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <ActionBtn label="Approve" variant="btn-success" disabled={actionLoading === app.id}
                                      onClick={() => handleAction(`/api/admin/properties/applications/${app.id}/approve`, 'PUT', app.id, 'apps')} />
                                    <ActionBtn label="Ask Reupload" variant="btn-warning" disabled={actionLoading === app.id}
                                      onClick={() => confirmAction('Request Reupload', 'Wipe documents and ask agent to upload again?', () => handleAction(`/api/admin/properties/applications/${app.id}/reupload`, 'POST', app.id, 'apps', { reason: 'Documents unclear or invalid' }))} />
                                    <ActionBtn label="Reject" variant="btn-danger" disabled={actionLoading === app.id}
                                      onClick={() => confirmAction('Reject Application', 'Permanently reject this verification?', () => handleAction(`/api/admin/properties/applications/${app.id}/reject`, 'POST', app.id, 'apps', { reason: 'Rejected by admin' }))} />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* ═══ SUPPORT TICKETS ═══ */}
                {tab === 'tickets' && (
                  <>
                    <h2 style={{ marginBottom: 16 }}>Support Tickets</h2>
                    {(!data.tickets || data.tickets.length === 0) ? <EmptyAdmin icon="🎫" msg="No tickets." /> : (
                      <DataTableWrap>
                        <thead><tr><th>User</th><th>Category</th><th>Subject</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                        <tbody>
                          {paginate(data.tickets).map(t => (
                            <tr key={t.id}>
                              <td><div style={{ fontWeight: 600 }}>{t.users?.email || 'Unknown'}</div></td>
                              <td><span className="badge badge-accent">{t.category}</span></td>
                              <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</td>
                              <td><span className={`badge ${t.status === 'open' ? 'badge-warning' : 'badge-success'}`}>{t.status}</span></td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(t.created_at).toLocaleString()}</td>
                              <td><ActionBtn label="View" small onClick={() => setDetail({ title: 'Ticket', data: t })} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </DataTableWrap>
                    )}
                  </>
                )}

                {/* ═══ CONTACT QUERIES ═══ */}
                {tab === 'queries' && (
                  <>
                    <h2 style={{ marginBottom: 16 }}>Contact Queries</h2>
                    {(!data.queries || data.queries.length === 0) ? <EmptyAdmin icon="💬" msg="No queries." /> : (
                      <DataTableWrap>
                        <thead><tr><th>Email</th><th>Message</th><th>Date</th><th>Actions</th></tr></thead>
                        <tbody>
                          {paginate(data.queries).map(q => (
                            <tr key={q.id}>
                              <td style={{ fontWeight: 600 }}>{q.email}</td>
                              <td style={{ maxWidth: 360, lineHeight: 1.5 }}>{q.message?.length > 100 ? q.message.substring(0, 100) + '...' : q.message}</td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(q.created_at).toLocaleString()}</td>
                              <td><ActionBtn label="View" small onClick={() => setDetail({ title: 'Query', data: q })} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </DataTableWrap>
                    )}
                  </>
                )}

                {/* ═══ PAYMENTS ═══ */}
                {tab === 'payments' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                      <h2>Payments & Revenue</h2>
                      <div className="badge badge-success" style={{ padding: '8px 16px', fontSize: '1rem' }}>
                        Total Revenue: €{data.payments?.totalRevenue || 0}
                      </div>
                    </div>
                    {(!data.payments?.payments || data.payments.payments.length === 0) ? <EmptyAdmin icon="💳" msg="No payments." /> : (
                      <DataTableWrap>
                        <thead><tr><th>User</th><th>Listing</th><th>Agent</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                        <tbody>
                          {paginate(data.payments.payments).map(p => (
                            <tr key={p.id}>
                              <td style={{ fontSize: '0.85rem' }}>{p.user_email}</td>
                              <td style={{ fontSize: '0.85rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.listing_title}</td>
                              <td style={{ fontSize: '0.85rem' }}>{p.agent_name}</td>
                              <td style={{ fontWeight: 700 }}>€{p.amount}</td>
                              <td><span className={`badge ${p.payment_status === 'Paid' ? 'badge-success' : p.payment_status === 'Refunded' ? 'badge-danger' : 'badge-warning'}`}>{p.payment_status}</span></td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                              <td>
                                {p.payment_status === 'Paid' && (
                                  <ActionBtn label="Refund" variant="btn-danger" small disabled={actionLoading === p.id}
                                    onClick={() => confirmAction('Refund', `Refund €${p.amount}?`, () => handleAction(`/api/admin/payments/${p.id}/refund`, 'PUT', p.id, 'payments'))} />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </DataTableWrap>
                    )}
                  </>
                )}

                {/* ═══ DATABASE MANAGER ═══ */}
                {tab === 'database' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                      <h2>Database Manager</h2>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select value={dbTable} onChange={e => { setDbTable(e.target.value); setPage(1); }} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                          {['users','agents','listings','property_verification_requests','agent_property_documents','bookings','support_tickets','contact_queries','admin_activity_log','platform_settings'].map(t =>
                            <option key={t} value={t}>{t}</option>
                          )}
                        </select>
                        <button className="button secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={() => exportCSV(dbTable)}>⬇ Export CSV</button>
                        <button className="button secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }} onClick={() => fetchDbTable(dbTable)}>↻ Refresh</button>
                      </div>
                    </div>
                    {dbLoading ? <div className="skeleton" style={{ height: 200, borderRadius: 14 }} /> : (
                      !dbData || dbData.length === 0 ? <EmptyAdmin icon="🗄️" msg={`No records in ${dbTable}`} /> : (
                        <>
                          <div style={{ overflowX: 'auto', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                            <table className="data-table">
                              <thead><tr>{Object.keys(dbData[0]).slice(0, 8).map(k => <th key={k}>{k}</th>)}<th>Actions</th></tr></thead>
                              <tbody>
                                {paginate(dbData).map((row, i) => (
                                  <tr key={row.id || i}>
                                    {Object.values(row).slice(0, 8).map((v, j) => (
                                      <td key={j} style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                                        {typeof v === 'object' ? JSON.stringify(v)?.substring(0, 40) : String(v ?? '').substring(0, 50)}
                                      </td>
                                    ))}
                                    <td>
                                      <div style={{ display: 'flex', gap: 4 }}>
                                        <ActionBtn label="View" small onClick={() => setDetail({ title: `${dbTable} Record`, data: row })} />
                                        {row.id && <ActionBtn label="Delete" variant="btn-danger" small
                                          onClick={() => confirmAction('Delete Record', 'Permanently delete this record?', async () => {
                                            await doAction(`/api/admin/db/${dbTable}/${row.id}`, 'DELETE');
                                            fetchDbTable(dbTable);
                                            setConfirm(null);
                                          })} />}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <Pagination total={dbData.length} page={page} perPage={PER_PAGE} onChange={setPage} />
                        </>
                      )
                    )}
                  </>
                )}

                {/* ═══ ACTIVITY LOG ═══ */}
                {tab === 'activity' && (
                  <>
                    <h2 style={{ marginBottom: 16 }}>Admin Activity Log</h2>
                    {(!data.activity || data.activity.length === 0) ? <EmptyAdmin icon="📝" msg="No activity yet." /> : (
                      <DataTableWrap>
                        <thead><tr><th>Admin</th><th>Action</th><th>Target</th><th>Date</th></tr></thead>
                        <tbody>
                          {paginate(data.activity).map(a => (
                            <tr key={a.id}>
                              <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.admin_name}</td>
                              <td>{a.action}</td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{a.target_type} {a.target_id ? `· ${a.target_id.substring(0, 8)}...` : ''}</td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </DataTableWrap>
                    )}
                  </>
                )}

                {/* ═══ EMERGENCY MODE ═══ */}
                {tab === 'emergency' && (
                  <>
                    <h2 style={{ marginBottom: 8 }}>🚨 Emergency Admin Mode</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Critical platform controls. Use with caution.</p>
                    <div style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
                      {[
                        { key: 'platform_enabled', label: 'Platform Enabled', desc: 'Disable to take the entire platform offline' },
                        { key: 'registrations_enabled', label: 'Registrations Enabled', desc: 'Disable to block new user signups' },
                        { key: 'listings_enabled', label: 'Listings Enabled', desc: 'Disable to prevent new listings' },
                      ].map(s => (
                        <div key={s.key} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                          <div>
                            <h4>{s.label}</h4>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>{s.desc}</p>
                          </div>
                          <button
                            onClick={async () => {
                              const newVal = settings[s.key] === 'true' ? 'false' : 'true';
                              try {
                                await doAction('/api/admin/settings', 'PUT', { [s.key]: newVal });
                                setSettings(prev => ({ ...prev, [s.key]: newVal }));
                              } catch (err) { alert(err.message); }
                            }}
                            className={`button ${settings[s.key] === 'true' ? 'btn-success' : 'btn-danger'}`}
                            style={{ padding: '8px 20px', minWidth: 80, whiteSpace: 'nowrap' }}
                          >
                            {settings[s.key] === 'true' ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      ))}
                      {/* Announcement */}
                      <div className="card">
                        <h4 style={{ marginBottom: 8 }}>Platform Announcement</h4>
                        <textarea
                          value={settings.announcement || ''}
                          onChange={e => setSettings(prev => ({ ...prev, announcement: e.target.value }))}
                          placeholder="Enter a platform-wide announcement..."
                          style={{ marginBottom: 12, minHeight: 80 }}
                        />
                        <button className="button" style={{ padding: '10px 20px' }}
                          onClick={async () => {
                            try {
                              await doAction('/api/admin/settings', 'PUT', { announcement: settings.announcement || '' });
                              alert('Announcement saved!');
                            } catch (err) { alert(err.message); }
                          }}>
                          Save Announcement
                        </button>
                      </div>
                    </div>
                  </>
                )}

              </>)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* MODALS */}
      <ConfirmModal open={!!confirm} title={confirm?.title} message={confirm?.message} onConfirm={confirm?.onConfirm} onCancel={() => setConfirm(null)} />
      <DetailModal open={!!detail} title={detail?.title} data={detail?.data} onClose={() => setDetail(null)} />
    </AdminProtectedRoute>
  );
}
