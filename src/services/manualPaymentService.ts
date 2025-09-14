// Manual Payment Service for Naira payments with admin confirmation
import { doc, setDoc, updateDoc, increment, getDoc, getDocs, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EmailService } from './emailService';

export interface ManualPaymentRequest {
  userId: string;
  userEmail?: string;
  amountNGN: number;
  amountUSD: number;
  exchangeRate: number;
  senderName: string;
  senderPhone?: string;
  transactionReference: string;
  paymentMethod: 'opay' | 'gtbank' | 'access' | 'other';
  receiptUrl: string;
  notes?: string;
}

export interface ManualPayment {
  id: string;
  userId: string;
  userEmail?: string;
  amountNGN: number;
  amountUSD: number;
  exchangeRate: number;
  senderName: string;
  senderPhone?: string;
  transactionReference: string;
  paymentMethod: string;
  receiptUrl: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

export class ManualPaymentService {
  // Get current NGN to USD exchange rate
  static async getExchangeRate(): Promise<number> {
    try {
      // Try to get rate from a free API
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      const usdToNgn = data.rates.NGN;
      const ngnToUsd = 1 / usdToNgn;
      
      console.log(`Current exchange rate: 1 USD = ${usdToNgn} NGN`);
      return ngnToUsd;
    } catch (error) {
      console.warn('Failed to fetch live exchange rate, using fallback:', error);
      // Fallback rate (approximate as of 2024)
      return 1 / 1600; // 1 NGN = 0.000625 USD (1600 NGN = 1 USD)
    }
  }

