import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { FirebaseError } from 'firebase/app';

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

class PaymentPointService {
  private createVirtualAccountFunction = httpsCallable<PaymentPointVirtualAccountRequest, PaymentPointVirtualAccountResponse>(
    functions,
    'createPaymentPointVirtualAccount'
  );

  /**
   * Create a PaymentPoint virtual account for the user
   */
  async createVirtualAccount(data: PaymentPointVirtualAccountRequest): Promise<PaymentPointVirtualAccountResponse> {
    try {
      console.log('Creating PaymentPoint virtual account:', data);
      
      const result = await this.createVirtualAccountFunction(data);
      
      console.log('PaymentPoint virtual account result:', result.data);
      
      if (!result.data.success) {
        throw new Error(result.data.message || 'Failed to create virtual account');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error creating PaymentPoint virtual account:', error);
      
      // Handle Firebase function deployment issues
      if (error instanceof FirebaseError) {
        if (error.code === 'functions/not-found') {
          throw new Error('PaymentPoint service is not available in development mode. Please use manual payment options.');
        } else if (error.code === 'functions/unauthenticated') {
          throw new Error('Authentication required. Please log in again.');
        } else if (error.code === 'functions/permission-denied') {
          throw new Error('Access denied. Please contact support.');
        } else if (error.code === 'functions/unavailable') {
          throw new Error('PaymentPoint service is temporarily unavailable. Please use manual payment options.');
        } else if (error.code === 'functions/internal') {
          throw new Error('PaymentPoint service encountered an error. Please use manual payment options or contact support.');
        }
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch failed')) {
        throw new Error('PaymentPoint service connection failed. Please use manual payment options.');
      }
      
      throw error;
    }
  }

  /**
   * Format account number for display
   */
  formatAccountNumber(accountNumber: string): string {
    if (!accountNumber) return '';
    
    // Add spacing for better readability
    return accountNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  /**
   * Copy account details to clipboard
   */
  async copyAccountDetails(account: PaymentPointVirtualAccountResponse['account']): Promise<void> {
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
  validateCustomerDetails(data: Partial<PaymentPointVirtualAccountRequest>): string[] {
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

export const paymentPointService = new PaymentPointService();
export default paymentPointService;
