import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Loader } from './Loader';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import PaymentPointService from '../../services/paymentPointService';
import { 
  Building2, 
  Copy, 
  CreditCard, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Shield,
  Banknote
} from 'lucide-react';

interface PaymentPointAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  isPermanent: boolean;
}

interface PaymentPointCardProps {
  className?: string;
  onAccountCreated?: (account: PaymentPointAccount) => void;
}

export function PaymentPointCard({ className, onAccountCreated }: PaymentPointCardProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [account, setAccount] = useState<PaymentPointAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    customerName: user?.name || '',
    customerEmail: user?.email || '',
    customerPhone: ''
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      checkExistingAccount();
    }
  }, [user]);

  const checkExistingAccount = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const existingAccount = await PaymentPointService.getExistingAccount(user.id);
      
      if (existingAccount) {
        setAccount({
          accountNumber: existingAccount.accountNumber,
          accountName: existingAccount.accountName,
          bankName: existingAccount.bankName,
          isPermanent: true
        });
        setShowAccountDetails(true);
        console.log('Existing PaymentPoint account loaded:', existingAccount.accountNumber);
      } else {
        setShowCreateForm(true);
        console.log('No existing PaymentPoint account found');
      }
    } catch (err) {
      console.error('Error checking existing account:', err);
      setShowCreateForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors when user starts typing
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      showError('Authentication Required', 'Please log in to create a virtual account');
      return;
    }

    // Validate form
    const errors = PaymentPointService.validateCustomerDetails(formData);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setCreating(true);
      setFormErrors([]);

      console.log('Creating PaymentPoint virtual account for user:', user.id);

      const result = await PaymentPointService.createVirtualAccount({
        userId: user.id,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone
      });

      if (result.success && result.account) {
        setAccount(result.account);
        setShowCreateForm(false);
        setShowAccountDetails(true);
        
        success('Account Created!', 'Your PaymentPoint virtual account has been created successfully');
        
        // Notify parent component
        if (onAccountCreated) {
          onAccountCreated(result.account);
        }
      } else {
        showError('Creation Failed', result.message || 'Failed to create virtual account');
      }
    } catch (error: any) {
      console.error('Error creating PaymentPoint account:', error);
      showError('Service Error', error.message || 'PaymentPoint service is currently unavailable');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyDetails = async () => {
    if (!account) return;
    
    try {
      await PaymentPointService.copyAccountDetails(account);
      success('Copied!', 'Account details copied to clipboard');
    } catch (error) {
      showError('Copy Failed', 'Failed to copy account details');
    }
  };

  const toggleAccountVisibility = () => {
    setShowAccountDetails(!showAccountDetails);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader size="md" text="Loading PaymentPoint account..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-green-600" />
          <span>PaymentPoint Virtual Account</span>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
            Nigerian Banks
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Service Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Instant Bank Transfer Deposits</p>
              <div className="space-y-1 text-xs">
                <p>• Transfer from any Nigerian bank</p>
                <p>• Funds credited within 2-5 minutes</p>
                <p>• 2% transaction fee applied</p>
                <p>• Permanent virtual account</p>
              </div>
            </div>
          </div>
        </div>

        {/* Existing Account Display */}
        {account && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Virtual Account Active</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAccountVisibility}
                className="h-8"
              >
                {showAccountDetails ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Show Details
                  </>
                )}
              </Button>
            </div>

            {showAccountDetails && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="text-center mb-3">
                  <h4 className="font-semibold text-blue-900 text-sm">Bank Transfer Details</h4>
                  <p className="text-xs text-blue-700">Use these details for all future deposits</p>
                </div>

                <div className="bg-white rounded-lg p-3 space-y-3 border border-blue-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 font-medium">Bank Name:</span>
                    <span className="font-semibold text-gray-900 text-sm">{account.bankName}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 font-medium">Account Name:</span>
                    <span className="font-semibold text-gray-900 text-sm">{account.accountName}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 font-medium">Account Number:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-blue-600 text-sm">
                        {PaymentPointService.formatAccountNumber(account.accountNumber)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyDetails}
                        className="p-1 hover:bg-blue-100"
                        title="Copy account details"
                      >
                        <Copy className="w-3 h-3 text-blue-600" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-blue-800 text-xs mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">How to Use</span>
                  </div>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Transfer any amount to this account</li>
                    <li>• Funds appear in your wallet within 2-5 minutes</li>
                    <li>• No manual approval needed</li>
                    <li>• Use this same account for all future deposits</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Account Form */}
        {showCreateForm && !account && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Create Your Virtual Account</p>
                  <p>Get a permanent Nigerian bank account for instant deposits</p>
                </div>
              </div>
            </div>

            {/* Form Errors */}
            {formErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Please fix the following errors:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {formErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <Input
                label="Full Name *"
                name="customerName"
                type="text"
                value={formData.customerName}
                onChange={handleInputChange}
                placeholder="Enter your full name as it appears on your ID"
                required
              />

              <Input
                label="Email Address *"
                name="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                required
              />

              <Input
                label="Phone Number (Optional)"
                name="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={handleInputChange}
                placeholder="+234 801 234 5678"
              />

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-green-800 text-xs mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Security & Privacy</span>
                </div>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• Your information is encrypted and secure</li>
                  <li>• Account is permanent and reusable</li>
                  <li>• Only you can access this account</li>
                  <li>• Compliant with Nigerian banking regulations</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                disabled={creating}
                size="lg"
              >
                {creating ? (
                  <>
                    <Loader size="sm" className="mr-2" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Building2 className="h-5 w-5 mr-2" />
                    Create Virtual Account
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Benefits */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Banknote className="w-4 h-4 mr-2 text-green-600" />
            PaymentPoint Benefits
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>Instant automatic crediting</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>Works with all Nigerian banks</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>No manual approval needed</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>Permanent account number</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PaymentPointCard;