import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  Smartphone, 
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  TrendingUp,
  Activity,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  DollarSign,
  MessageSquare,
  Globe,
  Zap,
  Shield
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { AnnouncementModal } from '../../components/ui/AnnouncementModal';
import { useAuth } from '../../hooks/useAuth';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { formatCurrency, formatDate } from '../../lib/utils';
import { collection, query, where, getDocs, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    showTelegram, 
    showAnnouncement, 
    dismissTelegram, 
    dismissAnnouncement 
  } = useAnnouncements();
  const [stats, setStats] = useState({
    activeNumbers: 0,
    totalOrders: 0,
    successRate: 0,
    totalSpent: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(1600);
  const [balanceUSD, setBalanceUSD] = useState(0);
  const [balanceNGN, setBalanceNGN] = useState(0);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadExchangeRate();
      fetchBalance();
    }
  }, [user]);

  const fetchBalance = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const usdBalance = userData.walletBalance || 0;
        const ngnBalance = userData.walletBalanceNGN || 0;
        
        setBalanceUSD(usdBalance);
        setBalanceNGN(ngnBalance);
      } else {
        setBalanceUSD(0);
        setBalanceNGN(0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalanceUSD(0);
      setBalanceNGN(0);
    }
  };

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

  const loadDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load active numbers
      const rentalsQuery = query(
        collection(db, 'rentals'),
        where('userId', '==', user.id),
        where('status', '==', 'waiting')
      );
      const rentalsSnapshot = await getDocs(rentalsQuery);
      const activeNumbers = rentalsSnapshot.size;
      
      // Load total orders
      const allRentalsQuery = query(
        collection(db, 'rentals'),
        where('userId', '==', user.id)
      );
      const allRentalsSnapshot = await getDocs(allRentalsQuery);
      const totalOrders = allRentalsSnapshot.size;
      
      // Calculate success rate and total spent
      const completedRentals = allRentalsSnapshot.docs.filter(doc => 
        doc.data().status === 'completed'
      ).length;
      const successRate = totalOrders > 0 ? (completedRentals / totalOrders) * 100 : 0;
      
      // Calculate total spent
      const totalSpent = allRentalsSnapshot.docs.reduce((total, doc) => {
        const rental = doc.data();
        return total + (rental.userPrice || 0);
      }, 0);
      
      setStats({
        activeNumbers,
        totalOrders,
        successRate: Math.round(successRate * 10) / 10,
        totalSpent
      });
      
      // Load recent activity
      try {
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', user.id),
          limit(5)
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const transactions = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt?.toDate() || new Date()
        }));
        setRecentActivity(transactions);
      } catch (error) {
        console.warn('Could not load recent activity:', error);
        setRecentActivity([]);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNaira = (usdAmount: number) => {
    const nairaAmount = usdAmount * exchangeRate;
    return `₦${nairaAmount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
  };

  // DaisySMS Popular Services
  const popularServices = [
    { name: 'Telegram', emoji: '📱', price: 0.25, code: 'tg' },
    { name: 'WhatsApp', emoji: '💬', price: 0.30, code: 'wa' },
    { name: 'Instagram', emoji: '📷', price: 0.35, code: 'ig' },
    { name: 'Discord', emoji: '🎮', price: 0.27, code: 'ds' },
    { name: 'Google', emoji: '🔍', price: 0.30, code: 'go' },
    { name: 'Facebook', emoji: '📘', price: 0.28, code: 'fb' }
  ];

  return (
    <>
      {/* InstantNums Modern Dashboard */}
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-amber-50 to-green-50 pb-20">
        {/* Main Dashboard Container */}
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          
          {/* Welcome Header - InstantNums Style */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border-2 border-emerald-200 p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2">
                  Welcome back, <span className="bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">{user?.name?.split(' ')[0] || 'User'}</span>!
                </h1>
                <p className="text-xl text-gray-600">
                  Ready to get instant SMS verification from <span className="font-bold text-emerald-700">150+ countries</span>?
                </p>
              </div>
              <div className="text-right">
                <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-2xl p-6 text-white shadow-2xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <Wallet className="w-5 h-5" />
                    <span className="text-sm font-medium opacity-90">Current Balance</span>
                    <button
                      onClick={() => setShowBalance(!showBalance)}
                      className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-3xl font-black mb-1">
                    {loading ? (
                      <div className="animate-pulse bg-white/20 rounded h-8 w-24"></div>
                    ) : showBalance ? (
                      `$${balanceUSD.toFixed(2)}`
                    ) : (
                      '••••••'
                    )}
                  </div>
                  <div className="text-sm opacity-80">
                    ≈ {showBalance ? formatNaira(balanceUSD) : '••••••'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200 p-6 text-center hover:scale-105 transition-transform duration-300">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-6 h-6 text-amber-600" />
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{stats.activeNumbers}</div>
              <div className="text-sm font-medium text-gray-600">Active Numbers</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-200 p-6 text-center hover:scale-105 transition-transform duration-300">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{stats.totalOrders}</div>
              <div className="text-sm font-medium text-gray-600">Total Orders</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-green-200 p-6 text-center hover:scale-105 transition-transform duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{stats.successRate}%</div>
              <div className="text-sm font-medium text-gray-600">Success Rate</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-yellow-200 p-6 text-center hover:scale-105 transition-transform duration-300">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">${stats.totalSpent.toFixed(0)}</div>
              <div className="text-sm font-medium text-gray-600">Total Spent</div>
            </div>
          </div>

          {/* Main CTA Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Get Number CTA */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-black mb-4">
                  Get Instant Numbers
                </h2>
                <p className="text-emerald-100 mb-8 text-lg leading-relaxed">
                  Choose from <span className="font-bold text-white">150+ countries</span> and get SMS verification codes in seconds!
                </p>
                <Button 
                  size="xl" 
                  className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  onClick={() => navigate('/dashboard/numbers')}
                >
                  <Zap className="mr-2 w-5 h-5" />
                  RENT NUMBER NOW
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <div className="mt-6 flex items-center space-x-4 text-emerald-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">From $0.25</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">5s Activation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">24/7 Support</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Funds CTA */}
            <div className="bg-gradient-to-br from-amber-500 to-yellow-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-black mb-4">
                  Top Up Wallet
                </h2>
                <p className="text-amber-100 mb-8 text-lg leading-relaxed">
                  Add funds with <span className="font-bold text-white">PaymentPoint (Naira)</span> or <span className="font-bold text-white">Crypto (USD)</span>
                </p>
                <Button 
                  size="xl" 
                  className="bg-white text-amber-700 hover:bg-amber-50 font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  onClick={() => navigate('/dashboard/wallet')}
                >
                  <Plus className="mr-2 w-5 h-5" />
                  ADD FUNDS
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <div className="mt-6 flex items-center space-x-4 text-amber-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Instant Credit</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Secure Payment</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Best Rates</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Popular Services */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border-2 border-emerald-200 p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Popular Services</h3>
                <p className="text-gray-600 mt-1">Quick access to most requested verification services</p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/numbers')}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                View All
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {popularServices.map((service, index) => (
                <button
                  key={index}
                  onClick={() => navigate('/dashboard/numbers', { 
                    state: { preselectedService: service.code } 
                  })}
                  className="group p-6 border-2 border-gray-200 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-300 text-center hover:scale-105 hover:shadow-xl"
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{service.emoji}</div>
                  <div className="font-bold text-gray-900 text-sm mb-1 group-hover:text-emerald-700">{service.name}</div>
                  <div className="text-emerald-600 font-bold text-lg">${service.price}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border-2 border-emerald-200 p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Recent Activity</h3>
                <p className="text-gray-600 mt-1">Your latest transactions and number rentals</p>
              </div>
              <Button 
                variant="outline"
                onClick={() => navigate('/dashboard/wallet')}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <Activity className="w-4 h-4 mr-2" />
                View All
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-emerald-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600 font-medium">Loading activity...</p>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Activity className="w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Activity Yet</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">Your transactions and number rentals will appear here. Get started by renting your first number!</p>
                <Button onClick={() => navigate('/dashboard/numbers')} size="xl" className="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800">
                  <Zap className="w-5 h-5 mr-2" />
                  Get Your First Number
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-emerald-50/30 rounded-2xl border-2 border-gray-100 hover:border-emerald-200 transition-all">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                        activity.type === 'deposit' 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : activity.type === 'refund'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}>
                        {activity.type === 'deposit' || activity.type === 'refund' ? (
                          <Plus className="w-6 h-6" />
                        ) : (
                          <Smartphone className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">
                          {(() => {
                            let desc = activity.description || 'Transaction';
                            desc = desc.replace(/<[^>]*>/g, '');
                            desc = desc.replace(/window\.__sb_state[^"]*"[^"]*"/g, '');
                            if (desc.includes('Number rental:')) {
                              desc = desc.replace(/Number rental: (\d+)/, 'Number: +$1');
                            }
                            return desc.length > 40 ? desc.substring(0, 40) + '...' : desc;
                          })()}
                        </p>
                        <p className="text-sm text-gray-500 font-medium">{formatDate(activity.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-xl ${
                        activity.amount > 0 ? 'text-emerald-600' : 'text-gray-900'
                      }`}>
                        {activity.amount > 0 ? '+' : ''}
                        {formatCurrency(Math.abs(activity.amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Features Banner - InstantNums Style */}
          <div className="bg-gradient-to-br from-gray-900 via-emerald-900 to-green-900 rounded-3xl p-12 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-amber-600/20"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            
            <div className="relative text-center">
              <h2 className="text-4xl font-black mb-8">Why Choose <span className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">InstantNums</span>?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="group">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl group-hover:scale-110 transition-transform">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div className="font-bold text-xl mb-2">Military-Grade Security</div>
                  <div className="text-emerald-200 text-lg">99.9% uptime with enterprise security standards</div>
                </div>
                <div className="group">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl group-hover:scale-110 transition-transform">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div className="font-bold text-xl mb-2">5-Second Activation</div>
                  <div className="text-amber-200 text-lg">Fastest SMS delivery in the industry</div>
                </div>
                <div className="group">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl group-hover:scale-110 transition-transform">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div className="font-bold text-xl mb-2">Best Pricing</div>
                  <div className="text-green-200 text-lg">Competitive rates with transparent pricing</div>
                </div>
              </div>
              
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-4xl font-black text-amber-400">150+</div>
                  <div className="text-gray-300 font-medium">Countries</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-emerald-400">100K+</div>
                  <div className="text-gray-300 font-medium">Users</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-green-400">2M+</div>
                  <div className="text-gray-300 font-medium">SMS Sent</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-yellow-400">24/7</div>
                  <div className="text-gray-300 font-medium">Support</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Announcement Modals */}
      <AnnouncementModal
        isOpen={showTelegram}
        onClose={dismissTelegram}
        type="telegram"
      />

      <AnnouncementModal
        isOpen={!!showAnnouncement}
        onClose={dismissAnnouncement}
        announcement={showAnnouncement || undefined}
        type="admin"
      />
    </>
  );
}