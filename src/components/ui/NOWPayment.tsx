import React, { useState, useEffect, useRef } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Select } from './Select';
import { Input } from './Input';
import { Loader } from './Loader';
import { 
  CreditCard, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Copy,
  ExternalLink,
  RefreshCw,
  QrCode,
  Download,
  Smartphone
} from 'lucide-react';
import { NOWPaymentsService, SUPPORTED_CRYPTO_CURRENCIES, NOWPayment } from '../../services/nowPaymentsService';
import { useAuth } from '../../hooks/useAuth';
import QRCodeLib from 'qrcode';

interface NOWPaymentProps {
  amount: number;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
  className?: string;
}

export function NOWPaymentComponent({ 
  amount, 
  onSuccess, 
  onError, 
  className = '' 
}: NOWPaymentProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('BTC');
  const [payment, setPayment] = useState<NOWPayment | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [showQR, setShowQR] = useState(true);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const createPayment = async () => {
    if (!amount || amount <= 0) {
      onError('Invalid amount');
      return;
    }

    if (!user) {
      onError('Please log in to create a payment');
      return;
    }

    setLoading(true);
    try {
      const nowPayments = NOWPaymentsService.createInstance(user.id);
      
      const paymentData = await nowPayments.createPayment({
        amount: amount,
        currency: selectedCurrency,
        userEmail: userEmail || user.email,
        userName: user.name
      });

      setPayment(paymentData);
      setPaymentStatus('pending');
      
      // Generate QR code for the payment
      await generateQRCode(paymentData.payAddress, paymentData.amount, selectedCurrency);
      
      // Start checking payment status
      checkPaymentStatus(paymentData.id);
      
    } catch (error) {
      console.error('Payment creation failed:', error);
      onError(error instanceof Error ? error.message : 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (paymentId: string) => {
    if (!user || !user.id) return;
    
    setCheckingStatus(true);
    try {
      const nowPayments = NOWPaymentsService.createInstance(user.id);
      const paymentStatus = await nowPayments.getPaymentStatus(paymentId);
      
      if (paymentStatus.status === 'finished') {
        setPaymentStatus('completed');
        onSuccess({
          paymentId: paymentStatus.paymentId,
          amount: amount,
          currency: selectedCurrency,
          status: 'completed'
        });
      } else if (paymentStatus.status === 'failed' || paymentStatus.status === 'expired') {
        setPaymentStatus('failed');
        onError('Payment failed or expired');
      } else {
        // Continue checking
        setTimeout(() => checkPaymentStatus(paymentId), 10000); // Check every 10 seconds
      }
    } catch (error) {
      console.error('Status check failed:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const generateQRCode = async (address: string, amount: number, currency: string) => {
    try {
      // Create a crypto payment URI (works for most wallets)
      const paymentURI = `${currency.toLowerCase()}:${address}?amount=${amount}`;
      
      const qrCodeURL = await QRCodeLib.toDataURL(paymentURI, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeDataURL(qrCodeURL);
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback to just the address
      try {
        const fallbackQR = await QRCodeLib.toDataURL(address, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeDataURL(fallbackQR);
      } catch (fallbackError) {
        console.error('Error generating fallback QR code:', fallbackError);
      }
    }
  };

  const downloadQRCode = () => {
    if (qrCodeDataURL) {
      const link = document.createElement('a');
      link.href = qrCodeDataURL;
      link.download = `payment-qr-${selectedCurrency}-${Date.now()}.png`;
      link.click();
    }
  };

  // Get selected crypto data
  const getSelectedCrypto = () => {
    return SUPPORTED_CRYPTO_CURRENCIES.find(crypto => crypto.code === selectedCurrency) || SUPPORTED_CRYPTO_CURRENCIES[0];
  };

  if (paymentStatus === 'completed') {
    return (
      <Card className={`p-8 text-center border-0 bg-gradient-to-br from-green-50 to-yellow-50 shadow-2xl ${className}`}>
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-green-800 mb-3">Payment Completed!</h3>
        <p className="text-green-700 text-lg">
          Your payment of ${amount} has been successfully processed.
          Your wallet will be updated shortly.
        </p>
      </Card>
    );
  }

  if (payment && paymentStatus === 'pending') {
    const selectedCrypto = getSelectedCrypto();
    
    return (
      <div className={`max-w-full ${className}`}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Complete Your Payment</h3>
          <p className="text-gray-700 text-sm md:text-base">
            Send exactly <strong style={{ color: selectedCrypto.color }}>{payment.amount} {payment.currency}</strong> to complete your ${amount} deposit
          </p>
        </div>

        {/* Compact Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Payment Info Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 md:p-6 border border-blue-200">
            <div className="flex items-center mb-4">
              <img 
                src={selectedCrypto.logo} 
                alt={selectedCrypto.name}
                className="w-8 h-8 rounded-full mr-3"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <h4 className="font-semibold text-gray-900">{selectedCrypto.name}</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">USD Amount:</span>
                <span className="font-bold text-green-700">${amount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Pay Amount:</span>
                <span className="font-bold" style={{ color: selectedCrypto.color }}>
                  {payment.amount} {payment.currency}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Status:</span>
                <div className="flex items-center gap-2">
                  {checkingStatus && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />}
                  <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                    {payment.status === 'waiting' ? 'Awaiting Payment' : payment.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="bg-white rounded-2xl p-3 md:p-4 border border-gray-200 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <QrCode className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-900 text-sm">Scan to Pay</span>
            </div>
            
            {qrCodeDataURL ? (
              <div className="space-y-3">
                <div className="inline-block bg-white p-2 rounded-lg shadow-sm border">
                  <img 
                    src={qrCodeDataURL} 
                    alt="Payment QR Code"
                    className="w-24 h-24 md:w-28 md:h-28 mx-auto"
                  />
                </div>
                <div className="flex gap-1 justify-center">
                  <Button
                    onClick={downloadQRCode}
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    onClick={() => setShowQR(!showQR)}
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1"
                  >
                    <Smartphone className="w-3 h-3 mr-1" />
                    {showQR ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <QrCode className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Generating...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Address Section */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Copy className="w-4 h-4 mr-2" />
            Payment Address
          </h4>
          
          <div className="bg-white rounded-lg border p-3 mb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-mono text-xs md:text-sm text-gray-700 break-all flex-1 min-w-0">
                {payment.payAddress}
              </span>
              <Button
                onClick={() => copyToClipboard(payment.payAddress)}
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-600 mb-4">
            <strong>Important:</strong> Send exactly {payment.amount} {payment.currency} to this address. 
            Sending a different amount may result in loss of funds.
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => checkPaymentStatus(payment.id)}
              disabled={checkingStatus}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {checkingStatus ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Status
                </>
              )}
            </Button>
            <Button
              onClick={() => copyToClipboard(`${payment.amount} ${payment.currency} to ${payment.payAddress}`)}
              variant="outline"
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy All Details
            </Button>
          </div>
        </div>

        {/* Mobile-friendly Instructions */}
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-2">Payment Instructions:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>• Scan QR with your crypto wallet</div>
                <div>• Payment confirms in 10-30 minutes</div>
                <div>• Send exact amount shown</div>
                <div>• Keep this page open</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedCrypto = getSelectedCrypto();
  
  return (
    <div className={`max-w-full ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <DollarSign className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Pay with Cryptocurrency</h3>
        <p className="text-gray-600 text-sm md:text-base">
          Secure, fast, and anonymous payment via NOWPayments
        </p>
      </div>

      {/* Responsive Form */}
      <div className="space-y-6">
        {/* Email Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email (optional)
          </label>
          <Input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full"
          />
        </div>

        {/* Cryptocurrency Selection Grid */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Cryptocurrency
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-3">
            {SUPPORTED_CRYPTO_CURRENCIES.slice(0, 8).map(crypto => (
              <button
                key={crypto.code}
                onClick={() => setSelectedCurrency(crypto.code)}
                className={`p-2 border-2 rounded-lg transition-all duration-200 ${
                  selectedCurrency === crypto.code
                    ? `border-2 shadow-lg` 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
                style={{
                  borderColor: selectedCurrency === crypto.code ? crypto.color : undefined,
                  backgroundColor: selectedCurrency === crypto.code ? `${crypto.color}10` : undefined
                }}
              >
                <div className="flex flex-col items-center space-y-1">
                  <img 
                    src={crypto.logo} 
                    alt={crypto.name}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="text-center">
                    <div className="font-semibold text-xs text-gray-900">{crypto.code}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {/* Fallback Select for all currencies */}
          <Select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="w-full"
          >
            {SUPPORTED_CRYPTO_CURRENCIES.map(crypto => (
              <option key={crypto.code} value={crypto.code}>
                {crypto.icon} {crypto.name} ({crypto.code})
              </option>
            ))}
          </Select>
        </div>

        {/* Payment Summary */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 md:p-6 border border-blue-200">
          <div className="flex items-center mb-4">
            <img 
              src={selectedCrypto.logo} 
              alt={selectedCrypto.name}
              className="w-10 h-10 rounded-full mr-3"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div>
              <h4 className="font-semibold text-gray-900">{selectedCrypto.name}</h4>
              <p className="text-sm text-gray-600">Selected Cryptocurrency</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Deposit Amount:</span>
              <span className="font-bold text-green-700 text-lg">${amount} USD</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Payment Method:</span>
              <span className="font-bold" style={{ color: selectedCrypto.color }}>
                {selectedCrypto.name} ({selectedCrypto.code})
              </span>
            </div>
          </div>
        </div>

        {/* Create Payment Button */}
        <Button
          onClick={createPayment}
          disabled={loading || amount <= 0}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
          size="lg"
        >
          {loading ? (
            <>
              <Loader size="sm" className="mr-2" />
              Creating Payment...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Create {selectedCrypto.code} Payment
            </>
          )}
        </Button>

        {/* Security Info */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Secure Payment Features:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>• Powered by NOWPayments</div>
                <div>• Instant confirmation</div>
                <div>• 12+ cryptocurrencies supported</div>
                <div>• Automatic wallet credit</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
