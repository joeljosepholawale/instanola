import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { paymentPointService, PaymentPointBankAccount } from '../services/paymentPointService';
import { Copy, CreditCard, Bank, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentPointAccountData {
  userId: string;
  userEmail: string;
  userName: string;
  customer_id: string;
  bankAccounts: PaymentPointBankAccount[];
  createdAt: any;
}

export const PaymentPointAccount: React.FC = () => {
  const { user } = useAuth();
  const [accountData, setAccountData] = useState<PaymentPointAccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPaymentPointAccount();
    }
  }, [user]);

  const loadPaymentPointAccount = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Check if user already has a PaymentPoint account
      const accountDoc = await getDoc(doc(db, 'paymentpoint_accounts', user.uid));
      
      if (accountDoc.exists()) {
        setAccountData(accountDoc.data() as PaymentPointAccountData);
      } else {
        // Check if account data is stored in user's main document
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.paymentPointAccount) {
            setAccountData({
              userId: user.uid,
              userEmail: user.email || '',
              userName: userData.displayName || userData.name || '',
              customer_id: userData.paymentPointAccount.customer_id,
              bankAccounts: userData.paymentPointAccount.bankAccounts,
              createdAt: userData.paymentPointAccount.createdAt
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading PaymentPoint account:', error);
      setError('Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  const createVirtualAccount = async () => {
    if (!user) return;

    try {
      setCreating(true);
      setError(null);

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      const userName = userData?.displayName || userData?.name || user.displayName || 'User';
      const userEmail = user.email || '';
      const phoneNumber = userData?.phone || userData?.phoneNumber || '';

      const result = await paymentPointService.createVirtualAccount(
        user.uid,
        userEmail,
        userName,
        phoneNumber
      );

      if (result.success) {
        toast.success('Virtual account created successfully!');
        await loadPaymentPointAccount(); // Reload the account data
      }
    } catch (error) {
      console.error('Error creating virtual account:', error);
      setError(error instanceof Error ? error.message : 'Failed to create virtual account');
      toast.error('Failed to create virtual account');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-300">Loading virtual account...</span>
        </div>
      </div>
    );
  }

  if (error && !accountData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center text-red-600 dark:text-red-400 mb-4">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
        <button
          onClick={loadPaymentPointAccount}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!accountData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <Bank className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Setup Your Virtual Account
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
            Create a dedicated virtual bank account for easy deposits. Transfer money to this account and it will be automatically added to your balance (2% transaction fee applies).
          </p>
          <button
            onClick={createVirtualAccount}
            disabled={creating}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center mx-auto"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              <>
                <Bank className="w-4 h-4 mr-2" />
                Create Virtual Account
              </>
            )}
          </button>
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center mb-6">
        <div className="flex items-center">
          <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Virtual Bank Account
          </h3>
        </div>
        <div className="ml-auto">
          <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full">
            Active
          </span>
        </div>
      </div>

      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-blue-800 dark:text-blue-300 text-sm">
          <strong>Note:</strong> Deposits to these accounts are automatically processed with a 2% transaction fee. 
          Your balance will be updated within minutes of a successful transfer.
        </p>
      </div>

      <div className="space-y-4">
        {accountData.bankAccounts.map((account, index) => (
          <div
            key={account.Reserved_Account_Id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            style={{ borderColor: paymentPointService.getBankColor(account.bankName) + '20' }}
          >
            <div className="flex items-center mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: paymentPointService.getBankColor(account.bankName) }}
              >
                {account.bankName.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {account.bankName}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Virtual Account
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Number
                </label>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                    {paymentPointService.formatAccountNumber(account.accountNumber)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(account.accountNumber, 'Account number')}
                    className="p-1 text-gray-500 hover:text-blue-500 transition-colors"
                    title="Copy account number"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Name
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-900 dark:text-white">
                    {account.accountName}
                  </span>
                  <button
                    onClick={() => copyToClipboard(account.accountName, 'Account name')}
                    className="p-1 text-gray-500 hover:text-blue-500 transition-colors"
                    title="Copy account name"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
              <CreditCard className="w-4 h-4 mr-1" />
              <span>Bank Code: {account.bankCode}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
          <div className="text-yellow-800 dark:text-yellow-300 text-sm">
            <p className="font-medium mb-1">Important:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Only transfer Nigerian Naira (₦) to these accounts</li>
              <li>Minimum deposit: ₦100, Maximum: ₦500,000</li>
              <li>A 2% transaction fee will be deducted from all deposits</li>
              <li>Deposits are processed automatically within 5 minutes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
