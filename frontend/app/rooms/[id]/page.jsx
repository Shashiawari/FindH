'use client';

import API_URL from '../../../lib/api.js';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '../../../context/AppContext';

/* ═══════ SVG Icons ═══════ */
const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const ImageIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
  </svg>
);
const ParkingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>
  </svg>
);
const VerifiedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);

export default function RoomDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { token, latestVerificationEvent, user } = useAppContext();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [verificationRequest, setVerificationRequest] = useState(null);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/^room-images\//, '').replace(/^property-images\//, '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://segrvvwuryibbfvnrwvx.supabase.co';
    return `${supabaseUrl}/storage/v1/object/public/room-images/${cleanPath}`;
  };

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const roomRes = await fetch(`${API_URL}/api/tenants/${id}`);
        const roomData = roomRes.ok ? await roomRes.json() : null;
        setRoom(roomData);
      } catch (err) {
        console.error('RoomDetails error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  useEffect(() => {
    if (!id || !token) {
      setVerificationRequest(null);
      return;
    }

    const fetchVerificationRequest = async () => {
      try {
        const res = await fetch(`${API_URL}/api/verification/my-requests?listingId=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) return;

        const data = await res.json();
        const request = Array.isArray(data) && data.length > 0 ? data[0] : null;
        setVerificationRequest(request);
      } catch (error) {
        console.error('Failed to load verification request', error);
      }
    };

    fetchVerificationRequest();
  }, [id, token]);

  useEffect(() => {
    const payload = latestVerificationEvent?.payload;
    if (!payload) return;

    setVerificationRequest(prev => {
      if (!prev) return prev;
      if (payload.listingId && payload.listingId !== id) return prev;
      if (payload.bookingId && prev.bookingId && payload.bookingId !== prev.bookingId) return prev;

      const nextStatus = payload.verificationStatus || prev.verificationStatus;
      const nextAssignedAgent = payload.assignedAgent || prev.assignedAgent;

      const sameStatus = nextStatus === prev.verificationStatus;
      const sameAssignedAgent = JSON.stringify(nextAssignedAgent || null) === JSON.stringify(prev.assignedAgent || null);

      if (sameStatus && sameAssignedAgent) return prev;

      return {
        ...prev,
        verificationStatus: nextStatus,
        assignedAgent: nextAssignedAgent
      };
    });
  }, [latestVerificationEvent, id]);

  if (loading) return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <div className="badge badge-primary" style={{ fontSize: '1rem', padding: '12px 24px' }}>Loading...</div>
    </div>
  );

  if (!room) return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <h2>Room not found</h2>
      <Link href="/rooms" className="button" style={{ marginTop: '16px' }}>Back to Listings</Link>
    </div>
  );

  const hasImages = room.images?.length > 0;
  const trackerSteps = ['pending', 'accepted', 'in_progress', 'verified'];
  const currentTrackerStatus = verificationRequest?.verificationStatus || null;
  const activeTrackerIndex = trackerSteps.indexOf(currentTrackerStatus);
  const hasActiveVerification = ['pending', 'accepted', 'in_progress'].includes(currentTrackerStatus);
  const currentUserId = user?.id || user?._id || null;
  const listingOwnerId = room?.tenantId || room?.tenant_id || null;
  const isOwner = Boolean(currentUserId && listingOwnerId && listingOwnerId === currentUserId);

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      <Link href="/rooms" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '28px', color: 'var(--primary)', fontWeight: '500' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back to Listings
      </Link>

      {/* ══════ MAIN CONTENT ══════ */}
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* TITLE */}
        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>{room.title}</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPinIcon /> {room.address1}, {room.city}, {room.country}
        </p>

        {/* PROPERTY ID — Responsive */}
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
          overflow: 'hidden', wordBreak: 'break-all'
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', flexShrink: 0 }}>Property ID:</span>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{room._id}</span>
        </div>

        {/* IMAGE CAROUSEL */}
        <div style={{ position: 'relative', width: '100%', height: '380px', marginBottom: '28px', overflow: 'hidden', borderRadius: '16px', background: '#1e293b' }}>
          {hasImages ? (
            <img
              key={room.images[currentImage]}
              src={getImageUrl(room.images[currentImage])}
              alt="Room"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '8px' }}>
              <ImageIcon />
              <span>No images uploaded</span>
            </div>
          )}
          {hasImages && currentImage > 0 && (
            <button onClick={() => setCurrentImage(i => i - 1)} style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: '22px', padding: '8px 14px', borderRadius: '50%', cursor: 'pointer' }}>&#8249;</button>
          )}
          {hasImages && currentImage < room.images.length - 1 && (
            <button onClick={() => setCurrentImage(i => i + 1)} style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: '22px', padding: '8px 14px', borderRadius: '50%', cursor: 'pointer' }}>&#8250;</button>
          )}
          {hasImages && (
            <div style={{ position: 'absolute', bottom: '12px', right: '14px', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem' }}>
              {currentImage + 1} / {room.images.length}
            </div>
          )}
        </div>

        {/* FINANCIALS */}
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Financials & Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '3px' }}>Cold Rent</p>
              <p style={{ fontSize: '1.4rem', fontWeight: '800' }}>${room.coldRent}<span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-muted)' }}>/mo</span></p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '3px' }}>Warm Rent</p>
              <p style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981' }}>${room.warmRent}<span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-muted)' }}>/mo</span></p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '3px' }}>Sharing</p>
              <p style={{ fontWeight: '600' }}>{room.personsSharing} Person(s)</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '3px' }}>Listed</p>
              <p style={{ fontWeight: '600' }}>{new Date(room.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          {room.rules && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '6px' }}>Rules & Amenities</p>
              <p style={{ fontSize: '0.95rem' }}>{room.rules}</p>
            </div>
          )}
          {room.parking && (
            <div className="badge badge-accent" style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ParkingIcon /> Parking Available
            </div>
          )}
        </div>

        {/* VERIFICATION STATUS TRACKER */}
        {verificationRequest && (
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '10px', fontSize: '1.05rem' }}>Your Verification Request</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Booking ID: {verificationRequest.bookingId}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '8px', marginBottom: '14px' }}>
              {trackerSteps.map((step, index) => {
                const done = activeTrackerIndex >= 0 && index <= activeTrackerIndex;
                const label = step === 'in_progress' ? 'In Progress' : step.charAt(0).toUpperCase() + step.slice(1);
                return (
                  <div key={step} style={{
                    padding: '10px 8px',
                    textAlign: 'center',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    background: done ? 'rgba(16,185,129,0.16)' : 'var(--surface-2)',
                    color: done ? '#10b981' : 'var(--text-muted)',
                    border: done ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border)'
                  }}>
                    {label}
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Current status: <strong style={{ color: 'var(--text)' }}>{(currentTrackerStatus || 'pending').replace('_', ' ').toUpperCase()}</strong>
            </div>

            {verificationRequest.assignedAgent && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#10b981' }}>
                Assigned agent: <strong>{verificationRequest.assignedAgent.name || verificationRequest.assignedAgent.email}</strong>
              </div>
            )}
          </div>
        )}

        {/* REQUEST VERIFICATION BUTTON */}
        <div className="glass-card" style={{
          textAlign: 'center', padding: '32px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.04))',
          border: '1.5px solid rgba(99,102,241,0.15)'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <ShieldIcon />
          </div>
          <h3 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>Request Property Verification</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', maxWidth: '420px', margin: '0 auto 20px', lineHeight: '1.5' }}>
            Request a physical verification by a local agent.<br/>
            The agent will visit the property and upload verification documents.<br/>
            Once approved, you will receive the verification report privately.
          </p>
          <button
            className="button"
            style={{ padding: '13px 32px', fontSize: '0.95rem' }}
            onClick={() => {
              if (!token) {
                alert('Please log in to request verification');
                router.push('/login');
                return;
              }
              if (hasActiveVerification || isOwner) {
                return;
              }
              router.push(`/verify-payment?propertyId=${room._id}&propertyName=${encodeURIComponent(room.title)}&ownerId=${listingOwnerId}`);
            }}
            disabled={hasActiveVerification || isOwner}
          >
            <ShieldIcon /> {isOwner ? 'Cannot Verify Own Listing' : hasActiveVerification ? 'Verification Request Active' : 'Request Verification'}
          </button>
        </div>

      </div>
    </div>
  );
}
