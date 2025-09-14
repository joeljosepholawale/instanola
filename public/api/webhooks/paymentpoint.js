// PaymentPoint Webhook Handler
// This would typically be deployed as a serverless function

import { WebhookHandler } from '../../src/services/webhookHandler.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-paymentpoint-signature'] || '';
    const payload = req.body;

    console.log('PaymentPoint webhook received:', payload);

    await WebhookHandler.processPaymentWebhook('paymentpoint', payload, signature);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('PaymentPoint webhook error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
}