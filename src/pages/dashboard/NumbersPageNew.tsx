import React, { useState, useEffect } from "react";
import {
  Smartphone,
  RefreshCw,
  CheckCircle,
  XCircle,
  MoreVertical,
  Heart,
  ChevronDown,
  Copy,
  X,
  Zap,
  Info,
  Phone,
  Clock,
  Search,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Loader } from "../../components/ui/Loader";
import { useAuth } from "../../hooks/useAuth";
import { useStatusPolling } from "../../hooks/useStatusPolling";
import { useToast } from "../../hooks/useToast";
import { DaisySMSService } from "../../services/daisySMS";
import { formatCurrency, formatDate } from "../../lib/utils";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  increment,
  setDoc,
  limit,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

// Define missing interfaces
interface Service {
  code: string;
  name: string;
  price: number;
  available: boolean;
}

interface Country {
  id: string;
  name: string;
  code: string;
  price: number;
}

interface ActiveNumber {
  id: string;
  number: string;
  service: string;
  country: string;
  status: 'waiting' | 'completed' | 'expired';
  daisyId: string;
  createdAt: Date;
  expiresAt: Date;
  code?: string;
}

export function NumbersPageNew() {
  const { user } = useAuth();
  const { success, error } = useToast();

  // State management
  const [loading, setLoading] = useState(true);
  const [rentals, setRentals] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("0"); // USA default
  const [selectedService, setSelectedService] = useState("");
  const [serviceInput, setServiceInput] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [renting, setRenting] = useState(false);
  const [balance, setBalance] = useState<{usd: number; ngn: number}>({usd: 0, ngn: 0});
  const [pricing, setPricing] = useState<any>({});
  const [allServices, setAllServices] = useState<any[]>([]);
  const [showSMSText, setShowSMSText] = useState<string | null>(null);
  const [smsTextData, setSmsTextData] = useState<any>(null);
  const [displayCount, setDisplayCount] = useState(6);
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  const [timers, setTimers] = useState<{ [key: string]: number }>({});
  const [markupPercentage, setMarkupPercentage] = useState(30);
  const [exchangeRate, setExchangeRate] = useState(1600);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [initialTimers, setInitialTimers] = useState<{ [key: string]: number }>(
    {}
  );
  const [pricingLoaded, setPricingLoaded] = useState(false);

  // Additional state for the component
  const [services, setServices] = useState<Service[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [activeNumbers, setActiveNumbers] = useState<ActiveNumber[]>([]);
  const [searchService, setSearchService] = useState("");
  const [priceFilter, setPriceFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  // Cache for services to avoid repeated API calls
  const [servicesCache, setServicesCache] = useState<any[]>([]);
  const [servicesCacheTime, setServicesCacheTime] = useState<number>(0);
  const [servicesLoading, setServicesLoading] = useState(false);

  // Advanced options state
  const [areaCodes, setAreaCodes] = useState("");
  const [carriers, setCarriers] = useState("Any Carrier");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isShortTerm, setIsShortTerm] = useState(true);
  const [durationValue, setDurationValue] = useState("1");
  const [durationUnit, setDurationUnit] = useState("Days");
  const [renewable, setRenewable] = useState(false);
  const [autoRenew, setAutoRenew] = useState(false);

  // Utility functions
  const getServiceName = (code: string): string => {
    const service = allServices.find((s) => s.code === code);
    return service ? service.name : code;
  };

  const getCountryName = (code: string): string => {
    const country = countries.find((c) => c.code === code);
    return country ? country.name : code;
  };

  const getCountryNameFromCode = (code: string): string | null => {
    const countryNames: { [key: string]: string } = {
      '0': 'United States',
      '1': 'Russia', 
      '2': 'Ukraine',
      '7': 'Kazakhstan',
      '16': 'Canada',
      '44': 'United Kingdom',
      '33': 'France',
      '49': 'Germany',
      '39': 'Italy',
      '34': 'Spain',
      '31': 'Netherlands',
      '32': 'Belgium',
      '41': 'Switzerland',
      '43': 'Austria',
      '45': 'Denmark',
      '46': 'Sweden',
      '47': 'Norway',
      '48': 'Poland',
      '420': 'Czech Republic',
      '421': 'Slovakia',
      '36': 'Hungary',
      '40': 'Romania',
      '359': 'Bulgaria',
      '385': 'Croatia',
      '386': 'Slovenia',
      '371': 'Latvia',
      '370': 'Lithuania',
      '372': 'Estonia',
      '55': 'Brazil',
      '52': 'Mexico',
      '54': 'Argentina',
      '56': 'Chile',
      '57': 'Colombia',
      '58': 'Venezuela',
      '51': 'Peru',
      '91': 'India',
      '86': 'China',
      '81': 'Japan',
      '82': 'South Korea',
      '66': 'Thailand',
      '60': 'Malaysia',
      '65': 'Singapore',
      '63': 'Philippines',
      '84': 'Vietnam',
      '62': 'Indonesia',
      '61': 'Australia',
      '64': 'New Zealand',
      '27': 'South Africa',
      '20': 'Egypt',
      '212': 'Morocco',
      '213': 'Algeria',
      '216': 'Tunisia',
      '234': 'Nigeria',
      '254': 'Kenya'
    };
    return countryNames[code] || null;
  };

  useEffect(() => {
    if (user) {
      initializeData();
    }
  }, [user]);

  // Reload services when country changes
  useEffect(() => {
    if (user && pricing && Object.keys(pricing).length > 0) {
      console.log('Country changed to:', selectedCountry, 'reloading services...');
      loadServicesForCountry();
    }
  }, [selectedCountry, user]);

  const loadServicesForCountry = () => {
    if (!pricing || !selectedCountry) return;
    
    const countryPricing = pricing[selectedCountry] || {};
    const updatedServices: Service[] = [];
    
    // Convert pricing data to services for the selected country
    Object.entries(countryPricing).forEach(([serviceCode, serviceData]: [string, any]) => {
      const serviceName = allServices.find(s => s.code === serviceCode)?.name || 
                          serviceCode.charAt(0).toUpperCase() + serviceCode.slice(1);
      
      updatedServices.push({
        code: serviceCode,
        name: serviceName,
        price: parseFloat(serviceData.cost) || 0.50,
        available: parseInt(serviceData.count) > 0
      });
    });
    
    if (updatedServices.length > 0) {
      console.log(`Updated services for ${getCountryNameFromCode(selectedCountry)}: ${updatedServices.length} services`);
      setServices(updatedServices);
    }
  };

  useEffect(() => {
    // Start timers for active numbers
    const interval = setInterval(() => {
      setTimers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          if (updated[id] > 0) {
            updated[id] -= 1;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const initializeData = async () => {
    try {
      await Promise.all([
        fetchBalance(),
        loadServicesAndCountries(),
        fetchActiveNumbers()
      ]);
    } catch (err) {
      console.error('Error initializing:', err);
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

  const loadServicesAndCountries = async () => {
    setServicesLoading(true);
    try {
      console.log('Loading DaisySMS services and pricing...');
      
      // Initialize DaisySMS service
      const daisyService = await DaisySMSService.createWithStoredKey();
      
      // Load services from DaisySMS API
      const apiServices = await daisyService.getAllServices();
      console.log('Got services from DaisySMS:', apiServices);
      
      // Load pricing data
      const pricingData = await daisyService.getPrices();
      console.log('Got pricing from DaisySMS:', Object.keys(pricingData).length, 'countries');
      setPricing(pricingData);
      
      // Convert API services to our format
      const loadedServices: Service[] = [];
      const countryPricing = pricingData[selectedCountry] || {};
      
      apiServices.forEach(service => {
        const servicePrice = countryPricing[service.code];
        if (servicePrice) {
          loadedServices.push({
            code: service.code,
            name: service.name,
            price: parseFloat(servicePrice.cost) || 0.50,
            available: parseInt(servicePrice.count) > 0
          });
        }
      });
      
      // If we got services from API, use them
      if (loadedServices.length > 0) {
        console.log(`Loaded ${loadedServices.length} services from DaisySMS API`);
        setServices(loadedServices);
        setAllServices(apiServices); // Store for service name lookups
      } else {
        console.log('No services from API, using fallback');
        // Fallback to default services if API fails
        const defaultServices: Service[] = [
          { code: 'wa', name: 'WhatsApp', price: 0.70, available: true },
          { code: 'tg', name: 'Telegram', price: 1.50, available: true },
          { code: 'ds', name: 'Discord', price: 0.10, available: true },
          { code: 'fb', name: 'Facebook', price: 1.00, available: true },
          { code: 'ig', name: 'Instagram', price: 0.80, available: true },
          { code: 'go', name: 'Google', price: 0.50, available: true },
          { code: 'tw', name: 'Twitter/X', price: 0.60, available: true },
          { code: 'ot', name: 'OpenAI/ChatGPT', price: 0.10, available: true }
        ];
        setServices(defaultServices);
      }

      // Load countries from pricing data
      const loadedCountries: Country[] = [];
      Object.keys(pricingData).forEach(countryCode => {
        const countryName = getCountryNameFromCode(countryCode);
        if (countryName) {
          loadedCountries.push({
            id: countryCode,
            name: countryName,
            code: countryCode,
            price: 1.0 // Base price multiplier
          });
        }
      });
      
      if (loadedCountries.length > 0) {
        console.log(`Loaded ${loadedCountries.length} countries from DaisySMS API`);
        setCountries(loadedCountries);
      } else {
        // Fallback countries
        const defaultCountries: Country[] = [
          { id: '0', name: 'United States', code: 'US', price: 1.0 },
          { id: '1', name: 'Russia', code: 'RU', price: 0.5 },
          { id: '44', name: 'United Kingdom', code: 'GB', price: 0.9 },
          { id: '49', name: 'Germany', code: 'DE', price: 0.8 }
        ];
        setCountries(defaultCountries);
      }
      
    } catch (err) {
      console.error('Error loading DaisySMS data:', err);
      error('Failed to load live services', 'Using cached data');
      
      // Use fallback data on error
      const defaultServices: Service[] = [
        { code: 'wa', name: 'WhatsApp', price: 0.70, available: true },
        { code: 'tg', name: 'Telegram', price: 1.50, available: true },
        { code: 'ds', name: 'Discord', price: 0.10, available: true },
        { code: 'fb', name: 'Facebook', price: 1.00, available: true },
        { code: 'ig', name: 'Instagram', price: 0.80, available: true },
        { code: 'go', name: 'Google', price: 0.50, available: true }
      ];
      
      const defaultCountries: Country[] = [
        { id: '0', name: 'United States', code: 'US', price: 1.0 },
        { id: '1', name: 'Russia', code: 'RU', price: 0.5 },
        { id: '44', name: 'United Kingdom', code: 'GB', price: 0.9 },
        { id: '49', name: 'Germany', code: 'DE', price: 0.8 }
      ];
      
      setServices(defaultServices);
      setCountries(defaultCountries);
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchActiveNumbers = async () => {
    if (!user) return;
    try {
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
      })) as ActiveNumber[];
      
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
    } catch (err) {
      console.error('Error fetching numbers:', err);
    }
  };

  const handleRentNumber = async (serviceCode: string) => {
    if (!user || renting) return;
    
    const service = services.find(s => s.code === serviceCode);
    const country = countries.find(c => c.id === selectedCountry);
    if (!service || !country) return;

    const totalPrice = service.price * country.price;
    if (balance.usd < totalPrice) {
      error('Insufficient balance', `Need $${totalPrice.toFixed(2)}`);
      return;
    }

    setRenting(true);
    try {
      const daisyService = await DaisySMSService.createWithStoredKey();
      const result = await daisyService.getNumber(serviceCode, selectedCountry);
      
      if (result.number) {
        // Deduct balance
        await updateDoc(doc(db, 'users', user.id), {
          walletBalance: increment(-totalPrice)
        });

        // Create rental record
        const rentalId = `${user.id}_${Date.now()}`;
        const rental: ActiveNumber = {
          id: rentalId,
          number: result.number,
          service: serviceCode,
          country: selectedCountry,
          status: 'waiting',
          daisyId: result.id,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes
        };

        await setDoc(doc(db, 'rentals', rentalId), rental);
        
        // Update local state
        setActiveNumbers(prev => [rental, ...prev]);
        setTimers(prev => ({ ...prev, [rentalId]: 20 * 60 }));
        
        await fetchBalance();
        success('Number rented successfully!', `${result.number}`);
      }
    } catch (err: any) {
      error('Failed to rent number', err.message);
    } finally {
      setRenting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Copied!');
  };

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchService.toLowerCase()) ||
                         service.code.toLowerCase().includes(searchService.toLowerCase());
    const matchesPrice = priceFilter === 'all' || 
                        (priceFilter === 'low' && service.price <= 0.5) ||
                        (priceFilter === 'medium' && service.price > 0.5 && service.price <= 1.0) ||
                        (priceFilter === 'high' && service.price > 1.0);
    return matchesSearch && matchesPrice;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">
                Phone Numbers
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Rent numbers for SMS verification</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs sm:text-sm text-gray-600">Available Balance</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-700">${balance.usd.toFixed(2)}</div>
              <div className="text-xs text-gray-500">≈ ₦{(balance.usd * exchangeRate).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <Select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full"
              >
                {countries.map(country => (
                  <option key={country.id} value={country.id}>
                    {country.name} (+{country.id}) - ${country.price}x
                  </option>
                ))}
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Service</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search services..."
                  value={searchService}
                  onChange={(e) => setSearchService(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <Select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value as any)}
                className="w-full"
              >
                <option value="all">All Prices</option>
                <option value="low">Low ($0 - $0.50)</option>
                <option value="medium">Medium ($0.51 - $1.00)</option>
                <option value="high">High ($1.01+)</option>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => loadServicesAndCountries()}
                variant="outline"
                disabled={servicesLoading}
                className="w-full bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${servicesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Services List */}
          <div className="xl:col-span-2 order-2 xl:order-1">
            <Card className="shadow-lg border border-emerald-200 bg-white/90 backdrop-blur-sm">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Available Services</h2>
                <p className="text-sm text-gray-600">{filteredServices.length} services available</p>
              </div>
              <div className="p-3 sm:p-6">
                <div className="space-y-2 sm:space-y-3">
                  {filteredServices.map(service => {
                    const country = countries.find(c => c.id === selectedCountry);
                    const totalPrice = service.price * (country?.price || 1);
                    const canAfford = balance.usd >= totalPrice;
                    
                    return (
                      <div
                        key={service.code}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border transition-all ${
                          canAfford 
                            ? 'border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50' 
                            : 'border-gray-200 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex-1 mb-3 sm:mb-0">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              service.available ? 'bg-emerald-100' : 'bg-red-100'
                            }`}>
                              <Phone className={`w-5 h-5 ${
                                service.available ? 'text-emerald-600' : 'text-red-600'
                              }`} />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{service.name}</div>
                              <div className="text-sm text-gray-500">Code: {service.code.toUpperCase()}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end space-x-4">
                          <div className="text-left sm:text-right">
                            <div className="font-bold text-gray-900">${totalPrice.toFixed(2)}</div>
                            <div className="text-sm text-gray-500">
                              ${service.price} × {country?.price}x
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => handleRentNumber(service.code)}
                            disabled={!canAfford || renting || !service.available}
                            size="sm"
                            className={canAfford && service.available ? 
                              'bg-emerald-600 hover:bg-emerald-700 shadow-lg' : 
                              'bg-gray-300 cursor-not-allowed'
                            }
                          >
                            {renting ? 'Renting...' : 'Rent'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* Active Numbers */}
          <div className="order-1 xl:order-2">
            <Card className="shadow-lg border border-amber-200 bg-white/90 backdrop-blur-sm">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Active Numbers</h2>
                <p className="text-sm text-gray-600">{activeNumbers.length} active rentals</p>
              </div>
              <div className="divide-y divide-gray-200">
                {activeNumbers.length === 0 ? (
                  <div className="p-6 text-center">
                    <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No active numbers</p>
                    <p className="text-xs text-gray-400 mt-1">Rented numbers will appear here</p>
                  </div>
                ) : (
                  activeNumbers.map(number => (
                    <div key={number.id} className="p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono font-bold text-gray-900 truncate">{number.number}</div>
                          <div className="text-sm text-gray-600 truncate">
                            {services.find(s => s.code === number.service)?.name || number.service}
                          </div>
                        </div>
                        <div className={`ml-2 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          number.status === 'waiting' ? 'bg-amber-100 text-amber-800' :
                          number.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {number.status}
                        </div>
                      </div>

                      {number.status === 'waiting' && timers[number.id] && (
                        <div className="flex items-center space-x-2 mb-3">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span className="text-sm text-amber-700 font-medium">
                            {formatTimer(timers[number.id])} remaining
                          </span>
                        </div>
                      )}

                      {number.code ? (
                        <div className="space-y-2">
                          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-3">
                            <div className="text-xs text-emerald-700 mb-1 font-medium">SMS Code:</div>
                            <div className="font-mono font-bold text-lg text-emerald-800">{number.code}</div>
                          </div>
                          <Button
                            onClick={() => copyToClipboard(number.code!)}
                            size="sm"
                            variant="outline"
                            className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Code
                          </Button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic bg-gray-50 rounded-lg p-3 text-center">
                          Waiting for SMS...
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NumbersPageNew;
