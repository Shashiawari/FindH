'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminProtectedRoute({ children }) {

  const router = useRouter()

  useEffect(() => {

    const token = sessionStorage.getItem('adminToken')
    const loginTime = sessionStorage.getItem('adminLoginTimestamp')

    if (!token || !loginTime) {
      router.push('/admin-login')
      return
    }

    const now = Date.now()
    const diff = now - parseInt(loginTime)

    const THIRTY_MIN = 30 * 60 * 1000

    if (diff > THIRTY_MIN) {
      sessionStorage.removeItem('adminToken')
      sessionStorage.removeItem('adminUser')
      sessionStorage.removeItem('adminLoginTimestamp')
      router.push('/admin-login')
    }

  }, [])

  return children
}