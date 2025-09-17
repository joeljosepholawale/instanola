import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import fetch from 'node-fetch';
import * as nodemailer from 'nodemailer';

admin.initializeApp();
const db = admin.firestore();

// PaymentPoint Virtual Account Creation
export const createPaymentPointVirtualAccount = functions.https.onCall(async (data, context) => {
  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userId, customerName, customerEmail, customerPhone } = data;

    // Validate required fields
    if (!userId || !customerName || !customerEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: userId, customerName, customerEmail');
    }
    
    // Verify user owns this request
    if (context.auth.uid !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'User ID does not match authenticated user');
    }

    // Check if user already has a PaymentPoint account
    const existingAccount = await db.collection('paymentpoint_accounts').doc(userId).get();
    if (existingAccount.exists) {
      const accountData = existingAccount.data()!;
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

    // 🔑 Load API credentials from Firebase config
    const paymentPointConfig = functions.config().paymentpoint;
    if (!paymentPointConfig || !paymentPointConfig.key || !paymentPointConfig.secret || !paymentPointConfig.business_id) {
      console.error('❌ PaymentPoint credentials missing from Firebase config');
      throw new functions.https.HttpsError(
        'failed-precondition', 
        'PaymentPoint API credentials are not configured. Please contact admin.'
      );
    }

    console.log('✅ PaymentPoint credentials loaded from Firebase config');
    console.log('Creating PaymentPoint virtual account for user:', userId);

    // Prepare request body according to PaymentPoint documentation
    const requestBody = {
      email: customerEmail,
      name: customerName,
      phoneNumber: customerPhone || '08000000000',
      bankCode: ['20946'], // Palmpay bank code
      businessId: paymentPointConfig.business_id
    };

    console.log('➡️ PaymentPoint API request:', JSON.stringify(requestBody, null, 2));

    // Make API call to PaymentPoint with correct headers
    const response = await fetch('https://api.paymentpoint.ng/api/v1/createVirtualAccount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${paymentPointConfig.secret}`,
        'X-API-Key': paymentPointConfig.key
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 PaymentPoint API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ PaymentPoint API error:', response.status, errorText);
      
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { message: errorText };
      }
      
      throw new functions.https.HttpsError(
        'internal', 
        `PaymentPoint API error: ${response.status} - ${errorData.message || errorText}`
      );
    }

    const result = await response.json();
    console.log('✅ PaymentPoint API response:', JSON.stringify(result, null, 2));
      
    if (result.status !== 'success' || !result.bankAccounts || result.bankAccounts.length === 0) {
      console.error('❌ PaymentPoint invalid response:', result);
      throw new functions.https.HttpsError('internal', result.message || 'Failed to create virtual account');
    }

    const bankAccount = result.bankAccounts[0];
    
    // Store account data in Firestore
    const accountData = {
      userId: userId,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      bankName: bankAccount.bankName,
      bankCode: bankAccount.bankCode,
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhone: customerPhone || null,
      paymentPointCustomerId: result.customer.customer_id,
      reservedAccountId: bankAccount.Reserved_Account_Id,
      createdAt: FieldValue.serverTimestamp(),
      isActive: true,
      provider: 'paymentpoint'
    };

    await db.collection('paymentpoint_accounts').doc(userId).set(accountData);
    
    console.log('✅ PaymentPoint virtual account created successfully for user:', userId);

    return {
      success: true,
      message: 'Virtual account created successfully',
      account: {
        accountNumber: bankAccount.accountNumber,
        accountName: bankAccount.accountName,
        bankName: bankAccount.bankName,
        isPermanent: true
      }
    };

  } catch (error) {
    console.error('🔥 Error creating PaymentPoint virtual account:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', `Failed to create virtual account: ${error}`);
  }
});

