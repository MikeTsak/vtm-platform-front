import React, { useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';

export default function NotificationBanner() {
  const { notifications, dismiss } = useNotifications();

  useEffect(() => {
    // Set auto-dismiss timer for each notification
    notifications.forEach(notification => {
      const id = setTimeout(() => {
        dismiss(notification.id);
      }, 5000); // 5 seconds
      // Cleanup on unmount or if notification removed before timeout
      return () => clearTimeout(id);
    });
    // Note: This effect runs whenever notifications change, but we need to clean up previous timeouts.
    // Simpler: we'll rely on the timestamp and filter out old notifications in render.
  }, [notifications, dismiss]);

  // Filter out notifications older than 5 seconds (should be dismissed by effect, but just in case)
  const now = Date.now();
  const recentNotifications = notifications.filter(n => now - n.timestamp < 5000);

  if (recentNotifications.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      {recentNotifications.map(notification => (
        <div
          key={notification.id}
          style={{
            background: notification.type === 'error' ? '#8a0f1a' : notification.type === 'success' ? '#2f7a3a' : '#5a060f',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            minWidth: '280px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div>{notification.message}</div>
          <button
            onClick={() => dismiss(notification.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '0',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}