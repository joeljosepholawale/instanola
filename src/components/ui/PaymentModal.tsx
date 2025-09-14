import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, User, Phone, Building, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { Card } from './Card';
import { ManualPaymentModal } from './ManualPaymentModal';
import { ManualCryptoPaymentModal } from './ManualCryptoPaymentModal';
import { paymentPointService } from '../../services/paymentPointService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number) => void;
  exchangeRate: number;
  directPaymentPoint?: boolean; // New prop to skip method selection
}

export function PaymentModal({ isOpen, onClose, onSuccess, exchangeRate, directPaymentPoint = false }: PaymentModalProps) {
  const { user } = useAuth();
  const { success, error } = useToast();
  
  const [step, setStep] = useState<'method' | 'profile' | 'paymentpoint' | 'manual' | 'crypto'>('method');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
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
      checkExistingVirtualAccount();
      resetModal();
      
      // If directPaymentPoint is true, skip method selection
      if (directPaymentPoint) {
        setSelectedMethod('paymentpoint');
        // Check if we should go directly to PaymentPoint or profile setup
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
      const accountDoc = await getDoc(doc(db, 'paymentpoint_accounts', user.id));
      if (accountDoc.exists()) {
        setHasVirtualAccount(true);
        setVirtualAccount(accountDoc.data());
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
    setStep('method');
    setSelectedMethod('');
    setAmount('');
    setProfileData({
      name: user?.name || '',
      phone: ''
    });
  };

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
    
    if (method === 'manual') {
      setShowManualModal(true);
    } else if (method === 'crypto') {
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

    // Validate phone number format (basic validation)
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
    if (!phoneRegex.test(profileData.phone)) {
      error('Invalid Phone', 'Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);
      
      // Create virtual account with PaymentPoint
      const accountRequest = {
        userId: user!.id,
        amount: 0, // No specific amount for permanent account
        currency: 'NGN',
        description: 'ProxyNumSMS Wallet Funding',
        customerEmail: user!.email,
        customerName: profileData.name,
        customerPhone: profileData.phone
      };

      const result = await paymentPointService.createVirtualAccount(
        {
          userId: user!.id,
          customerEmail: user!.email || '',
          customerName: profileData.name,
          customerPhone: profileData.phone
        }
      );
      
      // Use the account from the result
      const account = result.account;
      setVirtualAccount({
        accountNumber: account.accountNumber,
        bankName: account.bankName,
        accountName: account.accountName
      });
      setHasVirtualAccount(true);
      setStep('paymentpoint');
      
      success('Account Created!', 'Your permanent virtual account has been created');
    } catch (err) {
      console.error('Error creating virtual account:', err);
      error('Creation Failed', err instanceof Error ? err.message : 'Failed to create virtual account');
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
    setShowManualModal(false);
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
            <h2 className="text-xl font-bold text-gray-900">Add Funds</h2>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Step 1: Payment Method Selection - Skip if directPaymentPoint is true */}
            {step === 'method' && !directPaymentPoint && (
              <div className="space-y-3">
                <div className="text-center mb-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Choose Payment Method</h3>
                  <p className="text-xs text-gray-600">Select how you'd like to add funds to your wallet</p>
                </div>

                <div className="space-y-2">
                  {/* PaymentPoint Option */}
                  <button
                    onClick={() => handleMethodSelect('paymentpoint')}
                    className="w-full p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">PaymentPoint (Recommended)</h4>
                        <p className="text-xs text-gray-600">Nigerian bank transfer • Instant crediting</p>
                        {hasVirtualAccount && (
                          <p className="text-xs text-green-600 font-medium">✓ Virtual account ready</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-green-600">Instant</div>
                        <div className="text-xs text-gray-500">2-5 minutes</div>
                      </div>
                    </div>
                  </button>

                  {/* Manual Payment Option */}
                  <button
                    onClick={() => handleMethodSelect('manual')}
                    className="w-full p-3 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">Manual Payment (Naira)</h4>
                        <p className="text-xs text-gray-600">OPAY, Bank transfer • Manual approval</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-orange-600">10-15 min</div>
                        <div className="text-xs text-gray-500">Admin review</div>
                      </div>
                    </div>
                  </button>

                  {/* Crypto Payment Option */}
                  <button
                    onClick={() => handleMethodSelect('crypto')}
                    className="w-full p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">Cryptocurrency</h4>
                        <p className="text-xs text-gray-600">Bitcoin, Ethereum, TRON • Fast confirmation</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-purple-600">5-10 min</div>
                        <div className="text-xs text-gray-500">Confirmation</div>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <div className="flex items-center space-x-2 text-blue-800 text-xs">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Payment Information</span>
                  </div>
                  <ul className="text-xs text-blue-700 mt-1 space-y-0.5">
                    <li>• PaymentPoint: Instant automatic crediting</li>
                    <li>• Manual: Requires admin approval (10-15 min)</li>
                    <li>• Crypto: Fast confirmation after screenshot review</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 2: Profile Completion for PaymentPoint */}
            {step === 'profile' && (
              <div className="space-y-3">
                <div className="text-center mb-4">
                  <Building className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Complete Your Profile</h3>
                  <p className="text-xs text-gray-600">We need this information to create your permanent virtual account</p>
                </div>

                <div className="space-y-3">
                  <Input
                    label="Full Name"
                    placeholder="Enter your full name as it appears on your ID"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />

                  <Input
                    label="Phone Number"
                    placeholder="Enter your phone number (e.g., +234 801 234 5678)"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-green-800 text-xs">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">One-time Setup</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    After this setup, you'll get a permanent virtual account for instant deposits.
                  </p>
                </div>

                <div className="flex space-x-2">
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
                    className={directPaymentPoint ? "flex-1" : "flex-1"}
                  >
                    {loading ? 'Creating Account...' : 'Create Virtual Account'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: PaymentPoint Virtual Account Display */}
            {step === 'paymentpoint' && virtualAccount && (
              <div className="space-y-3">
                <div className="text-center mb-4">
                  <Building className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Your Virtual Account</h3>
                  <p className="text-xs text-gray-600">Transfer any amount to this account for instant crediting</p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 space-y-3">
                  <div className="text-center">
                    <h4 className="font-medium text-blue-900 mb-2 text-sm">Bank Transfer Details</h4>
                  </div>

                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Bank Name:</span>
                      <span className="font-medium text-gray-900 text-sm">{virtualAccount.bankName}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Account Name:</span>
                      <span className="font-medium text-gray-900 text-sm">{virtualAccount.accountName}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Account Number:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-blue-600 text-sm">{virtualAccount.accountNumber}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyAccountNumber}
                          className="p-1"
                        >
                          <CreditCard className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-100 border border-blue-300 rounded-lg p-2">
                    <div className="flex items-center space-x-2 text-blue-800 text-xs">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Instant Crediting</span>
                    </div>
                    <ul className="text-xs text-blue-700 mt-1 space-y-0.5">
                      <li>• Transfer any amount to this account</li>
                      <li>• Funds appear in your wallet within 2-5 minutes</li>
                      <li>• No manual approval needed</li>
                      <li>• Use this same account for all future deposits</li>
                    </ul>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {!directPaymentPoint && (
                    <Button variant="outline" onClick={() => setStep('method')} className="flex-1">
                      Back
                    </Button>
                  )}
                  <Button onClick={handleClose} className={directPaymentPoint ? "w-full" : "flex-1"}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Payment Modal */}
      <ManualPaymentModal
        isOpen={showManualModal}
        onClose={() => {
          setShowManualModal(false);
          handleClose();
        }}
        onSuccess={() => {
          setShowManualModal(false);
          handlePaymentSuccess(0);
        }}
      />

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