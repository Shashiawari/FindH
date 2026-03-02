'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  // ======= USER STATE =======
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // ======= ADMIN STATE =======
  const [adminToken, setAdminToken] = useState(null);
  const [adminUser, setAdminUser] = useState(null);

  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const isTimeExpired = (timestampKey, isSession = false) => {
    const stamp = isSession ? sessionStorage.getItem(timestampKey) : localStorage.getItem(timestampKey);
    if (!stamp) return true;
    return Date.now() - parseInt(stamp, 10) > 30 * 60 * 1000;
  };

  useEffect(() => {
    const checkAllExpiries = () => {
      // User session
      if (localStorage.getItem('token')) {
        if (isTimeExpired('loginTimestamp')) {
          logoutUser();
        } else {
          setToken(localStorage.getItem('token'));
          try { setUser(JSON.parse(localStorage.getItem('user'))); } catch (e) {}
        }
      }
      // Admin session (sessionStorage)
      if (sessionStorage.getItem('adminToken')) {
        if (isTimeExpired('adminLoginTimestamp', true)) {
          logoutAdmin();
        } else {
          setAdminToken(sessionStorage.getItem('adminToken'));
          try { setAdminUser(JSON.parse(sessionStorage.getItem('adminUser'))); } catch (e) {}
        }
      }
    };

    checkAllExpiries();
    const interval = setInterval(checkAllExpiries, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch rooms globally
  useEffect(() => {
    const fetchRooms = async () => {
      setLoadingRooms(true);
      try {
        const res = await fetch('http://localhost:5000/api/tenants');
        const data = await res.json();
        if (res.ok) setRooms(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch rooms', error);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
  }, []);

  const loginUser = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('loginTimestamp', Date.now().toString());
    setToken(userData.token);
    setUser(userData);
  };

  const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTimestamp');
    setToken(null);
    setUser(null);
  };

  const loginAdmin = (adminData) => {
    sessionStorage.setItem('adminToken', adminData.token);
    sessionStorage.setItem('adminUser', JSON.stringify(adminData));
    sessionStorage.setItem('adminLoginTimestamp', Date.now().toString());
    setAdminToken(adminData.token);
    setAdminUser(adminData);
  };

  const logoutAdmin = () => {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminUser');
    sessionStorage.removeItem('adminLoginTimestamp');
    setAdminToken(null);
    setAdminUser(null);
  };

  return (
    <AppContext.Provider value={{
      rooms, loadingRooms,
      token, user, loginUser, logoutUser,
      adminToken, adminUser, loginAdmin, logoutAdmin
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
