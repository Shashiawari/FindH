'use client'

import API_URL from '../../lib/api.js';

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppContext } from '../../context/AppContext'

export default function Login(){

  const { loginUser, user } = useAppContext()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [loading,setLoading] = useState(false)

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false)   // show forgot-password form
  const [forgotStep, setForgotStep] = useState(1)        // 1=enter email, 2=enter otp+new pw
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMsg, setForgotMsg] = useState('')

  const handleSubmit = async (e)=>{

    e.preventDefault()
    setLoading(true)

    try{

      const res = await fetch(`${API_URL}/api/auth/login`,{
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          email,
          password
        })
      })

      let data

      try{
        data = await res.json()
      }catch{
        throw new Error("Server response invalid")
      }

      if(!res.ok){
        throw new Error(data.message || "Login failed")
      }

      // STORE TOKEN
      loginUser(data)

      // REDIRECT
      router.push('/')

    }catch(err){

      console.error(err)
      alert(err.message)

    }

    setLoading(false)
  }

  // --- Forgot Password Handlers ---
  const handleSendResetOtp = async (e) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotMsg('')
    try {
      const res = await fetch(`${API_URL}/api/auth/send-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to send code')
      setForgotMsg('✓ Reset code sent! Check your email.')
      setForgotStep(2)
    } catch (err) {
      setForgotMsg(err.message)
    }
    setForgotLoading(false)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotMsg('')
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, newPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Reset failed')
      setForgotMsg('✓ Password reset! You can now sign in.')
      setTimeout(() => {
        setForgotMode(false)
        setForgotStep(1)
        setForgotEmail('')
        setForgotOtp('')
        setNewPassword('')
        setForgotMsg('')
      }, 2000)
    } catch (err) {
      setForgotMsg(err.message)
    }
    setForgotLoading(false)
  }

  // --- Forgot Password UI ---
  if (forgotMode) {
    return (
      <div className="container" style={{
        display:'flex',
        justifyContent:'center',
        alignItems:'center',
        minHeight:'75vh'
      }}>
        <div className="glass-card" style={{
          width:'100%',
          maxWidth:'420px',
          padding:'48px 40px'
        }}>
          <div style={{textAlign:'center',marginBottom:'32px'}}>
            <h2>Reset Password</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.9rem' }}>
              {forgotStep === 1
                ? 'Enter your email to receive a reset code.'
                : 'Enter the code and your new password.'}
            </p>
          </div>

          {forgotStep === 1 ? (
            <form onSubmit={handleSendResetOtp}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e)=>setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                style={{ width:'100%', marginTop:'16px', padding:'16px' }}
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>Reset Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={forgotOtp}
                  onChange={(e)=>setForgotOtp(e.target.value)}
                  placeholder="6-digit code"
                  style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem' }}
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e)=>setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                style={{ width:'100%', marginTop:'16px', padding:'16px' }}
              >
                {forgotLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {forgotMsg && (
            <p style={{
              textAlign:'center', marginTop:'16px', fontSize:'0.9rem',
              color: forgotMsg.startsWith('✓') ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)'
            }}>
              {forgotMsg}
            </p>
          )}

          <p style={{textAlign:'center',marginTop:'24px'}}>
            <button
              type="button"
              onClick={() => { setForgotMode(false); setForgotStep(1); setForgotMsg(''); }}
              style={{
                background:'none', border:'none', color:'var(--primary)',
                cursor:'pointer', textDecoration:'underline', fontSize:'0.9rem'
              }}
            >
              ← Back to Sign In
            </button>
          </p>
        </div>
      </div>
    )
  }

  return(
    <div className="container" style={{
      display:'flex',
      justifyContent:'center',
      alignItems:'center',
      minHeight:'75vh'
    }}>

      <div className="glass-card" style={{
        width:'100%',
        maxWidth:'420px',
        padding:'48px 40px'
      }}>

        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <h2>Welcome Back</h2>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
            />
          </div>

          <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setForgotMode(true)}
              style={{
                background:'none', border:'none', color:'var(--primary)',
                cursor:'pointer', fontSize:'0.85rem', padding:0
              }}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width:'100%',
              marginTop:'8px',
              padding:'16px'
            }}
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>

        </form>

        <p style={{textAlign:'center',marginTop:'32px'}}>
          Don't have an account?
          <Link href="/signup"> Sign up</Link>
        </p>

      </div>
    </div>
  )
}