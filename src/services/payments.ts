// Payment Integration - Static hosting compatible with CORS proxy
import { doc, setDoc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EmailService } from './emailService';
import { PlisioService } from './plisioService';

export interface PaymentRequest {
  userId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
  webhookUrl?: string;
}

export interface PaymentResponse {
  paymentId: string;
  paymentUrl: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  amount: number;
  currency: string;
  expiresAt?: Date;
}

export class PaymentService {
  // Make API call with CORS proxy
  private static async makeApiCall(url: string, options: RequestInit = {}): Promise<Response> {
    // Method 1: Try CORS proxy
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        ...options,
        signal: AbortSignal.timeout(15000)
      });
      
      if (response.ok) {
        return response;
      }
    } catch (error) {
      console.log('CORS proxy failed, trying alternative...');
    }

    // Method 2: Try alternative CORS proxy
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        ...options,
        signal: AbortSignal.timeout(15000)
      });
      
      if (response.ok) {
        return response;
      }
    } catch (error) {
      console.log('Alternative CORS proxy failed, trying direct...');
    }

    // Method 3: Try direct call
    return fetch(url, {
      ...options,
      mode: 'cors',
      signal: AbortSignal.timeout(10000)
    });
  }

  // Create PaymentPoint payment
  static async createPaymentPointPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('Creating PaymentPoint virtual account...');
      
      const paymentId = `pp_${request.userId}_${Date.now()}`;
      const apiKey = import.meta.env.VITE_PAYMENTPOINT_API_KEY;
      const businessId = import.meta.env.VITE_PAYMENTPOINT_BUSINESS_ID;
      const secretKey = import.meta.env.VITE_PAYMENTPOINT_SECRET_KEY;
      
      if (!apiKey || !businessId || !secretKey) {
        console.warn('PaymentPoint credentials not configured, falling back to manual payment');
        // Fallback to manual payment when PaymentPoint is not configured
        throw new Error('PaymentPoint temporarily unavailable. Please use manual payment method.');
      }
      
      try {
        // Check if user already has a virtual account
        const existingAccountDoc = await getDoc(doc(db, 'paymentpoint_accounts', request.userId));
        
        if (existingAccountDoc.exists()) {
          // Return existing account details
          const accountData = existingAccountDoc.data();
          
          return {
            paymentId: paymentId,
            paymentUrl: `${accountData.accountNumber}|${accountData.bankName}|${accountData.accountName}`,
            status: 'pending',
            amount: request.amount,
            currency: request.currency || 'NGN',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          };
        }

        // Create new virtual account for first-time user
        const virtualAccountData = {
          business_id: businessId,
          customer_name: request.customerName,
          customer_email: request.customerEmail,
          customer_phone: (request as any).customerPhone || '',
          description: request.description,
          webhook_url: `${window.location.origin}/api/webhooks/paymentpoint`,
          metadata: {
            userId: request.userId,
            paymentId: paymentId
          }
        };

        console.log('Creating PaymentPoint virtual account with data:', virtualAccountData);

        const response = await fetch('https://api.paymentpoint.ng/v1/virtual-accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${secretKey}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(virtualAccountData),
          signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('PaymentPoint API error:', response.status, errorText);
          throw new Error(`PaymentPoint API error: ${response.status}`);
        }

        const result = await response.json();
        console.log('PaymentPoint virtual account created:', result);

        if (!result.data?.account_number || !result.data?.bank_name) {
          console.error('Invalid PaymentPoint response:', result);
          throw new Error('Invalid response from PaymentPoint API');
        }

        const accountNumber = result.data.account_number;
        const bankName = result.data.bank_name;
        const accountName = result.data.account_name || request.customerName;
        
        // Store permanent virtual account
        await setDoc(doc(db, 'paymentpoint_accounts', request.userId), {
          userId: request.userId,
          accountNumber: accountNumber,
          bankName: bankName,
          accountName: accountName,
          customerName: request.customerName,
          customerEmail: request.customerEmail,
          customerPhone: (request as any).customerPhone || '',
          createdAt: new Date(),
          isActive: true,
          paymentPointId: result.data.id
        });
        
        // Store virtual account record
        await setDoc(doc(db, 'paymentpoint_payments', paymentId), {
          id: paymentId,
          userId: request.userId,
          provider: 'paymentpoint',
          amount: request.amount,
          currency: request.currency || 'NGN',
          status: 'pending',
          accountNumber: accountNumber,
          bankName: bankName,
          accountName: accountName,
          reference: result.data.reference || paymentId,
          description: request.description,
          customerEmail: request.customerEmail,
          customerName: request.customerName,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          paymentPointId: result.data.id || paymentId,
          paymentPointData: result.data
        });

        return {
          paymentId: paymentId,
          paymentUrl: `${accountNumber}|${bankName}|${accountName}`,
          status: 'pending',
          amount: request.amount,
          currency: request.currency || 'NGN',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };
      } catch (apiError) {
        console.error('PaymentPoint API call failed:', apiError);
        throw new Error('PaymentPoint service temporarily unavailable. Please use manual payment method.');
      }
    } catch (error) {
      console.error('Error creating PaymentPoint payment:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('PaymentPoint temporarily unavailable. Please use manual payment method.');
        } else if (error.message.includes('timeout')) {
          throw new Error('PaymentPoint request timed out. Please use manual payment method.');
        } else if (error.message.includes('530')) {
          throw new Error('PaymentPoint service temporarily unavailable. Please try manual payment method.');
        }
        throw error;
      }
      
      throw new Error('Failed to create payment. Please try manual payment method.');
    }
  }

  // Create Plisio crypto payment
  static async createPlisioCryptoPayment(request: PaymentRequest, currency: string = 'btc'): Promise<PaymentResponse> {
    try {
      console.log('Creating Plisio crypto payment...');
      
      // Use direct Plisio service
      const invoice = await PlisioService.createInvoice({
        userId: request.userId,
        amount: request.amount,
        currency: currency,
        userEmail: request.customerEmail || 'user@example.com',
        userName: request.customerName || 'User'
      });
      
      return {
        paymentId: invoice.id,
        paymentUrl: invoice.walletAddress,
        status: 'pending',
        amount: invoice.amount,
        currency: invoice.currency,
        expiresAt: new Date(invoice.expiresAt)
      };
    } catch (error) {
      console.error('Error creating Plisio crypto payment:', error);
      throw new Error(`Failed to create crypto payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get crypto minimum amount
  static async getCryptoMinimumAmount(): Promise<number> {
    return 5; // Fallback minimum of $5
  }

  // Process webhook
  static async processWebhook(provider: 'paymentpoint' | 'plisio', payload: any, signature: string): Promise<boolean> {
    try {
      console.log(`Processing ${provider} webhook:`, payload);
      
      const paymentId = payload.payment_id || payload.id;
      const status = payload.status || payload.payment_status;
      const amount = parseFloat(payload.amount || payload.price_amount || 0);
      
      // Extract userId from order_id
      let userId = '';
      if (payload.order_id) {
        const parts = payload.order_id.split('_');
        userId = parts[1] || '';
      } else if (payload.customer?.user_id) {
        userId = payload.customer.user_id;
      }

      if (!paymentId || !userId) {
        throw new Error('Missing required webhook data');
      }

      // Update payment record
      const paymentCollection = provider === 'paymentpoint' ? 'paymentpoint_payments' : 'plisio_invoices';
      await updateDoc(doc(db, paymentCollection, paymentId), {
        status: status,
        completedAt: new Date(),
        webhookData: payload,
        lastUpdated: new Date()
      });

      // If payment successful, add funds to user wallet
      if (status === 'completed' || status === 'success' || status === 'finished' || status === 'confirmed') {
        await updateDoc(doc(db, 'users', userId), {
          walletBalance: increment(amount)
        });

        // Create transaction record
        await setDoc(doc(db, 'transactions', `${paymentId}_completed`), {
          userId: userId,
          type: 'deposit',
          amount: amount,
          provider: provider,
          paymentId: paymentId,
          status: 'completed',
          description: `Wallet funding via ${provider}`,
          createdAt: new Date()
        });

        // Send confirmation email
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            await EmailService.sendTransactionConfirmation(
              userData.email,
              userData.name || 'User',
              {
                type: 'deposit',
                amount: amount,
                description: `Wallet funding via ${provider}`,
                date: new Date()
              }
            );
          }
        } catch (emailError) {
          console.warn('Failed to send payment confirmation email:', emailError);
        }
      }

      return true;
    } catch (error) {
      console.error(`Error processing ${provider} webhook:`, error);
      return false;
    }
  }

  // Process expired payments
  static async processExpiredPayments(isAdmin: boolean = false, userId?: string): Promise<void> {
    console.log('Processing expired payments...');
    // Implementation would check for expired payments and handle them
  }

  // Process failed payments
  static async processFailedPayments(isAdmin: boolean = false, userId?: string): Promise<void> {
    console.log('Processing failed payments...');
    // Implementation would check for failed payments and handle them
  }
}