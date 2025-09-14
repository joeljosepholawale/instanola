import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { useAuth } from '../../hooks/useAuth';
import { paymentPointService } from '../../services/paymentPointService';
import { useToast } from '../../hooks/useToast';
import { 
  Building2, 
  Copy, 
  CreditCard, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';

interface PaymentPointAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  isPermanent: boolean;
}

interface PaymentPointCardProps {
  className?: string;
}

export const PaymentPointCard: React.FC<PaymentPointCardProps> = ({ className }) => {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [account, setAccount] = useState<PaymentPointAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    customerName: user?.displayName || '',
    customerEmail: user?.email || '',
    customerPhone: ''
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Check for existing account on component mount
  useEffect(() => {
    checkExistingAccount();
  }, [user]);

  const checkExistingAccount = () => {
    if (!user) return;

    // Simply show the create form if no account exists
    // We'll check for existing accounts through other means
    setShowCreateForm(true);
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
    const errors = paymentPointService.validateCustomerDetails(formData);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setLoading(true);
      setFormErrors([]);

      const result = await paymentPointService.createVirtualAccount({
        userId: user.id,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone
      });

      if (result.success && result.account) {
        setAccount(result.account);
        setShowCreateForm(false);
        setShowAccountDetails(true);
        success('Account Created', 'PaymentPoint virtual account created successfully!');
      } else {
        showError('Creation Failed', result.message || 'Failed to create virtual account');
      }
    } catch (error: any) {
      console.error('Error creating PaymentPoint account:', error);
      showError('Creation Failed', error.message || 'Failed to create virtual account');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDetails = async () => {
    if (!account) return;
    
    try {
      await paymentPointService.copyAccountDetails(account);
      success('Copied!', 'Account details copied to clipboard!');
    } catch (error) {
      showError('Copy Failed', 'Failed to copy account details');
    }
  };

  const toggleAccountVisibility = () => {
    setShowAccountDetails(!showAccountDetails);
  };

  if (loading && !account && !showCreateForm) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading PaymentPoint account...</span>
          </div>
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
          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
            Nigerian Banks
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Account Status Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-green-600 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium">Bank Transfer Deposits</p>
              <p>Transfer money from any Nigerian bank to your virtual account. Funds appear instantly with a 2% fee.</p>
            </div>
          </div>
        </div>

        {/* Existing Account Display */}
        {account && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Account Active</span>
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
                    Show
                  </>
                )}
              </Button>
            </div>

            {showAccountDetails && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Account Name</label>
                  <p className="text-sm font-mono bg-white border rounded px-2 py-1">
                    {account.accountName}
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
                  <p className="text-sm font-mono bg-white border rounded px-2 py-1">
                    {paymentPointService.formatAccountNumber(account.accountNumber)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                  <p className="text-sm font-mono bg-white border rounded px-2 py-1">
                    {account.bankName}
                  </p>
                </div>

                <Button
                  onClick={handleCopyDetails}
                  className="w-full mt-3"
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Account Details
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Create Account Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <CreditCard className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Create Your Virtual Account</p>
                  <p>Enter your details to create a permanent virtual account for bank transfers.</p>
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
                    <ul className="list-disc list-inside mt-1">
                      {formErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <Input
                  id="customerName"
                  name="customerName"
                  type="text"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <Input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div>
                <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number (Optional)</label>
                <Input
                  id="customerPhone"
                  name="customerPhone"
                  type="tel"
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  placeholder="080XXXXXXXX"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 mr-2" />
                  Create Virtual Account
                </>
              )}
            </Button>
          </form>
        )}

        {/* Show Create Form Button */}
        {!account && !showCreateForm && (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="w-full"
            variant="outline"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Create PaymentPoint Account
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentPointCard;