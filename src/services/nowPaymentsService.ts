/**
 * NOWPayments Service using Firebase Functions (CORS-safe)
 * This service makes calls through Firebase Functions instead of direct API calls
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface NOWPayment {
  id: string;
  paymentId: number;
  amount: number;
  currency: string;
  payAddress: string;
  status: 'waiting' | 'confirming' | 'confirmed' | 'sending' | 'partially_paid' | 'finished' | 'failed' | 'refunded' | 'expired';
  purchaseId: string;
}

export interface NOWPaymentRequest {
  amount: number;
  currency: string;
  userEmail?: string;
  userName?: string;
}

export class NOWPaymentsService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Create a new cryptocurrency payment via Firebase Function
   */
  async createPayment(request: NOWPaymentRequest): Promise<NOWPayment> {
    try {
      const createPaymentFunction = httpsCallable(functions, 'createNOWPayment');
      
      const result = await createPaymentFunction({
        userId: this.userId,
        amount: request.amount,
        currency: request.currency,
        userEmail: request.userEmail,
        userName: request.userName
      });

      const data = result.data as any;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment');
      }

      return data.payment;

    } catch (error) {
      console.error('Error creating NOWPayments payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get payment status via Firebase Function
   */
  async getPaymentStatus(paymentId: string): Promise<NOWPayment> {
    try {
      const checkStatusFunction = httpsCallable(functions, 'getNOWPaymentStatus');
      
      const result = await checkStatusFunction({
        orderId: paymentId
      });

      const data = result.data as any;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get payment status');
      }

      return data.payment;

    } catch (error) {
      console.error('Error getting NOWPayments status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(errorMessage);
    }
  }

  /**
   * Create instance with authenticated user
   */
  static createInstance(userId: string): NOWPaymentsService {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return new NOWPaymentsService(userId);
  }
}

// Common cryptocurrency options for NOWPayments UI with working logos
export const SUPPORTED_CRYPTO_CURRENCIES = [
  { 
    code: 'BTC', 
    name: 'Bitcoin', 
    icon: '₿',
    logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    color: '#F7931A'
  },
  { 
    code: 'ETH', 
    name: 'Ethereum', 
    icon: 'Ξ',
    logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    color: '#627EEA'
  },
  { 
    code: 'USDT', 
    name: 'Tether USD', 
    icon: '₮',
    logo: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    color: '#26A17B'
  },
  { 
    code: 'USDC', 
    name: 'USD Coin', 
    icon: '$',
    logo: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    color: '#2775CA'
  },
  { 
    code: 'LTC', 
    name: 'Litecoin', 
    icon: 'Ł',
    logo: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
    color: '#BFBBBB'
  },
  { 
    code: 'BCH', 
    name: 'Bitcoin Cash', 
    icon: '₿',
    logo: 'https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png',
    color: '#0AC18E'
  },
  { 
    code: 'TRX', 
    name: 'TRON', 
    icon: 'T',
    logo: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
    color: '#FF060A'
  },
  { 
    code: 'BNB', 
    name: 'Binance Coin', 
    icon: 'BNB',
    logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    color: '#F3BA2F'
  },
  { 
    code: 'XMR', 
    name: 'Monero', 
    icon: 'ɱ',
    logo: 'https://assets.coingecko.com/coins/images/69/small/monero_logo.png',
    color: '#FF6600'
  },
  { 
    code: 'ADA', 
    name: 'Cardano', 
    icon: '₳',
    logo: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
    color: '#0033AD'
  },
  { 
    code: 'DOT', 
    name: 'Polkadot', 
    icon: '●',
    logo: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
    color: '#E6007A'
  },
  { 
    code: 'SOL', 
    name: 'Solana', 
    icon: '◎',
    logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    color: '#9945FF'
  }
];
