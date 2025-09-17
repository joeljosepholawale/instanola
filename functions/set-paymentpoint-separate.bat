@echo off
echo Setting PaymentPoint configuration...

echo Setting API key...
firebase functions:config:set paymentpoint.key="f5cac610af31a143abcb458191a9434fd9e1ee91"

echo Setting secret key...
firebase functions:config:set paymentpoint.secret="ffc7d975ab05d7ded2df40aca56c3e441de78ba1fab1c1600487b4faf3232c7f1681d9e04f11c3771e713d5fd7cd805c82128c38fb29d67d1847d8a"

echo Setting business ID...
firebase functions:config:set paymentpoint.business_id="069e4b494cc072663678554d1d6d69d73e34c97b"

echo.
echo ✅ PaymentPoint configuration complete!
echo Now run: firebase deploy --only functions
pause