  // Submit manual payment request
  static async submitPaymentRequest(request: ManualPaymentRequest): Promise<string> {
    try {
      // Validate request data
      if (!request.userId || !request.senderName?.trim()) {
        throw new Error('Missing required payment information');
      }
      
      if (request.amountNGN < 1000) {
        throw new Error('Minimum payment amount is ₦1,000');
      }
      
      if (request.amountUSD < 0.50) {
        throw new Error('Minimum USD equivalent is $0.50');
      }
      
      const paymentId = `manual_${request.userId}_${Date.now()}`;
      
      const paymentData: ManualPayment = {
        id: paymentId,
        userId: request.userId,
        userEmail: request.userEmail || '',
        amountNGN: request.amountNGN,
        amountUSD: request.amountUSD,
        exchangeRate: request.exchangeRate,
        senderName: request.senderName.trim(),
        senderPhone: request.senderPhone || '',
        transactionReference: request.transactionReference || `manual_${Date.now()}`,
        paymentMethod: request.paymentMethod,
        receiptUrl: request.receiptUrl || '',
        notes: request.notes || '',
        status: 'pending',
        submittedAt: new Date()
      };

      // Save to Firebase
      await setDoc(doc(db, 'manual_payments', paymentId), paymentData);

      // Create pending transaction record
      await setDoc(doc(db, 'transactions', `pending_${paymentId}`), {
        userId: request.userId,
        type: 'deposit',
        amount: request.amountUSD,
        provider: 'manual_payment',
        paymentId: paymentId,
        status: 'pending',
        description: `Manual payment - ₦${request.amountNGN.toLocaleString()} (${request.paymentMethod})`,
        amountNGN: request.amountNGN,
        currency: 'NGN',
        exchangeRate: request.exchangeRate,
        senderName: request.senderName,
        createdAt: new Date()
      });

      // Send notification email to user
      try {
        const userDoc = await getDoc(doc(db, 'users', request.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          await EmailService.sendTransactionConfirmation(
            userData.email,
            userData.name || 'User',
            {
              type: 'deposit',
              amount: request.amountUSD,
              description: `Manual payment submitted - ₦${request.amountNGN.toLocaleString()} (Approval in 10-15 minutes)`,
              date: new Date()
            }
          );
        }
      } catch (emailError) {
        console.warn('Failed to send payment submission email:', emailError);
      }

      return paymentId;
    } catch (error) {
      console.error('Error submitting manual payment:', error);
      throw error;
    }
  }

  // Submit crypto payment request (manual approval)
  static async submitCryptoPaymentRequest(request: {
    userId: string;
    userEmail: string;
    amountUSD: number;
    cryptoNetwork: string;
    cryptoSymbol: string;
    cryptoAddress: string;
    senderName: string;
    receiptUrl: string;
    paymentMethod: string;
    transactionReference: string;
  }): Promise<string> {
    try {
      // Validate request data
      if (!request.userId || !request.senderName?.trim()) {
        throw new Error('Missing required payment information');
      }
      
      if (request.amountUSD < 1) {
        throw new Error('Minimum payment amount is $1.00');
      }
      
      if (request.amountUSD > 10000) {
        throw new Error('Maximum payment amount is $10,000');
      }
      
      const paymentId = `crypto_${request.userId}_${Date.now()}`;
      
      const paymentData = {
        id: paymentId,
        userId: request.userId,
        userEmail: request.userEmail,
        amountUSD: request.amountUSD,
        cryptoNetwork: request.cryptoNetwork,
        cryptoSymbol: request.cryptoSymbol,
        cryptoAddress: request.cryptoAddress,
        senderName: request.senderName.trim(),
        transactionReference: request.transactionReference,
        paymentMethod: request.paymentMethod,
        receiptUrl: request.receiptUrl,
        status: 'pending',
        submittedAt: new Date(),
        type: 'crypto_manual'
      };

      // Save to Firebase
      await setDoc(doc(db, 'manual_payments', paymentId), paymentData);

      // Create pending transaction record
      await setDoc(doc(db, 'transactions', `pending_${paymentId}`), {
        userId: request.userId,
        type: 'deposit',
        amount: request.amountUSD,
        provider: 'crypto_manual',
        paymentId: paymentId,
        status: 'pending',
        description: `Crypto payment - $${request.amountUSD} (${request.cryptoSymbol})`,
        cryptoNetwork: request.cryptoNetwork,
        cryptoSymbol: request.cryptoSymbol,
        cryptoAddress: request.cryptoAddress,
        senderName: request.senderName,
        createdAt: new Date()
      });

      // Send notification email to user
      try {
        const userDoc = await getDoc(doc(db, 'users', request.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          await EmailService.sendTransactionConfirmation(
            userData.email,
            userData.name || 'User',
            {
              type: 'deposit',
              amount: request.amountUSD,
              description: `Crypto payment submitted - $${request.amountUSD} (${request.cryptoSymbol}) - Approval in 10-15 minutes`,
              date: new Date()
            }
          );
        }
      } catch (emailError) {
        console.warn('Failed to send crypto payment submission email:', emailError);
      }

      return paymentId;
    } catch (error) {
      console.error('Error submitting crypto payment:', error);
      throw error;
    }
  }

  // Get all manual payments (admin only)
  static async getAllPayments(limitCount: number = 100): Promise<ManualPayment[]> {
    try {
      // Add limit to prevent performance issues
      const paymentsQuery = query(
        collection(db, 'manual_payments'),
        limit(limitCount)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      console.log(`Loaded ${paymentsSnapshot.docs.length} payments for admin panel`);
      
      const payments = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate() || new Date(),
        reviewedAt: doc.data().reviewedAt?.toDate()
      })) as ManualPayment[];
      
      // Sort in memory instead of using Firestore orderBy
      return payments.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    } catch (error) {
      console.error('Error fetching all payments:', error);
      return [];
    }
  }

  // Get pending manual payments (admin only) - optimized query
  static async getPendingPayments(): Promise<ManualPayment[]> {
    try {
      // Direct query for pending payments instead of filtering all payments
      const pendingQuery = query(
        collection(db, 'manual_payments'),
        where('status', '==', 'pending'),
        limit(50)
      );
      const snapshot = await getDocs(pendingQuery);
      
      const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate() || new Date(),
        reviewedAt: doc.data().reviewedAt?.toDate()
      })) as ManualPayment[];
      
