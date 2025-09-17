#!/bin/bash

# PaymentPoint API Secrets Setup for Firebase Functions
echo "Setting up PaymentPoint API secrets..."

# Set PaymentPoint API Key
echo "f5cac610af31a143abcb458191a9434fd9e1ee91" | firebase functions:secrets:set PAYMENTPOINT_API_KEY

# Set PaymentPoint Secret Key
echo "ffc7d975ab05d7ded2df40aca56c3e441de78ba1fab1c1600487b4faf3232c7f1681d9e04f11c3771e713d5fd7cd805c82128c38fb29d67d1847d8a" | firebase functions:secrets:set PAYMENTPOINT_SECRET_KEY

# Set PaymentPoint Business ID
echo "069e4b494cc072663678554d1d6d69d73e34c97b" | firebase functions:secrets:set PAYMENTPOINT_BUSINESS_ID

echo "PaymentPoint secrets set successfully!"
echo "Now run: firebase deploy --only functions"