'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '../../../context/AppContext';

export default function RoomDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { token, user } = useAppContext();

  const [room, setRoom] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [myBooking, setMyBooking] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [roomRes, agentsRes] = await Promise.all([
          fetch(`http://localhost:5000/api/tenants/${id}`),
          fetch(`http://localhost:5000/api/agents/public/nearby/${id}`, { headers })
        ]);

        const roomData = roomRes.ok ? await roomRes.json() : null;
        const agentsData = agentsRes.ok ? await agentsRes.json() : [];

        setRoom(roomData);
        setAgents(Array.isArray(agentsData) ? agentsData : []);

        // Check ownership — the listing tenant_id is exposed in the response
        if (token && roomData) {
          // tenantController returns tenant_id (the user who posted)
          const listingOwnerId = roomData.tenantId;
          setIsOwner(listingOwnerId && user?._id && listingOwnerId === user._id);

          // Check if current user already booked this room
          const bkRes = await fetch(`http://localhost:5000/api/bookings/my-booking/${id}`, { headers });
          if (bkRes.ok) setMyBooking(await bkRes.json());
        }
      } catch (err) {
        console.error('RoomDetails error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  if (loading) return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <div className="badge badge-primary" style={{ fontSize: '1rem', padding: '12px 24px' }}>Loading...</div>
    </div>
  );

  if (!room) return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <h2>Room not found</h2>
      <Link href="/rooms" className="button" style={{ marginTop: '16px' }}>← All Rooms</Link>
    </div>
  );

  const hasPaidBooking = myBooking?.payment_status === 'Paid';
  const hasImages = room.images?.length > 0;

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      <Link href="/rooms" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '28px', color: 'var(--primary)', fontWeight: '500' }}>
        ← Back to Listings
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '40px', alignItems: 'start' }}>

        {/* ══════ LEFT ══════ */}
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>{room.title}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '24px' }}>
            📍 {room.address1}, {room.city}, {room.country}
          </p>

          {/* IMAGE CAROUSEL */}
          <div style={{ position: 'relative', width: '100%', height: '320px', marginBottom: '28px', overflow: 'hidden', borderRadius: '16px', background: '#1e293b' }}>
            {hasImages ? (
              <img
                key={room.images[currentImage]}
                src={room.images[currentImage]}
                alt="Room"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '8px' }}>
                <span style={{ fontSize: '2.5rem' }}>🏠</span>
                <span>No images uploaded</span>
              </div>
            )}
            {hasImages && currentImage > 0 && (
              <button onClick={() => setCurrentImage(i => i - 1)} style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: '22px', padding: '8px 14px', borderRadius: '50%', cursor: 'pointer' }}>‹</button>
            )}
            {hasImages && currentImage < room.images.length - 1 && (
              <button onClick={() => setCurrentImage(i => i + 1)} style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: '22px', padding: '8px 14px', borderRadius: '50%', cursor: 'pointer' }}>›</button>
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
            {room.parking && <div className="badge badge-accent" style={{ marginTop: '12px' }}>🅿️ Parking Available</div>}
          </div>

          {/* VERIFICATION SECTION — locked behind payment */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '12px' }}>🔒 Property Verification Documents</h3>
            {!token ? (
              <div style={{ padding: '24px', textAlign: 'center', borderRadius: '12px', background: 'rgba(124,58,237,0.06)', border: '1px dashed var(--primary)' }}>
                <p style={{ fontWeight: '600', marginBottom: '8px' }}>Login to access property verification</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>Book a verified agent to unlock verified ownership documents.</p>
                <Link href="/login" className="button" style={{ padding: '10px 24px' }}>Login to Continue</Link>
              </div>
            ) : isOwner ? (
              <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6' }}>
                <p style={{ fontWeight: '600' }}>This is your listed property.</p>
                <p style={{ fontSize: '0.9rem', marginTop: '4px', color: 'var(--text-muted)' }}>Verification documents will be visible here once an agent you've been booked by completes verification and admin approves.</p>
              </div>
            ) : !hasPaidBooking ? (
              <div style={{ padding: '24px', textAlign: 'center', borderRadius: '12px', background: 'rgba(245,158,11,0.06)', border: '1px dashed #f59e0b' }}>
                <p style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🔐</p>
                <p style={{ fontWeight: '600', marginBottom: '6px' }}>Exclusive to booked users</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Book a verified agent to unlock ownership proof, rental agreement, electricity bill & more.</p>
              </div>
            ) : (
              <div>
                <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', color: '#10b981', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ✔ You've booked verification for this property
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Documents appear here once the agent uploads them and admin approves. Track progress in <Link href="/profile?tab=requests" style={{ color: 'var(--primary)' }}>My Profile</Link>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ══════ RIGHT: AGENTS PANEL ══════ */}
        <div style={{ position: 'sticky', top: '90px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Nearby Agents</h2>
            <span style={{
              background: agents.length > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(100,100,100,0.1)',
              color: agents.length > 0 ? '#10b981' : 'var(--text-muted)',
              padding: '3px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem'
            }}>
              {agents.length}
            </span>
          </div>

          {isOwner && (
            <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontSize: '0.88rem', marginBottom: '16px', fontWeight: '500' }}>
              You cannot book an agent for your own listing.
            </div>
          )}

          {hasPaidBooking && !isOwner && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#10b981', fontSize: '0.88rem', marginBottom: '16px', fontWeight: '600' }}>
              ✔ Agent booked for this property.
            </div>
          )}

          {agents.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '6px' }}>🔍</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No verified agents found in {room.city}.</p>
            </div>
          ) : (
            <div>
              {agents.map(agent => (
                /* Click on agent card → agent detail page with listingId param */
                <Link
                  key={agent._id}
                  href={`/agents/${agent._id}?listingId=${id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div className="glass-card" style={{ padding: '18px', marginBottom: '12px', cursor: 'pointer', transition: 'transform 0.15s', display: 'flex', gap: '14px', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: '700', fontSize: '1.1rem', flexShrink: 0
                    }}>
                      {agent.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 3px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                        {agent.name}
                        <span style={{ color: '#3b82f6', fontSize: '0.9rem' }}>☑</span>
                      </h4>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {agent.agentType} · {agent.city}
                      </p>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>›</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* How it works */}
          <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(124,58,237,0.05)', borderRadius: '10px', fontSize: '0.82rem', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '8px' }}>How it works</strong>
            <ol style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.9' }}>
              <li>Click agent to see details & reviews</li>
              <li>Book the agent from their profile</li>
              <li>Agent visits & uploads property docs</li>
              <li>Admin approves → you get verified docs</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}