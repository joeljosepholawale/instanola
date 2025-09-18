import {onCall, onRequest, HttpsError, CallableRequest} from 'firebase-functions/v2/https';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {FieldValue} from 'firebase-admin/firestore';
import {defineSecret} from 'firebase-functions/params';
import {createHmac} from 'node:crypto';
import {Request, Response} from 'express';
import * as nodemailer from 'nodemailer';

initializeApp();

const db = getFirestore();

// Get user's referral data securely
export const getReferrals = onCall({
  cors: true
}, async (request: CallableRequest) => {
  const { auth } = request;
  
  try {
    // Verify user is authenticated
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;

    // Get user's referral code
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data()!;
    const referralCode = userData.referralCode;

    if (!referralCode) {
      throw new HttpsError('not-found', 'User has no referral code');
    }

    // Get referrals made by this user (admin privileges allow this query)
    const referralsSnapshot = await db.collection('users')
      .where('referredBy', '==', referralCode)
      .get();

    const referrals = referralsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email || 'Unknown',
        status: (data.totalDepositNGN || 0) >= 1000 ? 'qualified' : 'pending',
        depositAmount: data.totalDepositNGN || 0,
        earnedAmount: (data.totalDepositNGN || 0) >= 1000 ? 100 : 0,
        joinedAt: data.createdAt || new Date()
      };
    });

    const qualifiedReferrals = referrals.filter(r => r.status === 'qualified');
    const pendingReferrals = referrals.filter(r => r.status === 'pending');

    return {
      success: true,
      data: {
        referralCode,
        referralCount: referrals.length,
        referralEarnings: userData.referralEarningsAvailable || 0,
        pendingEarnings: pendingReferrals.length * 100,
        totalEarned: userData.referralEarningsTotal || 0,
        referrals
      }
    };

  } catch (error) {
    console.error('Error fetching referrals:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to fetch referral data');
  }
});

// Define secret parameter with different name to avoid conflicts
const plisioApiSecret = defineSecret('PLISIO_API_SECRET');

// NOWPayments secrets
const nowPaymentsApiKey = defineSecret('NOWPAYMENTS_API_KEY');
const nowPaymentsIpnSecret = defineSecret('NOWPAYMENTS_IPN_SECRET');

// PaymentPoint secrets
const paymentPointApiKey = defineSecret('PAYMENTPOINT_API_KEY');
const paymentPointSecretKey = defineSecret('PAYMENTPOINT_SECRET_KEY');
const paymentPointBusinessId = defineSecret('PAYMENTPOINT_BUSINESS_ID');

// DaisySMS secret (CRITICAL: Move API key to server-side)
const daisySmsApiKey = defineSecret('DAISYSMS_API_KEY');

// SMTP Email Configuration
const smtpUser = defineSecret('SMTP_USER');
const smtpPassword = defineSecret('SMTP_PASSWORD');

interface PlisioInvoiceResponse {
  status: string;
  data: {
    id: string;
    order_number: string;
    order_name: string;
    source_currency: string;
    source_rate: string;
    source_amount: string;
    currency: string;
    amount: string;
    wallet_hash: string;
    psys_cid: string;
    qr_code: string;
    verify_hash: string;
    invoice_commission: string;
    invoice_sum: string;
    invoice_total_sum: string;
    invoice_url: string;
    expire_utc: number;
    status: string;
  };
}

interface NOWPaymentsCreateResponse {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  created_at: string;
  updated_at: string;
  outcome_amount?: number;
  outcome_currency?: string;
}

interface NOWPaymentsStatusResponse {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  created_at: string;
  updated_at: string;
  outcome_amount?: number;
  outcome_currency?: string;
}