// PaymentPoint Webhook Handler
export const paymentPointWebhook = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-paymentpoint-signature');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    console.log('📨 PaymentPoint webhook received');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Validate webhook signature
    const signature = req.headers['x-paymentpoint-signature'] as string;
    const paymentPointConfig = functions.config().paymentpoint;
    
    if (paymentPointConfig?.secret && signature) {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', paymentPointConfig.secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('❌ Invalid PaymentPoint webhook signature');
        res.status(401).send('Invalid signature');
        return;
      }
    }

    const webhookData = req.body;

    // Process successful payments only
    if (webhookData.notification_status === 'payment_successful' && 
        webhookData.transaction_status === 'success') {
      
      console.log(`💰 Processing successful payment: ${webhookData.transaction_id}`);
      console.log(`Amount: ₦${webhookData.amount_paid}`);
      console.log(`Customer: ${webhookData.customer.email}`);

      // Find user by account number
      const accountsSnapshot = await db.collection('paymentpoint_accounts')
        .where('accountNumber', '==', webhookData.receiver.account_number)
        .limit(1)
        .get();

      let userId: string;
      if (!accountsSnapshot.empty) {
        userId = accountsSnapshot.docs[0].id;
      } else {
        // Fallback: find by customer email
        const userSnapshot = await db.collection('users')
          .where('email', '==', webhookData.customer.email)
          .limit(1)
          .get();
        
        if (userSnapshot.empty) {
          console.error('❌ User not found for account:', webhookData.receiver.account_number);
          res.status(404).send('User not found');
          return;
        }
        userId = userSnapshot.docs[0].id;
      }

      const amount = webhookData.amount_paid;
      
      // Apply 2% transaction fee
      const feePercentage = 2;
      const feeAmount = amount * (feePercentage / 100);
      const finalAmount = amount - feeAmount;

      console.log(`💵 Amount: ₦${amount}, Fee: ₦${feeAmount.toFixed(2)} (${feePercentage}%), Final: ₦${finalAmount.toFixed(2)}`);

      // Credit user's wallet
      await db.collection('users').doc(userId).update({
        walletBalanceNGN: FieldValue.increment(finalAmount),
        lastUpdated: FieldValue.serverTimestamp()
      });

      // Create transaction record
      await db.collection('transactions').add({
        userId: userId,
        type: 'deposit',
        method: 'paymentpoint',
        amount: finalAmount,
        currency: 'NGN',
        amountNGN: finalAmount,
        originalAmount: amount,
        feeAmount: feeAmount,
        feePercentage: feePercentage,
        provider: 'paymentpoint',
        status: 'completed',
        description: `PaymentPoint bank transfer - ₦${amount.toLocaleString()}`,
        transactionId: webhookData.transaction_id,
        webhookData: webhookData,
        createdAt: FieldValue.serverTimestamp()
      });

      console.log(`✅ PaymentPoint payment processed: User ${userId}, credited ₦${finalAmount.toFixed(2)}`);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('🔥 PaymentPoint webhook error:', error);
    res.status(500).send('Internal server error');
  }
});

// Send notification email
export const sendNotificationEmail = functions.https.onCall(async (data, context) => {
  try {
    const { type, message, userEmail, userId, additionalData } = data;
    
    if (!type) {
      throw new functions.https.HttpsError('invalid-argument', 'Notification type is required');
    }

    // Configure nodemailer transporter (you'll need to set email config)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password'
      }
    });

    // Prepare email content based on type
    let subject = '';
    let htmlContent = '';
    
    switch (type) {
      case 'welcome':
        subject = 'Welcome to InstantNums!';
        htmlContent = `
          <h2>Welcome to InstantNums!</h2>
          <p>Thank you for joining us. Your account has been created successfully.</p>
          <p>You can now start purchasing phone numbers for SMS verification.</p>
          <br>
          <p>Best regards,<br>InstantNums Team</p>
        `;
        break;
        
      case 'payment_success':
        subject = 'Payment Confirmation - InstantNums';
        htmlContent = `
          <h2>Payment Received!</h2>
          <p>We have successfully received your payment.</p>
          <p><strong>Amount:</strong> $${additionalData?.amount || 'N/A'}</p>
          <p><strong>Payment Method:</strong> ${additionalData?.method || 'N/A'}</p>
          <p>Your wallet balance has been updated.</p>
          <br>
          <p>Best regards,<br>InstantNums Team</p>
        `;
        break;
        
      default:
        subject = 'Notification - InstantNums';
        htmlContent = `
          <h2>InstantNums Notification</h2>
          <p>${message || 'You have a new notification from InstantNums.'}</p>
          <br>
          <p>Best regards,<br>InstantNums Team</p>
        `;
    }

    const mailOptions = {
      from: '"InstantNums" <noreply@instantnums.com>',
      to: userEmail,
      subject: subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log(`📧 Notification email sent (${type}):`, result.messageId);

    return {
      success: true,
      messageId: result.messageId,
      type: type
    };

  } catch (error) {
    console.error('📧 Error sending notification email:', error);
    throw new functions.https.HttpsError('internal', `Failed to send notification email: ${error}`);
  }
});

