import React, { useState, useEffect } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Clock, Image, DollarSign } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { ManualPaymentService } from '../../services/manualPaymentService';
import { useAuth } from '../../hooks/useAuth';

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualPaymentModal({ isOpen, onClose, onSuccess }: ManualPaymentModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'submitting' | 'success'>('form');
  const [currency, setCurrency] = useState<'USD' | 'NGN'>('NGN');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(1600);

  useEffect(() => {
    loadExchangeRate();
  }, []);

  const loadExchangeRate = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      setExchangeRate(data.rates.NGN || 1600);
    } catch (error) {
      console.warn('Failed to load exchange rate, using fallback');
      setExchangeRate(1600);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload an image file (JPG, PNG, GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setReceiptFile(file);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadToCloudinary = async (): Promise<string> => {
    if (!receiptFile) {
      throw new Error('No receipt file selected');
    }

    try {
      setUploadingReceipt(true);
      
      const formData = new FormData();
      formData.append('file', receiptFile);
      formData.append('upload_preset', 'ml_default');
      formData.append('folder', 'receipts');
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload to Cloudinary');
      }

      const result = await response.json();
      return result.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new Error('Failed to upload receipt. Please try again.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please log in to submit payment');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Validate minimum amounts
    if (currency === 'NGN' && parseFloat(amount) < 1000) {
      setError('Minimum amount is ₦1,000');
      return;
    }

    if (currency === 'USD' && parseFloat(amount) < 1) {
      setError('Minimum amount is $1.00');
      return;
    }

    if (!receiptFile) {
      setError('Please upload your payment receipt');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setStep('submitting');

      // Upload receipt to Cloudinary
      const receiptUrl = await uploadToCloudinary();

      // Calculate amounts based on selected currency
      let amountNGN: number;
      let amountUSD: number;

      if (currency === 'NGN') {
        amountNGN = parseFloat(amount);
        amountUSD = amountNGN / exchangeRate;
      } else {
        amountUSD = parseFloat(amount);
        amountNGN = amountUSD * exchangeRate;
      }

      const paymentRequest = {
        userId: user.id,
        userEmail: user.email,
        amountNGN: amountNGN,
        amountUSD: amountUSD,
        exchangeRate: exchangeRate,
        senderName: user.name || 'User',
        senderPhone: '',
        transactionReference: `manual_${Date.now()}`,
        paymentMethod: 'other' as 'opay' | 'gtbank' | 'access' | 'other',
        receiptUrl: receiptUrl,
        notes: `${currency} payment - Receipt uploaded`
      };

      await ManualPaymentService.submitPaymentRequest(paymentRequest);
      setStep('success');
      
    } catch (error) {
      console.error('Payment submission error:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit payment');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setAmount('');
    setCurrency('NGN');
    setReceiptFile(null);
    setReceiptPreview('');
    setError('');
    onClose();
  };

  const handleSuccess = () => {
    onSuccess();
    handleClose();
  };

  const formatNaira = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getConvertedAmount = () => {
    if (!amount || isNaN(parseFloat(amount))) {
      return currency === 'USD' ? '₦0' : '$0.00';
    }
    
    const numAmount = parseFloat(amount);
    if (currency === 'USD') {
      return formatNaira(numAmount * exchangeRate);
    } else {
      return formatCurrency(numAmount / exchangeRate);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Manual Payment</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === 'form' && (
            <div className="space-y-4">
              {/* Currency Selection Tabs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Currency
                </label>
                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setCurrency('NGN')}
                    className={`flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      currency === 'NGN'
                        ? 'bg-white text-green-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-base">₦</span>
                    <span>Naira</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      currency === 'USD'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>USD</span>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ({currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    {currency === 'USD' ? '$' : '₦'}
                  </span>
                  <input
                    type="number"
                    placeholder={currency === 'USD' ? '10.00' : '10000'}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={currency === 'USD' ? '1' : '1000'}
                    step={currency === 'USD' ? '0.01' : '100'}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
                    required
                  />
                </div>
                
                {/* Conversion Display */}
                {amount && parseFloat(amount) > 0 && (
                  <div className="mt-1 text-xs text-gray-600 text-center">
                    ≈ {getConvertedAmount()}
                  </div>
                )}
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Receipt <span className="text-red-500">*</span>
                </label>
                <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                  {receiptPreview ? (
                    <div className="space-y-2">
                      <img 
                        src={receiptPreview} 
                        alt="Receipt preview" 
                        className="max-w-full h-32 object-contain mx-auto rounded border"
                      />
                      <div className="flex items-center justify-center space-x-2">
                        <Image className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">
                          {receiptFile?.name}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReceiptFile(null);
                          setReceiptPreview('');
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-xs text-gray-600 font-medium">Upload payment receipt</p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF (max 5MB)</p>
                      </div>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                
                {uploadingReceipt && (
                  <div className="mt-1 text-xs text-blue-600 flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Uploading receipt...</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                  <div className="flex items-center space-x-2 text-red-800 text-xs">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Payment Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h3 className="font-medium text-blue-900 mb-1 text-sm">Payment Instructions</h3>
                <div className="text-xs text-blue-800 space-y-1">
                  <p><strong>Account:</strong> 6140666744</p>
                  <p><strong>Name:</strong> KOYA OMOBOLAJI.C</p>
                  <p><strong>Bank:</strong> OPAY</p>
                  <p className="mt-1 font-medium">Upload receipt after payment for approval</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                <div className="flex items-center space-x-2 text-yellow-800 text-xs">
                  <Clock className="w-4 h-4" />
                  <span>Payment requires admin approval (usually within 10-15 minutes)</span>
                </div>
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={loading || uploadingReceipt || !amount || !receiptFile} 
                className="w-full" 
              >
                {loading ? 'Submitting...' : uploadingReceipt ? 'Uploading...' : 'Submit Payment Request'}
              </Button>
            </div>
          )}

          {step === 'submitting' && (
            <div className="text-center py-6">
              <Clock className="w-10 h-10 text-blue-600 mx-auto mb-3 animate-pulse" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">Submitting Payment</h3>
              <p className="text-sm text-gray-600">
                Please wait while we process your payment request...
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-6">
              <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">Payment Submitted</h3>
              <p className="text-sm text-gray-600 mb-3">
                Your payment request has been submitted successfully. 
                An admin will review and approve it within 10-15 minutes.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-800">
                  <strong>Amount:</strong> {currency === 'NGN' ? formatNaira(parseFloat(amount)) : formatCurrency(parseFloat(amount))}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  You'll receive an email notification once approved.
                </p>
              </div>
              <Button onClick={handleSuccess} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}