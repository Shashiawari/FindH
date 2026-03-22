'use client';

import { motion } from 'framer-motion';
import AnimatedBackground from '../../components/AnimatedBackground';
import Link from 'next/link';
import { useAppContext } from '../../context/AppContext';

const values = [
  {
    title: 'Transparency',
    desc: 'Every agent is KYC-verified. Every property document is admin-reviewed. No hidden surprises.'
  },
  {
    title: 'Location Intelligence',
    desc: 'Our geo-matching technology connects tenants with verified agents within their exact city and neighborhood.'
  },
  {
    icon: '🛡️',
    title: 'Trust & Safety',
    desc: 'Government ID verification, university credentials, and multi-layer document authentication protect every transaction.'
  },
  {
    icon: '⚡',
    title: 'Speed & Simplicity',
    desc: 'From posting a listing to booking an agent and getting verified documents — the entire process is streamlined.'
  }
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

export default function AboutPage() {
  const { user } = useAppContext();

  return (
    <div className="container" style={{ paddingBottom: '80px', position: 'relative', zIndex: 1 }}>
      <AnimatedBackground />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: 'center', marginBottom: '56px' }}
      >
        <div className="badge badge-primary" style={{ marginBottom: '12px' }}>About FindH</div>
        <h1>
          Redefining Rental <span className="text-gradient">Trust</span>
        </h1>
        <p style={{
          color: 'var(--text-muted)', fontSize: '1.15rem', maxWidth: '640px',
          margin: '16px auto 0', lineHeight: '1.7'
        }}>
          FindH is a geo-location based rental platform that bridges the gap between tenants and locally verified 
          agents — making the rental experience secure, transparent, and effortless.
        </p>
      </motion.div>

      {/* Mission Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        style={{ maxWidth: '800px', margin: '0 auto 56px' }}
      >
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🎯</div>
          <h2 style={{ marginBottom: '16px', fontSize: '1.6rem' }}>Our Mission</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.8', maxWidth: '600px', margin: '0 auto' }}>
            To eliminate uncertainty in the rental market by providing a platform where every property is physically
            verified by trusted, locally-based agents — empowering tenants with confidence and landlords with visibility.
          </p>
        </div>
      </motion.div>

      {/* How it Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        style={{ marginBottom: '56px' }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: '32px' }}>
          How <span className="text-gradient">It Works</span>
        </h2>
        <div className="grid grid-cols-4" style={{ maxWidth: '900px', margin: '0 auto' }}>
          {[
            { step: '1', title: 'List Your Property', desc: 'Tenants post their room with details, photos, and location.' },
            { step: '2', title: 'Match with Agents', desc: 'Our system finds verified agents in the same city automatically.' },
            { step: '3', title: 'Agent Verifies', desc: 'The agent visits the property and uploads verification documents.' },
            { step: '4', title: 'Admin Approved', desc: 'Documents are reviewed by admin. Tenants get verified, trusted info.' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="card"
              style={{ textAlign: 'center', padding: '28px 20px' }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                color: '#fff', fontWeight: '800', fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                {item.step}
              </div>
              <h4 style={{ marginBottom: '8px' }}>{item.title}</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.5' }}>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Values */}
      <div style={{ marginBottom: '56px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '32px' }}>
          Why <span className="text-gradient">Trust Us</span>
        </h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2"
          style={{ maxWidth: '800px', margin: '0 auto' }}
        >
          {values.map((v, i) => (
            <motion.div key={i} variants={itemVariants} className="card" style={{ padding: '28px' }}>
              <h3 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>{v.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.6' }}>{v.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        style={{
          textAlign: 'center', padding: '48px 32px', borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
          border: '1px solid rgba(99,102,241,0.15)'
        }}
      >
        <h2 style={{ marginBottom: '12px' }}>Ready to Get Started?</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '28px', maxWidth: '450px', margin: '0 auto 28px' }}>
          Join thousands of tenants and agents already using FindH to make renting safe and simple.
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/rooms" className="button" style={{ padding: '14px 32px' }}>Browse Listings</Link>
          {!user && (
            <Link href="/signup" className="button secondary" style={{ padding: '14px 32px' }}>Create Account</Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