// PaymentPoint interfaces
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
export const createPaymentPointVirtualAccount = onCall({
  cors: true,
  secrets: [paymentPointApiKey, paymentPointSecretKey, paymentPointBusinessId]
}, async (request: CallableRequest) => {
  const { data, auth } = request;
  
  try {
    // Validate authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userId, customerName, customerEmail, customerPhone } = data;

    // Validate required fields
    if (!userId || !customerName || !customerEmail) {
      throw new HttpsError('invalid-argument', 'Missing required fields: userId, customerName, customerEmail');
    }
    
    // Verify user owns this request
    if (auth.uid !== userId) {
      throw new HttpsError('permission-denied', 'User ID does not match authenticated user');
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

    // Get API credentials
    const apiKey = paymentPointApiKey.value();
    const secretKey = paymentPointSecretKey.value();
    const businessId = paymentPointBusinessId.value();
    
    console.log('PaymentPoint credentials check:', { 
      hasApiKey: !!apiKey, 
      hasSecretKey: !!secretKey, 
      hasBusinessId: !!businessId,
      apiKeyLength: apiKey ? apiKey.length : 0,
      secretKeyLength: secretKey ? secretKey.length : 0,
      businessIdLength: businessId ? businessId.length : 0
    });
    
    if (!apiKey || !secretKey || !businessId) {
      console.error('PaymentPoint credentials missing:', { 
        hasApiKey: !!apiKey, 
        hasSecretKey: !!secretKey, 
        hasBusinessId: !!businessId 
      });
      throw new HttpsError('failed-precondition', 'PaymentPoint API credentials are not properly configured in Firebase secrets. Please contact admin to verify the API keys.');
    }

    console.log('Creating PaymentPoint virtual account for user:', userId);

    // Prepare request body according to PaymentPoint documentation
    const requestBody = {
      email: customerEmail,
      name: customerName,
      phoneNumber: customerPhone || '08000000000',
      bankCode: ['20946', '20897'], // Palmpay and Opay bank codes
      businessId: businessId.trim()
    };

    console.log('PaymentPoint API request:', JSON.stringify(requestBody, null, 2));

    // Make API call to PaymentPoint with correct headers from documentation
    const response = await fetch('https://api.paymentpoint.co/api/v1/createVirtualAccount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey.trim()}`,
        'api-key': apiKey.trim(),
        'Accept': 'application/json',
        'User-Agent': 'InstantNums/1.0'
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
      
      throw new HttpsError('internal', `PaymentPoint API error: ${response.status} - ${errorData.message || errorText}`);
    }

    const result: PaymentPointVirtualAccountResponse = await response.json();
    console.log('PaymentPoint API response:', JSON.stringify(result, null, 2));
      
    if (result.status !== 'success' || !result.bankAccounts || result.bankAccounts.length === 0) {
      console.error('PaymentPoint invalid response:', result);
      throw new HttpsError('internal', result.message || 'Failed to create virtual account');
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
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', `Failed to create virtual account: ${error}`);
  }
});

// PaymentPoint Webhook Handler
export const paymentPointWebhook = onRequest({
  cors: true,
  secrets: [paymentPointSecretKey]
}, async (req: Request, res: Response) => {
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
    console.log('PaymentPoint webhook received');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Validate webhook signature
    const signature = req.headers['x-paymentpoint-signature'] as string;
    const secretKey = paymentPointSecretKey.value();
    
    if (secretKey && signature) {
      const expectedSignature = createHmac('sha256', secretKey)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid PaymentPoint webhook signature');
        res.status(401).send('Invalid signature');
        return;
      }
    }

    const webhookData: PaymentPointWebhookData = req.body;

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

      // Credit user's wallet (create document if it doesn't exist)
      await db.collection('users').doc(userId).set({
        walletBalanceNGN: FieldValue.increment(finalAmount),
        lastUpdated: FieldValue.serverTimestamp(),
        // Add default values for new users
        walletBalance: 0,
        email: webhookData.customer.email,
        name: webhookData.customer.name,
        isAdmin: false,
        isBlocked: false,
        createdAt: FieldValue.serverTimestamp()
      }, { merge: true }); // merge: true will update existing or create new

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

      console.log(`PaymentPoint payment processed: User ${userId}, credited ₦${finalAmount.toFixed(2)}`);

      // Process referral earnings (₦1000+ deposits)
      if (amount >= 1000) {
        try {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data()!;
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
                  createdAt: FieldValue.serverTimestamp(),
                  status: 'earned'
                });
                
                console.log(`Referral bonus awarded: ₦${REFERRAL_BONUS} to ${referrerId}`);
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
            loyaltyPoints: FieldValue.increment(pointsToAward),
            totalLoyaltyPoints: FieldValue.increment(pointsToAward)
          });
          
          await db.collection('loyaltyTransactions').add({
            userId,
            action: 'deposit',
            points: pointsToAward,
            amount: finalAmount,
            createdAt: FieldValue.serverTimestamp()
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
export const sendNotificationEmail = onCall({
  cors: true,
  secrets: [smtpUser, smtpPassword]
}, async (request: CallableRequest) => {
  const { data, auth } = request;
  
  try {
    // Some notifications don't require authentication (e.g., admin alerts)
    const allowedUnauthenticatedTypes = ['admin_alert'];
    const { type, message, userEmail, userId, additionalData } = data;
    
    if (!allowedUnauthenticatedTypes.includes(type) && !auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated for this notification type');
    }

    if (!type) {
      throw new HttpsError('invalid-argument', 'Notification type is required');
    }

    const smtpUserEmail = smtpUser.value();
    const smtpPass = smtpPassword.value();

    if (!smtpUserEmail || !smtpPass) {
      throw new HttpsError('failed-precondition', 'SMTP credentials not configured');
    }

    // Configure nodemailer transporter
    let transporter;
    try {
      transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: smtpUserEmail,
          pass: smtpPass
        }
      });
      
      // Test the connection
      await transporter.verify();
    } catch (smtpError) {
      console.error('SMTP configuration error:', smtpError);
      throw new HttpsError('failed-precondition', 
        'Email service is not properly configured. Please contact admin to update SMTP credentials.');
    }

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
        
      case 'transaction_confirmation':
        const transaction = additionalData?.transaction;
        subject = `Transaction Confirmation - ${transaction?.type?.charAt(0).toUpperCase() + transaction?.type?.slice(1) || 'Transaction'}`;
        htmlContent = `
          <h2>Hello ${additionalData?.userName || 'Valued Customer'},</h2>
          <p>Your ${transaction?.type || 'transaction'} has been processed successfully.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
            <h3>Transaction Details</h3>
            <p><strong>Type:</strong> ${transaction?.type?.charAt(0).toUpperCase() + transaction?.type?.slice(1) || 'N/A'}</p>
            <p><strong>Amount:</strong> <span style="font-size: 24px; font-weight: bold; color: #10B981;">$${transaction?.amount?.toFixed(2) || 'N/A'}</span></p>
            <p><strong>Description:</strong> ${transaction?.description || 'N/A'}</p>
            <p><strong>Date:</strong> ${transaction?.date?.toLocaleString() || new Date().toLocaleString()}</p>
          </div>
          <p>Thank you for using InstantNums!</p>
        `;
        break;
        
      case 'sms_received':
        subject = `SMS Code Received - ${additionalData?.service || 'InstantNums'}`;
        htmlContent = `
          <h2>SMS Code Received!</h2>
          <p>Hello ${additionalData?.userName || 'Valued Customer'},</p>
          <p>You've received an SMS verification code for ${additionalData?.service || 'your service'}.</p>
          <p><strong>Number:</strong> ${additionalData?.number || 'N/A'}</p>
          <p><strong>Code:</strong> <span style="font-family: monospace; font-size: 18px; background: #f0f0f0; padding: 5px;">${additionalData?.code || 'N/A'}</span></p>
          <p><strong>Service:</strong> ${additionalData?.service || 'N/A'}</p>
          <br>
          <p>Best regards,<br>InstantNums Team</p>
        `;
        break;
        
      case 'low_balance':
        subject = 'Low Wallet Balance - InstantNums';
        htmlContent = `
          <h2>Hello ${additionalData?.userName || 'Valued Customer'},</h2>
          <p>Your wallet balance is running low and may not be sufficient for future rentals.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3>Current Balance</h3>
            <div style="font-size: 24px; font-weight: bold; color: #F59E0B;">$${additionalData?.currentBalance?.toFixed(2) || '0.00'}</div>
          </div>
          <p>To continue using our services without interruption, please add funds to your wallet.</p>
          <div style="text-align: center;">
            <a href="https://instantnums.com/dashboard/wallet" style="background: #1D4ED8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Add Funds Now</a>
          </div>
        `;
        break;
        
      case 'support_reply':
        subject = `Re: ${additionalData?.originalSubject || 'Your Support Request'}`;
        htmlContent = `
          <h2>Hello ${additionalData?.userName || 'Valued Customer'},</h2>
          <p>Thank you for contacting InstantNums support. We've reviewed your message and here's our response:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1D4ED8;">
            <h3>Re: ${additionalData?.originalSubject || 'Your Support Request'}</h3>
            <div style="white-space: pre-wrap;">${additionalData?.replyMessage || 'Thank you for contacting us.'}</div>
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; color: #666;">
              <p>Best regards,<br>
              ${additionalData?.adminName || 'Support Team'}<br>
              InstantNums Support Team</p>
            </div>
          </div>
          <p>If you have any additional questions, please don't hesitate to contact us again.</p>
        `;
        break;
        
      case 'payment_rejection':
        const paymentData = additionalData?.paymentData;
        subject = 'Payment Request Rejected - InstantNums';
        htmlContent = `
          <h2>Hello ${additionalData?.userName || 'Valued Customer'},</h2>
          <p>We regret to inform you that your manual payment request has been rejected by our admin team.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626;">
            <h3>Payment Details</h3>
            <p><strong>Amount:</strong> ₦${paymentData?.amountNGN?.toLocaleString() || 'N/A'} (${paymentData?.amountUSD?.toFixed(2) || 'N/A'} USD)</p>
            <p><strong>Reference:</strong> ${paymentData?.transactionReference || 'N/A'}</p>
            <p><strong>Payment Method:</strong> ${paymentData?.paymentMethod?.replace('_', ' ').toUpperCase() || 'N/A'}</p>
            <p><strong>Rejected On:</strong> ${paymentData?.rejectedAt?.toLocaleString() || new Date().toLocaleString()}</p>
          </div>
          <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3>Rejection Reason</h3>
            <p>${paymentData?.reason || 'Please contact support for details.'}</p>
          </div>
          <p>If you believe this rejection was made in error, please contact our support team with additional documentation or clarification.</p>
        `;
        break;
        
      case 'password_reset':
        subject = 'Reset Your Password - InstantNums';
        htmlContent = `
          <h2>Hello ${additionalData?.userName || 'Valued Customer'},</h2>
          <p>We received a request to reset your password for your InstantNums account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center;">
            <a href="${additionalData?.resetLink || '#'}" style="background: #1D4ED8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Reset My Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px; font-family: monospace;">
            ${additionalData?.resetLink || '#'}
          </p>
          <div style="background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <strong>Security Notice:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This link expires in 1 hour</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your password won't change until you create a new one</li>
            </ul>
          </div>
          <p>If you have any questions, please contact our support team.</p>
        `;
        break;
        
      case 'test_config':
        subject = 'InstantNums - Email Configuration Test';
        htmlContent = `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>InstantNums</h1>
              <p>Email Configuration Test</p>
            </div>
            <div style="padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                <h2>✅ Email Configuration Successful!</h2>
                <p>This is a test email to verify that your email configuration is working correctly.</p>
                <p><strong>Sent from:</strong> ${additionalData?.fromName || 'InstantNums'}</p>
                <p><strong>Test completed at:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p>If you received this email, your email configuration is working properly and you can now send notifications to users.</p>
            </div>
          </div>
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
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', `Failed to send notification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// NOWPayments webhook handler
export const nowPaymentsWebhook = onRequest({
  cors: true,
  secrets: [nowPaymentsIpnSecret]
}, async (req: Request, res: Response) => {
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
    const signature = req.headers['x-nowpayments-sig'] as string;
    const ipnSecret = nowPaymentsIpnSecret.value();
    
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

    const paymentData = paymentDoc.data()!;

    // Update payment status
    await paymentRef.update({
      status: payment_status,
      actuallyPaid: actually_paid,
      lastUpdated: FieldValue.serverTimestamp(),
      webhookData: webhookData
    });

    console.log(`NOWPayments payment updated: ${order_id} -> ${payment_status}`);

    // If payment is completed, credit user's wallet
    if (payment_status === 'finished') {
      const userId = paymentData.userId;
      const amount = paymentData.amount;

      // Credit user's wallet
      await db.collection('users').doc(userId).update({
        walletBalance: FieldValue.increment(amount)
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
        createdAt: FieldValue.serverTimestamp()
      });

      console.log(`User ${userId} credited with $${amount} from NOWPayments payment ${payment_id}`);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('NOWPayments webhook error:', error);
    res.status(500).send('Internal server error');
  }
});

// Create NOWPayments payment
export const createNOWPayment = onCall({
  cors: true,
  secrets: [nowPaymentsApiKey]
}, async (request: CallableRequest) => {
  const { data, auth } = request;
  
  try {
    // Verify user is authenticated
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userId, amount, currency, userEmail, userName } = data;

    // Validate required fields
    if (!userId || !amount || !currency) {
      throw new HttpsError('invalid-argument', 'Missing required fields: userId, amount, currency');
    }
    
    // Verify user owns this request
    if (auth.uid !== userId) {
      throw new HttpsError('permission-denied', 'User ID does not match authenticated user');
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      throw new HttpsError('invalid-argument', 'Amount must be a positive number');
    }

    const apiKey = nowPaymentsApiKey.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'NOWPayments API key not configured');
    }

    console.log('Creating NOWPayments payment for user:', userId);

    // Generate unique order ID
    const orderId = `nowpay_${userId}_${Date.now()}`;

    // Prepare request body for NOWPayments API
    const requestBody = {
      price_amount: amount,
      price_currency: 'USD',
      pay_currency: currency,
      order_id: orderId,
      order_description: `InstantNums wallet deposit - $${amount}`,
      purchase_id: `purchase_${Date.now()}`,
      ipn_callback_url: `${process.env.FUNCTIONS_EMULATOR === 'true' ? 'http://localhost:5001' : 'https://us-central1-your-project-id.cloudfunctions.net'}/nowPaymentsWebhook`,
      success_url: 'https://instantnums.com/dashboard/wallet?payment=success',
      cancel_url: 'https://instantnums.com/dashboard/wallet?payment=cancelled'
    };

    console.log('NOWPayments API request:', JSON.stringify(requestBody, null, 2));

    // Make API call to NOWPayments
    const response = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'InstantNums/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('NOWPayments API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NOWPayments API error:', response.status, errorText);
      
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { message: errorText };
      }
      
      throw new HttpsError('internal', `NOWPayments API error: ${response.status} - ${errorData.message || errorText}`);
    }

    const result: NOWPaymentsCreateResponse = await response.json();
    console.log('NOWPayments API response:', JSON.stringify(result, null, 2));
      
    if (!result.payment_id || !result.pay_address) {
      console.error('NOWPayments invalid response:', result);
      throw new HttpsError('internal', 'Invalid response from NOWPayments API');
    }

    // Store payment data in Firestore
    const paymentData = {
      userId: userId,
      paymentId: result.payment_id,
      orderId: orderId,
      amount: amount,
      currency: currency,
      payCurrency: result.pay_currency,
      payAmount: result.pay_amount,
      payAddress: result.pay_address,
      status: result.payment_status,
      userEmail: userEmail,
      userName: userName,
      createdAt: FieldValue.serverTimestamp(),
      provider: 'nowpayments',
      isActive: true
    };

    await db.collection('nowpayments_payments').doc(orderId).set(paymentData);
    
    console.log('NOWPayments payment created successfully:', orderId);

    return {
      success: true,
      payment: {
        id: orderId,
        paymentId: result.payment_id,
        amount: result.pay_amount,
        currency: result.pay_currency,
        payAddress: result.pay_address,
        status: result.payment_status,
        purchaseId: result.purchase_id
      }
    };

  } catch (error) {
    console.error('Error creating NOWPayments payment:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', `Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Get NOWPayments payment status
export const getNOWPaymentStatus = onCall({
  cors: true,
  secrets: [nowPaymentsApiKey]
}, async (request: CallableRequest) => {
  const { data, auth } = request;
  
  try {
    // Verify user is authenticated
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { paymentId, orderId } = data;

    if (!paymentId && !orderId) {
      throw new HttpsError('invalid-argument', 'Either paymentId or orderId must be provided');
    }

    // Get payment from Firestore first
    let paymentData: any = null;
    if (orderId) {
      const paymentDoc = await db.collection('nowpayments_payments').doc(orderId).get();
      if (paymentDoc.exists) {
        paymentData = paymentDoc.data()!;
        // Verify user owns this payment
        if (paymentData.userId !== auth.uid) {
          throw new HttpsError('permission-denied', 'You do not have access to this payment');
        }
      }
    }

    if (!paymentData && !paymentId) {
      throw new HttpsError('not-found', 'Payment not found');
    }

    const apiKey = '386TTNM-Q2CMAY8-HBM7PZ9-EJXWFWT';
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'NOWPayments API key not configured');
    }

    // Use paymentId from Firestore data if not provided
    const finalPaymentId = paymentId || paymentData.paymentId;

    // Check status via API
    const response = await fetch(`https://api.nowpayments.io/v1/payment/${finalPaymentId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
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
          }
        };
      }
      
      throw new HttpsError('failed-precondition', `NOWPayments API unavailable (${response.status})`);
    }

    const result: NOWPaymentsStatusResponse = await response.json();
    
    // Update Firestore if we have the document
    if (orderId && paymentData) {
      await db.collection('nowpayments_payments').doc(orderId).update({
        status: result.payment_status,
        actuallyPaid: result.actually_paid,
        lastUpdated: FieldValue.serverTimestamp()
      });

      // If payment completed and not already processed
      if (result.payment_status === 'finished' && paymentData.status !== 'finished') {
        // Credit user's wallet
        await db.collection('users').doc(paymentData.userId).update({
          walletBalance: FieldValue.increment(paymentData.amount)
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
          createdAt: FieldValue.serverTimestamp()
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
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to check payment status');
  }
});

// Affiliate program functions
export const processReferralEarnings = onCall({
  cors: true,
  secrets: []
}, async (request: CallableRequest) => {
  const { data, auth } = request;
  
  try {
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userId, depositAmount } = data;
    
    if (auth.uid !== userId) {
      throw new HttpsError('permission-denied', 'Unauthorized access');
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data()!;
    const referredBy = userData.referredBy;
    
    // Check if user was referred and hasn't earned referral bonus yet
    if (referredBy && !userData.referralEarningsPaid && depositAmount >= 1000) {
      // Find the referrer
      const referrerQuery = await db.collection('users').where('referralCode', '==', referredBy).limit(1).get();
      
      if (!referrerQuery.empty) {
        const referrerDoc = referrerQuery.docs[0];
        const referrerId = referrerDoc.id;
        const referrerData = referrerDoc.data();
        
        const REFERRAL_BONUS = 100; // ₦100
        
        // Update referrer's earnings
        await db.collection('users').doc(referrerId).update({
          referralEarningsAvailable: (referrerData.referralEarningsAvailable || 0) + REFERRAL_BONUS,
          referralEarningsTotal: (referrerData.referralEarningsTotal || 0) + REFERRAL_BONUS
        });
        
        // Mark referral as paid for the referred user
        await db.collection('users').doc(userId).update({
          referralEarningsPaid: true
        });
        
        // Log the referral earning
        await db.collection('referralEarnings').add({
          referrerId,
          referredUserId: userId,
          amount: REFERRAL_BONUS,
          depositAmount,
          createdAt: FieldValue.serverTimestamp(),
          status: 'earned'
        });
        
        return { success: true, earned: REFERRAL_BONUS };
      }
    }
    
    return { success: true, earned: 0 };
  } catch (error) {
    console.error('Referral processing error:', error);
    throw new HttpsError('internal', 'Failed to process referral');
  }
});

// Loyalty program functions
export const awardLoyaltyPoints = onCall({
  cors: true,
  secrets: []
}, async (request: CallableRequest) => {
  const { data, auth } = request;
  
  try {
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userId, action, amount } = data;
    
    if (auth.uid !== userId) {
      throw new HttpsError('permission-denied', 'Unauthorized access');
    }

    let pointsToAward = 0;
    
    // Award points based on action
    switch (action) {
      case 'deposit':
        // 1 point per ₦10 deposited
        pointsToAward = Math.floor(amount / 10);
        break;
      case 'purchase':
        // 2 points per number purchased
        pointsToAward = amount * 2;
        break;
      case 'rental':
        // 5 points per rental
        pointsToAward = amount * 5;
        break;
      default:
        return { success: true, pointsAwarded: 0 };
    }

    if (pointsToAward > 0) {
      // Update user's loyalty points
      await db.collection('users').doc(userId).update({
        loyaltyPoints: FieldValue.increment(pointsToAward),
        totalLoyaltyPoints: FieldValue.increment(pointsToAward)
      });

      // Log loyalty points transaction
      await db.collection('loyaltyTransactions').add({
        userId,
        action,
        points: pointsToAward,
        amount,
        createdAt: FieldValue.serverTimestamp()
      });
    }

    return { success: true, pointsAwarded: pointsToAward };
  } catch (error) {
    console.error('Loyalty points error:', error);
    throw new HttpsError('internal', 'Failed to award loyalty points');
  }
});

