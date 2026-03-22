'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminProtectedRoute({ children }) {
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('adminToken');
    const loginTime = sessionStorage.getItem('adminLoginTimestamp');

    if (!token || !loginTime) {
      router.push('/admin-login');
      return;
    }

    const now = Date.now();
    const diff = now - parseInt(loginTime, 10);
    const THIRTY_MIN = 30 * 60 * 1000;

    if (diff > THIRTY_MIN) {
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminUser');
      sessionStorage.removeItem('adminLoginTimestamp');
      router.push('/admin-login');
      return;
    }

    setIsAuth(true);
  }, [router]);

  if (!isAuth) return null; // Wait for authentication check before rendering

  return children;
}