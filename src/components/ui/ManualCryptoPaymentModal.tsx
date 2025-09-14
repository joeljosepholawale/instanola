import React, { useState, useEffect } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Clock, Image, Copy, QrCode } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { ManualPaymentService } from '../../services/manualPaymentService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

interface ManualCryptoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CryptoNetwork {
  name: string;
  symbol: string;
  address: string;
  color: string;
  icon: string;
}

export function ManualCryptoPaymentModal({ isOpen, onClose, onSuccess }: ManualCryptoPaymentModalProps) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [step, setStep] = useState<'currency' | 'amount' | 'payment' | 'submitting' | 'success'>('currency');
  const [selectedNetwork, setSelectedNetwork] = useState<CryptoNetwork | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const cryptoNetworks: CryptoNetwork[] = [
    {
      name: 'Bitcoin (BTC)',
      symbol: 'BTC',
      address: '1F7WGjK3pJacJkz5v9oA7vPLMKzicL5SqZ',
      color: 'from-orange-500 to-orange-600',
      icon: 'BTC'
    },
    {
      name: 'Ethereum',
      symbol: 'ETH',
      address: '0xbb17a35a306aa5a1b74cf85c7ffeec221f07c1af',
      color: 'from-blue-500 to-blue-600',
      icon: 'ETH'
    },
    {
      name: 'USD Coin (ERC20)',
      symbol: 'USDC',
      address: '0xbb17a35a306aa5a1b74cf85c7ffeec221f07c1af',
      color: 'from-blue-400 to-blue-500',
      icon: 'ETH'
    },
    {
      name: 'Tether (ERC20)',
      symbol: 'USDT',
      address: '0xbb17a35a306aa5a1b74cf85c7ffeec221f07c1af',
      color: 'from-green-500 to-green-600',
      icon: 'ETH'
    },
    {
      name: 'TRON',
      symbol: 'TRX',
      address: 'TA6NuQTfS6E6e6WCjaCHnkDZg612VWa4KU',
      color: 'from-red-500 to-red-600',
      icon: 'TRX'
    },
    {
      name: 'Tether (TRC20)',
      symbol: 'USDT-TRC20',
      address: 'TA6NuQTfS6E6e6WCjaCHnkDZg612VWa4KU',
      color: 'from-green-400 to-green-500',
      icon: 'TRX'
    },
    {
      name: 'Solana',
      symbol: 'SOL',
      address: '338rs34CsoRdmBZMCZWHLTdhfKXRsQr4cPZk9pFfdVu3',
      color: 'from-purple-500 to-purple-600',
      icon: 'SOL'
    },
    {
      name: 'USD Coin (SOL)',
      symbol: 'USDC-SOL',
      address: '338rs34CsoRdmBZMCZWHLTdhfKXRsQr4cPZk9pFfdVu3',
      color: 'from-blue-300 to-blue-400',
      icon: 'SOL'
    },
    {
      name: 'Binance Smart Chain',
      symbol: 'BNB',
      address: '0xbb17a35a306aa5a1b74cf85c7ffeec221f07c1af',
      color: 'from-yellow-500 to-yellow-600',
      icon: 'BSC'
    },
    {
      name: 'USD Coin (BEP20)',
      symbol: 'USDC-BSC',
      address: '0xbb17a35a306aa5a1b74cf85c7ffeec221f07c1af',
      color: 'from-blue-300 to-blue-400',
      icon: 'BSC'
    },
    {
      name: 'Tether (BEP20)',
      symbol: 'USDT-BSC',
      address: '0xbb17a35a306aa5a1b74cf85c7ffeec221f07c1af',
      color: 'from-green-400 to-green-500',
      icon: 'BSC'
    }
  ];

  const getCryptoLogo = (iconKey: string): string => {
    const logoMap: { [key: string]: string } = {
      'BTC': "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
      'ETH': "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
      'TRX': "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png",
      'SOL': "https://assets.coingecko.com/coins/images/4128/large/solana.png",
      'BSC': "https://assets.coingecko.com/coins/images/12591/large/binance-coin-logo.png"
    };
    return logoMap[iconKey];
  };

  const resetModal = () => {
    setStep('currency');
    setSelectedNetwork(null);
    setAmount('');
    setReceiptFile(null);
    setReceiptPreview('');
    setErrorMessage('');
  };

  const handleNetworkSelect = (network: CryptoNetwork) => {
    setSelectedNetwork(network);
    setStep('amount');
  };

  const handleAmountSubmit = () => {
    if (!amount || isNaN(parseFloat(amount))) {
      setErrorMessage('Please enter a valid amount');
      return;
    }
    
    const numAmount = parseFloat(amount);
    if (numAmount < 1) {
      setErrorMessage('Minimum deposit amount is $1.00');
      return;
    }
    
    if (numAmount > 10000) {
      setErrorMessage('Maximum deposit amount is $10,000');
      return;
    }
    
    setErrorMessage('');
    setStep('payment');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Please upload an image file (JPG, PNG, GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size must be less than 5MB');
      return;
    }

    setReceiptFile(file);
    setErrorMessage('');

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
      formData.append('folder', 'crypto_receipts');
      
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

  const handleSubmit = async () => {
    if (!user || !selectedNetwork) {
      setErrorMessage('Please log in and select a network');
      return;
    }

    if (!receiptFile) {
      setErrorMessage('Please upload your transaction receipt');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      setStep('submitting');

      // Upload receipt to Cloudinary
      const receiptUrl = await uploadToCloudinary();

      // Submit crypto payment request
      const paymentRequest = {
        userId: user.id,
        userEmail: user.email,
        amountUSD: parseFloat(amount),
        cryptoNetwork: selectedNetwork.name,
        cryptoSymbol: selectedNetwork.symbol,
        cryptoAddress: selectedNetwork.address,
        senderName: user.name || 'User',
        receiptUrl: receiptUrl,
        paymentMethod: 'crypto_manual',
        transactionReference: `crypto_${selectedNetwork.symbol}_${Date.now()}`
      };

      await ManualPaymentService.submitCryptoPaymentRequest(paymentRequest);
      setStep('success');
      
    } catch (error) {
      console.error('Crypto payment submission error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit payment');
      setStep('payment');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      success('Copied!', 'Address copied to clipboard');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      success('Copied!', 'Address copied to clipboard');
    });
  };

  const generateQRCode = (address: string, amount?: string) => {
    let qrData = address;
    
    if (amount && selectedNetwork) {
      const numAmount = parseFloat(amount);
      if (selectedNetwork.symbol === 'BTC') {
        qrData = `bitcoin:${address}?amount=${numAmount}`;
      } else if (selectedNetwork.symbol === 'ETH') {
        qrData = `ethereum:${address}?value=${numAmount}`;
      }
    }
    
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleSuccess = () => {
    onSuccess();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Crypto Payment</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Step 1: Currency Selection */}
          {step === 'currency' && (
            <div className="space-y-3">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Select Cryptocurrency</h3>
                <p className="text-xs text-gray-600">Choose your preferred crypto network</p>
              </div>

                {cryptoNetworks.map((network) => (
                  <button
                    key={network.symbol}
                    onClick={() => handleNetworkSelect(network)}
                    className="w-full p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                        <img 
                          src={getCryptoLogo(network.icon)}
                          alt={network.symbol} 
                          className="w-6 h-6 rounded-full"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">{network.name}</h4>
                        <p className="text-xs text-gray-600">{network.symbol}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
          )}

          {/* Step 2: Amount */}
          {step === 'amount' && selectedNetwork && (
            <div className="space-y-3">
              <div className="text-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-gray-100 shadow-sm">
                  <img 
                    src={getCryptoLogo(selectedNetwork.icon)} 
                    alt={selectedNetwork.symbol}
                    className="w-8 h-8 rounded-full"
                  />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedNetwork.name}</h3>
                <p className="text-sm text-gray-600">Enter deposit amount</p>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                  $
                </span>
                <input
                  type="number"
                  placeholder="10.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  max="10000"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium text-center"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-1">
                <button type="button" onClick={() => setAmount('1')} className="py-2 px-3 text-xs border border-gray-300 rounded hover:bg-gray-50">$1</button>
                <button type="button" onClick={() => setAmount('5')} className="py-2 px-3 text-xs border border-gray-300 rounded hover:bg-gray-50">$5</button>
                <button type="button" onClick={() => setAmount('10')} className="py-2 px-3 text-xs border border-gray-300 rounded hover:bg-gray-50">$10</button>
                <button type="button" onClick={() => setAmount('50')} className="py-2 px-3 text-xs border border-gray-300 rounded hover:bg-gray-50">$50</button>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                  <div className="flex items-center space-x-2 text-red-800 text-xs">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setStep('currency')} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleAmountSubmit} className="flex-1">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 'payment' && selectedNetwork && (
            <div className="space-y-3">
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-white border-2 border-gray-100 shadow-sm">
                  <img 
                    src={getCryptoLogo(selectedNetwork.icon)}
                    alt={selectedNetwork.symbol}
                    className="w-8 h-8 rounded-full object-contain"
                  />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Send ${amount} USD</h3>
                <p className="text-sm text-gray-600">Send to {selectedNetwork.symbol} address</p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 space-y-4">
                  <div className="text-center border-b border-gray-200 pb-3">
                    <div className="text-base font-semibold text-gray-900 mb-1">
                      {selectedNetwork.name}
                    </div>
                    <p className="text-xs text-gray-500">Network: {selectedNetwork.symbol}</p>
                  </div>

                  {/* QR Code */}
                  <div className="text-center bg-white rounded-lg p-3 border border-gray-100">
                    <img 
                      src={generateQRCode(selectedNetwork.address, amount)}
                      alt="Payment QR Code"
                      className="w-36 h-36 mx-auto rounded-lg shadow-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2 font-medium">Scan with your crypto wallet</p>
                  </div>

                  {/* Wallet Address */}
                  <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-800">Payment Address</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedNetwork.address)}
                        className="p-1 hover:bg-blue-50 text-blue-600"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="font-mono text-xs bg-gray-50 p-3 rounded-lg border break-all text-center">
                      {selectedNetwork.address}
                    </div>
                  </div>

                  {/* Amount Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-center">
                      <p className="text-xs text-blue-600 mb-1 font-medium">Send approximately</p>
                      <div className="text-xl font-bold text-blue-900">
                        ${amount} worth of {selectedNetwork.symbol}
                      </div>
                      <p className="text-xs text-blue-700 mt-1">
                        Check current rates on your exchange
                      </p>
                    </div>
                  </div>
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Transaction Screenshot <span className="text-red-500">*</span>
                </label>
                <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200">
                  {receiptPreview ? (
                    <div className="space-y-3">
                      <img 
                        src={receiptPreview} 
                        alt="Receipt preview" 
                        className="max-w-full h-40 object-contain mx-auto rounded-lg border shadow-sm"
                      />
                      <div className="flex items-center justify-center space-x-2">
                        <Image className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">
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
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-semibold">Upload transaction screenshot</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF (max 5MB)</p>
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
                  <div className="mt-2 text-sm text-blue-600 flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="font-medium">Uploading receipt...</span>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-red-800 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-amber-800 text-sm">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Confirmation within 5 to 10 mins</span>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button variant="outline" onClick={() => setStep('amount')} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || uploadingReceipt || !receiptFile}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {loading ? 'Submitting...' : uploadingReceipt ? 'Uploading...' : 'Submit Payment'}
                </Button>
              </div>
            </div>
          )}

          {step === 'submitting' && (
            <div className="text-center py-6">
              <Clock className="w-10 h-10 text-blue-600 mx-auto mb-3 animate-pulse" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">Submitting Payment</h3>
              <p className="text-sm text-gray-600">
                Please wait while we process your crypto payment request...
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-6">
              <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">Payment Submitted</h3>
              <p className="text-sm text-gray-600 mb-3">
                Your crypto payment request has been submitted successfully. 
                An admin will review and approve it within 10-15 minutes.
              </p>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="text-lg font-bold text-green-700 mb-1">
                  ${amount}
                </div>
                <div className="text-sm text-green-600">
                  {selectedNetwork?.name} payment submitted
                </div>
              </div>
              <Button onClick={handleSuccess} className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}