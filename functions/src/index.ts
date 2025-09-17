import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createHmac } from 'crypto';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

const db = admin.firestore();

// PaymentPoint credentials
const PAYMENTPOINT_API_KEY = 'f5cac610af31a143abcb458191a9434fd9e1ee91';
const PAYMENTPOINT_SECRET_KEY = 'ffc7d975ab05d7ded2df40aca56c3e441de78ba1fab1c1600487b4faf3232c7f1681d9e04f11c3771e713d5fd7cd805c82128c38fb29d67d1847d8a';
const PAYMENTPOINT_BUSINESS_ID = '069e4b494cc072663678554d1d6d69d73e34c97b';

// NOWPayments API key
const NOWPAYMENTS_API_KEY = '386TTNM-Q2CMAY8-HBM7PZ9-EJXWFWT';

interface PaymentPointVirtualAccountRequest {
  email: string;
  name: string;
  phoneNumber?: string;
  bankCode: string[];
  businessId: string;
}

interface PaymentPointVirtualAccountResponse {
  status: string;
  message: string;
  customer: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone_number?: string;
  };
  business: {
    business_name: string;
    business_email: string;
    business_phone_number: string;
    business_Id: string;
  };
  bankAccounts: Array<{
    bankCode: string;
    accountNumber: string;
    accountName: string;
    bankName: string;
    Reserved_Account_Id: string;
  }>;
  errors?: string[];
}

interface PaymentPointWebhookData {
  notification_status: string;
  transaction_id: string;
  amount_paid: number;
  settlement_amount: number;
  settlement_fee: number;
  transaction_status: string;
  sender: {
    name: string;
    account_number: string;
    bank: string;
  };
  receiver: {
    name: string;
    account_number: string;
    bank: string;
  };
  customer: {
    name: string;
    email: string;
    phone?: string;
    customer_id: string;
  };
  description: string;
  timestamp: string;
}

