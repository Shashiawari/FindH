'use client';

import { useAppContext } from '../context/AppContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }) {
  const { token } = useAppContext();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !token) {
      // Small timeout allows UI to settle before redirecting
      setTimeout(() => {
        router.push('/login');
      }, 0);
    }
  }, [token, isMounted, router]);

  if (!isMounted) return null; // Avoid hydration mismatch

  if (!token) {
    return <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>Redirecting to Login...</div>;
  }

  return children;
}
