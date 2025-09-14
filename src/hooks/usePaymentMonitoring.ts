// Hook for monitoring payment status and automatic refunds
import { useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UsePaymentMonitoringProps {
  enabled?: boolean;
  interval?: number; // in milliseconds
  isAdmin?: boolean;
  userId?: string;
}

export function usePaymentMonitoring({
  enabled = true,
  interval = 5 * 60 * 1000, // 5 minutes
  isAdmin = false,
  userId
}: UsePaymentMonitoringProps = {}) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBalanceRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    // Set up real-time balance monitoring to detect unauthorized changes
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        const currentBalance = userData.walletBalance || 0;
        const lastBalance = lastBalanceRef.current;
        
        // Check for unauthorized balance increases
        if (lastBalance > 0 && currentBalance > lastBalance) {
          const increase = currentBalance - lastBalance;
          console.warn('Unauthorized balance increase detected:', {
            userId,
            previousBalance: lastBalance,
            currentBalance,
            increase,
            timestamp: new Date()
          });
          
          // Log security event for admin review
          if (isAdmin) {
            logSecurityEvent(userId, increase, lastBalance, currentBalance);
          }
        }
        
        lastBalanceRef.current = currentBalance;
      }
    });

    const monitorPayments = async () => {
      try {
        // Only run monitoring logic for admin users
        if (isAdmin) {
          console.log('Running admin payment monitoring...');
          // Admin-specific monitoring logic would go here
        }
      } catch (error) {
        console.error('Error in payment monitoring:', error);
      }
    };

    // Set up interval for admin monitoring only
    if (isAdmin) {
      intervalRef.current = setInterval(monitorPayments, interval);
    }

    // Cleanup
    return () => {
      unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, isAdmin, userId]);

  const logSecurityEvent = async (userId: string, increase: number, previousBalance: number, currentBalance: number) => {
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      await setDoc(doc(db, 'security_events', `unauthorized_balance_${userId}_${Date.now()}`), {
        type: 'suspicious_activity',
        userId: userId,
        details: {
          action: 'unauthorized_balance_increase',
          increase: increase,
          previousBalance: previousBalance,
          currentBalance: currentBalance,
          possibleCause: 'System bug or unauthorized modification'
        },
        severity: 'high',
        timestamp: new Date(),
        resolved: false,
        ipAddress: 'system',
        userAgent: 'balance_monitor'
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  };

  // Manual trigger function
  const triggerMonitoring = async () => {
    try {
      if (isAdmin) {
        console.log('Manual payment monitoring triggered');
        // Admin monitoring logic
      }
    } catch (error) {
      console.error('Error in manual payment monitoring:', error);
      throw error;
    }
  };

  return { triggerMonitoring };
}