// PaymentPoint Virtual Account Creation
export const createPaymentPointVirtualAccount = functions.https.onCall(async (data, context) => {
  try {
    // Validate authentication
    if (!context || !context.auth) {
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
      const accountData = existingAccount.data();
      if (accountData) {
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
    }

    console.log('Creating PaymentPoint virtual account for user:', userId);

    // Prepare request body according to PaymentPoint documentation
    const requestBody = {
      email: customerEmail,
      name: customerName,
      phoneNumber: customerPhone || '08000000000',
      bankCode: ['20946'], // Palmpay bank code only
      businessId: PAYMENTPOINT_BUSINESS_ID
    };

    console.log('PaymentPoint API request:', JSON.stringify(requestBody, null, 2));

    // Make API call
    const response = await fetch('https://api.paymentpoint.ng/api/v1/createVirtualAccount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAYMENTPOINT_SECRET_KEY}`,
        'X-API-Key': PAYMENTPOINT_API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    console.log('PaymentPoint API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PaymentPoint API error:', response.status, errorText);
      
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { message: errorText };
      }
      
      throw new functions.https.HttpsError('internal', `PaymentPoint API error: ${response.status} - ${errorData.message || errorText}`);
    }

    const result = await response.json() as PaymentPointVirtualAccountResponse;
    console.log('PaymentPoint API response:', JSON.stringify(result, null, 2));
      
    if (result.status !== 'success' || !result.bankAccounts || result.bankAccounts.length === 0) {
      console.error('PaymentPoint invalid response:', result);
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      provider: 'paymentpoint'
    };

    await db.collection('paymentpoint_accounts').doc(userId).set(accountData);
    
    console.log('PaymentPoint virtual account created successfully for user:', userId);

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
    console.error('Error creating PaymentPoint virtual account:', error);
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
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-PaymentPoint-Signature');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    console.log('PaymentPoint webhook received');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Validate webhook signature
    const signature = req.headers['x-paymentpoint-signature'] || req.get('x-paymentpoint-signature');
    
    if (PAYMENTPOINT_SECRET_KEY && signature) {
      const expectedSignature = createHmac('sha256', PAYMENTPOINT_SECRET_KEY)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid PaymentPoint webhook signature');
        res.status(401).send('Invalid signature');
        return;
      }
    }

    const webhookData = req.body as PaymentPointWebhookData;

    // Process successful payments only
    if (webhookData.notification_status === 'payment_successful' && 
        webhookData.transaction_status === 'success') {
      
      console.log(`Processing successful payment: ${webhookData.transaction_id}`);
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
          console.error('User not found for account:', webhookData.receiver.account_number);
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

      console.log(`Amount: ₦${amount}, Fee: ₦${feeAmount.toFixed(2)} (${feePercentage}%), Final: ₦${finalAmount.toFixed(2)}`);

      // Credit user's wallet
      await db.collection('users').doc(userId).update({
        walletBalanceNGN: admin.firestore.FieldValue.increment(finalAmount),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
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
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`PaymentPoint payment processed: User ${userId}, credited ₦${finalAmount.toFixed(2)}`);

      // Process referral earnings (₦1000+ deposits)
      if (amount >= 1000) {
        try {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData) {
              const referredBy = userData.referredBy;
              
              if (referredBy && !userData.referralEarningsPaid) {
                const referrerSnapshot = await db.collection('users')
                  .where('referralCode', '==', referredBy)
                  .limit(1)
                  .get();
                
                if (!referrerSnapshot.empty) {
                  const referrerDoc = referrerSnapshot.docs[0];
                  const referrerId = referrerDoc.id;
                  const referrerData = referrerDoc.data();
                  
                  const REFERRAL_BONUS = 100; // ₦100
                  
                  // Update referrer's earnings
                  await db.collection('users').doc(referrerId).update({
                    referralEarningsAvailable: (referrerData.referralEarningsAvailable || 0) + REFERRAL_BONUS,
                    referralEarningsTotal: (referrerData.referralEarningsTotal || 0) + REFERRAL_BONUS
                  });
                  
                  // Mark referral as paid
                  await db.collection('users').doc(userId).update({
                    referralEarningsPaid: true
                  });
                  
                  // Log referral earning
                  await db.collection('referralEarnings').add({
                    referrerId,
                    referredUserId: userId,
                    amount: REFERRAL_BONUS,
                    depositAmount: amount,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'earned'
                  });
                  
                  console.log(`Referral bonus awarded: ₦${REFERRAL_BONUS} to ${referrerId}`);
                }
              }
            }
          }
        } catch (referralError) {
          console.error('Referral processing error:', referralError);
        }
      }

      // Award loyalty points (1 point per ₦10)
      try {
        const pointsToAward = Math.floor(finalAmount / 10);
        if (pointsToAward > 0) {
          await db.collection('users').doc(userId).update({
            loyaltyPoints: admin.firestore.FieldValue.increment(pointsToAward),
            totalLoyaltyPoints: admin.firestore.FieldValue.increment(pointsToAward)
          });
          
          await db.collection('loyaltyTransactions').add({
            userId,
            action: 'deposit',
            points: pointsToAward,
            amount: finalAmount,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`Loyalty points awarded: ${pointsToAward} points`);
        }
      } catch (loyaltyError) {
        console.error('Loyalty points error:', loyaltyError);
      }
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('PaymentPoint webhook error:', error);
    res.status(500).send('Internal server error');
  }
});

