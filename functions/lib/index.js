"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.daisySmsWebhook = exports.daisySmsProxy = exports.redeemLoyaltyPoints = exports.awardLoyaltyPoints = exports.processReferralEarnings = exports.getNOWPaymentStatus = exports.nowPaymentsWebhook = exports.sendNotificationEmail = exports.paymentPointWebhook = exports.createPaymentPointVirtualAccount = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const node_crypto_1 = require("node:crypto");
const nodemailer = __importStar(require("nodemailer"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// Define secret parameter with different name to avoid conflicts
const plisioApiSecret = (0, params_1.defineSecret)('PLISIO_API_SECRET');
// NOWPayments secrets
const nowPaymentsApiKey = (0, params_1.defineSecret)('NOWPAYMENTS_API_KEY');
const nowPaymentsIpnSecret = (0, params_1.defineSecret)('NOWPAYMENTS_IPN_SECRET');
// PaymentPoint secrets
const paymentPointApiKey = (0, params_1.defineSecret)('PAYMENTPOINT_API_KEY');
const paymentPointSecretKey = (0, params_1.defineSecret)('PAYMENTPOINT_SECRET_KEY');
const paymentPointBusinessId = (0, params_1.defineSecret)('PAYMENTPOINT_BUSINESS_ID');
// DaisySMS secret (CRITICAL: Move API key to server-side)
const daisySmsApiKey = (0, params_1.defineSecret)('DAISYSMS_API_KEY');
// SMTP Email Configuration
const smtpUser = (0, params_1.defineSecret)('SMTP_USER');
const smtpPassword = (0, params_1.defineSecret)('SMTP_PASSWORD');
// PaymentPoint Virtual Account Creation
exports.createPaymentPointVirtualAccount = (0, https_1.onCall)({
    cors: true,
    secrets: [paymentPointApiKey, paymentPointSecretKey, paymentPointBusinessId]
}, async (request) => {
    const { data, auth } = request;
    try {
        // Validate authentication
        if (!auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { userId, customerName, customerEmail, customerPhone } = data;
        // Validate required fields
        if (!userId || !customerName || !customerEmail) {
            throw new https_1.HttpsError('invalid-argument', 'Missing required fields: userId, customerName, customerEmail');
        }
        // Verify user owns this request
        if (auth.uid !== userId) {
            throw new https_1.HttpsError('permission-denied', 'User ID does not match authenticated user');
        }
        // Check if user already has a PaymentPoint account
        const existingAccount = await db.collection('paymentpoint_accounts').doc(userId).get();
        if (existingAccount.exists) {
            const accountData = existingAccount.data();
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
        if (!apiKey || !secretKey || !businessId) {
            console.error('PaymentPoint credentials missing:', {
                hasApiKey: !!apiKey,
                hasSecretKey: !!secretKey,
                hasBusinessId: !!businessId
            });
            throw new https_1.HttpsError('failed-precondition', 'PaymentPoint credentials not configured. Please contact support.');
        }
        console.log('Creating PaymentPoint virtual account for user:', userId);
        // Prepare request body according to PaymentPoint documentation
        const requestBody = {
            email: customerEmail,
            name: customerName,
            phoneNumber: customerPhone || '08000000000',
            bankCode: ['20946'], // Palmpay bank code only
            businessId: businessId.trim()
        };
        console.log('PaymentPoint API request:', JSON.stringify(requestBody, null, 2));
        // Make API call to PaymentPoint with correct headers from documentation
        const response = await fetch('https://api.paymentpoint.ng/api/v1/createVirtualAccount', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${secretKey.trim()}`,
                'X-API-Key': apiKey.trim()
            },
            body: JSON.stringify(requestBody)
        });
        console.log('PaymentPoint API response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('PaymentPoint API error:', response.status, errorText);
            let errorData = {};
            try {
                errorData = JSON.parse(errorText);
            }
            catch (parseError) {
                errorData = { message: errorText };
            }
            throw new https_1.HttpsError('internal', `PaymentPoint API error: ${response.status} - ${errorData.message || errorText}`);
        }
        const result = await response.json();
        console.log('PaymentPoint API response:', JSON.stringify(result, null, 2));
        if (result.status !== 'success' || !result.bankAccounts || result.bankAccounts.length === 0) {
            console.error('PaymentPoint invalid response:', result);
            throw new https_1.HttpsError('internal', result.message || 'Failed to create virtual account');
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
            createdAt: firestore_2.FieldValue.serverTimestamp(),
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
    }
    catch (error) {
        console.error('Error creating PaymentPoint virtual account:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to create virtual account: ${error}`);
    }
});
// PaymentPoint Webhook Handler
exports.paymentPointWebhook = (0, https_1.onRequest)({
    cors: true,
    secrets: [paymentPointSecretKey]
}, async (req, res) => {
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
        const signature = req.headers['x-paymentpoint-signature'];
        const secretKey = paymentPointSecretKey.value();
        if (secretKey && signature) {
            const expectedSignature = (0, node_crypto_1.createHmac)('sha256', secretKey)
                .update(JSON.stringify(req.body))
                .digest('hex');
            if (signature !== expectedSignature) {
                console.error('Invalid PaymentPoint webhook signature');
                res.status(401).send('Invalid signature');
                return;
            }
        }
        const webhookData = req.body;
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
            let userId;
            if (!accountsSnapshot.empty) {
                userId = accountsSnapshot.docs[0].id;
            }
            else {
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
                walletBalanceNGN: firestore_2.FieldValue.increment(finalAmount),
                lastUpdated: firestore_2.FieldValue.serverTimestamp()
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
                createdAt: firestore_2.FieldValue.serverTimestamp()
            });
            console.log(`PaymentPoint payment processed: User ${userId}, credited ₦${finalAmount.toFixed(2)}`);
            // Process referral earnings (₦1000+ deposits)
            if (amount >= 1000) {
                try {
                    const userDoc = await db.collection('users').doc(userId).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
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
                                    createdAt: firestore_2.FieldValue.serverTimestamp(),
                                    status: 'earned'
                                });
                                console.log(`Referral bonus awarded: ₦${REFERRAL_BONUS} to ${referrerId}`);
                            }
                        }
                    }
                }
                catch (referralError) {
                    console.error('Referral processing error:', referralError);
                }
            }
            // Award loyalty points (1 point per ₦10)
            try {
                const pointsToAward = Math.floor(finalAmount / 10);
                if (pointsToAward > 0) {
                    await db.collection('users').doc(userId).update({
                        loyaltyPoints: firestore_2.FieldValue.increment(pointsToAward),
                        totalLoyaltyPoints: firestore_2.FieldValue.increment(pointsToAward)
                    });
                    await db.collection('loyaltyTransactions').add({
                        userId,
                        action: 'deposit',
                        points: pointsToAward,
                        amount: finalAmount,
                        createdAt: firestore_2.FieldValue.serverTimestamp()
                    });
                    console.log(`Loyalty points awarded: ${pointsToAward} points`);
                }
            }
            catch (loyaltyError) {
                console.error('Loyalty points error:', loyaltyError);
            }
        }
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('PaymentPoint webhook error:', error);
        res.status(500).send('Internal server error');
    }
});
// Send notification email
exports.sendNotificationEmail = (0, https_1.onCall)({
    cors: true,
    secrets: [smtpUser, smtpPassword]
}, async (request) => {
    const { data, auth } = request;
    try {
        // Some notifications don't require authentication (e.g., admin alerts)
        const allowedUnauthenticatedTypes = ['admin_alert'];
        const { type, message, userEmail, userId, additionalData } = data;
        if (!allowedUnauthenticatedTypes.includes(type) && !auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated for this notification type');
        }
        if (!type) {
            throw new https_1.HttpsError('invalid-argument', 'Notification type is required');
        }
        const smtpUserEmail = smtpUser.value();
        const smtpPass = smtpPassword.value();
        if (!smtpUserEmail || !smtpPass) {
            throw new https_1.HttpsError('failed-precondition', 'SMTP credentials not configured');
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
          <p><strong>Amount:</strong> $${(additionalData === null || additionalData === void 0 ? void 0 : additionalData.amount) || 'N/A'}</p>
          <p><strong>Payment Method:</strong> ${(additionalData === null || additionalData === void 0 ? void 0 : additionalData.method) || 'N/A'}</p>
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
          <p><strong>Number:</strong> ${(additionalData === null || additionalData === void 0 ? void 0 : additionalData.number) || 'N/A'}</p>
          <p><strong>Code:</strong> <span style="font-family: monospace; font-size: 18px; background: #f0f0f0; padding: 5px;">${(additionalData === null || additionalData === void 0 ? void 0 : additionalData.code) || 'N/A'}</span></p>
          <p><strong>Service:</strong> ${(additionalData === null || additionalData === void 0 ? void 0 : additionalData.service) || 'N/A'}</p>
          <br>
          <p>Best regards,<br>InstantNums Team</p>
        `;
                break;
            case 'admin_alert':
                subject = `Admin Alert - ${(additionalData === null || additionalData === void 0 ? void 0 : additionalData.alertType) || 'System'}`;
                htmlContent = `
          <h2>Admin Alert</h2>
          <p><strong>Alert Type:</strong> ${(additionalData === null || additionalData === void 0 ? void 0 : additionalData.alertType) || 'General'}</p>
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
    }
    catch (error) {
        console.error('Error sending notification email:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to send notification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
// NOWPayments webhook handler
exports.nowPaymentsWebhook = (0, https_1.onRequest)({
    cors: true,
    secrets: [nowPaymentsIpnSecret]
}, async (req, res) => {
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
        const signature = req.headers['x-nowpayments-sig'];
        const ipnSecret = nowPaymentsIpnSecret.value();
        if (signature && ipnSecret) {
            const sortedParams = JSON.stringify(webhookData, Object.keys(webhookData).sort());
            const expectedSignature = (0, node_crypto_1.createHmac)('sha512', ipnSecret).update(sortedParams).digest('hex');
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
        // Update payment status
        await paymentRef.update({
            status: payment_status,
            actuallyPaid: actually_paid,
            lastUpdated: firestore_2.FieldValue.serverTimestamp(),
            webhookData: webhookData
        });
        console.log(`NOWPayments payment updated: ${order_id} -> ${payment_status}`);
        // If payment is completed, credit user's wallet
        if (payment_status === 'finished') {
            const userId = paymentData.userId;
            const amount = paymentData.amount;
            // Credit user's wallet
            await db.collection('users').doc(userId).update({
                walletBalance: firestore_2.FieldValue.increment(amount)
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
                createdAt: firestore_2.FieldValue.serverTimestamp()
            });
            console.log(`User ${userId} credited with $${amount} from NOWPayments payment ${payment_id}`);
        }
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('NOWPayments webhook error:', error);
        res.status(500).send('Internal server error');
    }
});
// Get NOWPayments payment status
exports.getNOWPaymentStatus = (0, https_1.onCall)({
    cors: true
}, async (request) => {
    const { data, auth } = request;
    try {
        // Verify user is authenticated
        if (!auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { paymentId, orderId } = data;
        if (!paymentId && !orderId) {
            throw new https_1.HttpsError('invalid-argument', 'Either paymentId or orderId must be provided');
        }
        // Get payment from Firestore first
        let paymentData = null;
        if (orderId) {
            const paymentDoc = await db.collection('nowpayments_payments').doc(orderId).get();
            if (paymentDoc.exists) {
                paymentData = paymentDoc.data();
                // Verify user owns this payment
                if (paymentData.userId !== auth.uid) {
                    throw new https_1.HttpsError('permission-denied', 'You do not have access to this payment');
                }
            }
        }
        if (!paymentData && !paymentId) {
            throw new https_1.HttpsError('not-found', 'Payment not found');
        }
        const apiKey = '386TTNM-Q2CMAY8-HBM7PZ9-EJXWFWT';
        if (!apiKey) {
            throw new https_1.HttpsError('failed-precondition', 'NOWPayments API key not configured');
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
                        purchaseId: paymentData.purchaseId
                    }
                };
            }
            throw new https_1.HttpsError('failed-precondition', `NOWPayments API unavailable (${response.status})`);
        }
        const result = await response.json();
        // Update Firestore if we have the document
        if (orderId && paymentData) {
            await db.collection('nowpayments_payments').doc(orderId).update({
                status: result.payment_status,
                actuallyPaid: result.actually_paid,
                lastUpdated: firestore_2.FieldValue.serverTimestamp()
            });
            // If payment completed and not already processed
            if (result.payment_status === 'finished' && paymentData.status !== 'finished') {
                // Credit user's wallet
                await db.collection('users').doc(paymentData.userId).update({
                    walletBalance: firestore_2.FieldValue.increment(paymentData.amount)
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
                    createdAt: firestore_2.FieldValue.serverTimestamp()
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
    }
    catch (error) {
        console.error('Error checking NOWPayments status:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to check payment status');
    }
});
// Affiliate program functions
exports.processReferralEarnings = (0, https_1.onCall)({
    cors: true,
    secrets: []
}, async (request) => {
    const { data, auth } = request;
    try {
        if (!auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { userId, depositAmount } = data;
        if (auth.uid !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Unauthorized access');
        }
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError('not-found', 'User not found');
        }
        const userData = userDoc.data();
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
                    createdAt: firestore_2.FieldValue.serverTimestamp(),
                    status: 'earned'
                });
                return { success: true, earned: REFERRAL_BONUS };
            }
        }
        return { success: true, earned: 0 };
    }
    catch (error) {
        console.error('Referral processing error:', error);
        throw new https_1.HttpsError('internal', 'Failed to process referral');
    }
});
// Loyalty program functions
exports.awardLoyaltyPoints = (0, https_1.onCall)({
    cors: true,
    secrets: []
}, async (request) => {
    const { data, auth } = request;
    try {
        if (!auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { userId, action, amount } = data;
        if (auth.uid !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Unauthorized access');
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
                loyaltyPoints: firestore_2.FieldValue.increment(pointsToAward),
                totalLoyaltyPoints: firestore_2.FieldValue.increment(pointsToAward)
            });
            // Log loyalty points transaction
            await db.collection('loyaltyTransactions').add({
                userId,
                action,
                points: pointsToAward,
                amount,
                createdAt: firestore_2.FieldValue.serverTimestamp()
            });
        }
        return { success: true, pointsAwarded: pointsToAward };
    }
    catch (error) {
        console.error('Loyalty points error:', error);
        throw new https_1.HttpsError('internal', 'Failed to award loyalty points');
    }
});
// Redeem loyalty points
exports.redeemLoyaltyPoints = (0, https_1.onCall)({
    cors: true,
    secrets: []
}, async (request) => {
    const { data, auth } = request;
    try {
        if (!auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { userId, points } = data;
        if (auth.uid !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Unauthorized access');
        }
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError('not-found', 'User not found');
        }
        const userData = userDoc.data();
        const availablePoints = userData.loyaltyPoints || 0;
        if (points > availablePoints) {
            throw new https_1.HttpsError('invalid-argument', 'Insufficient loyalty points');
        }
        // 100 points = ₦1
        const cashValue = points / 100;
        // Update user's points and wallet balance
        await db.collection('users').doc(userId).update({
            loyaltyPoints: firestore_2.FieldValue.increment(-points),
            walletBalanceNGN: firestore_2.FieldValue.increment(cashValue)
        });
        // Log redemption
        await db.collection('loyaltyRedemptions').add({
            userId,
            points,
            cashValue,
            createdAt: firestore_2.FieldValue.serverTimestamp()
        });
        return { success: true, pointsRedeemed: points, cashValue };
    }
    catch (error) {
        console.error('Loyalty redemption error:', error);
        throw new https_1.HttpsError('internal', 'Failed to redeem loyalty points');
    }
});
// Secure DaisySMS API proxy (protects API key)
exports.daisySmsProxy = (0, https_1.onCall)({
    cors: true,
    secrets: [daisySmsApiKey]
}, async (request) => {
    const { data, auth } = request;
    try {
        // Verify user is authenticated
        if (!auth) {
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { action, params } = data;
        // Validate action
        if (!action || typeof action !== 'string') {
            throw new https_1.HttpsError('invalid-argument', 'Action is required');
        }
        // Get API key securely
        const apiKey = daisySmsApiKey.value();
        if (!apiKey) {
            throw new https_1.HttpsError('failed-precondition', 'DaisySMS API key not configured');
        }
        // Build query parameters securely
        const queryParams = new URLSearchParams(Object.assign({ api_key: apiKey, action: action }, params));
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
            throw new https_1.HttpsError('internal', 'DaisySMS API request failed');
        }
        const result = await response.text();
        // Log usage for admin monitoring
        console.log('DaisySMS API response received for user:', auth.uid);
        return {
            success: true,
            result: result
        };
    }
    catch (error) {
        console.error('DaisySMS proxy error:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `DaisySMS API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
// DaisySMS webhook handler for SMS notifications
exports.daisySmsWebhook = (0, https_1.onRequest)({
    cors: true
}, async (req, res) => {
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
                    smsReceivedAt: firestore_2.FieldValue.serverTimestamp(),
                    lastUpdated: firestore_2.FieldValue.serverTimestamp()
                });
                const rentalData = rentalDoc.data();
                const userId = rentalData.userId;
                console.log(`Rental ${activationId} updated with SMS code for user ${userId}`);
                // Optional: Send notification to user (if you have push notifications setup)
                // await sendSMSNotification(userId, activationId, code);
            }
            else {
                console.warn(`Rental ${activationId} not found in database`);
            }
        }
        catch (error) {
            console.error('Error updating rental with SMS:', error);
        }
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('DaisySMS webhook error:', error);
        res.status(500).send('Internal server error');
    }
});
//# sourceMappingURL=index.js.map