// Webhook handler for DaisySMS SMS notifications
import { PaymentService } from './payments';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface DaisySMSWebhookPayload {
  id: string; // Rental ID
  phone: string; // Phone number
  text: string; // SMS text content
  code: string; // Extracted verification code
  service: string; // Service code
  country: string; // Country code
  timestamp: number; // Unix timestamp
}

export class WebhookHandler {
  // Process incoming DaisySMS webhook
  static async processDaisySMSWebhook(payload: DaisySMSWebhookPayload): Promise<void> {
    try {
      console.log('Processing DaisySMS webhook:', payload);
      
      // Validate payload
      if (!payload.id || !payload.phone || !payload.text) {
        throw new Error('Invalid webhook payload');
      }
      
      // Get rental from Firebase
      const rentalDoc = await getDoc(doc(db, 'rentals', payload.id));
      if (!rentalDoc.exists()) {
        console.warn('Rental not found for webhook:', payload.id);
        return;
      }
      
      const rentalData = rentalDoc.data();
      
      // Update rental with SMS data
      await updateDoc(doc(db, 'rentals', payload.id), {
        status: 'completed',
        code: payload.code,
        smsText: payload.text,
        completedAt: new Date(),
        webhookReceived: true,
        lastUpdated: new Date()
      });
      
      // Log webhook for debugging
      await setDoc(doc(db, 'webhooks', `${payload.id}_${Date.now()}`), {
        rentalId: payload.id,
        userId: rentalData.userId,
        phone: payload.phone,
        text: payload.text,
        code: payload.code,
        service: payload.service,
        country: payload.country,
        timestamp: new Date(payload.timestamp * 1000),
        processed: true,
        createdAt: new Date()
      });
      
      console.log('Webhook processed successfully for rental:', payload.id);
    } catch (error) {
      console.error('Error processing DaisySMS webhook:', error);
      
      // Log failed webhook
      try {
        await setDoc(doc(db, 'webhooks', `failed_${Date.now()}`), {
          payload: payload,
          error: error instanceof Error ? error.message : 'Unknown error',
          processed: false,
          createdAt: new Date()
        });
      } catch (logError) {
        console.error('Failed to log webhook error:', logError);
      }
      
      throw error;
    }
  }
  
  // Process payment webhooks
  static async processPaymentWebhook(
    provider: 'paymentpoint' | 'nowpayments',
    payload: any,
    signature: string
  ): Promise<void> {
    try {
      console.log(`Processing ${provider} webhook:`, payload);
      
      const success = await PaymentService.processWebhook(provider, payload, signature);
      
      if (!success) {
        throw new Error(`Failed to process ${provider} webhook`);
      }
      
      console.log(`${provider} webhook processed successfully`);
    } catch (error) {
      console.error(`Error processing ${provider} webhook:`, error);
      
      // Log failed webhook
      try {
        await setDoc(doc(db, 'failed_webhooks', `${provider}_${Date.now()}`), {
          provider: provider,
          payload: payload,
          signature: signature,
          error: error instanceof Error ? error.message : 'Unknown error',
          processed: false,
          createdAt: new Date()
        });
      } catch (logError) {
        console.error('Failed to log webhook error:', logError);
      }
      
      throw error;
    }
  }
  
  // Setup webhook endpoint URL for DaisySMS
  static getWebhookUrl(): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/webhooks/daisysms`;
  }
  
  // Validate webhook signature (if DaisySMS provides one)
  static validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Implementation depends on DaisySMS webhook signature method
    // This is a placeholder - implement based on DaisySMS documentation
    return true;
  }
  
  // Get payment webhook URLs
  static getPaymentWebhookUrls() {
    const baseUrl = window.location.origin;
    return {
      paymentpoint: `${baseUrl}/api/webhooks/paymentpoint`,
      nowpayments: `${baseUrl}/api/webhooks/nowpayments`
    };
  }
}