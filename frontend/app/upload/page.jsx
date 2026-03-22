'use client';

import API_URL from '../../lib/api.js';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function UploadRoom() {

  const router = useRouter();
  const { token, user } = useAppContext();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    email: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    contactNumber: '',
    rentalDate: '',
    coldRent: '',
    warmRent: '',
    personsSharing: '',
    parking: false,
    rules: ''
  });

  const [images, setImages] = useState([]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        contactNumber: user.phone || ''
      }));
    }
  }, [user]);

  // ================= INPUT CHANGE =================

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ================= IMAGE CHANGE =================

  const handleImageChange = (e) => {
    if (e.target.files.length > 4) {
      alert('Maximum 4 images allowed');
      e.target.value = '';
      return;
    }
    setImages(e.target.files);
  };

  // ================= SUBMIT =================

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();

    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });

    for (let i = 0; i < images.length; i++) {
      data.append('images', images[i]);
    }

    try {

      const res = await fetch(`${API_URL}/api/tenants`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: data
      });

      if (res.ok) {
        router.push('/rooms');
      } else {
        const err = await res.json();
        alert(err.message || 'Error uploading room');
      }

    } catch (error) {
      alert('Network error. Is backend running?');
    }

    setLoading(false);
  };

  return (
    <ProtectedRoute>
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="glass-card animate-fade-in">

          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className="badge badge-primary" style={{ marginBottom: '16px' }}>For Tenants</div>
            <h2>Post a Room</h2>
            <p style={{ color: 'var(--text-muted)' }}>List your property and reach matching agents instantly.</p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-2">

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Listing Title</label>
              <input name="title" required onChange={handleInputChange} placeholder="Beautiful 2BHK in Downtown" />
            </div>

            <div className="form-group">
              <label>Contact Email <span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>(Locked to profile)</span></label>
              <input name="email" type="email" value={formData.email} readOnly disabled required style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-faint)', cursor: 'not-allowed', borderColor: 'transparent' }} />
            </div>

            <div className="form-group">
              <label>Contact Number <span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>(Locked to profile)</span></label>
              <input name="contactNumber" type="tel" value={formData.contactNumber} readOnly disabled required style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-faint)', cursor: 'not-allowed', borderColor: 'transparent' }} />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ marginTop: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                Location Details
              </h4>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Address Line 1</label>
              <input name="address1" required onChange={handleInputChange} />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Address Line 2 (Optional)</label>
              <input name="address2" onChange={handleInputChange} />
            </div>

            <div className="form-group">
              <label>City</label>
              <input name="city" required onChange={handleInputChange} />
            </div>

            <div className="form-group">
              <label>State / Province</label>
              <input name="state" required onChange={handleInputChange} />
            </div>

            <div className="form-group">
              <label>Postal Code</label>
              <input name="postalCode" required onChange={handleInputChange} />
            </div>

            <div className="form-group">
              <label>Country</label>
              <input name="country" required onChange={handleInputChange} />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ marginTop: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                Rental Details
              </h4>
            </div>

            <div className="form-group">
              <label>Available Date</label>
              <input name="rentalDate" type="date" required onChange={handleInputChange} />
            </div>

            <div className="form-group">
              <label>Persons Sharing</label>
              <input name="personsSharing" type="number" min="1" required onChange={handleInputChange} />
            </div>

            <div className="form-group">
              <label>Cold Rent</label>
              <input name="coldRent" type="number" required onChange={handleInputChange} />
            </div>

            <div className="form-group">
              <label>Warm Rent</label>
              <input name="warmRent" type="number" required onChange={handleInputChange} />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', gridColumn: '1 / -1' }}>
              <input name="parking" type="checkbox" onChange={handleInputChange} />
              <label>Parking Available</label>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Rental Rules</label>
              <textarea name="rules" rows="3" onChange={handleInputChange}></textarea>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Upload Property Images (Max 4)</label>
              <input
                type="file"
                name="images"
                multiple
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
              <button type="submit" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} disabled={loading}>
                {loading ? 'Publishing...' : 'Publish Listing'}
              </button>
            </div>

          </form>

        </div>
      </div>
    </ProtectedRoute>
  );
}