import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Timer, 
  Copy, 
  CheckCircle,
  Zap,
  CreditCard,
  ArrowRight,
  Sparkles,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { DaisySMSService } from '../../services/daisySMS';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

export function NumbersPage() {
  const { user } = useAuth();
  const { success, error } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({ usd: 0, ngn: 0 });
  const [selectedService, setSelectedService] = useState('wa');
  const [activeNumbers, setActiveNumbers] = useState<any[]>([]);
  const [renting, setRenting] = useState(false);
  const [timers, setTimers] = useState<{ [key: string]: number }>({});

  // Popular services only
  const services = [
    { code: 'wa', name: 'WhatsApp', emoji: '💬', price: 0.70, color: 'bg-green-500' },
    { code: 'tg', name: 'Telegram', emoji: '✈️', price: 1.50, color: 'bg-blue-500' },
    { code: 'ds', name: 'Discord', emoji: '🎮', price: 0.10, color: 'bg-purple-500' },
    { code: 'fb', name: 'Facebook', emoji: '📘', price: 1.00, color: 'bg-blue-600' },
    { code: 'ig', name: 'Instagram', emoji: '📷', price: 0.80, color: 'bg-pink-500' },
    { code: 'go', name: 'Google', emoji: '🔍', price: 0.50, color: 'bg-red-500' },
    { code: 'tw', name: 'Twitter', emoji: '🐦', price: 0.60, color: 'bg-blue-400' },
    { code: 'ot', name: 'OpenAI ChatGPT', emoji: '🤖', price: 0.10, color: 'bg-gray-800' },
  ];

  const exchangeRate = 1600;

  useEffect(() => {
    if (user) {
      loadData();
      startTimers();
    }
  }, [user]);

  const loadData = async () => {
    try {
      await Promise.all([
        fetchBalance(),
        fetchActiveNumbers()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, 'users', user.id));
    if (userDoc.exists()) {
      const data = userDoc.data();
      setBalance({
        usd: data.walletBalance || 0,
        ngn: data.walletBalanceNGN || 0
      });
    }
  };

  const fetchActiveNumbers = async () => {
    if (!user) return;
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('userId', '==', user.id),
      where('status', 'in', ['waiting', 'completed']),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(rentalsQuery);
    const numbers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      expiresAt: doc.data().expiresAt?.toDate() || new Date(),
    }));
    setActiveNumbers(numbers);

    // Initialize timers
    const newTimers: { [key: string]: number } = {};
    numbers.forEach(number => {
      if (number.status === 'waiting') {
        const timeLeft = Math.max(0, Math.floor((number.expiresAt.getTime() - Date.now()) / 1000));
        newTimers[number.id] = timeLeft;
      }
    });
    setTimers(newTimers);
  };

  const startTimers = () => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const newTimers = { ...prev };
        Object.keys(newTimers).forEach(id => {
          if (newTimers[id] > 0) {
            newTimers[id] -= 1;
          }
        });
        return newTimers;
      });
    }, 1000);
    return () => clearInterval(interval);
  };

  const handleRentNumber = async (serviceCode: string) => {
    if (!serviceCode || renting) return;
    
    const service = services.find(s => s.code === serviceCode);
    if (!service) return;

    const price = service.price;
    if (balance.usd < price) {
      error('Insufficient balance');
      return;
    }

    setRenting(true);
    try {
      const daisyService = await DaisySMSService.createWithStoredKey();
      const result = await daisyService.getNumber(serviceCode, '0'); // USA default
      
      if (result.number) {
        // Deduct balance
        await updateDoc(doc(db, 'users', user!.id), {
          walletBalance: increment(-price)
        });

        // Create rental record
        const rentalId = `${user!.id}_${Date.now()}`;
        const rental = {
          id: rentalId,
          userId: user!.id,
          number: result.number,
          service: serviceCode,
          country: '0',
          status: 'waiting',
          userPrice: price,
          daisyId: result.id,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes
        };

        await setDoc(doc(db, 'rentals', rentalId), rental);
        
        // Add to active numbers
        setActiveNumbers(prev => [rental, ...prev]);
        setTimers(prev => ({ ...prev, [rentalId]: 20 * 60 })); // 20 minutes in seconds
        
        await fetchBalance();
        success('Number rented successfully!', `Number: ${result.number}`);
      }
    } catch (err: any) {
      error('Failed to rent number', err.message);
    } finally {
      setRenting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Copied to clipboard');
  };

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-emerald-700 font-medium">Loading numbers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-amber-50 p-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header with Balance */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black text-gray-900 mb-4">
            Get <span className="bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">Instant</span> Numbers
          </h1>
          <p className="text-xl text-gray-600 mb-6">Choose a service below and get your verification code in seconds</p>
          
          <div className="inline-flex items-center bg-white rounded-2xl px-6 py-4 shadow-xl border-2 border-emerald-200">
            <CreditCard className="w-6 h-6 text-emerald-600 mr-3" />
            <div className="text-right">
              <div className="text-sm text-gray-600">Your Balance</div>
              <div className="text-2xl font-bold text-emerald-700">${balance.usd.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Service Selection - Big Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {services.map(service => (
            <button
              key={service.code}
              onClick={() => handleRentNumber(service.code)}
              disabled={renting || balance.usd < service.price}
              className={`group relative p-8 rounded-3xl border-3 transition-all duration-300 ${
                balance.usd >= service.price
                  ? 'border-emerald-300 bg-white shadow-xl hover:shadow-2xl hover:scale-105 hover:border-emerald-500'
                  : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="text-center">
                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                  {service.emoji}
                </div>
                <div className="font-bold text-lg text-gray-900 mb-2 group-hover:text-emerald-700">
                  {service.name}
                </div>
                <div className="text-2xl font-black text-emerald-600 mb-1">
                  ${service.price}
                </div>
                <div className="text-sm text-gray-500">
                  ≈ ₦{(service.price * exchangeRate).toFixed(0)}
                </div>
                
                {balance.usd >= service.price ? (
                  <div className="mt-4 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-bold">
                    <Zap className="w-3 h-3 inline mr-1" />
                    Click to Buy
                  </div>
                ) : (
                  <div className="mt-4 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold">
                    Insufficient Balance
                  </div>
                )}
              </div>
              
              {renting && (
                <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Active Numbers */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Your Active Numbers</h2>
          
          {activeNumbers.length === 0 ? (
            <Card className="border-2 border-gray-200 bg-white/80">
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Smartphone className="w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">No Active Numbers</h3>
                <p className="text-gray-600 text-lg mb-6">Click on any service above to rent your first number instantly!</p>
                <div className="flex items-center justify-center space-x-2 text-emerald-600">
                  <ArrowRight className="w-5 h-5" />
                  <span className="font-medium">Choose a service above to get started</span>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {activeNumbers.map((number) => (
                <Card key={number.id} className={`border-3 transition-all duration-300 shadow-xl ${
                  number.status === 'waiting' 
                    ? 'border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50' 
                    : number.status === 'completed'
                    ? 'border-green-400 bg-gradient-to-r from-green-50 to-emerald-50'
                    : 'border-gray-300 bg-white'
                }`}>
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${
                          services.find(s => s.code === number.service)?.color || 'bg-gray-500'
                        }`}>
                          <span className="text-3xl">
                            {services.find(s => s.code === number.service)?.emoji || '📱'}
                          </span>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-gray-900">{number.number}</div>
                          <div className="text-lg text-gray-600">
                            {services.find(s => s.code === number.service)?.name || 'Unknown'} • USA
                          </div>
                        </div>
                      </div>
                      
                      {/* Timer/Status */}
                      <div className="text-right">
                        {number.status === 'waiting' && timers[number.id] !== undefined && (
                          <div className={`px-6 py-3 rounded-2xl font-bold text-xl ${
                            timers[number.id] > 600 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : timers[number.id] > 300
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            <div className="flex items-center space-x-3">
                              <Timer className="w-6 h-6" />
                              <span className="text-2xl">{formatTimer(timers[number.id])}</span>
                            </div>
                          </div>
                        )}
                        {number.status === 'completed' && (
                          <div className="px-6 py-3 bg-green-100 text-green-800 rounded-2xl font-bold text-xl">
                            <div className="flex items-center space-x-3">
                              <CheckCircle className="w-6 h-6" />
                              <span>Completed</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SMS Code Display */}
                    <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
                      <div className="text-center">
                        <div className="text-lg text-gray-600 mb-3">SMS Verification Code:</div>
                        {number.status === 'waiting' ? (
                          <div className="flex items-center justify-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
                            <span className="text-xl font-bold text-amber-700">Waiting for SMS...</span>
                          </div>
                        ) : number.code ? (
                          <div className="space-y-4">
                            <div className="text-5xl font-black text-gray-900 bg-gray-100 px-6 py-4 rounded-xl tracking-wider">
                              {number.code}
                            </div>
                            <Button
                              onClick={() => copyToClipboard(number.code)}
                              className="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800"
                              size="lg"
                            >
                              <Copy className="w-5 h-5 mr-2" />
                              Copy Code
                            </Button>
                            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                              <div className="flex items-center justify-center space-x-2 text-green-800">
                                <Sparkles className="w-5 h-5" />
                                <span className="font-medium">SMS received successfully! Use the code above for verification.</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xl font-bold text-red-600">No code received</span>
                        )}
                      </div>
                    </div>

                    {/* Cost Display */}
                    <div className="mt-4 text-center">
                      <div className="text-gray-600">Cost: <span className="font-bold text-gray-900">${number.userPrice?.toFixed(2)}</span></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Low Balance Warning */}
        {balance.usd < 0.10 && (
          <Card className="border-2 border-red-300 bg-red-50 mb-8">
            <div className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-800 mb-2">Low Balance Alert</h3>
              <p className="text-red-700 mb-6">You need to add funds to rent more numbers. Minimum balance required: $0.10</p>
              <div className="flex space-x-4 justify-center">
                <Button
                  onClick={() => window.location.href = '/dashboard/wallet'}
                  className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Add Naira
                </Button>
                <Button
                  onClick={() => window.location.href = '/dashboard/wallet'}
                  className="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Add Crypto
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Info */}
        <Card className="border-2 border-emerald-200 bg-white/80 backdrop-blur-sm">
          <div className="p-6 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">1️⃣</span>
                </div>
                <div className="font-bold text-gray-900">Click Service</div>
                <div className="text-sm text-gray-600">Choose from popular services</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">2️⃣</span>
                </div>
                <div className="font-bold text-gray-900">Get Number</div>
                <div className="text-sm text-gray-600">Instant activation in 5 seconds</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">3️⃣</span>
                </div>
                <div className="font-bold text-gray-900">Receive SMS</div>
                <div className="text-sm text-gray-600">Copy and use verification code</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default NumbersPage;
