import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  position: 'top' | 'center' | 'bottom';
  active: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export function useAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showTelegram, setShowTelegram] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkAnnouncements();
    }
  }, [user]);

  const checkAnnouncements = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Check Telegram community prompt
      await checkTelegramPrompt();

      // Check admin announcements
      await checkAdminAnnouncements();

    } catch (error) {
      console.error('Error checking announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTelegramPrompt = async () => {
    try {
      const telegramDoc = await getDoc(doc(db, 'user_announcements', `${user!.id}_telegram`));
      
      if (!telegramDoc.exists()) {
        // First time user - show Telegram prompt
        setShowTelegram(true);
        return;
      }

      const data = telegramDoc.data();
      const nextShowAt = data.nextShowAt?.toDate();
      
      if (!nextShowAt || nextShowAt <= new Date()) {
        // Time to show again (after 12 hours)
        setShowTelegram(true);
      }
    } catch (error) {
      console.error('Error checking Telegram prompt:', error);
    }
  };

  const checkAdminAnnouncements = async () => {
    try {
      // Get all active announcements
      const announcementsSnapshot = await getDocs(collection(db, 'announcements'));
      const activeAnnouncements = announcementsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          expiresAt: doc.data().expiresAt?.toDate()
        }))
        .filter((announcement: any) => {
          // Filter active announcements that haven't expired
          if (!announcement.active) return false;
          if (announcement.expiresAt && announcement.expiresAt <= new Date()) return false;
          return true;
        }) as Announcement[];

      setAnnouncements(activeAnnouncements);

      // Check if user has seen each announcement
      for (const announcement of activeAnnouncements) {
        const userAnnouncementDoc = await getDoc(
          doc(db, 'user_announcements', `${user!.id}_${announcement.id}`)
        );
        
        if (!userAnnouncementDoc.exists()) {
          // User hasn't seen this announcement - show it
          setShowAnnouncement(announcement);
          break; // Only show one announcement at a time
        }
      }
    } catch (error) {
      console.error('Error checking admin announcements:', error);
    }
  };

  const dismissTelegram = () => {
    setShowTelegram(false);
  };

  const dismissAnnouncement = () => {
    setShowAnnouncement(null);
  };

  return {
    announcements,
    showTelegram,
    showAnnouncement,
    loading,
    dismissTelegram,
    dismissAnnouncement,
    checkAnnouncements
  };
}