// Secure DaisySMS API proxy
export const daisySmsProxy = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { action, params } = data;

    // Validate action
    if (!action || typeof action !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Action is required');
    }

    // 🔑 Get API key from Firebase config
    const daisySmsConfig = functions.config().daisysms;
    if (!daisySmsConfig || !daisySmsConfig.api_key) {
      throw new functions.https.HttpsError('failed-precondition', 'DaisySMS API key not configured');
    }

    // Build query parameters securely
    const queryParams = new URLSearchParams({
      api_key: daisySmsConfig.api_key,
      action: action,
      ...params
    });

    console.log('📱 DaisySMS API call:', { action, userId: context.auth.uid });

    // Make secure API call to DaisySMS
    const response = await fetch(`https://daisysms.com/stubs/handler_api.php?${queryParams}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'InstantNums/1.0'
      }
    });

    if (!response.ok) {
      throw new functions.https.HttpsError('internal', 'DaisySMS API request failed');
    }

    const result = await response.text();

    // Log usage for admin monitoring
    console.log('✅ DaisySMS API response received for user:', context.auth.uid);

    return {
      success: true,
      result: result
    };

  } catch (error) {
    console.error('🔥 DaisySMS proxy error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', `DaisySMS API error: ${error}`);
  }
});

// DaisySMS webhook handler for SMS notifications
export const daisySmsWebhook = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const webhookData = req.body;
    console.log('📱 DaisySMS webhook received:', webhookData);

    // Parse webhook data according to DaisySMS format
    const activationId = webhookData.activationId;
    const messageId = webhookData.messageId;
    const service = webhookData.service;
    const text = webhookData.text;
    const code = webhookData.code;
    const country = webhookData.country;
    const receivedAt = webhookData.receivedAt;

    if (!activationId || !code) {
      console.warn('⚠️ Invalid DaisySMS webhook data:', webhookData);
      res.status(400).send('Missing required fields');
      return;
    }

    console.log(`📨 DaisySMS SMS received for activation ${activationId}: ${code}`);

    // Update rental status in Firestore
    try {
      const rentalRef = db.collection('rentals').doc(activationId);
      const rentalDoc = await rentalRef.get();

      if (rentalDoc.exists) {
        // Update rental with SMS details
        await rentalRef.update({
          status: 'completed',
          smsCode: code,
          smsText: text,
          smsReceivedAt: FieldValue.serverTimestamp(),
          lastUpdated: FieldValue.serverTimestamp()
        });

        const rentalData = rentalDoc.data()!;
        const userId = rentalData.userId;

        console.log(`✅ Rental ${activationId} updated with SMS code for user ${userId}`);
      } else {
        console.warn(`⚠️ Rental ${activationId} not found in database`);
      }
    } catch (error) {
      console.error('🔥 Error updating rental with SMS:', error);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('🔥 DaisySMS webhook error:', error);
    res.status(500).send('Internal server error');
  }
});