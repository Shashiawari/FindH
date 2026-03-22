'use client';

import API_URL from '../lib/api.js';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { useAppContext } from '../context/AppContext';

/* ═══════════════════════════════════════════════
   SVG ICON COMPONENTS
═══════════════════════════════════════════════ */
const Icon = ({ children, size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    {children}
  </svg>
);

const UserIcon = (props) => (
  <Icon {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>
);
const LogOutIcon = (props) => (
  <Icon {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Icon>
);
const InfoIcon = (props) => (
  <Icon {...props}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></Icon>
);
const MailIcon = (props) => (
  <Icon {...props}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></Icon>
);
const ShieldIcon = (props) => (
  <Icon {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Icon>
);
const ChevronDown = (props) => (
  <Icon size={14} {...props}><path d="M6 9l6 6 6-6"/></Icon>
);
const BellIcon = (props) => (
  <Icon {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Icon>
);
const TrashIcon = (props) => (
  <Icon size={15} {...props}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </Icon>
);

export default function Navbar() {
  const {
    user,
    adminUser: admin,
    logoutUser,
    logoutAdmin,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    deleteNotification,
    liveToast,
    clearLiveToast
  } = useAppContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [agentStatus, setAgentStatus] = useState(null);
  const dropRef = useRef(null);
  const notificationRef = useRef(null);
  const mobileNotificationRef = useRef(null);
  const notificationPanelRef = useRef(null);
  const navRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!navRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(navRef.current, { y: -22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false);
      const insideDesktopTrigger = notificationRef.current && notificationRef.current.contains(e.target);
      const insideMobileTrigger = mobileNotificationRef.current && mobileNotificationRef.current.contains(e.target);
      const insidePanel = notificationPanelRef.current && notificationPanelRef.current.contains(e.target);
      if (!insideDesktopTrigger && !insideMobileTrigger && !insidePanel) setNotificationOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setDropdownOpen(false); setNotificationOpen(false); setMobileMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (!user) { setIsAgent(false); setAgentStatus(null); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d?.agent) { setIsAgent(true); setAgentStatus(d.agent.verification_status); } })
      .catch(() => {});
  }, [user]);

  const handleLogout = () => {
    logoutUser?.();
    logoutAdmin?.();
    setDropdownOpen(false);
    router.push('/');
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';

  const getNotificationRoute = (notification) => {
    const type = notification?.type;

    if ([
      'VERIFICATION_REQUEST',
      'VERIFICATION_ACCEPTED_BY_ME',
      'VERIFICATION_REQUEST_TAKEN',
      'VERIFICATION_REQUEST_REJECTED',
      'VERIFICATION_REUPLOAD'
    ].includes(type)) {
      return '/agent-dashboard';
    }

    if ([
      'VERIFICATION_REQUEST_SUBMITTED',
      'VERIFICATION_ACCEPTED',
      'VERIFICATION_IN_PROGRESS'
    ].includes(type)) {
      return '/profile';
    }

    if (type === 'VERIFICATION_VERIFIED') {
      return '/profile?tab=agentDocs';
    }

    return '/notifications';
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) return;
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
    }
    setNotificationOpen(false);
    router.push(getNotificationRoute(notification));
  };

  // Determine which links to show based on auth state
  const showBecomeAgent = user && !isAgent;
  const isLoggedOut = !user && !admin;
  const latestNotifications = notifications.slice(0, 3);

  return (
    <nav
      ref={navRef}
      className="navbar"
      style={{
        boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.06)' : '0 1px 0 #E5E7EB',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="container nav-content">
        {/* LOGO */}
        <Link href="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
          <div className="navbar-brand-mark">F</div>
          <span className="navbar-brand-text">
            Find<span className="text-gradient">H</span>
          </span>
        </Link>

        {/* MOBILE ACTIONS */}
        <div className="mobile-actions">
          {user && !admin && (
            <button
              ref={mobileNotificationRef}
              className="mobile-notification-btn nav-icon-button"
              onClick={() => setNotificationOpen(open => !open)}
              style={{ background: notificationOpen ? 'var(--surface-2)' : '#fff' }}
              aria-label="Open notifications"
            >
              <BellIcon size={17} />
              {unreadNotificationCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  borderRadius: '999px',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff'
                }}>
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>
          )}

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ color: 'var(--text)', background: 'none', border: 'none', boxShadow: 'none', transform: 'none' }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* ═══════ DESKTOP NAV ═══════ */}
        <div className="nav-links desktop-menu">
          {/* Always show Listings when user is logged in */}
          {user && (
            <Link href="/rooms" className={`nav-link${pathname === '/rooms' ? ' active' : ''}`}>Listings</Link>
          )}

          {!admin && (
            <>
              <Link href="/about" className={`nav-link${pathname === '/about' ? ' active' : ''}`}>
                About Us
              </Link>
              <Link href="/contact" className={`nav-link${pathname === '/contact' ? ' active' : ''}`}>
                Contact Us
              </Link>
            </>
          )}

          {/* Logged in, NOT an agent: show Become Agent */}
          {showBecomeAgent && (
            <Link href="/agent" className={`nav-link${pathname === '/agent' ? ' active' : ''}`}>Become Agent</Link>
          )}
          {user && isAgent && (
            <Link href="/agent-dashboard" className={`nav-link${pathname === '/agent-dashboard' ? ' active' : ''}`}>Agent Dashboard</Link>
          )}

          {/* Not logged in: Sign In / Get Started */}
          {isLoggedOut && (
            <div className="navbar-auth-group">
              <Link href="/login" className="navbar-auth-link">Log In</Link>
              <Link href="/signup" className="navbar-auth-pill">Sign Up</Link>
            </div>
          )}

          {/* Admin */}
          {admin && (
            <div className="navbar-auth-group">
              <Link href="/admin/dashboard" className="navbar-admin-pill">Admin Panel</Link>
              <button onClick={handleLogout} style={{
                padding: '8px 16px', fontSize: '0.875rem', background: 'transparent',
                border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '999px',
                cursor: 'pointer', fontWeight: '600', boxShadow: 'none',
              }}>Sign Out</button>
            </div>
          )}

          {/* ═══════ PROFILE DROPDOWN (Simplified) ═══════ */}
          {user && !admin && (
            <div className="navbar-user-area">
              <div ref={notificationRef} style={{ position: 'relative' }}>
                <button
                  className="nav-icon-button"
                  onClick={() => setNotificationOpen(open => !open)}
                  style={{ background: notificationOpen ? 'var(--surface-2)' : '#fff' }}
                >
                  <BellIcon size={18} />
                  {unreadNotificationCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 5px',
                      borderRadius: '999px',
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #fff'
                    }}>
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </span>
                  )}
                </button>
              </div>

              <div ref={dropRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="navbar-profile-trigger"
                >
                  <div className="avatar" style={{ boxShadow: dropdownOpen ? '0 0 0 3px rgba(99,102,241,0.35)' : '0 0 0 2px rgba(99,102,241,0.15)', transition: 'var(--transition)' }}>
                    {initial}
                  </div>
                  <div className="navbar-profile-meta">
                    <div className="navbar-profile-email">{user.email || 'User'}</div>
                    {user.user_code && <div className="navbar-profile-code">{user.user_code}</div>}
                  </div>
                  <ChevronDown style={{ color: 'var(--text-muted)', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      style={{
                        position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                        width: '240px', zIndex: 200,
                        background: '#FFFFFF',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        boxShadow: '0 20px 48px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* User Header */}
                      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '1rem', flexShrink: 0 }}>{initial}</div>
                          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {user.email}
                            </div>
                            {isAgent && (
                              <div style={{ marginTop: '4px' }}>
                                {agentStatus === 'Verified' ? (
                                  <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                                    <ShieldIcon size={11} style={{ marginRight: '2px' }} /> Verified Agent
                                  </span>
                                ) : (
                                  <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>Pending Agent</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Links — Only My Profile */}
                      <div style={{ padding: '8px' }}>
                        <Link href="/profile"
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500', transition: 'var(--transition)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <UserIcon size={16} style={{ flexShrink: 0 }} />
                          My Profile
                        </Link>
                      </div>

                      {/* Sign Out */}
                      <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
                        <button onClick={handleLogout} style={{
                          width: '100%', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
                          color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.875rem',
                          fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          boxShadow: 'none', transition: 'var(--transition)'
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; }}>
                          <LogOutIcon size={15} /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* ═══════ MOBILE MENU ═══════ */}
        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          {/* Not logged in: About + Contact only */}
          {isLoggedOut && (
            <>
              <Link href="/about" className={`nav-link${pathname === '/about' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>About Us</Link>
              <Link href="/contact" className={`nav-link${pathname === '/contact' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Contact Us</Link>
              <Link href="/login" className="nav-link" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-muted)' }}>Sign In</Link>
              <Link href="/signup" className="nav-link" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--primary)', fontWeight: '700' }}>Get Started</Link>
            </>
          )}

          {/* Logged in user */}
          {user && !admin && (
            <>
              <Link href="/rooms" className={`nav-link${pathname === '/rooms' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Listings</Link>
              <Link href="/about" className={`nav-link${pathname === '/about' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>About Us</Link>
              <Link href="/contact" className={`nav-link${pathname === '/contact' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Contact Us</Link>
              {showBecomeAgent && (
                <Link href="/agent" className={`nav-link${pathname === '/agent' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Become Agent</Link>
              )}
              {isAgent && (
                <Link href="/agent-dashboard" className={`nav-link${pathname === '/agent-dashboard' ? ' active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Agent Dashboard</Link>
              )}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', padding: '8px 14px', background: 'var(--surface-2)', borderRadius: '10px' }}>
                  <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>{initial}</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)' }}>{user.name || user.email || 'User'}</div>
                    {user.user_code && <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: '700' }}>{user.user_code}</div>}
                  </div>
                </div>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)}
                  className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <UserIcon size={16} /> My Profile
                </Link>
                <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', boxShadow: 'none' }}>
                  <LogOutIcon size={15} /> Sign Out
                </button>
              </div>
            </>
          )}

          {/* Admin */}
          {admin && (
            <>
              <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} style={{ color: '#d97706', fontWeight: '700', padding: '8px 14px', borderRadius: '8px', background: 'rgba(245,158,11,0.08)' }}>Admin Panel</Link>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', boxShadow: 'none', color: 'var(--danger)', fontWeight: '600', textAlign: 'left', padding: '8px 14px' }}>Sign Out</button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {notificationOpen && user && !admin && (
          <motion.div
            ref={notificationPanelRef}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '74px',
              right: '16px',
              width: 'min(340px, calc(100vw - 24px))',
              maxHeight: 'calc(100vh - 100px)',
              overflowY: 'auto',
              zIndex: 420,
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              boxShadow: '0 20px 48px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)'
            }}
            className="notification-popover"
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Notifications</span>
              <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>{unreadNotificationCount} unread</span>
            </div>

            {notifications.length === 0 ? (
              <div style={{ padding: '18px 16px', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                No notifications yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', padding: '10px' }}>
                {latestNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item${notification.is_read ? '' : ' unread'}`}
                    style={{
                      marginBottom: '10px'
                    }}
                  >
                    <div className="notification-item-row">
                      <div
                        className="notification-item-main"
                        onClick={() => handleNotificationClick(notification)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleNotificationClick(notification);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        style={{
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'inherit',
                          padding: 0,
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        <div className="notification-item-head">
                          <span style={{ fontSize: '0.95rem', color: 'var(--text)', fontWeight: '700', lineHeight: '1.35' }}>
                            {notification.message}
                          </span>
                          <span style={{ fontSize: '0.73rem', color: 'var(--text-faint)', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {!notification.is_read && (
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                          )}
                          <span className="notification-message" style={{ fontSize: '0.82rem', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                            Tap to open this update
                          </span>
                        </div>
                      </div>
                      <button
                        className="notification-delete"
                        onClick={() => deleteNotification(notification.id)}
                        aria-label="Delete notification"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {notifications.length > 0 && (
              <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', background: '#fff' }}>
                <Link
                  href="/notifications"
                  onClick={() => setNotificationOpen(false)}
                  className="button secondary"
                  style={{ width: '100%', justifyContent: 'center', padding: '9px 14px', fontSize: '0.84rem' }}
                >
                  View All Notifications
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {liveToast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              right: '20px',
              bottom: '20px',
              maxWidth: '340px',
              zIndex: 450,
              background: '#111827',
              color: '#fff',
              borderRadius: '12px',
              padding: '12px 14px',
              boxShadow: '0 18px 36px rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ fontSize: '0.84rem', lineHeight: '1.4' }}>{liveToast.message}</div>
              <button
                onClick={clearLiveToast}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: 0,
                  boxShadow: 'none',
                  transform: 'none'
                }}
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
