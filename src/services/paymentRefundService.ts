// Comprehensive Payment Refund Service
import { doc, setDoc, updateDoc, increment, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EmailService } from './emailService';

export interface PaymentRefund {
  paymentId: string;
  userId: string;
  amount: number;
  reason: 'failed' | 'expired' | 'cancelled' | 'timeout' | 'insufficient_payment';
  provider: 'paymentpoint' | 'nowpayments';
  originalStatus: string;
  processedAt: Date;
}

export class PaymentRefundService {
  // Process automatic refund for failed/expired payments
  static async processPaymentRefund(refund: PaymentRefund, isAdmin: boolean = false): Promise<boolean> {
    try {
      console.log('Processing payment refund:', refund);

      // Get user data
      const userDoc = await getDoc(doc(db, 'users', refund.userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const userEmail = userData.email;
      const userName = userData.name || 'User';

      // Add refund amount back to user wallet
      await updateDoc(doc(db, 'users', refund.userId), {
        walletBalance: increment(refund.amount),
        lastUpdated: new Date()
      });

      // Create refund transaction record
      const refundTransactionId = `refund_${refund.paymentId}_${Date.now()}`;
      await setDoc(doc(db, 'transactions', refundTransactionId), {
        id: refundTransactionId,
        userId: refund.userId,
        type: 'refund',
        amount: refund.amount,
        description: `Refund for ${refund.reason} payment`.replace(/<[^>]*>/g, ''),
        paymentId: refund.paymentId,
        provider: refund.provider,
        reason: refund.reason,
        originalStatus: refund.originalStatus,
        status: 'completed',
        createdAt: new Date(),
        processedAt: refund.processedAt
      });

      // Update payment status to refunded
      await updateDoc(doc(db, 'payments', refund.paymentId), {
        status: 'refunded',
        refundAmount: refund.amount,
        refundedAt: new Date(),
        refundReason: refund.reason,
        refundTransactionId: refundTransactionId,
        lastUpdated: new Date()
      });

      // Update system refund tracking (admin only)
      if (isAdmin) {
        await setDoc(doc(db, 'system', 'refund_tracking'), {
          totalRefunds: increment(refund.amount),
          totalRefundCount: increment(1),
          [`${refund.provider}Refunds`]: increment(refund.amount),
          [`${refund.reason}Refunds`]: increment(1),
          lastRefundAt: new Date(),
          lastUpdated: new Date()
        }, { merge: true });
      }

      // Send refund notification email
      try {
        await EmailService.sendTransactionConfirmation(
          userEmail,
          userName,
          {
            type: 'refund',
            amount: refund.amount,
            description: `Refund for ${refund.reason} payment (${refund.provider})`,
            date: new Date()
          }
        );
      } catch (emailError) {
        console.warn('Failed to send refund email:', emailError);
      }

      console.log('Payment refund processed successfully:', refundTransactionId);
      return true;

    } catch (error) {
      console.error('Error processing payment refund:', error);
      
      // Log failed refund attempt
      if (isAdmin) {
        try {
          await setDoc(doc(db, 'failed_refunds', `${refund.paymentId}_${Date.now()}`), {
            ...refund,
            error: error instanceof Error ? error.message : 'Unknown error',
            attemptedAt: new Date(),
            processed: false
          });
        } catch (logError) {
          console.error('Failed to log refund error:', logError);
        }
      }

      return false;
    }
  }

  // Check for expired payments and process refunds
  static async processExpiredPayments(isAdmin: boolean = false, userId?: string): Promise<void> {
    try {
      console.log('Checking for expired payments...');
      
      // Get all pending payments
      let paymentsQuery;
      if (isAdmin) {
        paymentsQuery = query(
          collection(db, 'payments'),
          where('status', 'in', ['pending', 'waiting', 'confirming'])
        );
      } else if (userId) {
        paymentsQuery = query(
          collection(db, 'payments'),
          where('userId', '==', userId),
          where('status', 'in', ['pending', 'waiting', 'confirming'])
        );
      } else {
        console.log('No userId provided for non-admin user, skipping expired payments check');
        return;
      }
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const now = new Date();
      
      for (const paymentDoc of paymentsSnapshot.docs) {
        const payment = paymentDoc.data();
        const expiresAt = payment.expiresAt?.toDate();
        
        if (expiresAt && expiresAt < now) {
          // Payment has expired, just cancel it (no refund needed since no money was taken)
          await updateDoc(doc(db, 'payments', payment.id), {
            status: 'expired',
            expiredAt: new Date(),
            lastUpdated: new Date()
          });

          // Create a cancelled transaction record (no money movement)
          await setDoc(doc(db, 'transactions', `expired_${payment.id}_${Date.now()}`), {
            userId: payment.userId,
            type: 'cancelled',
            amount: 0, // No money movement
            description: `Payment expired - ${payment.provider}`,
            paymentId: payment.id,
            provider: payment.provider,
            reason: 'expired',
            originalStatus: payment.status,
            status: 'completed',
            createdAt: new Date()
          });

          console.log('Payment expired and cancelled:', payment.id);
        }
      }
      
    } catch (error) {
      console.error('Error processing expired payments:', error);
    }
  }

  // Check for failed payments and process refunds
  static async processFailedPayments(isAdmin: boolean = false, userId?: string): Promise<void> {
    try {
      console.log('Checking for failed payments...');
      
      // Get all failed payments that haven't been refunded
      let paymentsQuery;
      if (isAdmin) {
        paymentsQuery = query(
          collection(db, 'payments'),
          where('status', 'in', ['failed', 'error', 'declined', 'cancelled'])
        );
      } else if (userId) {
        paymentsQuery = query(
          collection(db, 'payments'),
          where('userId', '==', userId),
          where('status', 'in', ['failed', 'error', 'declined', 'cancelled'])
        );
      } else {
        console.log('No userId provided for non-admin user, skipping failed payments check');
        return;
      }
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      for (const paymentDoc of paymentsSnapshot.docs) {
        const payment = paymentDoc.data();
        
        // Skip if already refunded
        if (payment.status === 'refunded' || payment.refundedAt) {
          continue;
        }
        
        const refund: PaymentRefund = {
          paymentId: payment.id,
          userId: payment.userId,
          amount: payment.amount,
          reason: 'failed',
          provider: payment.provider,
          originalStatus: payment.status,
          processedAt: new Date()
        };
        
        await this.processPaymentRefund(refund, isAdmin);
      }
      
    } catch (error) {
      console.error('Error processing failed payments:', error);
    }
  }

  // Manual refund (admin only)
  static async manualRefund(
    paymentId: string,
    adminUserId: string,
    reason: string
  ): Promise<boolean> {
    try {
      // Get payment data
      const paymentDoc = await getDoc(doc(db, 'payments', paymentId));
      if (!paymentDoc.exists()) {
        throw new Error('Payment not found');
      }

      const paymentData = paymentDoc.data();
      
      // Skip if already refunded
      if (paymentData.status === 'refunded' || paymentData.refundedAt) {
        throw new Error('Payment already refunded');
      }
      
      const refund: PaymentRefund = {
        paymentId: paymentId,
        userId: paymentData.userId,
        amount: paymentData.amount,
        reason: 'cancelled',
        provider: paymentData.provider,
        originalStatus: paymentData.status,
        processedAt: new Date()
      };

      const success = await this.processPaymentRefund(refund);

      if (success) {
        // Log admin action
        await setDoc(doc(db, 'admin_actions', `refund_${paymentId}_${Date.now()}`), {
          action: 'manual_refund',
          adminUserId: adminUserId,
          paymentId: paymentId,
          amount: refund.amount,
          reason: reason,
          timestamp: new Date()
        });
      }

      return success;
    } catch (error) {
      console.error('Error processing manual refund:', error);
      throw error;
    }
  }

  // Get refund statistics
  static async getRefundStats(): Promise<any> {
    try {
      const refundDoc = await getDoc(doc(db, 'system', 'refund_tracking'));
      if (refundDoc.exists()) {
        return refundDoc.data();
      }
      return {
        totalRefunds: 0,
        totalRefundCount: 0,
        paymentpointRefunds: 0,
        nowpaymentsRefunds: 0,
        failedRefunds: 0,
        expiredRefunds: 0,
        cancelledRefunds: 0
      };
    } catch (error) {
      console.error('Error getting refund stats:', error);
      return {};
    }
  }

  // Retry failed refunds
  static async retryFailedRefunds(): Promise<void> {
    try {
      console.log('Retrying failed refunds...');
      
      const failedRefundsQuery = query(
        collection(db, 'failed_refunds'),
        where('processed', '==', false)
      );
      
      const failedRefundsSnapshot = await getDocs(failedRefundsQuery);
      
      for (const failedRefundDoc of failedRefundsSnapshot.docs) {
        const failedRefund = failedRefundDoc.data();
        
        // Retry the refund
        const success = await this.processPaymentRefund({
          paymentId: failedRefund.paymentId,
          userId: failedRefund.userId,
          amount: failedRefund.amount,
          reason: failedRefund.reason,
          provider: failedRefund.provider,
          originalStatus: failedRefund.originalStatus,
          processedAt: new Date()
        });
        
        if (success) {
          // Mark as processed
          await updateDoc(doc(db, 'failed_refunds', failedRefundDoc.id), {
            processed: true,
            retrySuccessAt: new Date()
          });
        }
      }
      
    } catch (error) {
      console.error('Error retrying failed refunds:', error);
    }
  }
}