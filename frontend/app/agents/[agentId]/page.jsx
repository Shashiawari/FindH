'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import { ProtectedImage } from '../../../hooks/useSignedUrl'; // <-- ADDED

export default function AgentDetails({ params }) {
  const unwrappedParams = React.use(params);
  const { agentId } = unwrappedParams;
  const searchParams = useSearchParams();
  const listingId = searchParams.get('listingId');
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ totalReviews: 0, averageRating: 0 });
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const router = useRouter();
  const { token } = useAppContext();

  useEffect(() => {
    fetchAgent();
    fetchReviews();
  }, [agentId]);

  const fetchAgent = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/agents/${agentId}`);
      if (res.ok) setAgent(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/reviews/${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
        setReviewStats({ totalReviews: data.totalReviews, averageRating: data.averageRating });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setReviewError('');
    try {
      const res = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ agentId, ...newReview })
      });
      const data = await res.json();
      if (res.ok) {
        setNewReview({ rating: 5, comment: '' });
        fetchReviews();
      } else {
        setReviewError(data.message);
      }
    } catch (err) {
      setReviewError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', paddingTop: '60px' }}><div className="badge badge-primary">Loading agent details...</div></div>;
  if (!agent) return <div className="container" style={{ textAlign: 'center', paddingTop: '60px' }}><h2>Agent not found</h2></div>;

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom:'60px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '500', marginBottom: '24px', fontSize: '1rem' }}>
        &larr; Back
      </button>

      {/* Agent Header */}
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        {agent.verifiedBadge && (
          <div style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}>
            ✔ Identity Confirmed
          </div>
        )}

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', background: 'var(--surface)', flexShrink: 0 }}>
            {agent.selfie ? (
               // Render protected internal file path 
              <ProtectedImage path={agent.selfie} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>👤</div>
            )}
          </div>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem' }}>{agent.name}</h1>
            <span className={agent.agentType === 'Professional' ? 'badge badge-primary' : 'badge badge-accent'} style={{ marginRight: '8px' }}>{agent.agentType}</span>
            <p style={{ color: 'var(--text-muted)', margin: '8px 0 0 0' }}>📍 {agent.city}, {agent.country}</p>
          </div>
        </div>
      </div>

      {/* Rating Summary */}
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            {reviewStats.averageRating > 0 ? reviewStats.averageRating : '—'}
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', color: '#f59e0b' }}>
              {'★'.repeat(Math.round(reviewStats.averageRating))}{'☆'.repeat(5 - Math.round(reviewStats.averageRating))}
            </div>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Contact */}
      {token && (
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px' }}>Contact</h3>
          <p>📧 {agent.email}</p>
          <p>📞 {agent.phone}</p>
          <button onClick={() => router.push(`/book-agent/${agentId}${listingId ? `?listingId=${listingId}` : ''}`)} className="button" style={{ width: '100%', marginTop: '16px' }}>
            Book This Agent
          </button>
        </div>
      )}

      {/* Write Review */}
      {token && (
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Write a Review</h3>
          <form onSubmit={handleSubmitReview}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Rating</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button"
                    onClick={() => setNewReview({ ...newReview, rating: star })}
                    style={{ background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: star <= newReview.rating ? '#f59e0b' : '#555' }}>
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <textarea
                rows={3}
                placeholder="Share your experience..."
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', resize: 'vertical' }}
              />
            </div>
            {reviewError && <p style={{ color: '#ef4444', marginBottom: '8px' }}>{reviewError}</p>}
            <button type="submit" className="button" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      )}

      {/* Reviews List */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '16px' }}>Reviews</h3>
        {reviews.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No reviews yet. Be the first!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map(review => (
              <div key={review._id} style={{ padding: '16px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: '#f59e0b', fontSize: '1rem' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ margin: 0 }}>{review.comment}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{review.user?.email}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
