'use client';

import API_URL from '../lib/api.js';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

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
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [liveToast, setLiveToast] = useState(null);
  const [latestVerificationEvent, setLatestVerificationEvent] = useState(null);

  const socketRef = useRef(null);

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

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/verification/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch notifications');

      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load notifications', error);
    }
  }, [token]);

  const fetchUnreadNotificationCount = useCallback(async () => {
    if (!token) {
      setUnreadNotificationCount(0);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/verification/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch unread count');

      const data = await res.json();
      setUnreadNotificationCount(Number(data?.unread || 0));
    } catch (error) {
      console.error('Failed to load unread notification count', error);
    }
  }, [token]);

  const markNotificationAsRead = useCallback(async (notificationId) => {
    if (!token || !notificationId) return;

    try {
      const res = await fetch(`${API_URL}/api/verification/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to mark notification as read');

      setNotifications(prev => prev.map((notification) => (
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification
      )));
      setUnreadNotificationCount(prev => (prev > 0 ? prev - 1 : 0));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  }, [token]);

  const deleteNotification = useCallback(async (notificationId) => {
    if (!token || !notificationId) return;

    try {
      const res = await fetch(`${API_URL}/api/verification/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to delete notification');

      const data = await res.json();
      setNotifications(prev => prev.filter((notification) => notification.id !== notificationId));
      if (data?.wasUnread) {
        setUnreadNotificationCount(prev => (prev > 0 ? prev - 1 : 0));
      }
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  }, [token]);

  const clearLiveToast = useCallback(() => setLiveToast(null), []);

  useEffect(() => {
    if (liveToast) {
      const timeout = setTimeout(() => setLiveToast(null), 7000);
      return () => clearTimeout(timeout);
    }
  }, [liveToast]);

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadNotificationCount(0);
      setLatestVerificationEvent(null);

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    fetchNotifications();
    fetchUnreadNotificationCount();

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    const handleNotification = (payload) => {
      const notification = payload?.notification;
      if (!notification?.id) return;

      setNotifications((prev) => {
        const exists = prev.some((item) => item.id === notification.id);
        if (exists) {
          return prev.map((item) => (item.id === notification.id ? notification : item));
        }
        return [notification, ...prev].slice(0, 30);
      });

      if (!notification.is_read) {
        setUnreadNotificationCount((prev) => prev + 1);
      }

      if (notification.message) {
        setLiveToast({
          id: notification.id,
          type: notification.type || 'NOTIFICATION',
          message: notification.message
        });
      }
    };

    const setVerificationEvent = (eventType) => (payload) => {
      setLatestVerificationEvent({
        eventType,
        payload,
        timestamp: Date.now()
      });

      if (payload?.message) {
        setLiveToast({
          id: `${eventType}-${Date.now()}`,
          type: 'VERIFICATION_EVENT',
          message: payload.message
        });
      }
    };

    socket.on('notification:new', handleNotification);
    socket.on('verification_request:new', setVerificationEvent('verification_request:new'));
    socket.on('verification_request:taken', setVerificationEvent('verification_request:taken'));
    socket.on('verification_request:accepted', setVerificationEvent('verification_request:accepted'));
    socket.on('verification_request:status-updated', setVerificationEvent('verification_request:status-updated'));

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [token, fetchNotifications, fetchUnreadNotificationCount]);

  // Fetch rooms globally
  useEffect(() => {
    const fetchRooms = async () => {
      setLoadingRooms(true);
      try {
        const res = await fetch(`${API_URL}/api/tenants`);
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
    setNotifications([]);
    setUnreadNotificationCount(0);
    setLatestVerificationEvent(null);

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const loginAgent = (agentData) => loginUser(agentData);
  const logoutAgent = () => logoutUser();

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
      token, user, loginUser, logoutUser, loginAgent, logoutAgent,
      adminToken, adminUser, loginAdmin, logoutAdmin,
      notifications,
      unreadNotificationCount,
      markNotificationAsRead,
      deleteNotification,
      fetchNotifications,
      fetchUnreadNotificationCount,
      liveToast,
      clearLiveToast,
      latestVerificationEvent
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
