'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';

const getNotificationRoute = (notification) => {
  const type = notification?.type;

  if ([
    'VERIFICATION_REQUEST',
    'VERIFICATION_ACCEPTED_BY_ME',
    'VERIFICATION_REQUEST_TAKEN',
    'VERIFICATION_REQUEST_REJECTED',
    'VERIFICATION_REUPLOAD'
  ].includes(type)) {
    return '/agent-dashboard';
  }

  if ([
    'VERIFICATION_REQUEST_SUBMITTED',
    'VERIFICATION_ACCEPTED',
    'VERIFICATION_IN_PROGRESS'
  ].includes(type)) {
    return '/profile';
  }

  if (type === 'VERIFICATION_VERIFIED') {
    return '/profile?tab=agentDocs';
  }

  return '/notifications';
};

export default function NotificationsPage() {
  const router = useRouter();
  const {
    token,
    notifications,
    unreadNotificationCount,
    fetchNotifications,
    fetchUnreadNotificationCount,
    markNotificationAsRead,
    deleteNotification
  } = useAppContext();

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    fetchNotifications();
    fetchUnreadNotificationCount();
  }, [token, router, fetchNotifications, fetchUnreadNotificationCount]);

  const handleOpen = async (notification) => {
    if (!notification) return;
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
    }
    router.push(getNotificationRoute(notification));
  };

  return (
    <div className="container" style={{ paddingBottom: '72px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '8px' }}>Notifications</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Track request updates, admin approvals, and re-upload actions.
          </p>
        </div>
        <span className="badge badge-primary" style={{ padding: '8px 14px' }}>
          {unreadNotificationCount} unread
        </span>
      </div>

      {notifications.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '56px 28px' }}>
          <h3 style={{ marginBottom: '8px' }}>No notifications yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
            When verification requests or approvals happen, they will show here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="glass-card"
              style={{
                padding: '20px',
                border: notification.is_read ? '1px solid var(--border)' : '1px solid rgba(99,102,241,0.35)',
                background: notification.is_read ? 'var(--surface)' : 'rgba(99,102,241,0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: '16px', flexWrap: 'nowrap' }}>
                <div
                  onClick={() => handleOpen(notification)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleOpen(notification);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    transform: 'none',
                    padding: 0,
                    color: 'inherit',
                    cursor: 'pointer',
                    overflow: 'visible'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: '600' }}>
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                    {!notification.is_read && <span className="badge badge-warning">New</span>}
                  </div>
                  <div style={{ fontSize: '1rem', lineHeight: '1.65', color: 'var(--text)', wordBreak: 'break-word' }}>
                    {notification.message}
                  </div>
                </div>

                <button
                  onClick={() => deleteNotification(notification.id)}
                  className="button secondary"
                  style={{ padding: '9px 14px', fontSize: '0.85rem', alignSelf: 'flex-start', flexShrink: 0 }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
