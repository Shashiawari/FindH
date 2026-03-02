'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppContext } from '../../context/AppContext'

export default function AgentLogin(){

  const { loginAgent } = useAppContext()

  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [loading,setLoading] = useState(false)

  const router = useRouter()

  const handleSubmit = async (e)=>{
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('http://localhost:5000/api/auth/agent-login',{
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ email, password })
      })

      let data
      try {
        data = await res.json()
      } catch {
        throw new Error("Server response invalid")
      }

      if(!res.ok){
        throw new Error(data.message || "Agent login failed")
      }

      // STORE TOKEN AND TIMESTAMP (via Context)
      loginAgent(data)

      // REDIRECT TO AGENT DASHBOARD
      router.push('/agent/dashboard')

    } catch(err) {
      console.error(err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return(
    <div className="container" style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'75vh' }}>
      <div className="glass-card" style={{ width:'100%', maxWidth:'420px', padding:'48px 40px' }}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <h2>Agent Access Portal</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Agent Login ID</label>
            <input type="text" required value={email} onChange={(e)=>setEmail(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} />
          </div>

          <button type="submit" disabled={loading} style={{ width:'100%', marginTop:'16px', padding:'16px' }}>
            {loading ? "Authenticating..." : "Login to Dashboard"}
          </button>
        </form>

        <p style={{textAlign:'center',marginTop:'32px'}}>
          Not an agent? <Link href="/login"> User Login </Link>
        </p>
      </div>
    </div>
  )
}
