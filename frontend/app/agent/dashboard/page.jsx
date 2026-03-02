'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppContext } from '../../../context/AppContext'

export default function AgentDashboard() {
  const { token } = useAppContext()
  const router = useRouter()
  
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploadState, setUploadState] = useState({ listingId: null, loading: false })

  useEffect(() => {
    if (!token) {
      router.push('/agent-login')
      return
    }
    fetchStats()
  }, [token])

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/agent-dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setStats(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentUpload = async (e) => {
    e.preventDefault()
    if (!uploadState.listingId) return alert('Select a listing first')
    
    setUploadState(prev => ({ ...prev, loading: true }))
    
    const formData = new FormData()
    formData.append('listingId', uploadState.listingId)
    
    // Append single files
    const fields = ['idFront', 'idBack', 'selfie', 'ownershipProof', 'rentalAgreement', 'electricityBill', 'propertyRegistration']
    fields.forEach(field => {
        const file = e.target[field]?.files[0]
        if (file) formData.append(field, file)
    })
    
    // Append multiple property images
    const propertyFiles = e.target.propertyImages?.files
    if (propertyFiles) {
        for(let i=0; i<propertyFiles.length; i++) {
            formData.append('propertyImages', propertyFiles[i])
        }
    }

    try {
        const res = await fetch('http://localhost:5000/api/agent-dashboard/upload-documents', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }, // No Content-Type so browser sets boundary
            body: formData
        })
        const data = await res.json()
        if (res.ok) {
            alert('Documents uploaded successfully! Pending review.')
            setUploadState({ listingId: null, loading: false })
            fetchStats() // Refresh to see updated verification_status
        } else {
            alert(data.message)
            setUploadState(prev => ({ ...prev, loading: false }))
        }
    } catch(err) {
        alert('Upload failed: ' + err.message)
        setUploadState(prev => ({ ...prev, loading: false }))
    }
  }

  if (loading) return <div className="container" style={{padding:'60px'}}>Loading dashboard...</div>

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      <h2 style={{ marginBottom: '32px' }}>Agent Dashboard</h2>

      {/* OVERVIEW STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '20px', marginBottom: '40px' }}>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <h3>{stats?.totalTenants || 0}</h3>
          <p>Tenant Interests</p>
        </div>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <h3>{stats?.assignedListings?.length || 0}</h3>
          <p>Assigned Properties</p>
        </div>
      </div>

      {/* ASSIGNED PROPERTIES */}
      <h3 style={{ marginBottom: '20px' }}>Your Properties</h3>
      <div className="grid grid-cols-1">
        {stats?.assignedListings?.map(assignment => (
          <div key={assignment.listing_id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>{assignment.listings?.title}</h4>
                <span className="badge" style={{ 
                    background: assignment.verification_status === 'approved' ? '#10b981' : 
                               assignment.verification_status === 'rejected' ? '#ef4444' : '#f59e0b',
                    color: '#fff'
                 }}>
                    {assignment.verification_status.toUpperCase()}
                </span>
            </div>
            
            <p style={{ color: 'var(--text-muted)' }}>📍 City: {assignment.listings?.city}</p>
            <p style={{ color: 'var(--text-muted)' }}>📅 Bookings: {stats.bookingsPerListing[assignment.listing_id] || 0}</p>

            {assignment.verification_status === 'rejected' && (
                <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px' }}>
                    <p style={{ color: '#ef4444', margin: 0, fontWeight: 500 }}>Rejection Reason: {assignment.rejection_reason}</p>
                    <p style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '4px' }}>You can re-upload documents to apply again.</p>
                </div>
            )}

            {assignment.verification_status !== 'approved' && (
                <button 
                  className="button secondary" 
                  onClick={() => setUploadState({ listingId: assignment.listing_id, loading: false })}
                  style={{ alignSelf: 'flex-start', marginTop: '8px' }}
                >
                  Upload Verification Documents
                </button>
            )}
          </div>
        ))}
        {(!stats?.assignedListings || stats.assignedListings.length === 0) && (
            <div className="glass-card"><p>No properties assigned yet.</p></div>
        )}
      </div>

      {/* UPLOAD FORM MODAL / SECTION */}
      {uploadState.listingId && (
          <div className="glass-card" style={{ marginTop: '40px', border: '2px solid var(--primary)' }}>
              <h3 style={{ marginBottom: '24px' }}>Upload Property Documents</h3>
              <form onSubmit={handleDocumentUpload} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '20px' }}>
                      <div className="form-group">
                          <label>Selfie (Clear face photo)</label>
                          <input type="file" name="selfie" accept="image/*" required />
                      </div>
                      <div className="form-group">
                          <label>Government ID Front</label>
                          <input type="file" name="idFront" accept="image/*" required />
                      </div>
                      <div className="form-group">
                          <label>Government ID Back</label>
                          <input type="file" name="idBack" accept="image/*" required />
                      </div>
                      <div className="form-group">
                          <label>Property Ownership Proof</label>
                          <input type="file" name="ownershipProof" accept="image/*,application/pdf" required />
                      </div>
                      <div className="form-group">
                          <label>Rental Agreement Template</label>
                          <input type="file" name="rentalAgreement" accept="image/*,application/pdf" required />
                      </div>
                      <div className="form-group">
                          <label>Recent Electricity Bill</label>
                          <input type="file" name="electricityBill" accept="image/*,application/pdf" required />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <label>Property Registration Extract</label>
                          <input type="file" name="propertyRegistration" accept="image/*,application/pdf" required />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <label>Property Images (Multiple)</label>
                          <input type="file" name="propertyImages" accept="image/*" multiple required />
                      </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                      <button type="submit" className="button" disabled={uploadState.loading}>
                          {uploadState.loading ? 'Uploading...' : 'Submit Documents'}
                      </button>
                      <button type="button" className="button secondary" onClick={() => setUploadState({ listingId: null, loading: false })}>
                          Cancel
                      </button>
                  </div>
              </form>
          </div>
      )}

    </div>
  )
}
