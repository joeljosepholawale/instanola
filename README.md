# InstantNums - Virtual SMS Numbers Platform

A complete virtual SMS numbers platform built with React, TypeScript, and Firebase.

## Features

- 🔢 Virtual SMS numbers from 100+ countries
- 💰 Multiple payment methods (Crypto, PaymentPoint, Manual)
- 🔐 Secure user authentication and admin panel
- 📱 Real-time SMS reception and management
- 💳 Integrated crypto payments via Plisio
- 🛡️ Admin dashboard with user management
- 📊 Financial tracking and analytics

## Crypto Payment Setup (Plisio)

### 1. Get Plisio API Key
1. Visit [Plisio.net](https://plisio.net)
2. Create an account (no KYC required)
3. Go to API settings and generate an API key

### 2. Configure Firebase Secret
Set up the Plisio API key as a Firebase secret:

```bash
# In your terminal, run:
firebase functions:secrets:set PLISIO_API_SECRET
# When prompted, enter your Plisio API key

# Then redeploy functions:
firebase deploy --only functions
```

### 3. Test Integration
1. Go to `/dashboard/wallet` in your app
2. Scroll down to see the "Crypto Payment Demo" section
3. Click "Create Test Payment" to test the integration
4. Use "Simulate Payment" to test the completion flow

### 4. Webhook Setup (Required for Production)
Configure webhooks in your Plisio dashboard:
- **Status URL**: `https://plisiowebhook-bv6nk5vewq-uc.a.run.app`
- **Success URL**: `https://yourdomain.com/dashboard/wallet?payment=success`
- **Failed URL**: `https://yourdomain.com/dashboard/wallet?payment=failed`

Replace `yourdomain.com` with your actual domain.

## Other No-KYC Crypto Payment Alternatives

If you want to switch from Plisio, here are other easy options:

### CoinGate
- No KYC required
- Similar API structure
- Supports 70+ cryptocurrencies
- 1% fees

### CoinPayments
- No KYC required
- 100+ cryptocurrencies
- 0.5% fees
- Established platform

### BTCPay Server (Self-hosted)
- No KYC (self-hosted)
- No fees (except network)
- Full control
- Requires server setup

## Development

```bash
npm install
npm run dev
```

## Deployment

```bash
npm run build
# Deploy to your hosting provider
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config

# DaisySMS Configuration
VITE_DAISYSMS_API_KEY=your_daisysms_api_key

# Payment Configuration (Optional)
VITE_PAYMENTPOINT_API_KEY=your_paymentpoint_key
VITE_PLISIO_API_KEY=your_plisio_key
```

## License

MIT License