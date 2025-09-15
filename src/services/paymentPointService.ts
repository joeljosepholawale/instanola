import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// PaymentPoint Virtual Account Service
interface PaymentPointVirtualAccountRequest {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

interface PaymentPointVirtualAccountResponse {
  success: boolean;
  message: string;
  account?: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    isPermanent: boolean;
  };
}

interface PaymentPointAccount {
  userId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  paymentPointCustomerId: string;
  reservedAccountId: string;
  createdAt: Date;
  isActive: boolean;
  provider: string;
}

export class PaymentPointService {
  private static createVirtualAccountFunction = httpsCallable<PaymentPointVirtualAccountRequest, PaymentPointVirtualAccountResponse>(
    functions,
    'createPaymentPointVirtualAccount'
  );

  /**
   * Create a PaymentPoint virtual account for the user
   */
  static async createVirtualAccount(data: PaymentPointVirtualAccountRequest): Promise<PaymentPointVirtualAccountResponse> {
    try {
      console.log('Creating PaymentPoint virtual account via Firebase Function:', data);
      
      // Check if Firebase Functions are available
      if (!functions) {
        throw new Error('PaymentPoint service requires Firebase Functions deployment. Please contact support.');
      }

      // Check for existing account first
      const existingAccountDoc = await getDoc(doc(db, 'paymentpoint_accounts', data.userId));
      if (existingAccountDoc.exists()) {
        const accountData = existingAccountDoc.data() as PaymentPointAccount;
        console.log('Existing PaymentPoint account found:', accountData.accountNumber);
        
        return {
          success: true,
          message: 'Account already exists',
          account: {
            accountNumber: accountData.accountNumber,
            accountName: accountData.accountName,
            bankName: accountData.bankName,
            isPermanent: true
          }
        };
      }

      // Create new account via Firebase Function
      const result = await this.createVirtualAccountFunction(data);
      
      if (!result.data.success) {
        throw new Error(result.data.message || 'Failed to create virtual account');
      }
      
      console.log('PaymentPoint virtual account created successfully:', result.data.account);
      return result.data;
      
    } catch (error) {
      console.error('Error creating PaymentPoint virtual account:', error);
      
      // Handle specific Firebase errors
      if (error instanceof Error) {
        if (error.message.includes('functions/not-found')) {
          throw new Error('PaymentPoint service is not deployed. Please contact support for assistance.');
        } else if (error.message.includes('functions/unauthenticated')) {
          throw new Error('Authentication required. Please log in again.');
        } else if (error.message.includes('functions/permission-denied')) {
          throw new Error('Access denied. Please contact support.');
        } else if (error.message.includes('functions/unavailable') || error.message.includes('fetch failed')) {
          throw new Error('PaymentPoint service is temporarily unavailable. Please contact support.');
        } else if (error.message.includes('functions/internal')) {
          throw new Error('PaymentPoint service is experiencing technical difficulties. Please contact support.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Get existing PaymentPoint account for user
   */
  static async getExistingAccount(userId: string): Promise<PaymentPointAccount | null> {
    try {
      const accountDoc = await getDoc(doc(db, 'paymentpoint_accounts', userId));
      if (accountDoc.exists()) {
        const data = accountDoc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as PaymentPointAccount;
      }
      return null;
    } catch (error) {
      console.error('Error getting existing PaymentPoint account:', error);
      return null;
    }
  }

  /**
   * Format account number for display
   */
  static formatAccountNumber(accountNumber: string): string {
    if (!accountNumber) return '';
    return accountNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  /**
   * Copy account details to clipboard
   */
  static async copyAccountDetails(account: PaymentPointVirtualAccountResponse['account']): Promise<void> {
    if (!account) return;
    
    const details = `
Account Name: ${account.accountName}
Account Number: ${account.accountNumber}
Bank: ${account.bankName}
    `.trim();
    
    try {
      await navigator.clipboard.writeText(details);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = details;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  /**
   * Validate customer details
   */
  static validateCustomerDetails(data: Partial<PaymentPointVirtualAccountRequest>): string[] {
    const errors: string[] = [];
    
    if (!data.customerName || data.customerName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters');
    }
    
    if (!data.customerEmail || !/\S+@\S+\.\S+/.test(data.customerEmail)) {
      errors.push('Valid email address is required');
    }
    
    if (data.customerPhone && !/^(\+?234|0)[789]\d{9}$/.test(data.customerPhone.replace(/\s/g, ''))) {
      errors.push('Valid Nigerian phone number is required');
    }
    
    return errors;
  }
}

export default PaymentPointService;