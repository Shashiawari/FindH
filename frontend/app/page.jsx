"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground';

/* ═══════ SVG Icons ═══════ */
const MapPinIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);
const ZapIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
};

export default function Home() {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '10vh', position: 'relative', zIndex: 1 }}>
      <AnimatedBackground />
      
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeInUp} className="badge badge-primary" style={{ marginBottom: '24px' }}>
          Revolutionizing Rental Matching
        </motion.div>
        
        <motion.h1 variants={fadeInUp}>
          Find Your Perfect <span className="text-gradient">Match</span>
        </motion.h1>
        
        <motion.p variants={fadeInUp} style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 40px auto' }}>
          Connect with geo-located rental agents or list your property seamlessly. Experience a new era of renting.
        </motion.p>
        
        <motion.div variants={fadeInUp} style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/rooms" className="button" style={{ padding: '14px 32px', fontSize: '1rem' }}>
            Browse Rooms
          </Link>
          <Link href="/upload" className="button secondary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
            Post a Room
          </Link>
        </motion.div>
      </motion.div>

      <motion.div 
        className="grid grid-cols-3" 
        style={{ marginTop: '80px' }}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeInUp} className="card" style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}><MapPinIcon /></div>
          <h3 style={{ marginBottom: '12px' }}>Geo-Location Matching</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>Automatically find agents and rooms within a 5km radius of your desired location using powerful spatial queries.</p>
        </motion.div>
        <motion.div variants={fadeInUp} className="card" style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}><ShieldIcon /></div>
          <h3 style={{ marginBottom: '12px' }}>Verified Agents</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>All agents go through a rigorous KYC process with Government ID or University certification.</p>
        </motion.div>
        <motion.div variants={fadeInUp} className="card" style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}><ZapIcon /></div>
          <h3 style={{ marginBottom: '12px' }}>Instant Connections</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>Say goodbye to endless browsing. Get matched with the right people instantly based on your exact credentials.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
