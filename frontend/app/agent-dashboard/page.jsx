'use client';

import API_URL from '../../lib/api.js';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import AnimatedBackground from '../../components/AnimatedBackground';

const TAB_CONFIG = [
  { id: 'requests', label: 'Incoming Requests' },
  { id: 'earnings', label: 'My Earnings' },
];

function AgentDashboardInner() {
  const { user, token } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'requests');
  const [profile, setProfile] = useState(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const agent = profile?.agent || null;
  const isVerifiedAgent = agent?.verification_status === 'Verified';
  const isPendingAgent = agent?.verification_status === 'Pending';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    let ignore = false;

    const loadProfile = async () => {
      setAccessLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/profile`, { headers });
        const data = await res.json();
        if (!ignore) setProfile(data);
      } catch {
        if (!ignore) setProfile({ user: null, agent: null });
      } finally {
        if (!ignore) setAccessLoading(false);
      }
    };

    loadProfile();
    return () => { ignore = true; };
  }, [token, router]);

  const fetchTab = useCallback(async (tab) => {
    if (!isVerifiedAgent || tabData[tab] !== undefined) return;

    setTabLoading(true);
    const endpointMap = {
      requests: '/api/verification/agent/requests',
      earnings: '/api/profile/earnings',
    };
    const ep = endpointMap[tab];
    if (!ep) {
      setTabLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}${ep}`, { headers });
      const data = await res.json();
      const safeData = tab === 'earnings' ? data : (Array.isArray(data) ? data : []);
      setTabData((prev) => ({ ...prev, [tab]: safeData }));
    } catch {
      setTabData((prev) => ({ ...prev, [tab]: tab === 'earnings' ? { totalEarnings: 0, verificationsCompleted: 0 } : [] }));
    } finally {
      setTabLoading(false);
    }
  }, [headers, isVerifiedAgent, tabData]);

  useEffect(() => {
    if (isVerifiedAgent) fetchTab(activeTab);
  }, [activeTab, isVerifiedAgent, fetchTab]);

  const displayUser = profile?.user || user;
  const initial = displayUser?.name?.charAt(0)?.toUpperCase() || displayUser?.email?.charAt(0)?.toUpperCase() || '?';

  if (accessLoading) {
    return (
      <div className="container" style={{ paddingBottom: '80px', position: 'relative', zIndex: 1 }}>
        <AnimatedBackground />
        <div style={{ display: 'grid', gap: '16px', paddingTop: '24px' }}>
          {[1, 2].map((item) => <div key={item} className="skeleton" style={{ height: '120px', borderRadius: '18px' }} />)}
        </div>
      </div>
    );
  }

  if (!isVerifiedAgent) {
    return (
      <div className="container" style={{ paddingBottom: '80px', position: 'relative', zIndex: 1 }}>
        <AnimatedBackground />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center', padding: '40px 32px' }}
        >
          <div className={`badge ${isPendingAgent ? 'badge-warning' : 'badge-primary'}`} style={{ marginBottom: '16px' }}>
            {isPendingAgent ? 'Application Pending' : 'Agent Access'}
          </div>
          <h1 style={{ marginBottom: '10px' }}>
            {isPendingAgent ? 'Your agent application is under review' : 'Become an Agent'}
          </h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '620px', margin: '0 auto 28px' }}>
            {isPendingAgent
              ? 'We have your documents. Once an admin approves the application, this dashboard will unlock automatically.'
              : 'Only verified agents can access requests and earnings. Submit your application to join the verification network.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {!isPendingAgent && <Link href="/agent" className="button">Become an Agent</Link>}
            <Link href="/profile" className="button secondary">Go to Profile</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '80px', position: 'relative', zIndex: 1 }}>
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card"
        style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}
      >
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: '700', color: '#fff', flexShrink: 0, boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
          {initial}
        </div>
        <div>
          <div className="badge badge-success" style={{ marginBottom: '8px' }}>Verified Agent</div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>{displayUser?.name || 'Agent Dashboard'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)' }}>{displayUser?.email}</span>
            {displayUser?.user_code && <span className="badge badge-primary" style={{ padding: '4px 12px' }}>ID: {displayUser.user_code}</span>}
          </div>
        </div>
      </motion.div>

      <div className="tab-list" style={{ marginBottom: '28px' }}>
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
              {[1, 2].map((item) => <div key={item} className="skeleton" style={{ height: '100px', borderRadius: '14px' }} />)}
            </div>
          ) : (
            <>
              {activeTab === 'requests' && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '6px' }}>Verification Requests</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      Incoming verification requests assigned nearby, plus your active upload flow.
                    </p>
                  </div>
                  {(tabData.requests || []).length === 0 ? (
                    <EmptyState title="No requests available" sub="There are no nearby verification requests right now." />
                  ) : (
                    <div style={{ display: 'grid', gap: '14px' }}>
                      {(tabData.requests || []).map((req, i) => {
                        const isMine = req.requestStatus === 'accepted';
                        const isAvailable = req.requestStatus === 'pending' && !req.alreadyTakenByAnotherAgent;
                        const isTaken = req.requestStatus === 'pending' && req.alreadyTakenByAnotherAgent;
                        const isRejected = req.requestStatus === 'rejected';

                        if (isRejected && !isMine) return null;

                        return (
                          <motion.div key={req.bookingId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: '220px' }}>
                                <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', background: isMine ? 'rgba(16, 185, 129, 0.1)' : isTaken ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)', color: isMine ? '#10b981' : isTaken ? '#ef4444' : '#6366f1' }}>
                                  {isMine ? 'Assigned to You' : isTaken ? 'Taken by Another Agent' : 'Available'}
                                </div>
                                <h4 style={{ marginBottom: '4px', fontSize: '1.1rem' }}>{req.propertyTitle}</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, marginBottom: '8px' }}>{req.location}</p>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                                  <strong>Tenant:</strong> {req.tenant?.name || 'User'} ({req.tenant?.email})
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {isMine ? (
                                  req.verificationStatus === 'accepted' || req.verificationStatus === 'pending' ? (
                                    <Link href={`/profile/upload-docs/${req.bookingId}`} className="button" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Upload Documents</Link>
                                  ) : req.verificationStatus === 'in_progress' ? (
                                    <span style={{ fontSize: '0.85rem', color: 'var(--warning)', fontWeight: '600' }}>Documents Under Review</span>
                                  ) : req.verificationStatus === 'verified' ? (
                                    <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: '600' }}>Verification Complete</span>
                                  ) : (
                                    <span className="badge badge-muted">{req.verificationStatus}</span>
                                  )
                                ) : isAvailable ? (
                                  <button
                                    onClick={async () => {
                                      try {
                                        const r = await fetch(`${API_URL}/api/verification/agent/requests/${req.bookingId}/accept`, { method: 'POST', headers });
                                        const d = await r.json();
                                        if (d.message) alert(d.message);
                                        setTabData((prev) => ({ ...prev, requests: undefined }));
                                        setActiveTab('requests');
                                      } catch {
                                        alert('Failed to accept request');
                                      }
                                    }}
                                    className="button"
                                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                  >
                                    Accept
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Unavailable</span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'earnings' && (
                <div className="glass-card">
                  <h3 style={{ marginBottom: '24px' }}>Agent Earnings</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    <div style={{ background: 'var(--surface-2)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Total Earnings</p>
                      <h2 style={{ fontSize: '2.5rem', color: 'var(--accent)' }}>${(tabData.earnings?.totalEarnings || 0).toFixed(2)}</h2>
                    </div>
                    <div style={{ background: 'var(--surface-2)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Completed Jobs</p>
                      <h2 style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>{tabData.earnings?.verificationsCompleted || 0}</h2>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ title, sub }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ textAlign: 'center', padding: '60px 40px', background: 'var(--surface)', borderRadius: '18px', border: '1px solid var(--border)' }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '14px', color: 'var(--text-faint)' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
      </div>
      <h3 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{sub}</p>
    </motion.div>
  );
}

export default function AgentDashboard() {
  return (
    <Suspense fallback={<div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>Loading...</div>}>
      <AgentDashboardInner />
    </Suspense>
  );
}
