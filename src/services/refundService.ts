// Automatic refund processing service - FIXED VERSION
import { doc, updateDoc, setDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EmailService } from './emailService';

export interface RefundRequest {
  rentalId: string;
  userId: string;
  amount: number;
  reason: 'cancelled' | 'failed' | 'expired' | 'manual';
  originalTransactionId?: string;
  skipIfAlreadyRefunded?: boolean; // NEW: Prevent double refunds
}

export class RefundService {
  // Process automatic refund for cancelled/failed rentals
  static async processRefund(request: RefundRequest): Promise<boolean> {
    try {
      console.log('Processing refund:', request);

      // Get the original rental data
      const rentalDoc = await getDoc(doc(db, 'rentals', request.rentalId));
      if (!rentalDoc.exists()) {
        throw new Error('Rental not found for refund');
      }

      const rentalData = rentalDoc.data();
      
      // FIXED: Check if already refunded to prevent double refunds
      if (rentalData.refundedAt || rentalData.refundAmount) {
        console.log('Rental already refunded, skipping:', request.rentalId);
        if (request.skipIfAlreadyRefunded) {
          return true; // Consider it successful if we should skip
        }
        throw new Error('Rental has already been refunded');
      }

      // Get the user's current balance
      const userDoc = await getDoc(doc(db, 'users', request.userId));
      if (!userDoc.exists()) {
        throw new Error('User not found for refund');
      }

      const userData = userDoc.data();
      const currentBalance = userData.walletBalance || 0;
      
      // FIXED: Use the MINIMUM of what was requested vs what user actually paid
      // This prevents over-refunding
      const userPaidAmount = rentalData.userPrice || rentalData.actualPrice || 0;
      const requestedRefund = request.amount || 0;
      
      // FIXED: Take the SMALLER amount to prevent over-refunding
      const safeRefundAmount = Math.min(userPaidAmount, requestedRefund);
      
      // FIXED: Ensure we don't refund negative amounts or zero
      if (safeRefundAmount <= 0) {
        console.warn('Invalid refund amount calculated:', {
          userPaidAmount,
          requestedRefund,
          safeRefundAmount,
          rentalId: request.rentalId
        });
        throw new Error('Cannot process refund: invalid amount');
      }

      // FIXED: Additional validation - don't refund more than what user paid
      if (safeRefundAmount > userPaidAmount) {
        console.error('Refund validation failed - trying to refund more than user paid:', {
          safeRefundAmount,
          userPaidAmount,
          rentalId: request.rentalId
        });
        throw new Error('Cannot refund more than user paid');
      }

      const userEmail = userData.email;
      const userName = userData.name || 'User';

      // Log refund details for audit
      console.log('SAFE Refund details:', {
        rentalId: request.rentalId,
        userId: request.userId,
        originalRequestAmount: request.amount,
        userPaidAmount: userPaidAmount,
        safeRefundAmount: safeRefundAmount,
        currentBalance: currentBalance,
        reason: request.reason
      });

      // FIXED: Use the safe refund amount
      await updateDoc(doc(db, 'users', request.userId), {
        walletBalance: increment(safeRefundAmount),
        lastUpdated: new Date()
      });

      // Create refund transaction record with detailed tracking
      const refundTransactionId = `refund_${request.rentalId}_${Date.now()}`;
      await setDoc(doc(db, 'transactions', refundTransactionId), {
        id: refundTransactionId,
        userId: request.userId,
        type: 'refund',
        amount: safeRefundAmount, // FIXED: Use safe amount
        description: `Refund for ${request.reason} rental`.replace(/<[^>]*>/g, ''),
        rentalId: request.rentalId,
        originalTransactionId: request.originalTransactionId,
        originalUserPrice: rentalData.userPrice,
        originalActualPrice: rentalData.actualPrice,
        originalRequestAmount: request.amount,
        calculatedRefundAmount: safeRefundAmount, // NEW: Track calculation
        currentBalanceBefore: currentBalance,
        currentBalanceAfter: currentBalance + safeRefundAmount,
        refundValidated: true,
        refundSafetyCheck: 'passed', // NEW: Safety flag
        reason: request.reason,
        status: 'completed',
        createdAt: new Date(),
        processedAt: new Date()
      });

      // Update rental status with detailed refund info
      await updateDoc(doc(db, 'rentals', request.rentalId), {
        status: request.reason === 'cancelled' ? 'cancelled' : 'refunded',
        refundAmount: safeRefundAmount, // FIXED: Use safe amount
        refundedAt: new Date(),
        refundReason: request.reason,
        refundValidated: true,
        refundTransactionId: refundTransactionId, // NEW: Link to transaction
        originalRefundRequest: request.amount, // NEW: Track original request
        actualRefundAmount: safeRefundAmount, // NEW: Track actual refund
        lastUpdated: new Date()
      });

      // Update system profit tracking
      await updateDoc(doc(db, 'system', 'profit_tracking'), {
        totalRefunds: increment(safeRefundAmount), // FIXED: Use safe amount
        totalRefundCount: increment(1),
        lastRefundAt: new Date(),
        lastUpdated: new Date()
      });

      // Send email notification
      try {
        await EmailService.sendTransactionConfirmation(
          userEmail,
          userName,
          {
            type: 'refund',
            amount: safeRefundAmount, // FIXED: Use safe amount
            description: `Refund for ${request.reason} rental`,
            date: new Date()
          }
        );
      } catch (emailError) {
        console.warn('Failed to send refund email:', emailError);
        // Don't fail the refund if email fails
      }

      console.log('Refund processed successfully:', refundTransactionId, 'Amount:', safeRefundAmount);
      return true;

    } catch (error) {
      console.error('Error processing refund:', error);
      
      // Log failed refund attempt with more details
      try {
        await setDoc(doc(db, 'failed_refunds', `${request.rentalId}_${Date.now()}`), {
          ...request,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
          attemptedAt: new Date(),
          processed: false,
          refundSafetyCheck: 'failed'
        });
      } catch (logError) {
        console.error('Failed to log refund error:', logError);
      }

      return false;
    }
  }

