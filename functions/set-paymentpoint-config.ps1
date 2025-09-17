# PowerShell script to set PaymentPoint configuration
Write-Host "Setting PaymentPoint configuration in Firebase..." -ForegroundColor Green

# Set all PaymentPoint config values in one command (PowerShell syntax)
firebase functions:config:set paymentpoint.key="f5cac610af31a143abcb458191a9434fd9e1ee91" paymentpoint.secret="ffc7d975ab05d7ded2df40aca56c3e441de78ba1fab1c1600487b4faf3232c7f1681d9e04f11c3771e713d5fd7cd805c82128c38fb29d67d1847d8a" paymentpoint.business_id="069e4b494cc072663678554d1d6d69d73e34c97b"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PaymentPoint configuration set successfully!" -ForegroundColor Green
    Write-Host "Now run: firebase deploy --only functions" -ForegroundColor Yellow
} else {
    Write-Host "❌ Failed to set PaymentPoint configuration" -ForegroundColor Red
    Write-Host "Try running each command separately:" -ForegroundColor Yellow
    Write-Host 'firebase functions:config:set paymentpoint.key="f5cac610af31a143abcb458191a9434fd9e1ee91"' -ForegroundColor Cyan
    Write-Host 'firebase functions:config:set paymentpoint.secret="ffc7d975ab05d7ded2df40aca56c3e441de78ba1fab1c1600487b4faf3232c7f1681d9e04f11c3771e713d5fd7cd805c82128c38fb29d67d1847d8a"' -ForegroundColor Cyan
    Write-Host 'firebase functions:config:set paymentpoint.business_id="069e4b494cc072663678554d1d6d69d73e34c97b"' -ForegroundColor Cyan
}