// Send notification email
export const sendNotificationEmail = functions.https.onCall(async (data, context) => {
  try {
    // Some notifications don't require authentication (e.g., admin alerts)
    const allowedUnauthenticatedTypes = ['admin_alert'];
    const { type, message, userEmail, userId, additionalData } = data;
    
    if (!allowedUnauthenticatedTypes.includes(type) && (!context || !context.auth)) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated for this notification type');
    }

    if (!type) {
      throw new functions.https.HttpsError('invalid-argument', 'Notification type is required');
    }

    // Use environment variables or hardcoded values for SMTP
    const smtpUserEmail = functions.config().smtp?.user || process.env.SMTP_USER;
    const smtpPass = functions.config().smtp?.password || process.env.SMTP_PASSWORD;

    if (!smtpUserEmail || !smtpPass) {
      throw new functions.https.HttpsError('failed-precondition', 'SMTP credentials not configured');
    }

    // Configure nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUserEmail,
        pass: smtpPass
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
        
      case 'sms_received':
        subject = 'SMS Code Received - InstantNums';
        htmlContent = `
          <h2>SMS Code Received!</h2>
          <p>You have received an SMS code for your rented number.</p>
          <p><strong>Number:</strong> ${additionalData?.number || 'N/A'}</p>
          <p><strong>Code:</strong> <span style="font-family: monospace; font-size: 18px; background: #f0f0f0; padding: 5px;">${additionalData?.code || 'N/A'}</span></p>
          <p><strong>Service:</strong> ${additionalData?.service || 'N/A'}</p>
          <br>
          <p>Best regards,<br>InstantNums Team</p>
        `;
        break;
        
      case 'admin_alert':
        subject = `Admin Alert - ${additionalData?.alertType || 'System'}`;
        htmlContent = `
          <h2>Admin Alert</h2>
          <p><strong>Alert Type:</strong> ${additionalData?.alertType || 'General'}</p>
          <p><strong>User ID:</strong> ${userId || 'N/A'}</p>
          <p><strong>User Email:</strong> ${userEmail || 'N/A'}</p>
          <p><strong>Message:</strong> ${message}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <br>
          <p>InstantNums System</p>
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

    // Send to user if userEmail provided, otherwise send to admin
    const recipient = userEmail || smtpUserEmail;
    
    const mailOptions = {
      from: `"InstantNums" <${smtpUserEmail}>`,
      to: recipient,
      subject: subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log(`Notification email sent (${type}):`, result.messageId);

    return {
      success: true,
      messageId: result.messageId,
      type: type
    };

  } catch (error) {
    console.error('Error sending notification email:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', `Failed to send notification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// NOWPayments webhook handler
export const nowPaymentsWebhook = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-NOWPAYMENTS-SIG');

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
    console.log('NOWPayments webhook received:', webhookData);

    // Verify webhook signature
    const signature = req.headers['x-nowpayments-sig'] || req.get('x-nowpayments-sig');
    const ipnSecret = functions.config().nowpayments?.ipn_secret || process.env.NOWPAYMENTS_IPN_SECRET;
    
    if (signature && ipnSecret) {
      const sortedParams = JSON.stringify(webhookData, Object.keys(webhookData).sort());
      const expectedSignature = createHmac('sha512', ipnSecret).update(sortedParams).digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid NOWPayments webhook signature');
        res.status(401).send('Invalid signature');
        return;
      }
    }

    const { payment_id, payment_status, order_id, actually_paid, pay_amount, pay_currency } = webhookData;

    if (!payment_id || !order_id) {
      console.error('Missing required webhook data');
      res.status(400).send('Missing required data');
      return;
    }

    // Update payment in Firestore
    const paymentRef = db.collection('nowpayments_payments').doc(order_id);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      console.error('Payment not found:', order_id);
      res.status(404).send('Payment not found');
      return;
    }

    const paymentData = paymentDoc.data();
    if (!paymentData) {
      console.error('Payment data is undefined:', order_id);
      res.status(404).send('Payment data not found');
      return;
    }

    // Update payment status
    await paymentRef.update({
      status: payment_status,
      actuallyPaid: actually_paid,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      webhookData: webhookData
    });

    console.log(`NOWPayments payment updated: ${order_id} -> ${payment_status}`);

    // If payment is completed, credit user's wallet
    if (payment_status === 'finished') {
      const userId = paymentData.userId;
      const amount = paymentData.amount;

      // Credit user's wallet
      await db.collection('users').doc(userId).update({
        walletBalance: admin.firestore.FieldValue.increment(amount)
      });

      // Create transaction record
      await db.collection('transactions').add({
        userId: userId,
        type: 'deposit',
        amount: amount,
        currency: 'USD',
        provider: 'nowpayments',
        paymentId: payment_id,
        status: 'completed',
        description: `Crypto deposit - ${pay_amount} ${pay_currency}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`User ${userId} credited with $${amount} from NOWPayments payment ${payment_id}`);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('NOWPayments webhook error:', error);
    res.status(500).send('Internal server error');
  }
});

// Get NOWPayments payment status
export const getNOWPaymentStatus = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context || !context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { paymentId, orderId } = data;

    if (!paymentId && !orderId) {
      throw new functions.https.HttpsError('invalid-argument', 'Either paymentId or orderId must be provided');
    }

    // Get payment from Firestore first
    let paymentData: any = null;
    if (orderId) {
      const paymentDoc = await db.collection('nowpayments_payments').doc(orderId).get();
      if (paymentDoc.exists) {
        paymentData = paymentDoc.data();
        // Verify user owns this payment
        if (paymentData && paymentData.userId !== context.auth.uid) {
          throw new functions.https.HttpsError('permission-denied', 'You do not have access to this payment');
        }
      }
    }

    if (!paymentData && !paymentId) {
      throw new functions.https.HttpsError('not-found', 'Payment not found');
    }

    if (!NOWPAYMENTS_API_KEY) {
      throw new functions.https.HttpsError('failed-precondition', 'NOWPayments API key not configured');
    }

    // Use paymentId from Firestore data if not provided
    const finalPaymentId = paymentId || paymentData.paymentId;

    // Check status via API
    const response = await fetch(`https://api.nowpayments.io/v1/payment/${finalPaymentId}`, {
      method: 'GET',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY
      }
    });

    if (!response.ok) {
      console.error('NOWPayments API error:', response.status);
      
      // If API call fails, return Firestore data if available
      if (paymentData) {
        return {
          success: true,
          status: paymentData.status,
          payment: {
            id: paymentData.id,
            paymentId: paymentData.paymentId,
            amount: paymentData.payAmount,
            currency: paymentData.payCurrency,
            payAddress: paymentData.payAddress,
            status: paymentData.status,
            purchaseId: paymentData.purchaseId
          }
        };
      }
      
      throw new functions.https.HttpsError('failed-precondition', `NOWPayments API unavailable (${response.status})`);
    }

    const result = await response.json();
    
    // Update Firestore if we have the document
    if (orderId && paymentData) {
      await db.collection('nowpayments_payments').doc(orderId).update({
        status: result.payment_status,
        actuallyPaid: result.actually_paid,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });

      // If payment completed and not already processed
      if (result.payment_status === 'finished' && paymentData.status !== 'finished') {
        // Credit user's wallet
        await db.collection('users').doc(paymentData.userId).update({
          walletBalance: admin.firestore.FieldValue.increment(paymentData.amount)
        });

        // Create transaction record
        await db.collection('transactions').add({
          userId: paymentData.userId,
          type: 'deposit',
          amount: paymentData.amount,
          currency: 'USD',
          provider: 'nowpayments',
          paymentId: result.payment_id,
          status: 'completed',
          description: `Crypto deposit - ${result.pay_amount} ${result.pay_currency}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    return {
      success: true,
      status: result.payment_status,
      payment: {
        id: orderId || `nowpayments_${result.payment_id}`,
        paymentId: result.payment_id,
        amount: result.pay_amount,
        currency: result.pay_currency,
        payAddress: result.pay_address,
        status: result.payment_status,
        purchaseId: result.purchase_id
      }
    };

  } catch (error) {
    console.error('Error checking NOWPayments status:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to check payment status');
  }
});

// Secure DaisySMS API proxy (protects API key)
export const daisySmsProxy = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context || !context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { action, params } = data;

    // Validate action
    if (!action || typeof action !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Action is required');
    }

    // Get API key securely
    const apiKey = functions.config().daisysms?.api_key || process.env.DAISYSMS_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError('failed-precondition', 'DaisySMS API key not configured');
    }

    // Build query parameters securely
    const queryParams = new URLSearchParams({
      api_key: apiKey,
      action: action,
      ...params
    });

    console.log('DaisySMS API call:', { action, userId: context.auth.uid });

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
    console.log('DaisySMS API response received for user:', context.auth.uid);

    return {
      success: true,
      result: result
    };

  } catch (error) {
    console.error('DaisySMS proxy error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', `DaisySMS API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    console.log('DaisySMS webhook received:', webhookData);

    // Parse webhook data according to DaisySMS format:
    // { activationId, messageId, service, text, code, country, receivedAt }
    const activationId = webhookData.activationId;
    const messageId = webhookData.messageId;
    const service = webhookData.service;
    const text = webhookData.text;
    const code = webhookData.code;
    const country = webhookData.country;
    const receivedAt = webhookData.receivedAt;

    if (!activationId || !code) {
      console.warn('Invalid DaisySMS webhook data:', webhookData);
      res.status(400).send('Missing required fields');
      return;
    }

    console.log(`DaisySMS SMS received for activation ${activationId}: ${code}`);

    // Update rental status in Firestore
    try {
      const rentalRef = db.collection('rentals').doc(activationId);
      const rentalDoc = await rentalRef.get();

      if (rentalDoc.exists) {
        // Update rental with SMS details
        await rentalRef.update({
          status: 'sms_received',
          smsCode: code,
          smsText: text,
          smsReceivedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        const rentalData = rentalDoc.data();
        if (rentalData) {
          const userId = rentalData.userId;
          console.log(`Rental ${activationId} updated with SMS code for user ${userId}`);
        }
      } else {
        console.warn(`Rental ${activationId} not found in database`);
      }
    } catch (error) {
      console.error('Error updating rental with SMS:', error);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('DaisySMS webhook error:', error);
    res.status(500).send('Internal server error');
  }
});