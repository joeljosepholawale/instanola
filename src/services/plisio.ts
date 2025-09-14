/**
 * Plisio API Service for Cryptocurrency Payments
 * Documentation: https://plisio.net/documentation
 */

export interface PlisioInvoice {
  id: string;
  url: string;
  amount: string;
  currency: string;
  status: 'pending' | 'completed' | 'cancelled' | 'expired';
  created_at: string;
  expires_at: string;
}

export interface PlisioCreateInvoiceRequest {
  amount: number;
  currency_from: string; // USD
  currency_to: string; // BTC, ETH, USDT, etc.
  order_number?: string;
  order_name?: string;
  callback_url?: string;
  success_callback_url?: string;
  fail_callback_url?: string;
  email?: string;
}

export interface PlisioApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
}

export class PlisioService {
  private baseUrl = 'https://api.plisio.net/api/v1';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Create a new cryptocurrency invoice
   */
  async createInvoice(params: PlisioCreateInvoiceRequest): Promise<PlisioInvoice> {
    const queryParams = new URLSearchParams({
      api_key: this.apiKey,
      amount: params.amount.toString(),
      currency_from: params.currency_from,
      currency_to: params.currency_to,
      ...(params.order_number && { order_number: params.order_number }),
      ...(params.order_name && { order_name: params.order_name }),
      ...(params.callback_url && { callback_url: params.callback_url }),
      ...(params.success_callback_url && { success_callback_url: params.success_callback_url }),
      ...(params.fail_callback_url && { fail_callback_url: params.fail_callback_url }),
      ...(params.email && { email: params.email })
    });

    const response = await fetch(`${this.baseUrl}/invoices?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result: PlisioApiResponse<PlisioInvoice> = await response.json();
    
    if (result.status === 'error') {
      throw new Error(result.error || 'Failed to create invoice');
    }

    return result.data!;
  }

  /**
   * Get invoice status and details
   */
  async getInvoice(invoiceId: string): Promise<PlisioInvoice> {
    const queryParams = new URLSearchParams({
      api_key: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/operations/${invoiceId}?${queryParams}`, {
      method: 'GET',
    });

    const result: PlisioApiResponse<PlisioInvoice> = await response.json();
    
    if (result.status === 'error') {
      throw new Error(result.error || 'Failed to get invoice');
    }

    return result.data!;
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<Record<string, number>> {
    const queryParams = new URLSearchParams({
      api_key: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/balance?${queryParams}`, {
      method: 'GET',
    });

    const result: PlisioApiResponse<Record<string, number>> = await response.json();
    
    if (result.status === 'error') {
      throw new Error(result.error || 'Failed to get balance');
    }

    return result.data!;
  }

  /**
   * Get supported cryptocurrencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    const queryParams = new URLSearchParams({
      api_key: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/crypto-coins?${queryParams}`, {
      method: 'GET',
    });

    const result: PlisioApiResponse<string[]> = await response.json();
    
    if (result.status === 'error') {
      throw new Error(result.error || 'Failed to get supported currencies');
    }

    return result.data!;
  }

  /**
   * Get fee estimation for a transaction
   */
  async getFeeEstimation(currency: string, amount: number): Promise<{ fee: number }> {
    const queryParams = new URLSearchParams({
      api_key: this.apiKey,
      currency,
      amount: amount.toString()
    });

    const response = await fetch(`${this.baseUrl}/fee-estimation?${queryParams}`, {
      method: 'GET',
    });

    const result: PlisioApiResponse<{ fee: number }> = await response.json();
    
    if (result.status === 'error') {
      throw new Error(result.error || 'Failed to get fee estimation');
    }

    return result.data!;
  }

  /**
   * Create instance with API key from environment or config
   */
  static async createInstance(): Promise<PlisioService> {
    // Try to get API key from environment variables first
    const apiKey = import.meta.env.VITE_PLISIO_API_KEY;
    
    if (apiKey) {
      return new PlisioService(apiKey);
    }

    // Fallback to Firebase config
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      const configDoc = await getDoc(doc(db, 'config', 'plisio'));
      if (configDoc.exists()) {
        const config = configDoc.data();
        if (config.apiKey) {
          return new PlisioService(config.apiKey);
        }
      }
      
      throw new Error('Plisio API key not found in config');
    } catch (error) {
      throw new Error('Failed to initialize Plisio service: ' + (error as Error).message);
    }
  }
}

// Common cryptocurrency options for UI
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
