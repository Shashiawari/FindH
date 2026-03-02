'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function BecomeAgent() {
  const router = useRouter();
  const { token } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', agentType: 'Professional', dob: '',
    country: '', state: '', city: '', address1: '', address2: '', postalCode: '',
    idType: 'Passport', idNumber: '', university: '', matricNumber: ''
  });
  
  const [files, setFiles] = useState({});

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setFiles({ ...files, [e.target.name]: e.target.files[0] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const data = new FormData();
    Object.keys(form).forEach(key => data.append(key, form[key]));
    Object.keys(files).forEach(key => data.append(key, files[key]));

    try {
      const res = await fetch('http://localhost:5000/api/agents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });
      if (res.ok) {
        alert('✅ Application Submitted Successfully! Your documents are under review. Await Admin Verification.');
        router.push('/');
      } else {
        const err = await res.json();
        alert(err.message || 'Registration failed');
      }
    } catch (error) {
      alert('Network error');
    }
    setLoading(false);
  };

  return (
    <ProtectedRoute>
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="glass-card animate-fade-in">
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="badge badge-accent" style={{ marginBottom: '16px' }}>Join the Network</div>
          <h2>Become an Agent</h2>
          <p style={{ color: 'var(--text-muted)' }}>Complete your profile to start matching with tenants.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2">
          {/* Common Fields */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Personal Information</h4>
          </div>
          
          <div className="form-group">
            <label>Agent Type</label>
            <select name="agentType" value={form.agentType} onChange={handleChange}>
              <option value="Professional">Professional</option>
              <option value="Student">Student</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Full Name</label>
            <input name="name" required onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" name="email" required onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input name="phone" required onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input type="date" name="dob" required onChange={handleChange} />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ marginTop: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Location</h4>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Street Address</label>
            <input name="address1" required onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>City</label>
            <input name="city" required onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>State</label>
            <input name="state" required onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Postal Code</label>
            <input name="postalCode" required onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Country</label>
            <input name="country" required onChange={handleChange} />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ marginTop: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Verification Documents</h4>
          </div>

          {form.agentType === 'Professional' ? (
            <>
              <div className="form-group">
                <label>ID Type</label>
                <select name="idType" value={form.idType} onChange={handleChange}>
                  <option value="Passport">Passport</option>
                  <option value="National ID">National ID</option>
                  <option value="Driver License">Driver's License</option>
                </select>
              </div>
              <div className="form-group">
                <label>ID Number</label>
                <input name="idNumber" required onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>ID Front Image</label>
                <input type="file" name="idFront" required accept="image/*" onChange={handleFileChange} />
              </div>
              <div className="form-group">
                <label>ID Back Image</label>
                <input type="file" name="idBack" required accept="image/*" onChange={handleFileChange} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Selfie with ID</label>
                <input type="file" name="selfie" required accept="image/*" onChange={handleFileChange} />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>University Name</label>
                <input name="university" required onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Matriculation Number</label>
                <input name="matricNumber" required onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Student Certificate</label>
                <input type="file" name="studentCertificate" required accept="image/*,application/pdf" onChange={handleFileChange} />
              </div>
              <div className="form-group">
                <label>Student ID Card Photo</label>
                <input type="file" name="studentIDPhoto" required accept="image/*" onChange={handleFileChange} />
              </div>
            </>
          )}

          <div style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
            <button type="submit" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} disabled={loading}>
              {loading ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ProtectedRoute>
  );
}
