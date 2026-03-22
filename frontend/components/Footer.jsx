'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on admin pages
  if (pathname?.startsWith('/admin')) return null;

  return (
    <footer style={{
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      position: 'relative',
      overflow: 'hidden',
      zIndex: 10,
    }}>
      {/* Gradient accent line */}
      <div style={{
        height: '3px',
        background: 'linear-gradient(90deg, var(--primary), var(--secondary), var(--accent))',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
      }} />

      <div className="container" style={{
        padding: '48px 24px 32px',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr',
        gap: '40px',
        alignItems: 'start',
      }}>
        {/* Brand Column */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '800', fontSize: '0.85rem', color: '#fff',
            }}>F</div>
            <span style={{ fontWeight: '800', fontSize: '1.1rem', letterSpacing: '-0.03em', color: 'var(--text)' }}>
              Find<span className="text-gradient">H</span>
            </span>
          </div>
          <p style={{
            color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.7', maxWidth: '280px',
          }}>
            Geo-location based rental matching connecting tenants with verified local agents for a secure renting experience.
          </p>

          {/* Social Icons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            {[
              { label: '𝕏', href: '#', title: 'Twitter / X' },
              { label: 'in', href: '#', title: 'LinkedIn' },
              { label: '◻', href: '#', title: 'GitHub' },
            ].map((social, i) => (
              <a key={i} href={social.href} title={social.title} style={{
                width: '34px', height: '34px', borderRadius: '8px',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)',
                transition: 'var(--transition)', textDecoration: 'none',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>

        {/* Platform Links */}
        <div>
          <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '16px' }}>
            Platform
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { href: '/rooms', label: 'Browse Listings' },
              { href: '/upload', label: 'Post a Room' },
              { href: '/agent', label: 'Become an Agent' },
            ].map(link => (
              <Link key={link.href} href={link.href} style={{
                color: 'var(--text-muted)', fontSize: '0.88rem', transition: 'var(--transition)',
                textDecoration: 'none',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Company Links */}
        <div>
          <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '16px' }}>
            Company
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { href: '/about', label: 'About Us' },
              { href: '/contact', label: 'Contact' },
              { href: '/support', label: 'Need Help' },
            ].map(link => (
              <Link key={link.href} href={link.href} style={{
                color: 'var(--text-muted)', fontSize: '0.88rem', transition: 'var(--transition)',
                textDecoration: 'none',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Support Links */}
        <div>
          <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '16px' }}>
            Legal
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { href: '#', label: 'Privacy Policy' },
              { href: '#', label: 'Terms of Service' },
            ].map((link, i) => (
              <a key={i} href={link.href} style={{
                color: 'var(--text-muted)', fontSize: '0.88rem', transition: 'var(--transition)',
                textDecoration: 'none',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '18px 24px',
        textAlign: 'center',
        fontSize: '0.82rem',
        color: 'var(--text-faint)',
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span>© {new Date().getFullYear()} FindH. All rights reserved.</span>
          <span>Built for better rentals</span>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          footer > div:first-of-type + div {
            grid-template-columns: 1fr 1fr !important;
            gap: 28px !important;
          }
        }
        @media (max-width: 480px) {
          footer > div:first-of-type + div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
