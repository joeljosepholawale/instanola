// DaisySMS Webhook Handler
// This handles incoming SMS notifications from DaisySMS

import { WebhookHandler } from '../../src/services/webhookHandler.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    console.log('DaisySMS webhook received:', payload);

    // Validate required fields
    if (!payload.id || !payload.phone || !payload.text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await WebhookHandler.processDaisySMSWebhook(payload);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('DaisySMS webhook error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
}