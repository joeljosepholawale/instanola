import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  DollarSign,
  TrendingUp,
  Bitcoin,
  ArrowRight,
  CheckCircle,
  Clock,
  Shield,
  Zap,
  ArrowLeftRight,
  X,
  AlertCircle,
  Building2,
  Banknote
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Loader } from '../../components/ui/Loader';
import { NOWPaymentModal } from '../../components/ui/NOWPaymentModal';
import { PaymentPointCard } from '../../components/ui/PaymentPointCard';
import { PaymentModal } from '../../components/ui/PaymentModal';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatCurrency, formatDate } from '../../lib/utils';
import { doc, getDoc, updateDoc, collection, query, where, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Transaction {
  id: string;
  type: 'deposit' | 'purchase' | 'refund';
  amount: number;
  amountNGN?: number;
  currency: 'USD' | 'NGN';
  description: string;
  status: 'pending' | 'completed' | 'failed';
  date: Date;
  paymentMethod?: string;
}

export function WalletPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  
  const [balanceUSD, setBalanceUSD] = useState(0);
  const [balanceNGN, setBalanceNGN] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showPlisioModal, setShowPlisioModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(1600);
  const [convertingCurrency, setConvertingCurrency] = useState(false);
  const [conversionAmount, setConversionAmount] = useState('');
  const [conversionDirection, setConversionDirection] = useState<'usd-to-ngn' | 'ngn-to-usd'>('usd-to-ngn');
  const [serviceStatus, setServiceStatus] = useState<'operational' | 'degraded' | 'outage'>('operational');

  useEffect(() => {
    if (user) {
      fetchBalance();
      fetchTransactions();
      loadExchangeRate();
      
      // Real-time balance updates
      const unsubscribe = onSnapshot(doc(db, 'users', user.id), (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          setBalanceUSD(userData.walletBalance || 0);
          setBalanceNGN(userData.walletBalanceNGN || 0);
          setBalanceNGN(userData.walletBalanceNGN || 0);
        }
      });
      
      return () => unsubscribe();
    }
  }, [user]);

  const fetchBalance = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setBalanceUSD(userData.walletBalance || 0);
        setBalanceNGN(userData.walletBalanceNGN || 0);
        setBalanceNGN(userData.walletBalanceNGN || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;
    try {
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', user.id),
        limit(10)
      );
      const snapshot = await getDocs(transactionsQuery);
      const transactionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().createdAt?.toDate() || new Date()
      })) as Transaction[];
      setTransactions(transactionData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const loadExchangeRate = async () => {
    // Check cache first
    const cacheKey = 'exchange_rate_cache';
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { rate, timestamp } = JSON.parse(cached);
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        if (now - timestamp < oneHour) {
          setExchangeRate(rate);
          return;
        }
      } catch (error) {
        console.warn('Invalid exchange rate cache');
      }
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      const rate = data.rates.NGN || 1600;
      setExchangeRate(rate);
      
      // Cache for 1 hour
      localStorage.setItem(cacheKey, JSON.stringify({
        rate,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to load exchange rate, using fallback');
      setExchangeRate(1600);
    }
  };

  const handleCurrencyConversion = async () => {
    if (!user || !conversionAmount || parseFloat(conversionAmount) <= 0) return;

    try {
      setConvertingCurrency(true);
      const amount = parseFloat(conversionAmount);

      if (conversionDirection === 'usd-to-ngn') {
        if (amount > balanceUSD) {
          error('Insufficient Balance', 'You do not have enough USD balance');
          return;
        }

        const convertedAmount = amount * exchangeRate;
        
        // Update balances in Firestore
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          walletBalance: balanceUSD - amount,
          walletBalanceNGN: balanceNGN + convertedAmount
        });

        success('Conversion Complete', `Converted $${amount} to ₦${convertedAmount.toLocaleString()}`);
      } else {
        if (amount > balanceNGN) {
          error('Insufficient Balance', 'You do not have enough NGN balance');
          return;
        }

        const convertedAmount = amount / exchangeRate;
        
        // Update balances in Firestore
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          walletBalance: balanceUSD + convertedAmount,
          walletBalanceNGN: balanceNGN - amount
        });

        success('Conversion Complete', `Converted ₦${amount.toLocaleString()} to $${convertedAmount.toFixed(2)}`);
      }

      setConversionAmount('');
      setShowConversionModal(false);
      fetchBalance();
    } catch (err) {
      console.error('Currency conversion error:', err);
      error('Conversion Failed', 'Failed to convert currency');
    } finally {
      setConvertingCurrency(false);
    }
  };

  const handlePlisioPaymentSuccess = (amount: number) => {
    setServiceStatus('operational');
    // Don't immediately fetch balance - let webhook/status check handle it
    fetchTransactions();
    success('Payment Submitted', `$${amount} payment submitted. Your wallet will be credited after confirmation.`);
  };

  const handlePlisioPaymentError = (errorMessage: string) => {
    if (errorMessage.includes('Invalid Plisio API key') || errorMessage.includes('temporarily unavailable')) {
      setServiceStatus('degraded');
    }
    error('Payment Error', errorMessage);
  };

  const handlePaymentPointSuccess = (amount: number) => {
    fetchBalance();
    fetchTransactions();
    success('Payment Successful', `₦${amount.toLocaleString()} has been added to your wallet`);
  };

  const formatNaira = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-amber-50 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-amber-50 p-4">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              Your <span className="bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">Wallet</span>
            </h1>
            <p className="text-xl text-gray-600">Manage your balance and payment methods securely</p>
          </div>

          {/* Service Status Banner */}
          {serviceStatus !== 'operational' && (
            <div className="mb-6">
              <div className={`rounded-lg p-4 flex items-start space-x-3 ${
                serviceStatus === 'degraded' 
                  ? 'bg-yellow-50 border border-yellow-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <AlertCircle className={`w-5 h-5 mt-0.5 ${
                  serviceStatus === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                }`} />
                <div>
                  <h3 className={`font-semibold ${
                    serviceStatus === 'degraded' ? 'text-yellow-800' : 'text-red-800'
                  }`}>
                    {serviceStatus === 'degraded' ? 'Crypto Payment Service Issues' : 'Service Outage'}
                  </h3>
                  <p className={`text-sm mt-1 ${
                    serviceStatus === 'degraded' ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {serviceStatus === 'degraded' 
                      ? 'Cryptocurrency payments are currently using demo mode. Contact support for real payments.'
                      : 'Cryptocurrency payment service is temporarily unavailable. Please try again later.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
            {/* USD Balance Card */}
            <Card className="border-2 border-emerald-200 shadow-2xl bg-white/90 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">USD Balance</h3>
                      <p className="text-sm text-gray-600">Available for purchases</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-gray-600 hover:text-emerald-600"
                  >
                    {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </Button>
                </div>
                
                <div className="text-center">
                  <div className="text-5xl font-black text-gray-900 mb-2">
                    {showBalance ? `$${balanceUSD.toFixed(2)}` : '••••••'}
                  </div>
                  <div className="text-lg text-gray-600">
                    {showBalance ? `≈ ₦${(balanceUSD * exchangeRate).toLocaleString()}` : '••••••'}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    onClick={() => setShowPlisioModal(true)}
                    className={`w-full shadow-xl transition-all duration-300 ${
                      serviceStatus === 'degraded' 
                        ? 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700' 
                        : 'bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800'
                    }`}
                    size="lg"
                  >
                    <Bitcoin className="w-5 h-5 mr-2" />
                    {serviceStatus === 'degraded' ? 'Try Crypto (Demo)' : 'Add USD with Crypto'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* NGN Balance Card */}
            <Card className="border-2 border-green-200 shadow-2xl bg-white/90 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Banknote className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">NGN Balance</h3>
                      <p className="text-sm text-gray-600">Nigerian Naira</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-gray-600 hover:text-green-600"
                  >
                    {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </Button>
                </div>
                
                <div className="text-center">
                  <div className="text-5xl font-black text-gray-900 mb-2">
                    {showBalance ? formatNaira(balanceNGN) : '••••••'}
                  </div>
                  <div className="text-lg text-gray-600">
                    {showBalance ? `≈ $${(balanceNGN / exchangeRate).toFixed(2)}` : '••••••'}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-xl transition-all duration-300"
                    size="lg"
                  >
                    <Building2 className="w-5 h-5 mr-2" />
                    Add NGN with PaymentPoint
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  
                  {balanceNGN > 0 && balanceUSD < 1 && (
                    <Button
                      onClick={() => {
                        setConversionDirection('ngn-to-usd');
                        setShowConversionModal(true);
                      }}
                      variant="outline"
                      className="w-full border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <ArrowLeftRight className="w-4 h-4 mr-2" />
                      Convert to USD
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* PaymentPoint Card */}
            <PaymentPointCard />

            {/* Plisio Crypto Info */}
            <Card className={`border-2 ${
              serviceStatus === 'degraded' 
                ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50' 
                : 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    serviceStatus === 'degraded' ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    <Bitcoin className={`w-5 h-5 ${
                      serviceStatus === 'degraded' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Crypto (USD) {serviceStatus === 'degraded' && <span className="text-sm text-yellow-600">• Demo Mode</span>}
                    </h3>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className={`w-4 h-4 ${
                      serviceStatus === 'degraded' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                    <span className="text-gray-700">Bitcoin, Ethereum, USDT</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className={`w-4 h-4 ${
                      serviceStatus === 'degraded' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                    <span className="text-gray-700">Global payments</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className={`w-4 h-4 ${
                      serviceStatus === 'degraded' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                    <span className="text-gray-700">Minimum: $2</span>
                  </div>
                  {serviceStatus === 'degraded' && (
                    <div className="mt-2 p-2 bg-yellow-100 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        Currently using demo mode for testing. Contact support for real payments.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="border-2 border-emerald-200 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900">Recent Transactions</CardTitle>
                <Button
                  variant="outline"
                  onClick={fetchTransactions}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Transactions Yet</h3>
                  <p className="text-gray-600 mb-6">Your payment history will appear here</p>
                  <div className="flex space-x-4 justify-center">
                    <Button
                      onClick={() => setShowPaymentModal(true)}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Add NGN
                    </Button>
                    <Button
                      onClick={() => setShowPlisioModal(true)}
                      className="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800"
                    >
                      <Bitcoin className="w-4 h-4 mr-2" />
                      Add USD
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-emerald-50/30 rounded-2xl border-2 border-gray-100">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                          transaction.type === 'deposit' 
                            ? 'bg-emerald-100 text-emerald-600'
                            : transaction.type === 'refund'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}>
                          {transaction.type === 'deposit' ? (
                            <Plus className="w-6 h-6" />
                          ) : transaction.type === 'refund' ? (
                            <RefreshCw className="w-6 h-6" />
                          ) : (
                            <DollarSign className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg">
                            {(() => {
                              let desc = transaction.description || 'Transaction';
                              desc = desc.replace(/<[^>]*>/g, '');
                              desc = desc.replace(/window\.__sb_state[^"]*"[^"]*"/g, '');
                              return desc.length > 40 ? desc.substring(0, 40) + '...' : desc;
                            })()}
                          </p>
                          <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                          {transaction.currency === 'NGN' && (
                            <p className="text-xs text-green-600 font-medium">Nigerian Naira</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-xl ${
                          transaction.type === 'deposit' || transaction.type === 'refund' 
                            ? 'text-emerald-600' 
                            : 'text-gray-900'
                        }`}>
                          {transaction.type === 'deposit' || transaction.type === 'refund' ? '+' : '-'}
                          {transaction.currency === 'NGN' 
                            ? formatNaira(Math.abs(transaction.amountNGN || transaction.amount))
                            : formatCurrency(Math.abs(transaction.amount))
                          }
                        </p>
                        <div className={`text-sm px-2 py-1 rounded-full inline-block ${
                          transaction.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : transaction.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features Banner */}
          <div className="mt-8">
            <Card className="border-2 border-gray-900 bg-gradient-to-br from-gray-900 via-emerald-900 to-green-900 text-white shadow-2xl overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-amber-600/20"></div>
              <CardContent className="p-8 relative">
                <div className="text-center">
                  <h3 className="text-2xl font-black mb-6">
                    Why Choose <span className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">InstantNums</span> Payments?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div className="font-bold text-lg mb-2">Bank-Level Security</div>
                      <div className="text-emerald-200">SSL encryption and secure processing</div>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div className="font-bold text-lg mb-2">Instant Credit</div>
                      <div className="text-amber-200">Funds available immediately</div>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <div className="font-bold text-lg mb-2">24/7 Processing</div>
                      <div className="text-green-200">Round-the-clock availability</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Modals */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentPointSuccess}
        exchangeRate={exchangeRate}
        directPaymentPoint={true}
      />

      <NOWPaymentModal
        isOpen={showPlisioModal}
        onClose={() => setShowPlisioModal(false)}
        onSuccess={handlePlisioPaymentSuccess}
        onError={handlePlisioPaymentError}
      />

      {/* Currency Conversion Modal */}
      {showConversionModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Convert Currency
              </h2>
              <button 
                onClick={() => setShowConversionModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center mb-4">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className="text-lg font-semibold">
                    {conversionDirection === 'usd-to-ngn' ? '$' : '₦'}
                  </span>
                  <ArrowLeftRight className="w-5 h-5 text-gray-400" />
                  <span className="text-lg font-semibold">
                    {conversionDirection === 'usd-to-ngn' ? '₦' : '$'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Exchange Rate: 1 USD = ₦{exchangeRate.toLocaleString()}
                </p>
              </div>

              <div className="flex space-x-2 mb-4">
                <Button
                  variant={conversionDirection === 'usd-to-ngn' ? 'primary' : 'outline'}
                  onClick={() => setConversionDirection('usd-to-ngn')}
                  className="flex-1"
                  size="sm"
                >
                  USD → NGN
                </Button>
                <Button
                  variant={conversionDirection === 'ngn-to-usd' ? 'primary' : 'outline'}
                  onClick={() => setConversionDirection('ngn-to-usd')}
                  className="flex-1"
                  size="sm"
                >
                  NGN → USD
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Convert
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    {conversionDirection === 'usd-to-ngn' ? '$' : '₦'}
                  </span>
                  <input
                    type="number"
                    value={conversionAmount}
                    onChange={(e) => setConversionAmount(e.target.value)}
                    placeholder={`Enter ${conversionDirection === 'usd-to-ngn' ? 'USD' : 'NGN'} amount`}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Available: {conversionDirection === 'usd-to-ngn' 
                    ? `$${balanceUSD.toFixed(2)}` 
                    : formatNaira(balanceNGN)
                  }
                </div>
              </div>

              {conversionAmount && parseFloat(conversionAmount) > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">You will receive:</div>
                  <div className="text-xl font-bold text-gray-900">
                    {conversionDirection === 'usd-to-ngn' 
                      ? `₦${(parseFloat(conversionAmount) * exchangeRate).toLocaleString()}`
                      : `$${(parseFloat(conversionAmount) / exchangeRate).toFixed(2)}`
                    }
                  </div>
                </div>
              )}

              {conversionAmount && parseFloat(conversionAmount) > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs text-blue-800">
                    <p className="font-medium">Conversion Details:</p>
                    <p>• No conversion fees</p>
                    <p>• Instant conversion</p>
                    <p>• Rate: 1 USD = ₦{exchangeRate.toLocaleString()}</p>
                  </div>
                </div>
              )}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConversionModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCurrencyConversion}
                  disabled={
                    convertingCurrency || 
                    !conversionAmount || 
                    parseFloat(conversionAmount) <= 0 ||
                    (conversionDirection === 'usd-to-ngn' && parseFloat(conversionAmount) > balanceUSD) ||
                    (conversionDirection === 'ngn-to-usd' && parseFloat(conversionAmount) > balanceNGN)
                  }
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700"
                >
                  {convertingCurrency ? 'Converting...' : 'Convert'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default WalletPage;