// Redeem loyalty points
export const redeemLoyaltyPoints = onCall({
  cors: true,
  secrets: []
}, async (request: CallableRequest) => {
  const { data, auth } = request;
  
  try {
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userId, points } = data;
    
    if (auth.uid !== userId) {
      throw new HttpsError('permission-denied', 'Unauthorized access');
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data()!;
    const availablePoints = userData.loyaltyPoints || 0;

    if (points > availablePoints) {
      throw new HttpsError('invalid-argument', 'Insufficient loyalty points');
    }

    // 100 points = ₦1
    const cashValue = points / 100;
    
    // Update user's points and wallet balance
    await db.collection('users').doc(userId).update({
      loyaltyPoints: FieldValue.increment(-points),
      walletBalanceNGN: FieldValue.increment(cashValue)
    });

    // Log redemption
    await db.collection('loyaltyRedemptions').add({
      userId,
      points,
      cashValue,
      createdAt: FieldValue.serverTimestamp()
    });

    return { success: true, pointsRedeemed: points, cashValue };
  } catch (error) {
    console.error('Loyalty redemption error:', error);
    throw new HttpsError('internal', 'Failed to redeem loyalty points');
  }
});

// Secure DaisySMS API proxy (protects API key)
export const daisySmsProxy = onCall({
  cors: true,
  secrets: [daisySmsApiKey]
}, async (request: CallableRequest) => {
  const { data, auth } = request;
  
  try {
    // Verify user is authenticated
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { action, params } = data;

    // Validate action
    if (!action || typeof action !== 'string') {
      throw new HttpsError('invalid-argument', 'Action is required');
    }

    // Get API key securely
    const apiKey = daisySmsApiKey.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'DaisySMS API key not configured');
    }

    // Build query parameters securely
    const queryParams = new URLSearchParams({
      api_key: apiKey,
      action: action,
      ...params
    });

    console.log('DaisySMS API call:', { action, userId: auth.uid });

    // Make secure API call to DaisySMS
    const response = await fetch(`https://daisysms.com/stubs/handler_api.php?${queryParams}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'InstantNums/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new HttpsError('internal', 'DaisySMS API request failed');
    }

    const result = await response.text();

    // Log usage for admin monitoring
    console.log('DaisySMS API response received for user:', auth.uid);

    return {
      success: true,
      result: result
    };

  } catch (error) {
    console.error('DaisySMS proxy error:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', `DaisySMS API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// DaisySMS webhook handler for SMS notifications
export const daisySmsWebhook = onRequest({
  cors: true
}, async (req: Request, res: Response) => {
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
          smsReceivedAt: FieldValue.serverTimestamp(),
          lastUpdated: FieldValue.serverTimestamp()
        });

        const rentalData = rentalDoc.data()!;
        const userId = rentalData.userId;

        console.log(`Rental ${activationId} updated with SMS code for user ${userId}`);

        // Optional: Send notification to user (if you have push notifications setup)
        // await sendSMSNotification(userId, activationId, code);
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