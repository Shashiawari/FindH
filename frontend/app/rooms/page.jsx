'use client';
import Link from 'next/link';
import { useAppContext } from '../../context/AppContext';
import { motion } from 'framer-motion';

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } }
};

function SkeletonCard() {
  return (
    <div style={{ borderRadius: '18px', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div className="skeleton" style={{ height: '200px', borderRadius: 0 }} />
      <div style={{ padding: '20px' }}>
        <div className="skeleton skeleton-text" style={{ width: '70%' }} />
        <div className="skeleton skeleton-text" style={{ width: '45%' }} />
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
          <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          <div className="skeleton skeleton-text" style={{ width: '40%' }} />
        </div>
      </div>
    </div>
  );
}

export default function RoomsList() {
  const { rooms, loadingRooms: loading } = useAppContext();

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}
      >
        <div>
          <div className="badge badge-primary" style={{ marginBottom: '12px' }}>
            {rooms?.length || 0} Active Listings
          </div>
          <h1 style={{ marginBottom: '6px' }}>
            Find Your <span className="text-gradient">Next Space</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
            Human-verified rooms in your city.
          </p>
        </div>
        <Link href="/upload" className="button" style={{ flexShrink: 0 }}>
          + Post a Room
        </Link>
      </motion.div>

      {/* LOADING SKELETONS */}
      {loading && (
        <div className="grid grid-cols-3">
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* EMPTY */}
      {!loading && (!rooms || rooms.length === 0) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card"
          style={{ textAlign: 'center', padding: '80px 40px' }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏘️</div>
          <h3 style={{ marginBottom: '8px' }}>No listings yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>Be the first to list a property!</p>
          <Link href="/upload" className="button">Post a Room</Link>
        </motion.div>
      )}

      {/* LISTING GRID */}
      {!loading && rooms && rooms.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3"
        >
          {rooms.map(room => (
            <motion.div key={room._id} variants={cardVariants}>
              <Link href={`/rooms/${room._id}`} style={{ display: 'block', textDecoration: 'none' }}>
                <div style={{
                  borderRadius: '18px', background: 'var(--surface)',
                  border: '1px solid var(--border)', overflow: 'hidden',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {/* IMAGE */}
                  <div style={{ height: '210px', position: 'relative', overflow: 'hidden', background: '#0f1a2b' }}>
                    {room.images?.[0] ? (
                      <img
                        src={room.images[0]}
                        alt={room.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease', display: 'block' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-faint)' }}>
                        <span style={{ fontSize: '2rem' }}>🏠</span>
                        <span style={{ fontSize: '0.8rem' }}>No image</span>
                      </div>
                    )}
                    {/* PRICE CHIP */}
                    <div style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '999px', fontWeight: '700', fontSize: '0.9rem', color: '#fff' }}>
                      ${room.coldRent}/mo
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {room.title}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📍 {room.city}, {room.country}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sharing</div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{room.personsSharing} {room.personsSharing === 1 ? 'Person' : 'People'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warm Rent</div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--accent)' }}>${room.warmRent}/mo</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
