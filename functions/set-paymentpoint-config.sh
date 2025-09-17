#!/bin/bash

# PaymentPoint Firebase Config Setup
echo "🔧 Setting PaymentPoint configuration in Firebase Functions..."

# Navigate to functions directory
cd functions

# Set PaymentPoint configuration with actual credentials
firebase functions:config:set \
  paymentpoint.key="f5cac610af31a143abcb458191a9434fd9e1ee91" \
  paymentpoint.secret="ffc7d975ab05d7ded2df40aca56c3e441de78ba1fab1c1600487b4faf3232c7f1681d9e04f11c3771e713d5fd7cd805c82128c38fb29d67d1847d8a" \
  paymentpoint.business_id="069e4b494cc072663678554d1d6d69d73e34c97b"

echo "✅ PaymentPoint configuration set successfully!"
echo ""
echo "🔍 Verifying configuration..."
firebase functions:config:get

echo ""
echo "🚀 Next steps:"
echo "1. Run: npm run build"
echo "2. Run: firebase deploy --only functions"
echo "3. Test PaymentPoint integration"