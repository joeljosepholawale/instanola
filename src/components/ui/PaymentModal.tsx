import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, User, Phone, Building, AlertCircle, CheckCircle, Clock, Copy } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { Card } from './Card';
import { Loader } from './Loader';
import { ManualCryptoPaymentModal } from './ManualCryptoPaymentModal';
import PaymentPointService from '../../services/paymentPointService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number) => void;
  exchangeRate: number;
  directPaymentPoint?: boolean;
}

export function PaymentModal({ isOpen, onClose, onSuccess, exchangeRate, directPaymentPoint = false }: PaymentModalProps) {
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  
  const [step, setStep] = useState<'method' | 'profile' | 'paymentpoint' | 'crypto'>('method');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [showManualCryptoModal, setShowManualCryptoModal] = useState(false);
  const [hasVirtualAccount, setHasVirtualAccount] = useState(false);
  const [virtualAccount, setVirtualAccount] = useState<any>(null);
  
  // Profile completion for PaymentPoint
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: ''
  });

  useEffect(() => {
    if (isOpen && user) {
      resetModal();
      checkExistingVirtualAccount();
      
      // If directPaymentPoint is true, skip method selection
      if (directPaymentPoint) {
        setSelectedMethod('paymentpoint');
        checkExistingVirtualAccount().then(() => {
          if (hasVirtualAccount) {
            setStep('paymentpoint');
          } else {
            setStep('profile');
          }
        });
      }
    }
  }, [isOpen, user, directPaymentPoint]);

  const checkExistingVirtualAccount = async () => {
    if (!user) return;
    
    try {
      const account = await PaymentPointService.getExistingAccount(user.id);
      if (account) {
        setHasVirtualAccount(true);
        setVirtualAccount({
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          bankName: account.bankName
        });
      } else {
        setHasVirtualAccount(false);
        setVirtualAccount(null);
      }
    } catch (err) {
      console.error('Error checking virtual account:', err);
      setHasVirtualAccount(false);
    }
  };

  const resetModal = () => {
    if (!directPaymentPoint) {
      setStep('method');
      setSelectedMethod('');
    }
    setProfileData({
      name: user?.name || '',
      phone: ''
    });
  };

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
    
    if (method === 'crypto') {
      setShowManualCryptoModal(true);
    } else if (method === 'paymentpoint') {
      if (hasVirtualAccount) {
        setStep('paymentpoint');
      } else {
        setStep('profile');
      }
    }
  };

  const handleProfileSubmit = async () => {
    if (!profileData.name.trim()) {
      error('Name Required', 'Please enter your full name');
      return;
    }
    
    if (!profileData.phone.trim()) {
      error('Phone Required', 'Please enter your phone number');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^(\+?234|0)[789]\d{9}$/;
    if (!phoneRegex.test(profileData.phone.replace(/\s/g, ''))) {
      error('Invalid Phone', 'Please enter a valid Nigerian phone number');
      return;
    }

    try {
      setLoading(true);
      
      console.log('Creating PaymentPoint virtual account...');
      
      const result = await PaymentPointService.createVirtualAccount({
        userId: user!.id,
        customerName: profileData.name,
        customerEmail: user!.email,
        customerPhone: profileData.phone
      });
      
      if (result.success && result.account) {
        setVirtualAccount(result.account);
        setHasVirtualAccount(true);
        setStep('paymentpoint');
        
        success('Account Created!', 'Your PaymentPoint virtual account has been created');
      } else {
        error('Creation Failed', result.message || 'Failed to create virtual account');
      }
    } catch (err) {
      console.error('Error creating virtual account:', err);
      let errorMessage = 'Failed to create virtual account';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Handle specific PaymentPoint errors
        if (errorMessage.includes('API keys are not configured') || 
            errorMessage.includes('API Key is missing') || 
            errorMessage.includes('401')) {
          error('Service Configuration', 'PaymentPoint API keys need to be configured. Please contact support or use crypto payment instead.');
          // Auto-redirect to crypto payment after 3 seconds
          setTimeout(() => {
            setShowManualCryptoModal(true);
          }, 3000);
          return;
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
          errorMessage = 'PaymentPoint API access denied. Please verify API credentials.';
        } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
          errorMessage = 'PaymentPoint service is experiencing issues. Please try again later.';
        }
      }
      
      error('PaymentPoint Error', errorMessage);
      
      // Show crypto payment as alternative for configuration issues
      if (errorMessage.includes('API keys') || errorMessage.includes('contact support')) {
        setTimeout(() => {
          setShowManualCryptoModal(true);
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyAccountNumber = () => {
    if (virtualAccount?.accountNumber) {
      navigator.clipboard.writeText(virtualAccount.accountNumber);
      success('Copied!', 'Account number copied to clipboard');
    }
  };

  const handleClose = () => {
    resetModal();
    setShowManualCryptoModal(false);
    onClose();
  };

  const handlePaymentSuccess = (amount: number) => {
    onSuccess(amount);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {directPaymentPoint ? 'PaymentPoint Deposit' : 'Add Funds'}
            </h2>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Step 1: Payment Method Selection */}
            {step === 'method' && !directPaymentPoint && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Payment Method</h3>
                  <p className="text-sm text-gray-600">Select how you'd like to add funds to your wallet</p>
                </div>

                <div className="space-y-3">
                  {/* PaymentPoint Option */}
                  <button
                    onClick={() => handleMethodSelect('paymentpoint')}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Building className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">PaymentPoint (Recommended)</h4>
                        <p className="text-sm text-gray-600">Nigerian bank transfer • Instant crediting</p>
                        {hasVirtualAccount && (
                          <p className="text-xs text-green-600 font-medium">✓ Virtual account ready</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-green-600">Instant</div>
                        <div className="text-xs text-gray-500">2-5 minutes</div>
                      </div>
                    </div>
                  </button>

                  {/* Crypto Payment Option */}
                  <button
                    onClick={() => handleMethodSelect('crypto')}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Cryptocurrency</h4>
                        <p className="text-sm text-gray-600">Bitcoin, Ethereum, USDT • Global payments</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-blue-600">5-10 min</div>
                        <div className="text-xs text-gray-500">Confirmation</div>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <div className="flex items-center space-x-2 text-blue-800 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Payment Information</span>
                  </div>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• PaymentPoint: Instant automatic crediting with 2% fee</li>
                    <li>• Crypto: Fast confirmation after payment verification</li>
                    <li>• All payments are secure and encrypted</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 2: Profile Completion for PaymentPoint */}
            {step === 'profile' && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <Building className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Your Profile</h3>
                  <p className="text-sm text-gray-600">We need this information to create your permanent virtual account</p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    placeholder="Enter your full name as it appears on your ID"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />

                  <Input
                    label="Phone Number"
                    placeholder="Enter your Nigerian phone number (e.g., +234 801 234 5678)"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-green-800 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">One-time Setup</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    After this setup, you'll get a permanent virtual account for instant deposits.
                  </p>
                </div>

                <div className="flex space-x-3">
                  {!directPaymentPoint && (
                    <Button variant="outline" onClick={() => setStep('method')} className="flex-1">
                      Back
                    </Button>
                  )}
                  {directPaymentPoint && (
                    <Button variant="outline" onClick={handleClose} className="flex-1">
                      Cancel
                    </Button>
                  )}
                  <Button 
                    onClick={handleProfileSubmit} 
                    disabled={loading || !profileData.name.trim() || !profileData.phone.trim()}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  >
                    {loading ? (
                      <>
                        <Loader size="sm" className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Virtual Account'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: PaymentPoint Virtual Account Display */}
            {step === 'paymentpoint' && virtualAccount && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <Building className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Virtual Account</h3>
                  <p className="text-sm text-gray-600">Transfer any amount to this account for instant crediting</p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 space-y-4">
                  <div className="text-center">
                    <h4 className="font-semibold text-green-900 mb-3">Bank Transfer Details</h4>
                  </div>

                  <div className="bg-white rounded-lg p-4 space-y-3 border border-green-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 font-medium">Bank Name:</span>
                      <span className="font-semibold text-gray-900">{virtualAccount.bankName}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 font-medium">Account Name:</span>
                      <span className="font-semibold text-gray-900">{virtualAccount.accountName}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 font-medium">Account Number:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-green-600 text-lg">
                          {virtualAccount.accountNumber}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyAccountNumber}
                          className="p-1 hover:bg-green-100"
                          title="Copy account number"
                        >
                          <Copy className="w-4 h-4 text-green-600" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-green-800 text-sm mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Instant Processing</span>
                    </div>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Transfer any amount to this account</li>
                      <li>• Funds appear in your wallet within 2-5 minutes</li>
                      <li>• 2% transaction fee automatically deducted</li>
                      <li>• Use this same account for all future deposits</li>
                      <li>• Works with all Nigerian banks and mobile money</li>
                    </ul>
                  </div>
                </div>

                <div className="flex space-x-3">
                  {!directPaymentPoint && (
                    <Button variant="outline" onClick={() => setStep('method')} className="flex-1">
                      Back
                    </Button>
                  )}
                  <Button 
                    onClick={handleClose} 
                    className={`${directPaymentPoint ? 'w-full' : 'flex-1'} bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800`}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Crypto Payment Modal */}
      <ManualCryptoPaymentModal
        isOpen={showManualCryptoModal}
        onClose={() => {
          setShowManualCryptoModal(false);
          handleClose();
        }}
        onSuccess={() => {
          setShowManualCryptoModal(false);
          handlePaymentSuccess(0);
        }}
      />
    </>
  );
}