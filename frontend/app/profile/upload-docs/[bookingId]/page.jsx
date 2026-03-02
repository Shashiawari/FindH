'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useAppContext } from '../../../../context/AppContext';

export default function UploadPropertyDocs({ params }) {
  const unwrappedParams = React.use(params);
  const { bookingId } = unwrappedParams;
  const { token } = useAppContext();
  const router = useRouter();

  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    setFiles(prev => ({ ...prev, [e.target.name]: e.target.files }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    if (files.ownershipProof?.[0]) formData.append('ownershipProof', files.ownershipProof[0]);
    if (files.rentalAgreement?.[0]) formData.append('rentalAgreement', files.rentalAgreement[0]);
    if (files.electricityBill?.[0]) formData.append('electricityBill', files.electricityBill[0]);
    if (files.propertyRegistration?.[0]) formData.append('propertyRegistration', files.propertyRegistration[0]);
    if (files.propertyImages) {
      Array.from(files.propertyImages).forEach(f => formData.append('propertyImages', f));
    }

    try {
      const res = await fetch(`http://localhost:5000/api/profile/upload-docs/${bookingId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
      <h2>Documents Uploaded!</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Admin will review your submission and verify the property.</p>
      <button onClick={() => router.push('/profile?tab=requests')} className="button">← Back to Requests</button>
    </div>
  );

  return (
    <div className="container" style={{ maxWidth: '600px', paddingBottom: '60px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginBottom: '24px', fontSize: '1rem' }}>
        ← Back
      </button>

      <div className="glass-card">
        <h2 style={{ marginBottom: '8px' }}>Upload Property Documents</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>
          Upload the required documents to verify this property. Accepted: images and PDF.
        </p>

        {error && <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {[
            { name: 'ownershipProof', label: 'Ownership Proof *', required: true },
            { name: 'rentalAgreement', label: 'Rental Agreement', required: false },
            { name: 'electricityBill', label: 'Electricity Bill', required: false },
            { name: 'propertyRegistration', label: 'Property Registration', required: false },
          ].map(({ name, label, required }) => (
            <div key={name} className="form-group">
              <label>{label}</label>
              <input
                type="file" name={name} required={required}
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                style={{ padding: '10px' }}
              />
            </div>
          ))}

          <div className="form-group">
            <label>Property Images (up to 6)</label>
            <input
              type="file" name="propertyImages" multiple accept="image/*"
              onChange={handleFileChange}
              style={{ padding: '10px' }}
            />
          </div>

          <button type="submit" className="button" disabled={loading} style={{ width: '100%', marginTop: '16px', padding: '16px' }}>
            {loading ? 'Uploading...' : '📤 Submit for Admin Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
