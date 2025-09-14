/**
 * Plisio Service using Firebase Functions (CORS-safe)
 * This service makes calls through Firebase Functions instead of direct API calls
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { PlisioMockService } from './plisioMockService';

export interface PlisioInvoice {
  id: string;
  url?: string;
  amount: number;
  currency: string;
  walletAddress: string;
  qrCode?: string;
  invoiceUrl?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'expired';
  expiresAt: number;
}

export interface PlisioPaymentRequest {
  amount: number;
  currency: string;
  userEmail?: string;
  userName?: string;
}

export class PlisioService {
  private userId: string;
  private useMockService: boolean;
  private mockService?: PlisioMockService;

  constructor(userId: string, useMockService: boolean = false) {
    this.userId = userId;
    this.useMockService = useMockService;
    if (useMockService) {
      this.mockService = new PlisioMockService(userId);
    }
  }

  /**
   * Create a new cryptocurrency invoice via Firebase Function
   */
  async createInvoice(request: PlisioPaymentRequest): Promise<PlisioInvoice> {
    if (this.useMockService && this.mockService) {
      return this.mockService.createInvoice(request);
    }

    try {
      const createInvoiceFunction = httpsCallable(functions, 'createPlisioInvoice');
      
      const result = await createInvoiceFunction({
        userId: this.userId,
        amount: request.amount,
        currency: request.currency,
        userEmail: request.userEmail,
        userName: request.userName
      });

      const data = result.data as any;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create invoice');
      }

      return data.invoice;

    } catch (error) {
      console.error('Error creating Plisio invoice:', error);
      
      // Auto-fallback to mock service if Firebase Functions fail or API is unavailable
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const shouldFallback = errorMessage.includes('internal') || 
                             errorMessage.includes('Invalid Plisio API key') ||
                             errorMessage.includes('temporarily unavailable') ||
                             errorMessage.includes('Using mock service instead') ||
                             errorMessage.includes('unavailable') ||
                             errorMessage.includes('failed-precondition');
      
      if (shouldFallback) {
        console.log('🔄 Falling back to mock service due to API issues...');
        if (!this.mockService) {
          this.mockService = new PlisioMockService(this.userId);
          this.useMockService = true;
        }
        return this.mockService.createInvoice(request);
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Get invoice status via Firebase Function
   */
  async getInvoice(invoiceId: string): Promise<PlisioInvoice> {
    if (this.useMockService && this.mockService) {
      return this.mockService.getInvoice(invoiceId);
    }

    try {
      const checkStatusFunction = httpsCallable(functions, 'checkPlisioInvoiceStatus');
      
      const result = await checkStatusFunction({
        invoiceId: invoiceId
      });

      const data = result.data as any;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get invoice status');
      }

      return data.invoice;

    } catch (error) {
      console.error('Error getting Plisio invoice:', error);
      
      // Auto-fallback to mock service for various error conditions
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const shouldFallback = errorMessage.includes('internal') || 
                             errorMessage.includes('Invoice not found') ||
                             errorMessage.includes('unavailable') ||
                             errorMessage.includes('failed-precondition') ||
                             errorMessage.includes('Using mock service instead') ||
                             invoiceId.startsWith('mock_invoice_');
      
      if (shouldFallback) {
        console.log('🔄 Falling back to mock service for invoice status...');
        if (!this.mockService) {
          this.mockService = new PlisioMockService(this.userId);
          this.useMockService = true;
        }
        return this.mockService.getInvoice(invoiceId);
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Get fee estimation via Firebase Function
   */
  async getFeeEstimation(currency: string, amount: number): Promise<{ fee: number }> {
    if (this.useMockService && this.mockService) {
      return this.mockService.getFeeEstimation(currency, amount);
    }

    try {
      const getFeeFunction = httpsCallable(functions, 'getPlisioFeeEstimation');
      
      const result = await getFeeFunction({
        currency: currency,
        amount: amount
      });

      const data = result.data as any;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get fee estimation');
      }

      return { fee: data.fee };

    } catch (error) {
      console.warn('Fee estimation failed:', error);
      
      // Auto-fallback to mock service
      if (error instanceof Error && (error.message.includes('internal') || error.message.includes('failed-precondition'))) {
        console.log('🔄 Falling back to mock service for fee estimation...');
        if (!this.mockService) {
          this.mockService = new PlisioMockService(this.userId);
          this.useMockService = true;
        }
        return this.mockService.getFeeEstimation(currency, amount);
      }
      
      // Return default fee if all fails
      return { fee: 0 };
    }
  }

  /**
   * Get supported currencies via Firebase Function
   */
  async getSupportedCurrencies(): Promise<Record<string, any>> {
    try {
      const getCurrenciesFunction = httpsCallable(functions, 'getPlisioCurrencies');
      
      const result = await getCurrenciesFunction({});
      const data = result.data as any;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get supported currencies');
      }

      return data.currencies;

    } catch (error) {
      console.error('Error getting Plisio currencies:', error);
      // Return fallback currencies
      return {
        'BTC': { name: 'Bitcoin', icon: '₿' },
        'ETH': { name: 'Ethereum', icon: 'Ξ' },
        'USDT': { name: 'Tether USD', icon: '₮' },
        'LTC': { name: 'Litecoin', icon: 'Ł' }
      };
    }
  }

  /**
   * Create instance with authenticated user
   */
  static createInstance(userId: string): PlisioService {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return new PlisioService(userId);
  }
}

// Common cryptocurrency options for UI (fallback)
export const SUPPORTED_CRYPTO_CURRENCIES = [
  { code: 'BTC', name: 'Bitcoin', icon: '₿' },
  { code: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { code: 'USDT', name: 'Tether USD', icon: '₮' },
  { code: 'USDC', name: 'USD Coin', icon: '$' },
  { code: 'LTC', name: 'Litecoin', icon: 'Ł' },
  { code: 'BCH', name: 'Bitcoin Cash', icon: '₿' },
  { code: 'TRX', name: 'TRON', icon: 'T' },
  { code: 'BNB', name: 'Binance Coin', icon: 'BNB' }
];
