import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Copy, 
  RefreshCw, 
  Plus, 
  Info, 
  Building, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { useToast } from '../../hooks/useToast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { paymentPointService, PaymentPointBankAccount } from '../../services/paymentPointService';

interface PaymentPointAccountCardProps {
  userId: string;
}

interface PaymentPointAccountData {
  userId: string;
  userEmail: string;
  userName: string;
  customer_id: string;
  bankAccounts: PaymentPointBankAccount[];
  createdAt: any;
}

export function PaymentPointAccountCard({ userId }: PaymentPointAccountCardProps) {
  const { success, error } = useToast();
  const [accountData, setAccountData] = useState<PaymentPointAccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentPointAccount();
  }, [userId]);

  const loadPaymentPointAccount = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      // Check if user already has a PaymentPoint account
      const accountDoc = await getDoc(doc(db, 'paymentpoint_accounts', userId));
      
      if (accountDoc.exists()) {
        setAccountData(accountDoc.data() as PaymentPointAccountData);
      } else {
        // Check if account data is stored in user's main document
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.paymentPointAccount) {
            setAccountData({
              userId: userId,
              userEmail: userData.email || '',
              userName: userData.displayName || userData.name || '',
              customer_id: userData.paymentPointAccount.customer_id,
              bankAccounts: userData.paymentPointAccount.bankAccounts,
              createdAt: userData.paymentPointAccount.createdAt
            });
          }
        }
      }
    } catch (err) {
      console.error('Error loading PaymentPoint account:', err);
      setErrorMessage('Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  const createVirtualAccount = async () => {
    try {
      setCreating(true);
      setErrorMessage(null);

      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      
      const userName = userData?.displayName || userData?.name || 'User';
      const userEmail = userData?.email || '';
      const phoneNumber = userData?.phone || userData?.phoneNumber || '';

      const result = await paymentPointService.createVirtualAccount(
        userId,
        userEmail,
        userName,
        phoneNumber
      );

      if (result.success) {
        success('Virtual account created successfully!');
        await loadPaymentPointAccount(); // Reload the account data
      }
    } catch (err) {
      console.error('Error creating virtual account:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create virtual account');
      error('Failed to create virtual account');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      success(`${label} copied to clipboard!`);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      error('Failed to copy to clipboard');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading virtual account...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (errorMessage && !accountData) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center text-red-600 mb-4">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{errorMessage}</span>
          </div>
          <Button
            onClick={loadPaymentPointAccount}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!accountData) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900">
            <Building className="w-5 h-5 mr-2" />
            PaymentPoint Virtual Account
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-6">
            <Building className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Setup Your Virtual Account
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create a dedicated virtual bank account for easy deposits. Transfer money to this account and it will be automatically added to your balance (2% transaction fee applies).
            </p>
            <Button
              onClick={createVirtualAccount}
              disabled={creating}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Virtual Account
                </>
              )}
            </Button>
            {errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{errorMessage}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-green-900">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Virtual Bank Account
          </CardTitle>
          <div className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            Active
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Info className="w-4 h-4 text-blue-600 mr-2 mt-0.5" />
            <p className="text-blue-800 text-sm">
              Deposits to these accounts are automatically processed with a 2% transaction fee. 
              Your balance will be updated within minutes.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {accountData.bankAccounts.map((account, index) => (
            <div
              key={account.Reserved_Account_Id}
              className="border border-gray-200 rounded-lg p-4 bg-white"
            >
              <div className="flex items-center mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                  style={{ backgroundColor: paymentPointService.getBankColor(account.bankName) }}
                >
                  {account.bankName.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold text-gray-900">{account.bankName}</h4>
                  <p className="text-sm text-gray-500">Virtual Account</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-lg font-semibold text-gray-900">
                      {paymentPointService.formatAccountNumber(account.accountNumber)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(account.accountNumber, 'Account number')}
                      className="p-1 h-auto text-gray-500 hover:text-blue-500"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-900 text-sm">{account.accountName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(account.accountName, 'Account name')}
                      className="p-1 h-auto text-gray-500 hover:text-blue-500"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center text-sm text-gray-500">
                <CreditCard className="w-4 h-4 mr-1" />
                <span>Bank Code: {account.bankCode}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
            <div className="text-yellow-800 text-sm">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Only transfer Nigerian Naira (₦) to these accounts</li>
                <li>Minimum deposit: ₦100, Maximum: ₦500,000</li>
                <li>A 2% transaction fee will be deducted from all deposits</li>
                <li>Deposits are processed automatically within 5 minutes</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