  // FIXED: Enhanced method to check if refund is safe
  static async validateRefundRequest(request: RefundRequest): Promise<{
    valid: boolean;
    safeAmount: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    
    try {
      const rentalDoc = await getDoc(doc(db, 'rentals', request.rentalId));
      if (!rentalDoc.exists()) {
        return { valid: false, safeAmount: 0, reasons: ['Rental not found'] };
      }

      const rentalData = rentalDoc.data();
      
      // Check if already refunded
      if (rentalData.refundedAt) {
        reasons.push('Already refunded');
      }

      const userPaidAmount = rentalData.userPrice || rentalData.actualPrice || 0;
      const requestedAmount = request.amount || 0;
      
      if (userPaidAmount <= 0) {
        reasons.push('User paid amount is zero or invalid');
      }

      if (requestedAmount > userPaidAmount) {
        reasons.push(`Requested refund (${requestedAmount}) exceeds amount paid (${userPaidAmount})`);
      }

      const safeAmount = Math.min(userPaidAmount, requestedAmount);
      const valid = reasons.length === 0 && safeAmount > 0;

      return { valid, safeAmount, reasons };
    } catch (error) {
      return { 
        valid: false, 
        safeAmount: 0, 
        reasons: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  // Process bulk refunds with safety checks
  static async processBulkRefunds(requests: RefundRequest[]): Promise<{
    successful: number;
    failed: number;
    errors: string[];
    totalRefunded: number;
  }> {
    let successful = 0;
    let failed = 0;
    let totalRefunded = 0;
    const errors: string[] = [];

    for (const request of requests) {
      try {
        // FIXED: Validate each request first
        const validation = await this.validateRefundRequest(request);
        
        if (!validation.valid) {
          failed++;
          errors.push(`Refund validation failed for ${request.rentalId}: ${validation.reasons.join(', ')}`);
          continue;
        }

        // Use the safe amount from validation
        request.amount = validation.safeAmount;
        
        const success = await this.processRefund(request);
        if (success) {
          successful++;
          totalRefunded += validation.safeAmount;
        } else {
          failed++;
          errors.push(`Failed to process refund for ${request.rentalId}`);
        }
      } catch (error) {
        failed++;
        errors.push(`Error refunding ${request.rentalId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { successful, failed, errors, totalRefunded };
  }

  // Check for expired rentals and auto-refund
  static async processExpiredRentals(): Promise<void> {
    try {
      console.log('Checking for expired rentals...');
      
      // This would typically be called by a scheduled function
      // Implementation would query for expired rentals and process refunds safely
      
    } catch (error) {
      console.error('Error processing expired rentals:', error);
    }
  }

  // Manual refund with enhanced safety
  static async manualRefund(
    rentalId: string,
    adminUserId: string,
    reason: string,
    overrideAmount?: number
  ): Promise<boolean> {
    try {
      const rentalDoc = await getDoc(doc(db, 'rentals', rentalId));
      if (!rentalDoc.exists()) {
        throw new Error('Rental not found');
      }

      const rentalData = rentalDoc.data();
      const refundAmount = overrideAmount || rentalData.userPrice || 0;
      
      const refundRequest: RefundRequest = {
        rentalId: rentalId,
        userId: rentalData.userId,
        amount: refundAmount,
        reason: 'manual'
      };

      // FIXED: Validate the manual refund
      const validation = await this.validateRefundRequest(refundRequest);
      
      if (!validation.valid) {
        console.error('Manual refund validation failed:', validation.reasons);
        return false;
      }

      // Use the safe amount
      refundRequest.amount = validation.safeAmount;
      
      const success = await this.processRefund(refundRequest);

      if (success) {
        // Log admin action
        await setDoc(doc(db, 'admin_actions', `refund_${rentalId}_${Date.now()}`), {
          action: 'manual_refund',
          adminUserId: adminUserId,
          rentalId: rentalId,
          requestedAmount: refundAmount,
          actualAmount: validation.safeAmount,
          reason: reason,
          validationPassed: true,
          timestamp: new Date()
        });
      }

      return success;
    } catch (error) {
      console.error('Error processing manual refund:', error);
      return false;
    }
  }
}
