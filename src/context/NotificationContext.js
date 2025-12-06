import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, onValue, update, push } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Listen to user's notifications
    const notificationsRef = ref(database, `notifications/${user.uid}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notificationsList = Object.entries(data)
          .map(([id, notification]) => ({ id, ...notification }))
          .sort((a, b) => b.timestamp - a.timestamp);
        
        setNotifications(notificationsList);
        setUnreadCount(notificationsList.filter(n => !n.read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const markAsRead = async (notificationId) => {
    if (!user?.uid) return;

    try {
      await update(ref(database, `notifications/${user.uid}/${notificationId}`), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.uid || notifications.length === 0) return;

    try {
      const updates = {};
      notifications.forEach(notification => {
        if (!notification.read) {
          updates[`notifications/${user.uid}/${notification.id}/read`] = true;
        }
      });
      await update(ref(database), updates);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!user?.uid) return;

    try {
      await update(ref(database, `notifications/${user.uid}/${notificationId}`), {
        deleted: true
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const createNotification = async (targetUserId, notification) => {
    try {
      const notificationRef = ref(database, `notifications/${targetUserId}`);
      await push(notificationRef, {
        ...notification,
        timestamp: Date.now(),
        read: false,
        deleted: false
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const value = {
    notifications: notifications.filter(n => !n.deleted),
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