      return payments.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      return [];
    }
  }

  // Approve manual payment (admin only)
  static async approvePayment(paymentId: string, adminUserId: string): Promise<boolean> {
    try {
      const paymentDoc = await getDoc(doc(db, 'manual_payments', paymentId));
      if (!paymentDoc.exists()) {
        throw new Error('Payment not found');
      }

      const paymentData = paymentDoc.data() as ManualPayment;
      
      if (paymentData.status !== 'pending') {
        throw new Error('Payment is not pending');
      }

      // Update payment status
      await updateDoc(doc(db, 'manual_payments', paymentId), {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: adminUserId
      });

      // Add funds to user wallet
      await updateDoc(doc(db, 'users', paymentData.userId), {
        walletBalance: increment(paymentData.amountUSD),
        lastUpdated: new Date()
      });

      // Update transaction status
      await updateDoc(doc(db, 'transactions', `pending_${paymentId}`), {
        status: 'completed',
        approvedAt: new Date(),
        approvedBy: adminUserId
      });

      // Create completed transaction record
      await setDoc(doc(db, 'transactions', `approved_${paymentId}`), {
        userId: paymentData.userId,
        type: 'deposit',
        amount: paymentData.amountUSD,
        provider: 'manual_payment',
        paymentId: paymentId,
        status: 'completed',
        description: `Manual payment approved - ₦${paymentData.amountNGN.toLocaleString()} (${paymentData.paymentMethod})`,
        amountNGN: paymentData.amountNGN,
        exchangeRate: paymentData.exchangeRate,
        senderName: paymentData.senderName,
        approvedBy: adminUserId,
        createdAt: new Date()
      });

      // Send approval email to user
      try {
        const userDoc = await getDoc(doc(db, 'users', paymentData.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          await EmailService.sendTransactionConfirmation(
            userData.email,
            userData.name || 'User',
            {
              type: 'deposit',
              amount: paymentData.amountUSD,
              description: `Manual payment approved - ₦${paymentData.amountNGN.toLocaleString()}`,
              date: new Date()
            }
          );
        }
      } catch (emailError) {
        console.warn('Failed to send approval email:', emailError);
      }

      // Log admin action
      await setDoc(doc(db, 'admin_actions', `approve_${paymentId}_${Date.now()}`), {
        action: 'approve_manual_payment',
        adminUserId: adminUserId,
        paymentId: paymentId,
        amount: paymentData.amountUSD,
        amountNGN: paymentData.amountNGN,
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error approving manual payment:', error);
      return false;
    }
  }

  // Reject manual payment (admin only)
  static async rejectPayment(paymentId: string, adminUserId: string, reason: string): Promise<boolean> {
    try {
      const paymentDoc = await getDoc(doc(db, 'manual_payments', paymentId));
      if (!paymentDoc.exists()) {
        throw new Error('Payment not found');
      }

      const paymentData = paymentDoc.data() as ManualPayment;
      
      if (paymentData.status !== 'pending') {
        throw new Error('Payment is not pending');
      }

      // Update payment status
      await updateDoc(doc(db, 'manual_payments', paymentId), {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        rejectionReason: reason
      });

      // Update transaction status
      await updateDoc(doc(db, 'transactions', `pending_${paymentId}`), {
        status: 'failed',
        rejectedAt: new Date(),
        rejectedBy: adminUserId,
        rejectionReason: reason
      });

      // Send rejection email to user
      try {
        await EmailService.sendPaymentRejectionEmail(
          paymentData.userEmail,
          paymentData.senderName,
          {
            amountNGN: paymentData.amountNGN,
            amountUSD: paymentData.amountUSD,
            transactionReference: paymentData.transactionReference,
            paymentMethod: paymentData.paymentMethod,
            reason: reason,
            rejectedAt: new Date()
          }
        );
      } catch (emailError) {
        console.warn('Failed to send rejection email:', emailError);
      }

      // Log admin action
      await setDoc(doc(db, 'admin_actions', `reject_${paymentId}_${Date.now()}`), {
        action: 'reject_manual_payment',
        adminUserId: adminUserId,
        paymentId: paymentId,
        amount: paymentData.amountUSD,
        amountNGN: paymentData.amountNGN,
        reason: reason,
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error rejecting manual payment:', error);
      return false;
    }
  }

  // Get user's manual payment history
  static async getUserPayments(userId: string): Promise<ManualPayment[]> {
    try {
      // Use a simpler query without orderBy to avoid index requirement
      const paymentsQuery = query(
        collection(db, 'manual_payments'),
        where('userId', '==', userId),
        limit(20)
      );
      
      const snapshot = await getDocs(paymentsQuery);
      const payments = snapshot.docs.map(doc => ({
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate() || new Date(),
        reviewedAt: doc.data().reviewedAt?.toDate()
      })) as ManualPayment[];
      
      // Sort in memory instead of using Firestore orderBy
      return payments.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    } catch (error) {
      console.error('Error fetching user payments:', error);
      return [];
    }
  }
}