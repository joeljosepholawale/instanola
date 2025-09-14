# Firebase Functions Deployment Guide

## Prerequisites
1. ✅ Upgrade to Firebase Blaze plan: https://console.firebase.google.com/project/instantnums-48c6e/usage/details
2. ✅ Functions are built and ready to deploy

## Step 1: Set API Key Secrets

### Set DaisySMS API Key
```bash
firebase functions:secrets:set DAISYSMS_API_KEY
# When prompted, enter: D6moFnRLZN8yhBFTN2vwnVkRps5b5U
```

### Set Plisio API Key
```bash
firebase functions:secrets:set PLISIO_API_SECRET
# When prompted, enter your Plisio API key
```

## Step 2: Deploy Functions

### Deploy All Functions
```bash
firebase deploy --only functions
```

### Or Deploy Specific Functions
```bash
# Deploy only DaisySMS functions
firebase deploy --only functions:daisySmsProxy

# Deploy only Plisio functions
firebase deploy --only functions:createPlisioInvoice,functions:getPlisioFeeEstimation,functions:checkPlisioInvoiceStatus
```

## Step 3: Verify Deployment

After deployment, check the Firebase Console:
- https://console.firebase.google.com/project/instantnums-48c6e/functions

## Functions That Will Be Deployed

### DaisySMS Functions:
- `daisySmsProxy` - Secure proxy for DaisySMS API calls
- `daisySmsWebhook` - Webhook for SMS notifications

### Plisio Functions:
- `createPlisioInvoice` - Create cryptocurrency payment invoices
- `getPlisioFeeEstimation` - Get network fee estimates
- `checkPlisioInvoiceStatus` - Check payment status

### PaymentPoint Functions:
- `createPaymentPointAccount` - Create virtual bank accounts
- `paymentPointWebhook` - Handle bank payment notifications

## Cost Estimate
Firebase Functions free tier includes:
- 2 million invocations/month
- 400,000 GB-seconds/month
- 200,000 CPU-seconds/month

Your usage should be well within the free tier limits.

## Troubleshooting

If deployment fails:
1. Make sure you're on the Blaze plan
2. Check that secrets are set correctly: `firebase functions:secrets:access DAISYSMS_API_KEY`
3. Verify you're logged in: `firebase login`
4. Check project selection: `firebase use instantnums-48c6e`
