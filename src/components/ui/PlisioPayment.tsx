import React, { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { PlisioService, SUPPORTED_CRYPTO_CURRENCIES, PlisioInvoice } from '../../services/plisioService';
import { useAuth } from '../../hooks/useAuth';

interface PlisioPaymentProps {
  amount: number;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
  className?: string;
}

export function PlisioPayment({ 
  amount, 
  onSuccess, 
  onError, 
  className = '' 
}: PlisioPaymentProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USDT');
  const [invoice, setInvoice] = useState<PlisioInvoice | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState('');

  // Get fee estimation when currency changes
  useEffect(() => {
    const getFeeEstimation = async () => {
      if (amount > 0 && selectedCurrency && user && user.id) {
        try {
          const plisio = PlisioService.createInstance(user.id);
          const feeData = await plisio.getFeeEstimation(selectedCurrency, amount);
          setEstimatedFee(feeData.fee);
        } catch (error) {
          console.warn('Fee estimation failed:', error);
          setEstimatedFee(null);
        }
      }
    };

    getFeeEstimation();
  }, [amount, selectedCurrency, user]);

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
      const plisio = PlisioService.createInstance(user.id);
      
      const invoiceData = await plisio.createInvoice({
        amount: amount,
        currency: selectedCurrency,
        userEmail: userEmail || user.email,
        userName: user.name
      });

      setInvoice(invoiceData);
      setPaymentStatus('pending');
      
      // Start checking payment status
      checkPaymentStatus(invoiceData.id);
      
    } catch (error) {
      console.error('Payment creation failed:', error);
      onError(error instanceof Error ? error.message : 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (invoiceId: string) => {
    if (!user || !user.id) return;
    
    setCheckingStatus(true);
    try {
      const plisio = PlisioService.createInstance(user.id);
      const invoiceStatus = await plisio.getInvoice(invoiceId);
      
      if (invoiceStatus.status === 'completed') {
        setPaymentStatus('completed');
        onSuccess({
          invoiceId: invoiceStatus.id,
          amount: amount,
          currency: selectedCurrency,
          status: 'completed'
        });
      } else if (invoiceStatus.status === 'cancelled' || invoiceStatus.status === 'expired') {
        setPaymentStatus('failed');
        onError('Payment was cancelled or expired');
      } else {
        // Continue checking
        setTimeout(() => checkPaymentStatus(invoiceId), 10000); // Check every 10 seconds
      }
    } catch (error) {
      console.error('Status check failed:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openPaymentPage = () => {
    if (invoice?.invoiceUrl) {
      window.open(invoice.invoiceUrl, '_blank', 'noopener,noreferrer');
    }
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

  if (invoice && paymentStatus === 'pending') {
    return (
      <Card className={`p-8 border-0 bg-gradient-to-br from-yellow-50 to-green-50 shadow-2xl ${className}`}>
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Complete Your Payment</h3>
          <p className="text-gray-700 text-lg">
            Send exactly <strong className="text-green-700">${amount}</strong> in {selectedCurrency} to complete your payment
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-yellow-50 rounded-2xl p-6 mb-8 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Payment Amount:</span>
            <span className="font-bold text-green-700 text-lg">${amount} USD</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Currency:</span>
            <span className="font-bold text-gray-900">{selectedCurrency}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className="flex items-center gap-2">
              {checkingStatus && <RefreshCw className="w-4 h-4 text-green-600 animate-spin" />}
              <span className="text-sm font-medium text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full">Waiting for payment</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={openPaymentPage}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-300"
            size="lg"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Open Payment Page
          </Button>
          
          <div className="text-center">
            <Button
              onClick={() => checkPaymentStatus(invoice.id)}
              variant="outline"
              disabled={checkingStatus}
              className="text-sm"
            >
              {checkingStatus ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking Status...
                </>
              ) : (
                'Check Payment Status'
              )}
            </Button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Send the exact amount to avoid delays</li>
                <li>Payment typically confirms within 10-30 minutes</li>
                <li>Do not close this page until payment is confirmed</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-8 ${className}`}>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Pay with Cryptocurrency</h3>
        <p className="text-gray-600">
          Secure, fast, and anonymous payment via Plisio
        </p>
      </div>

      <div className="space-y-4">
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Cryptocurrency
          </label>
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

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Amount:</span>
            <span className="font-bold text-gray-900">${amount}</span>
          </div>
          {estimatedFee !== null && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Estimated Network Fee:</span>
              <span className="text-sm text-gray-900">~${estimatedFee.toFixed(4)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Currency:</span>
            <span className="font-bold text-blue-600">{selectedCurrency}</span>
          </div>
        </div>

        <Button
          onClick={createPayment}
          disabled={loading || amount <= 0}
          className="w-full bg-blue-600 hover:bg-blue-700"
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
              Create Payment
            </>
          )}
        </Button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Secure Payment:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Powered by Plisio - trusted crypto payment gateway</li>
              <li>Supports all major cryptocurrencies</li>
              <li>Instant confirmation and wallet credit</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
