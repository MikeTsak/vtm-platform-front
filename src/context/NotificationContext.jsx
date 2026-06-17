import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribe, publish } from '../utils/notification';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribe((notification) => {
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          message: notification.message,
          type: notification.type || 'info',
          timestamp: Date.now(),
        }
      ]);
    });
    return unsubscribe;
  }, []);

  const dismiss = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const value = {
    notifications,
    dismiss,
    // expose publish for imperatively adding notifications
    publish,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}