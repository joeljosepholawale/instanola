import React, { useState, useEffect } from 'react';
import { X, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { NOWPaymentComponent } from './NOWPayment';
import { Modal } from './Modal';
import { useAuth } from '../../hooks/useAuth';
import { doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface NOWPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number) => void;
  onError?: (error: string) => void;
}

export function NOWPaymentModal({ isOpen, onClose, onSuccess, onError }: NOWPaymentModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'amount' | 'payment' | 'success'>('amount');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Predefined amount options
  const predefinedAmounts = [10, 20, 50, 100, 200];
  const minAmount = 5;
  const maxAmount = 1000;

  useEffect(() => {
    if (!isOpen) {
      // Reset modal state when closed
      setAmount('');
      setStep('amount');
      setError(null);
    }
  }, [isOpen]);

  const handleAmountSelect = (value: number) => {
    setAmount(value.toString());
  };

  const handleContinue = () => {
    const numAmount = parseFloat(amount);
    
    if (!amount || isNaN(numAmount)) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount < minAmount) {
      setError(`Minimum amount is $${minAmount}`);
      return;
    }

    if (numAmount > maxAmount) {
      setError(`Maximum amount is $${maxAmount}`);
      return;
    }

    setError(null);
    setStep('payment');
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const numAmount = parseFloat(amount);
      
      // Record transaction as pending - wallet will be credited by webhook/status check
      await setDoc(doc(db, 'transactions', `nowpayments_${paymentData.paymentId}`), {
        userId: user.id,
        type: 'deposit',
        amount: numAmount,
        currency: 'USD',
        description: `NOWPayments crypto payment - ${paymentData.currency}`,
        status: 'pending',
        paymentMethod: 'nowpayments_crypto',
        nowPaymentId: paymentData.paymentId,
        cryptoCurrency: paymentData.currency,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Store payment for tracking - don't credit wallet yet
      await setDoc(doc(db, 'nowpayments_payments', paymentData.paymentId.toString()), {
        userId: user.id,
        paymentId: paymentData.paymentId,
        orderId: paymentData.paymentId.toString(),
        amount: numAmount,
        currency: paymentData.currency,
        status: 'waiting',
        payAddress: paymentData.payAddress,
        createdAt: new Date(),
        walletCredited: false // Track if wallet has been credited
      });

      setStep('success');
      onSuccess(numAmount);
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error('Error processing payment success:', error);
      setError(error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentError = (error: string) => {
    setError(error);
    if (onError) {
      onError(error);
    }
  };

  const renderAmountStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Add Funds</h3>
        <p className="text-gray-600">
          Top up your wallet with cryptocurrency payments
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select or enter amount (USD)
        </label>
        
        {/* Predefined amounts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
          {predefinedAmounts.map(value => (
            <button
              key={value}
              onClick={() => handleAmountSelect(value)}
              className={`p-4 border-2 rounded-xl text-center transition-all duration-200 hover:scale-105 ${
                amount === value.toString()
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 shadow-lg'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md'
              }`}
            >
              <div className="font-bold text-lg">${value}</div>
              <div className="text-xs text-gray-600 mt-1">Quick Select</div>
            </button>
          ))}
        </div>

        {/* Custom amount input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 text-lg">$</span>
          </div>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter custom amount"
            min={minAmount}
            max={maxAmount}
            step="0.01"
            className="pl-8 text-lg"
          />
        </div>
        
        <div className="text-sm text-gray-500 mt-2">
          Minimum: ${minAmount} • Maximum: ${maxAmount}
        </div>
      </div>

      <Button
        onClick={handleContinue}
        disabled={!amount || parseFloat(amount) < minAmount}
        className="w-full bg-blue-600 hover:bg-blue-700"
        size="lg"
      >
        Continue to Payment
      </Button>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Complete Payment</h3>
        <Button
          onClick={() => setStep('amount')}
          variant="ghost"
          size="sm"
          className="text-gray-500"
        >
          Back
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <NOWPaymentComponent
        amount={parseFloat(amount)}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-green-800 mb-2">Payment Successful!</h3>
        <p className="text-gray-600">
          ${amount} has been added to your wallet
        </p>
      </div>

      <div className="bg-green-50 rounded-lg p-4">
        <div className="text-sm text-green-700">
          Your wallet balance has been updated and you can now use these funds
          to purchase virtual numbers.
        </div>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            {step === 'amount' && 'Add Funds'}
            {step === 'payment' && 'Crypto Payment'}
            {step === 'success' && 'Payment Complete'}
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto max-h-[70vh]">
          {step === 'amount' && renderAmountStep()}
          {step === 'payment' && renderPaymentStep()}
          {step === 'success' && renderSuccessStep()}
        </div>
      </div>
    </Modal>
  );
}
