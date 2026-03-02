import Link from 'next/link';

export default function Home() {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '10vh' }}>
      <div className="badge badge-primary" style={{ marginBottom: '24px' }}>
        Revolutionizing Rental Matching
      </div>
      <h1 className="animate-fade-in">
        Find Your Perfect <span className="text-gradient">Match</span>
      </h1>
      <p className="animate-fade-in" style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 40px auto', animationDelay: '0.2s' }}>
        Connect with geo-located rental agents or list your property seamlessly. Experience a new era of renting.
      </p>
      
      <div className="animate-fade-in" style={{ display: 'flex', gap: '16px', justifyContent: 'center', animationDelay: '0.4s' }}>
        <Link href="/rooms" className="button" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
          Browse Rooms
        </Link>
        <Link href="/upload" className="button secondary" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
          Post a Room
        </Link>
      </div>

      <div className="grid grid-cols-3 animate-fade-in" style={{ marginTop: '80px', animationDelay: '0.6s' }}>
        <div className="glass-card" style={{ padding: '40px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '24px' }}>📍</div>
          <h3>Geo-Location Matching</h3>
          <p style={{ color: 'var(--text-muted)' }}>Automatically find agents and rooms within a 5km radius of your desired location using powerful spatial queries.</p>
        </div>
        <div className="glass-card" style={{ padding: '40px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '24px' }}>🛡️</div>
          <h3>Verified Agents</h3>
          <p style={{ color: 'var(--text-muted)' }}>All agents go through a rigorous KYC process with Government ID or University certification.</p>
        </div>
        <div className="glass-card" style={{ padding: '40px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '24px' }}>⚡</div>
          <h3>Instant Connections</h3>
          <p style={{ color: 'var(--text-muted)' }}>Say goodbye to endless browsing. Get matched with the right people instantly based on your exact credentials.</p>
        </div>
      </div>
    </div>
  );
}
