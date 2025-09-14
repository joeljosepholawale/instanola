import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Bell, Users, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  position: 'top' | 'center' | 'bottom';
  active: boolean;
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
}

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement?: Announcement;
  type: 'telegram' | 'admin';
}

export function AnnouncementModal({ isOpen, onClose, announcement, type }: AnnouncementModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleTelegramJoin = () => {
    window.open('https://t.me/ProxyNumSMS_Support', '_blank');
    handleDismiss();
  };

  const handleDismiss = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      if (type === 'telegram') {
        // Mark Telegram announcement as seen for 12 hours
        await setDoc(doc(db, 'user_announcements', `${user.id}_telegram`), {
          userId: user.id,
          type: 'telegram',
          lastShown: new Date(),
          dismissedAt: new Date(),
          nextShowAt: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
        });
      } else if (type === 'admin' && announcement) {
        // Mark admin announcement as seen
        await setDoc(doc(db, 'user_announcements', `${user.id}_${announcement.id}`), {
          userId: user.id,
          announcementId: announcement.id,
          type: 'admin',
          lastShown: new Date(),
          dismissedAt: new Date()
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error dismissing announcement:', error);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl">
        {type === 'telegram' ? (
          <>
            {/* Telegram Community Modal */}
            <div className="p-5 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              
              <h2 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">
                Join Our Community 🚀
              </h2>
              
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                Get instant support, updates, and connect with other users.
              </p>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-center space-x-2 text-blue-900 mb-2">
                  <Users className="w-4 h-4" />
                  <span className="font-semibold text-sm">@ProxyNumSMS_Support</span>
                </div>
                <div className="text-xs text-blue-800 space-y-1">
                  <div className="flex items-center justify-center space-x-1">
                    <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                    <span>Instant support responses</span>
                  </div>
                  <div className="flex items-center justify-center space-x-1">
                    <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                    <span>Service updates & tips</span>
                  </div>
                  <div className="flex items-center justify-center space-x-1">
                    <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                    <span>Direct team access</span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={handleDismiss}
                  disabled={loading}
                  className="flex-1 text-sm py-2"
                >
                  Maybe Later
                </Button>
                <Button 
                  onClick={handleTelegramJoin}
                  disabled={loading}
                  className="flex-1 text-sm py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Join Telegram
                </Button>
              </div>
              
              <p className="text-xs text-gray-400 mt-2">
                Reminder in 12 hours
              </p>
            </div>
          </>
        ) : announcement ? (
          <>
            {/* Admin Announcement Modal */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  announcement.type === 'success' ? 'bg-green-500' :
                  announcement.type === 'warning' ? 'bg-yellow-500' :
                  announcement.type === 'error' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}>
                  <Bell className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">Announcement</span>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <div className={`border rounded-lg p-3 mb-3 ${
                announcement.type === 'success' ? 'bg-green-50 border-green-200' :
                announcement.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                announcement.type === 'error' ? 'bg-red-50 border-red-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <h3 className={`font-semibold text-sm mb-2 ${
                  announcement.type === 'success' ? 'text-green-900' :
                  announcement.type === 'warning' ? 'text-yellow-900' :
                  announcement.type === 'error' ? 'text-red-900' :
                  'text-blue-900'
                }`}>
                  {announcement.title}
                </h3>
                <div className={`text-xs leading-relaxed whitespace-pre-wrap ${
                  announcement.type === 'success' ? 'text-green-800' :
                  announcement.type === 'warning' ? 'text-yellow-800' :
                  announcement.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`} style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {announcement.message}
                </div>
              </div>
              
              <Button 
                onClick={handleDismiss}
                disabled={loading}
                className="w-full text-sm py-2"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {loading ? 'Dismissing...' : 'Got It'}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}