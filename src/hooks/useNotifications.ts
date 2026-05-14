import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  limit
} from 'firebase/firestore';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  readAt: string | null;
  createdAt: any; // Firestore timestamp or ISO string
}

/**
 * A hook to manage user notifications from Firestore.
 * Features: real-time updates, unread count tracking, and batch mark-as-read.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as Notification));

      setNotifications(docs);
      setUnreadCount(docs.filter(n => !n.readAt).length);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', id), {
        readAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.readAt) {
          batch.update(doc(db, 'users', user.uid, 'notifications', n.id), {
            readAt: new Date().toISOString()
          });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  return { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead 
  };
}
