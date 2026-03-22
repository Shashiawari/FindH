'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import AnimatedBackground from '../../components/AnimatedBackground';
import API_URL from '../../lib/api.js';

export default function ContactPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [statusMsg, setStatusMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message })
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setStatusMsg(data.message || 'Query submitted successfully!');
        setEmail('');
        setMessage('');
      } else {
        setStatus('error');
        setStatusMsg(data.message || 'Something went wrong.');
      }
    } catch (err) {
      setStatus('error');
      setStatusMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '80px', position: 'relative', zIndex: 1 }}>
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: 'center', marginBottom: '48px' }}
      >
        <div className="badge badge-primary" style={{ marginBottom: '12px' }}>Get in Touch</div>
        <h1>
          Contact <span className="text-gradient">Us</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '550px', margin: '12px auto 0' }}>
          Have a question or need help? Send us a message and we'll get back to you as soon as possible.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        style={{ maxWidth: '560px', margin: '0 auto' }}
      >
        <div className="glass-card">
          {/* Status Messages */}
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="alert alert-success"
              style={{ marginBottom: '24px' }}
            >
              <span>Success: </span> {statusMsg}
            </motion.div>
          )}
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="alert alert-danger"
              style={{ marginBottom: '24px' }}
            >
              <span>Error: </span> {statusMsg}
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Your Message</label>
              <textarea
                rows={5}
                placeholder="Tell us what's on your mind..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                minLength={10}
                style={{ resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="button"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" /> Sending...
                </>
              ) : (
                '📨 Send Message'
              )}
            </button>
          </form>
        </div>

        <div style={{
          marginTop: '32px', textAlign: 'center', color: 'var(--text-muted)',
          fontSize: '0.9rem', lineHeight: '1.8'
        }}>
          <p>support@findh.com</p>
          <p>We typically respond within 24 hours.</p>
        </div>
      </motion.div>
    </div>
  );
}
