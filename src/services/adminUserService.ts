// Admin user management service
import { doc, updateDoc, increment, setDoc, getDoc, getDocs, collection, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EmailService } from './emailService';

export interface AdminFundAddition {
  userId: string;
  amount: number;
  reason: string;
  adminUserId: string;
}

export class AdminUserService {
  // Add funds to user account (admin only)
  static async addFundsToUser(addition: AdminFundAddition): Promise<boolean> {
    try {
      // Security validation
      if (!addition.adminUserId) {
        throw new Error('Admin user ID is required');
      }
      
      if (Math.abs(addition.amount) > 10000) {
        throw new Error('Invalid amount: must be between -$10,000 and $10,000');
      }
      
      if (!addition.reason || addition.reason.trim().length < 5) {
        throw new Error('Reason must be at least 5 characters long');
      }
      
      console.log('Adding funds to user:', addition);

      // Get user data
      const userDoc = await getDoc(doc(db, 'users', addition.userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const userEmail = userData.email;
      const userName = userData.name || 'User';
      const currentBalance = userData.walletBalance || 0;
      const currentBalanceNGN = userData.walletBalanceNGN || 0;

      // Prevent negative balance for fund removal
      if (addition.amount < 0) {
        const removeAmount = Math.abs(addition.amount);
        if (removeAmount > currentBalance) {
          throw new Error(`Cannot remove $${removeAmount.toFixed(2)}. User only has $${currentBalance.toFixed(2)}`);
        }
      }

      // Calculate new balance directly to avoid race conditions
      const newBalance = currentBalance + addition.amount;
      const newBalanceNGN = currentBalanceNGN + (addition.amount < 0 && currentBalanceNGN > 0 ? 
        -Math.min(Math.abs(addition.amount) * 1600, currentBalanceNGN) : 0);

      // Update user wallet with exact amount (positive or negative)
      const updateData: any = {
        walletBalance: newBalance,
        walletBalanceNGN: Math.max(0, newBalanceNGN),
        lastUpdated: new Date(),
        lastTransactionAt: new Date() // Prevent monitoring false positives
      };


      await updateDoc(doc(db, 'users', addition.userId), updateData);

      // Create transaction record
      const transactionId = `admin_${addition.amount >= 0 ? 'add' : 'remove'}_${addition.userId}_${Date.now()}`;
      await setDoc(doc(db, 'transactions', transactionId), {
        id: transactionId,
        userId: addition.userId,
        type: addition.amount >= 0 ? 'deposit' : 'withdrawal',
        amount: addition.amount,
        provider: 'admin_manual',
        status: 'completed',
        description: `Admin ${addition.amount >= 0 ? 'added' : 'removed'} funds: ${addition.reason}`,
        adminUserId: addition.adminUserId,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + addition.amount,
        lastTransactionAt: new Date(),
        createdAt: new Date()
      });

      // Log admin action
      await setDoc(doc(db, 'admin_actions', `${addition.amount >= 0 ? 'add' : 'remove'}_funds_${addition.userId}_${Date.now()}`), {
        action: addition.amount >= 0 ? 'add_funds' : 'remove_funds',
        adminUserId: addition.adminUserId,
        targetUserId: addition.userId,
        amount: addition.amount,
        reason: addition.reason,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + addition.amount,
        timestamp: new Date()
      });

      // Send notification email to user
      try {
        await EmailService.sendTransactionConfirmation(
          userEmail,
          userName,
          {
            type: addition.amount >= 0 ? 'deposit' : 'refund',
            amount: addition.amount,
            description: `Admin ${addition.amount >= 0 ? 'added' : 'removed'} funds: ${addition.reason}`,
            date: new Date()
          }
        );
      } catch (emailError) {
        console.warn('Failed to send fund modification email:', emailError);
      }

      console.log(`Funds ${addition.amount >= 0 ? 'added' : 'removed'} successfully:`, transactionId);
      return true;

    } catch (error) {
      console.error('Error modifying user funds:', error);
      throw error;
    }
  }

  // Get all users with pagination (admin only)
  static async getAllUsers(limitCount: number = 100): Promise<any[]> {
    try {
      // Limit users for better performance - admin can load more if needed
      const usersQuery = query(
        collection(db, 'users'),
        limit(limitCount)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      console.log(`Loaded ${usersSnapshot.docs.length} users for admin panel`);
      
      return usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastActive: doc.data().lastActive?.toDate() || new Date(),
        lastUpdated: doc.data().lastUpdated?.toDate() || new Date()
      }));
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }

  // Update user status (admin only)
  static async updateUserStatus(
    userId: string,
    adminUserId: string,
    updates: {
      name?: string;
      email?: string;
      isAdmin?: boolean;
      isBlocked?: boolean;
      notes?: string;
    }
  ): Promise<boolean> {
    try {
      // Validate admin user ID
      if (!adminUserId) {
        throw new Error('Admin user ID is required');
      }

      // Prevent blocking admin users
      if (updates.isBlocked === true) {
        const targetUserDoc = await getDoc(doc(db, 'users', userId));
        if (targetUserDoc.exists()) {
          const targetUserData = targetUserDoc.data();
          if (targetUserData.isAdmin === true) {
            throw new Error('Cannot block admin users');
          }
        }
      }

      // Get current user data for logging
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      const currentData = userDoc.data();

      const updateData: any = {
        ...updates,
        lastUpdated: new Date(),
        // Add security timestamp for blocked users
        ...(updates.isBlocked !== undefined && {
          blockedAt: updates.isBlocked ? new Date() : null,
          blockedBy: updates.isBlocked ? adminUserId : null,
          forceLogout: updates.isBlocked ? true : false // Force logout when blocked
        })
      };

      await updateDoc(doc(db, 'users', userId), updateData);

      // Log admin action
      await setDoc(doc(db, 'admin_actions', `update_user_${userId}_${Date.now()}`), {
        action: 'update_user_status',
        adminUserId: adminUserId,
        targetUserId: userId,
        updates: updates,
        previousData: {
          name: currentData.name,
          email: currentData.email,
          isAdmin: currentData.isAdmin,
          isBlocked: currentData.isBlocked
        },
        timestamp: new Date()
      });

      // If blocking user, also log security event
      if (updates.isBlocked === true && !currentData.isBlocked) {
        await setDoc(doc(db, 'security_events', `user_blocked_${userId}_${Date.now()}`), {
          type: 'admin_action',
          userId: userId,
          adminUserId: adminUserId,
          details: {
            action: 'user_blocked',
            reason: updates.notes || 'Blocked by admin',
            userEmail: currentData.email
          },
          severity: 'medium',
          timestamp: new Date(),
          resolved: true
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  // Get user statistics (admin only)
  static async getUserStatistics(userId: string): Promise<any> {
    try {
      // Get user's transactions with proper query filtering
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        limit(100) // Limit for performance
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const userTransactions = transactionsSnapshot.docs.map(doc => doc.data());

      // Get user's rentals with proper query filtering  
      const rentalsQuery = query(
        collection(db, 'rentals'),
        where('userId', '==', userId),
        limit(100) // Limit for performance
      );
      const rentalsSnapshot = await getDocs(rentalsQuery);
      const userRentals = rentalsSnapshot.docs.map(doc => doc.data());

      // Calculate statistics
      const totalDeposits = userTransactions
        .filter(t => t.type === 'deposit' && t.status === 'completed')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const totalSpent = userTransactions
        .filter(t => t.type === 'purchase' && t.status === 'completed')
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

      const totalRentals = userRentals.length;
      const completedRentals = userRentals.filter(r => r.status === 'completed').length;
      const successRate = totalRentals > 0 ? (completedRentals / totalRentals) * 100 : 0;

      return {
        totalDeposits,
        totalSpent,
        totalRentals,
        completedRentals,
        successRate: Math.round(successRate * 10) / 10,
        lastTransaction: userTransactions.length > 0 
          ? Math.max(...userTransactions.map(t => t.createdAt?.toDate?.()?.getTime() || 0))
          : null
      };
    } catch (error) {
      console.error('Error getting user statistics:', error);
      return {
        totalDeposits: 0,
        totalSpent: 0,
        totalRentals: 0,
        completedRentals: 0,
        successRate: 0,
        lastTransaction: null
      };
    }
  }

  // Get admin activity log
  static async getAdminActivityLog(): Promise<any[]> {
    try {
      const actionsSnapshot = await getDocs(collection(db, 'admin_actions'));
      return actionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Error fetching admin activity log:', error);
      return [];
    }
  }
}