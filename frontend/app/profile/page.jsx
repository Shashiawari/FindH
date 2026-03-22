'use client';

import API_URL from '../../lib/api.js';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import AnimatedBackground from '../../components/AnimatedBackground';

const TAB_CONFIG = [
  { id: 'rooms', label: 'My Rooms' },
  { id: 'agentDocs', label: 'Agent Docs' },
  { id: 'settings', label: 'Settings' },
];

function ProfilePageInner() {
  const { user, token, logoutUser } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'rooms');
  const [profile, setProfile] = useState(null);
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    fetch(`${API_URL}/api/profile`, { headers })
      .then(r => r.json())
      .then(d => {
        setProfile(d);
        setSettings({
          name: d.user?.name || '',
          phone: d.user?.phone || '',
          date_of_birth: d.user?.date_of_birth ? d.user.date_of_birth.slice(0, 10) : '',
          postal_code: d.user?.postal_code || '',
          address1: d.user?.address1 || '',
          city: d.user?.city || '',
          state: d.user?.state || '',
          country: d.user?.country || '',
        });
      })
      .catch(console.error);
  }, [token]);

  const fetchTab = useCallback(async (tab) => {
    if (tabData[tab] !== undefined) return;
    setTabLoading(true);
    const endpointMap = {
      rooms: '/api/profile/rooms',
      agentDocs: '/api/bookings/agent-docs',
    };
    const ep = endpointMap[tab];
    if (!ep) { setTabLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}${ep}`, { headers });
      const data = await res.json();
      let safeData = Array.isArray(data) ? data : [];

      if (tab === 'agentDocs') {
        const groupedDocs = new Map();

        safeData.forEach((item) => {
          const existing = groupedDocs.get(item.bookingId) || {
            bookingId: item.bookingId,
            propertyName: item.propertyTitle || 'Property',
            propertyTitle: item.propertyTitle || 'Property',
            propertyCity: item.propertyCity || '',
            agentName: item.agentName || 'FindH Agent',
            agentEmail: item.agentEmail || '',
            verificationStatus: 'approved',
            ownership_proof: null,
            rental_agreement: null,
            electricity_bill: null,
            property_registration: null,
            docs: {},
            uploadedAt: item.uploadedAt || null
          };

          const normalizedKey = item.docName === 'Ownership Proof'
            ? 'ownership_proof'
            : item.docName === 'Rental Agreement'
              ? 'rental_agreement'
              : item.docName === 'Electricity Bill'
                ? 'electricity_bill'
                : item.docName === 'Property Registration'
                  ? 'property_registration'
                  : null;

          if (normalizedKey && item.docPath) {
            existing[normalizedKey] = item.docPath;
            existing.docs[normalizedKey] = item.docPath;
          }

          groupedDocs.set(item.bookingId, existing);
        });

        safeData = Array.from(groupedDocs.values());
      }

      setTabData(p => ({ ...p, [tab]: safeData }));
    } catch { setTabData(p => ({ ...p, [tab]: [] })); }
    finally { setTabLoading(false); }
  }, [tabData, token]);

  const openOrDownloadDoc = async (path, download = false) => {
    if (!path) return;
    try {
      const res = await fetch(`${API_URL}/api/files/${encodeURIComponent(path)}`, { headers });
      const { signedUrl } = await res.json();
      if (download) {
        const a = document.createElement('a');
        a.href = signedUrl;
        a.download = path.split('/').pop();
        a.click();
      } else {
        window.open(signedUrl, '_blank');
      }
    } catch { alert('Failed to access document'); }
  };

  useEffect(() => { fetchTab(activeTab); }, [activeTab]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveStatus('');
    try {
      const res = await fetch(`${API_URL}/api/profile/settings`, { method: 'PUT', headers, body: JSON.stringify(settings) });
      setSaveStatus(res.ok ? 'saved' : 'error');
    } catch { setSaveStatus('error'); }
    finally { setSavingSettings(false); setTimeout(() => setSaveStatus(''), 3000); }
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';
  const agentStatus = profile?.agent?.verification_status || null;

  const renderDocActions = (doc) => {
    const docs = [
      ['Ownership Proof', doc.ownership_proof || doc.docs?.ownership_proof],
      ['Rental Agreement', doc.rental_agreement || doc.docs?.rental_agreement],
      ['Electricity Bill', doc.electricity_bill || doc.docs?.electricity_bill],
      ['Property Registration', doc.property_registration || doc.docs?.property_registration],
    ].filter(([, path]) => Boolean(path));

    if (doc.verificationStatus === 'not_uploaded') {
      return <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No documents uploaded yet</span>;
    }

    if (doc.verificationStatus === 'pending' || doc.verificationStatus === 'in_progress') {
      return <span style={{ fontSize: '0.9rem', color: 'var(--warning)' }}>Under admin review</span>;
    }

    if (doc.verificationStatus === 'approved' && docs.length === 0) {
      return <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No documents uploaded yet</span>;
    }

    if (doc.verificationStatus === 'approved') {
      return (
        <div style={{ display: 'grid', gap: '10px' }}>
          {docs.map(([label, path]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: '600' }}>{label}</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => openOrDownloadDoc(path, false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.8rem', padding: '7px 12px', borderRadius: '8px', fontWeight: '600' }}>View</button>
                <button onClick={() => openOrDownloadDoc(path, true)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.8rem', padding: '7px 12px', borderRadius: '8px', fontWeight: '600' }}>Download</button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return <span style={{ fontSize: '0.9rem', color: 'var(--danger)' }}>Documents were rejected by admin</span>;
  };

  return (
    <div className="container" style={{ paddingBottom: '80px', position: 'relative', zIndex: 1 }}>
      <AnimatedBackground />
      {/* ── PROFILE HERO ── */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card" style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: '700', color: '#fff', flexShrink: 0, boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
          {initial}
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>{user?.name || 'User Profile'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)' }}>{user?.email}</span>
            {user?.user_code && <span className="badge badge-primary" style={{ padding: '4px 12px' }}>ID: {user.user_code}</span>}
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div className={`badge ${agentStatus === 'Verified' ? 'badge-success' : agentStatus === 'Pending' ? 'badge-warning' : 'badge-primary'}`} style={{ marginBottom: '10px' }}>
            {agentStatus === 'Verified' ? 'Verified Agent' : agentStatus === 'Pending' ? 'Agent Application Pending' : 'Become an Agent'}
          </div>
          <h3 style={{ marginBottom: '6px' }}>
            {agentStatus === 'Verified' ? 'Agent dashboard is now separate' : agentStatus === 'Pending' ? 'Your application is being reviewed' : 'Join the FindH agent network'}
          </h3>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            {agentStatus === 'Verified'
              ? 'Manage verification requests and earnings from the dedicated dashboard.'
              : agentStatus === 'Pending'
                ? 'Once approved, you will automatically gain access to the agent dashboard.'
                : 'Submit your agent application to start receiving verification requests.'}
          </p>
        </div>
        <Link href={agentStatus ? '/agent-dashboard' : '/agent'} className="button">
          {agentStatus === 'Verified' ? 'Open Agent Dashboard' : agentStatus === 'Pending' ? 'View Agent Status' : 'Become an Agent'}
        </Link>
      </motion.div>

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
              {/* ── MY ROOMS ── */}
              {activeTab === 'rooms' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: 0 }}>My Listed Rooms</h3>
                    <Link href="/upload" className="button" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>+ New Listing</Link>
                  </div>
                  {(tabData.rooms || []).length === 0 ? (
                    <EmptyState title="No rooms listed" sub="Post your first room listing." cta={<Link href="/upload" className="button">Post a Room</Link>} />
                  ) : (
                    <div style={{ display: 'grid', gap: '14px' }}>
                      {(tabData.rooms || []).map((r, i) => (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div>
                              <h4 style={{ marginBottom: '4px' }}>{r.title}</h4>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>{r.city}, {r.country}</p>
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

              {/* Removed Requests Tab */}

              {/* ── AGENT DOCS ── */}
              {activeTab === 'agentDocs' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '6px' }}>Agent Uploaded Documents</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      Documents uploaded by agents for properties you have booked.
                    </p>
                  </div>

                  {(tabData.agentDocs || []).length === 0 ? (
                    <EmptyState
                      title="No documents uploaded yet"
                      sub="Once you book a property and an agent uploads approved verification documents, they will appear here."
                    />
                  ) : (
                    <div style={{ display: 'grid', gap: '16px' }}>
                      {(tabData.agentDocs || []).map((doc, i) => (
                        <motion.div
                          key={doc.bookingId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          style={{ background: 'var(--surface)', borderRadius: '18px', border: '1px solid var(--border)', padding: '22px' }}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '18px' }}>
                            <div>
                              <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px' }}>Property</div>
                              <div style={{ fontWeight: '700', fontSize: '1rem' }}>{doc.propertyName || doc.propertyTitle || 'Property'}</div>
                              {doc.propertyCity && <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>{doc.propertyCity}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px' }}>Agent Name</div>
                              <div style={{ fontWeight: '700', fontSize: '1rem' }}>{doc.agentName || 'FindH Agent'}</div>
                              {doc.agentEmail && <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>{doc.agentEmail}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px' }}>Status</div>
                              <span className={`badge ${doc.verificationStatus === 'approved' ? 'badge-success' : doc.verificationStatus === 'pending' || doc.verificationStatus === 'in_progress' ? 'badge-warning' : doc.verificationStatus === 'rejected' ? 'badge-danger' : 'badge-muted'}`}>
                                {doc.verificationStatus === 'not_uploaded' ? 'Awaiting Upload' : doc.verificationStatus === 'in_progress' ? 'Under Review' : doc.verificationStatus.charAt(0).toUpperCase() + doc.verificationStatus.slice(1)}
                              </span>
                            </div>
                          </div>
                          {renderDocActions(doc)}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}


              {/* Removed Earnings Tab */}

              {activeTab === 'settings' && (
                <div className="glass-card" style={{ maxWidth: '640px' }}>
                  <h3 style={{ marginBottom: '24px' }}>Profile Settings</h3>
                  <form onSubmit={handleSaveSettings}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                      {/* Full Name — full width */}
                      <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                        <label>Full Name</label>
                        <input type="text" value={settings.name || ''} onChange={e => setSettings(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
                      </div>

                      {/* Phone + DOB */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Phone Number</label>
                        <input type="tel" value={settings.phone || ''} onChange={e => setSettings(p => ({ ...p, phone: e.target.value }))} placeholder="+1 234 567 890" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Date of Birth</label>
                        <input type="date" value={settings.date_of_birth || ''} onChange={e => setSettings(p => ({ ...p, date_of_birth: e.target.value }))} />
                      </div>

                      {/* Address — full width */}
                      <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                        <label>Street Address</label>
                        <input type="text" value={settings.address1 || ''} onChange={e => setSettings(p => ({ ...p, address1: e.target.value }))} placeholder="e.g. 12 Main Street" />
                      </div>

                      {/* City + State */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>City</label>
                        <input type="text" value={settings.city || ''} onChange={e => setSettings(p => ({ ...p, city: e.target.value }))} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>State / Province</label>
                        <input type="text" value={settings.state || ''} onChange={e => setSettings(p => ({ ...p, state: e.target.value }))} />
                      </div>

                      {/* Country + Postal Code */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Country</label>
                        <input type="text" value={settings.country || ''} onChange={e => setSettings(p => ({ ...p, country: e.target.value }))} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Postal Code</label>
                        <input type="text" value={settings.postal_code || ''} onChange={e => setSettings(p => ({ ...p, postal_code: e.target.value }))} placeholder="e.g. 10001" />
                      </div>

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
      <div style={{ fontSize: '2.5rem', marginBottom: '14px', color: 'var(--text-faint)' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      </div>
      <h3 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: cta ? '20px' : 0 }}>{sub}</p>
      {cta}
    </motion.div>
  );
}
export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>Loading...</div>}>
      <ProfilePageInner />
    </Suspense>
  );
}
