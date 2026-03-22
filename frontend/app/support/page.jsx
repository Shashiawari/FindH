'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import AnimatedBackground from '../../components/AnimatedBackground';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAppContext } from '../../context/AppContext';
import API_URL from '../../lib/api.js';

const CATEGORIES = ['Payment', 'Booking', 'Account', 'Other'];

function SupportInner() {
  const { token } = useAppContext();
  const router = useRouter();

  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  useEffect(() => {
    fetchMyTickets();
  }, [token]);

  const fetchMyTickets = async () => {
    if (!token) return;
    setTicketsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/support/my-tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`${API_URL}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ category, subject, message })
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setStatusMsg(data.message || 'Ticket submitted!');
        setCategory('');
        setSubject('');
        setMessage('');
        fetchMyTickets();
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

  const getStatusBadge = (s) => {
    switch (s) {
      case 'open': return <span className="badge badge-warning">Open</span>;
      case 'in_progress': return <span className="badge badge-primary">In Progress</span>;
      case 'resolved': return <span className="badge badge-success">Resolved</span>;
      case 'closed': return <span className="badge badge-muted">Closed</span>;
      default: return <span className="badge badge-muted">{s}</span>;
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
        <div className="badge badge-primary" style={{ marginBottom: '12px' }}>Support Center</div>
        <h1>
          Need <span className="text-gradient">Help?</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '550px', margin: '12px auto 0' }}>
          Facing an issue with payments, bookings, or your account? Submit a support ticket and our team will assist you.
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Submit Ticket Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="glass-card">
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Submit a Ticket
            </h3>

            {status === 'success' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="alert alert-success" style={{ marginBottom: '16px' }}>
                <span>Success: </span> {statusMsg}
              </motion.div>
            )}
            {status === 'error' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="alert alert-danger" style={{ marginBottom: '16px' }}>
                <span>Error: </span> {statusMsg}
              </motion.div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                  <option value="">Select a category...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  placeholder="Brief description of the issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  minLength={5}
                />
              </div>

              <div className="form-group">
                <label>Describe Your Issue</label>
                <textarea
                  rows={4}
                  placeholder="Please provide as much detail as possible..."
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
                style={{ width: '100%', padding: '14px' }}
              >
                {loading ? (
                  <><span className="btn-spinner" /> Submitting...</>
                ) : (
                  '📩 Submit Ticket'
                )}
              </button>
            </form>
          </div>
        </motion.div>

        {/* My Tickets */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="glass-card" style={{ maxHeight: '600px', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              My Tickets
            </h3>

            {ticketsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '10px' }} />)}
              </div>
            ) : tickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                <p>No tickets yet. Submit one if you need help!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tickets.map(ticket => (
                  <div key={ticket.id} style={{
                    padding: '16px', borderRadius: '10px', background: 'var(--surface-2)',
                    border: '1px solid var(--border)', transition: 'var(--transition)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <span className="badge badge-accent" style={{ marginRight: '6px', fontSize: '0.7rem' }}>{ticket.category}</span>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '4px' }}>{ticket.subject}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                      {ticket.message.length > 100 ? ticket.message.substring(0, 100) + '...' : ticket.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <ProtectedRoute>
      <SupportInner />
    </ProtectedRoute>
  );
}
