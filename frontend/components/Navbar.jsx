'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';

export default function Navbar() {
  const { user, admin, logoutUser, logoutAdmin } = useAppContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setDropdownOpen(false); }, [pathname]);

  const handleLogout = () => {
    logoutUser?.();
    logoutAdmin?.();
    setDropdownOpen(false);
    router.push('/');
  };

  const navLinks = [
    { href: '/rooms', label: 'Listings' },
    { href: '/agent', label: 'Become Agent' },
  ];

  const initial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <nav
      className="navbar"
      style={{
        background: scrolled ? 'rgba(15,23,42,0.97)' : 'rgba(15,23,42,0.85)',
        borderBottomColor: scrolled ? 'rgba(255,255,255,0.08)' : 'transparent',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="container nav-content">
        {/* LOGO */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '800', fontSize: '1rem', color: '#fff',
            boxShadow: 'var(--shadow-primary)',
          }}>F</div>
          <span style={{ fontWeight: '800', fontSize: '1.2rem', letterSpacing: '-0.04em' }}>
            Find<span className="text-gradient">H</span>
          </span>
        </Link>

        {/* NAV LINKS */}
        <div className="nav-links" style={{ gap: '4px' }}>
          {navLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={`nav-link${isActive ? ' active' : ''}`}>
                {link.label}
              </Link>
            );
          })}

          {!user && !admin && (
            <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
              <Link href="/login" className="btn-ghost button" style={{ padding: '8px 18px', fontSize: '0.875rem' }}>Sign In</Link>
              <Link href="/signup" className="button" style={{ padding: '8px 18px', fontSize: '0.875rem' }}>Get Started</Link>
            </div>
          )}

          {admin && (
            <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
              <Link href="/admin/dashboard" className="button" style={{ padding: '8px 16px', fontSize: '0.875rem', background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>Admin Panel</Link>
              <button onClick={handleLogout} className="btn-ghost button" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Sign Out</button>
            </div>
          )}

          {/* PROFILE AVATAR DROPDOWN */}
          {user && !admin && (
            <div ref={dropRef} style={{ position: 'relative', marginLeft: '8px' }}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  boxShadow: 'none', transform: 'none',
                }}
              >
                <div className="avatar" style={{ boxShadow: dropdownOpen ? '0 0 0 3px var(--primary)' : '0 0 0 2px rgba(99,102,241,0.3)', transition: 'var(--transition)' }}>
                  {initial}
                </div>
                <div style={{ textAlign: 'left', display: 'none' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text)' }}>{user.name || 'User'}</div>
                  {user.user_code && <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: '700' }}>{user.user_code}</div>}
                </div>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--text-muted)', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
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
                      width: '220px', zIndex: 200,
                      background: 'rgba(15,23,42,0.98)',
                      backdropFilter: 'blur(24px)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '14px',
                      boxShadow: 'var(--shadow-lg)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* User Header */}
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '0.875rem' }}>{initial}</div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{user.name || user.email}</div>
                          {user.user_code && <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: '700', marginTop: '1px' }}>{user.user_code}</div>}
                        </div>
                      </div>
                    </div>

                    {/* Links */}
                    <div style={{ padding: '8px' }}>
                      {[
                        { href: '/profile', icon: '👤', label: 'My Profile' },
                        { href: '/profile?tab=rooms', icon: '🏠', label: 'My Rooms' },
                        { href: '/profile?tab=requests', icon: '📋', label: 'Requests' },
                        { href: '/profile?tab=earnings', icon: '💰', label: 'Earnings' },
                        { href: '/profile?tab=settings', icon: '⚙️', label: 'Settings' },
                      ].map(({ href, icon, label }) => (
                        <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500', transition: 'var(--transition)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <span style={{ fontSize: '1rem', width: '20px' }}>{icon}</span>
                          {label}
                        </Link>
                      ))}
                    </div>

                    <div style={{ padding: '8px', borderTop: '1px solid var(--glass-border)' }}>
                      <button onClick={handleLogout} style={{
                        width: '100%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                        color: 'var(--danger)', padding: '9px 12px', borderRadius: '8px', fontSize: '0.875rem',
                        fontWeight: '600', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                        boxShadow: 'none',
                      }}>
                        <span style={{ fontSize: '1rem', width: '20px' }}>🚪</span>
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
