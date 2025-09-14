import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  DollarSign, 
  Edit, 
  Save, 
  RefreshCw,
  Globe,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Download,
  Upload,
  RotateCcw,
  X,
  Search,
  Filter,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DaisySMSService } from '../../services/daisySMS';
import { formatCurrency } from '../../lib/utils';

interface ServicePricing {
  serviceCode: string;
  serviceName: string;
  countryCode: string;
  countryName: string;
  originalPrice: number;
  markupPrice: number;
  customPrice?: number;
  available: number;
  isCustom: boolean;
  profit: number;
}

interface PriceEditModal {
  isOpen: boolean;
  service: ServicePricing | null;
  newPrice: string;
}

export function ManualServicePricing() {
  const { success, error } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServicePricing[]>([]);
  const [filteredServices, setFilteredServices] = useState<ServicePricing[]>([]);
  const [markupPercentage, setMarkupPercentage] = useState(30);
  const [tempMarkup, setTempMarkup] = useState(30);
  const [editModal, setEditModal] = useState<PriceEditModal>({
    isOpen: false,
    service: null,
    newPrice: ''
  });
  const [filters, setFilters] = useState({
    country: 'all',
    service: 'all',
    priceType: 'all',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showPrices, setShowPrices] = useState(true);

  // Add state for dynamic services
  const [dynamicServices, setDynamicServices] = useState<{ [key: string]: string }>({});
  useEffect(() => {
    loadServicePricing();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await loadDynamicServiceNames();
      await loadServicePricing();
    };
    loadData();
  }, []);
  useEffect(() => {
    applyFilters();
  }, [services, filters]);

  const loadDynamicServiceNames = async () => {
    try {
      console.log('Loading dynamic service names from DaisySMS...');
      const daisyService = await DaisySMSService.createWithStoredKey();
      const allServices = await daisyService.getAllServices();
      
      // Create mapping from service codes to full names
      const serviceMapping: { [key: string]: string } = {};
      allServices.forEach(service => {
        serviceMapping[service.code] = service.name;
        console.log(`Service mapping: ${service.code} -> ${service.name}`);
      });
      
      setDynamicServices(serviceMapping);
      console.log('Dynamic service names loaded:', Object.keys(serviceMapping).length, 'services');
      
      // Force reload of service pricing after dynamic names are loaded
      if (Object.keys(serviceMapping).length > 0) {
        console.log('Reloading service pricing with dynamic names...');
        await loadServicePricing();
      }
    } catch (error) {
      console.warn('Failed to load dynamic service names:', error);
      // Keep using static fallback
    }
  };
  const loadServicePricing = async () => {
    try {
      setLoading(true);
      
      // Load current markup percentage
      try {
        const pricingDoc = await getDoc(doc(db, 'config', 'pricing'));
        if (pricingDoc.exists()) {
          const pricingData = pricingDoc.data();
          const markup = pricingData.markupPercentage;
          if (typeof markup === 'number' && markup >= 0 && markup <= 200) {
            setMarkupPercentage(markup);
            setTempMarkup(markup);
            console.log('Loaded markup percentage:', markup);
          } else {
            console.warn('Invalid markup percentage:', markup);
            setMarkupPercentage(30);
            setTempMarkup(30);
          }
        } else {
          console.log('No pricing config found, using default 30%');
          setMarkupPercentage(30);
          setTempMarkup(30);
        }
      } catch (err) {
        console.warn('Failed to load markup config:', err);
        setMarkupPercentage(30);
        setTempMarkup(30);
      }

      // Load custom pricing overrides
      let customPricing = {};
      try {
        const customPricingDoc = await getDoc(doc(db, 'config', 'custom_pricing'));
        if (customPricingDoc.exists()) {
          customPricing = customPricingDoc.data();
          console.log('Loaded custom pricing overrides:', Object.keys(customPricing).length);
        }
      } catch (err) {
        console.warn('Failed to load custom pricing:', err);
      }

      // Get live pricing from DaisySMS
      let livePricing = {};
      try {
        const daisyService = await DaisySMSService.createWithStoredKey();
        livePricing = await daisyService.getPrices();
        console.log('Loaded live DaisySMS pricing');
      } catch (err) {
        console.error('Failed to load DaisySMS pricing:', err);
        error('DaisySMS Error', 'Failed to load live pricing from DaisySMS API');
        // Use fallback data
        livePricing = getFallbackPricing();
      }

      // Transform pricing data into service list
      const serviceList: ServicePricing[] = [];
      
      Object.entries(livePricing).forEach(([countryCode, countryServices]: [string, any]) => {
        if (countryServices && typeof countryServices === 'object') {
          Object.entries(countryServices).forEach(([serviceCode, serviceData]: [string, any]) => {
            if (serviceData && typeof serviceData === 'object') {
              const originalPrice = parseFloat(serviceData.cost || '0');
              
              // Get the actual markup price that would be calculated
              const calculatedMarkupPrice = originalPrice * (1 + markupPercentage / 100);
              const roundedMarkupPrice = Math.round(calculatedMarkupPrice * 100) / 100;
              
              const customKey = `${countryCode}_${serviceCode}`;
              const customPrice = customPricing[customKey];
              
              let finalPrice = roundedMarkupPrice;
              let isCustom = false;
              
              if (customPrice && !isNaN(parseFloat(customPrice))) {
                finalPrice = parseFloat(customPrice);
                isCustom = true;
              }
              
              const profit = Math.max(0, finalPrice - originalPrice);
              
              serviceList.push({
                serviceCode,
                serviceName: dynamicServices[serviceCode] || serviceData.serviceName || serviceData.name || getServiceName(serviceCode),
                countryCode,
                countryName: getCountryName(countryCode),
                originalPrice,
                markupPrice: roundedMarkupPrice,
                customPrice: isCustom ? finalPrice : undefined,
                available: parseInt(serviceData.count || '0'),
                isCustom,
                profit
              });
            }
          });
        }
      });

      // Sort by service name, then country
      serviceList.sort((a, b) => {
        const serviceCompare = a.serviceName.localeCompare(b.serviceName);
        if (serviceCompare !== 0) return serviceCompare;
        return a.countryName.localeCompare(b.countryName);
      });

      setServices(serviceList);
      console.log('Loaded', serviceList.length, 'services');
    } catch (err) {
      console.error('Error loading service pricing:', err);
      error('Load Failed', 'Failed to load service pricing data');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const getFallbackPricing = () => {
    return {
      '0': { // United States
        'tg': { cost: '0.25', count: '50' },
        'wa': { cost: '0.30', count: '30' },
        'ig': { cost: '0.35', count: '20' },
        'fb': { cost: '0.28', count: '40' },
        'tw': { cost: '0.32', count: '25' },
        'ds': { cost: '0.27', count: '35' },
        'go': { cost: '0.30', count: '45' }
      },
      '1': { // Russia
        'tg': { cost: '0.20', count: '100' },
        'wa': { cost: '0.25', count: '80' },
        'ig': { cost: '0.30', count: '60' }
      },
      '44': { // United Kingdom
        'tg': { cost: '0.35', count: '25' },
        'wa': { cost: '0.40', count: '20' },
        'ig': { cost: '0.45', count: '15' }
      }
    };
  };

  const applyFilters = () => {
    let filtered = services;

    if (filters.country !== 'all') {
      filtered = filtered.filter(s => s.countryCode === filters.country);
    }

    if (filters.service !== 'all') {
      filtered = filtered.filter(s => s.serviceCode === filters.service);
    }

    if (filters.priceType !== 'all') {
      if (filters.priceType === 'custom') {
        filtered = filtered.filter(s => s.isCustom);
      } else if (filters.priceType === 'markup') {
        filtered = filtered.filter(s => !s.isCustom);
      }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.serviceName.toLowerCase().includes(searchLower) ||
        s.countryName.toLowerCase().includes(searchLower) ||
        s.serviceCode.toLowerCase().includes(searchLower)
      );
    }

    setFilteredServices(filtered);
  };

  const getServiceName = (serviceCode: string): string => {
    const serviceNames: { [key: string]: string } = {
      // Popular messaging apps
      'tg': 'Telegram',
      'wa': 'WhatsApp',
      'ig': 'Instagram',
      'fb': 'Facebook',
      'tw': 'Twitter',
      'ds': 'Discord',
      'go': 'Google',
      'yt': 'YouTube',
      'sc': 'Snapchat',
      'tt': 'TikTok',
      'li': 'LinkedIn',
      'vi': 'Viber',
      'sk': 'Skype',
      'zm': 'Zoom',
      'sl': 'Slack',
      'rd': 'Reddit',
      'pt': 'Pinterest',
      
      // Dating and social
      'td': 'Tinder',
      'bm': 'Bumble',
      'hg': 'Hinge',
      'gm': 'Grindr',
      'mt': 'Match.com',
      'pf': 'Plenty of Fish',
      'cm': 'Coffee Meets Bagel',
      
      // Financial and shopping
      'pp': 'PayPal',
      'stripe': 'Stripe',
      'square': 'Square',
      'venmo': 'Venmo',
      'cashapp': 'Cash App',
      'zelle': 'Zelle',
      'amazon': 'Amazon',
      'ebay': 'eBay',
      'etsy': 'Etsy',
      'shopify': 'Shopify',
      
      // Technology and services
      'ms': 'Microsoft',
      'outlook': 'Microsoft Outlook',
      'office365': 'Microsoft Office 365',
      'teams': 'Microsoft Teams',
      'chatgpt': 'OpenAI ChatGPT',
      'openai': 'OpenAI',
      'github': 'GitHub',
      'gitlab': 'GitLab',
      'bitbucket': 'Bitbucket',
      'docker': 'Docker',
      'aws': 'Amazon Web Services',
      'azure': 'Microsoft Azure',
      'gcp': 'Google Cloud Platform',
      
      // Entertainment and media
      'nf': 'Netflix',
      'hulu': 'Hulu',
      'disney': 'Disney Plus',
      'spotify': 'Spotify',
      'apple': 'Apple Music',
      'pandora': 'Pandora',
      'soundcloud': 'SoundCloud',
      'twitch': 'Twitch',
      'steam': 'Steam',
      'epic': 'Epic Games',
      
      // Communication and productivity
      'wc': 'WeChat',
      'ln': 'Line',
      'kk': 'KakaoTalk',
      'signal': 'Signal',
      'wickr': 'Wickr',
      'threema': 'Threema',
      'element': 'Element',
      'matrix': 'Matrix',
      'keybase': 'Keybase',
      
      // Travel and transportation
      'uber': 'Uber',
      'lyft': 'Lyft',
      'airbnb': 'Airbnb',
      'booking': 'Booking.com',
      'expedia': 'Expedia',
      'tripadvisor': 'TripAdvisor',
      
      // Food delivery
      'doordash': 'DoorDash',
      'ubereats': 'Uber Eats',
      'grubhub': 'GrubHub',
      'postmates': 'Postmates',
      
      // Cryptocurrency
      'binance': 'Binance',
      'coinbase': 'Coinbase',
      'kraken': 'Kraken',
      'bitfinex': 'Bitfinex',
      'huobi': 'Huobi',
      
      // Russian services
      'vk': 'VKontakte',
      'ok': 'Odnoklassniki',
      'av': 'Avito',
      'ya': 'Yandex',
      
      // Other services
      'cl': 'Craigslist',
      'ad': 'Adobe',
      'dr': 'Dropbox',
      'tb': 'Tumblr',
      'wp': 'WordPress',
      'sh': 'Shopify',
      'eb': 'eBay',
      'et': 'Etsy',
      'ai': 'Airbnb',
      'bf': 'Booking.com',
      'ex': 'Expedia',
      'tr': 'TripAdvisor',
      'zl': 'Zillow',
      'qr': 'QR Code',
      'bt': 'BitTorrent',
      'mg': 'Mega',
      'mw': 'MediaWiki',
      'jt': 'Jitsi',
      'rc': 'Rocket.Chat',
      'el': 'Element',
      'sg': 'Signal',
      'wk': 'Wickr',
      'th': 'Threema',
      'br': 'Briar',
      'ri': 'Ricochet',
      'ss': 'Session',
      'st': 'Status',
      'kp': 'Keybase',
      'pr': 'ProtonMail',
      'tm': 'Tutanota',
      'hm': 'HushMail',
      'sm': 'StartMail',
      'fm': 'FastMail',
      'gw': 'Guerrilla Mail',
      'mm': 'Mailinator',
      'yp': 'Yopmail',
      'gt': 'GetNada',
      'ml': 'Maildrop',
      'em': 'EmailOnDeck',
      'mb': 'Mailbox.org',
      'pm': 'Posteo',
      'ct': 'CounterMail',
      'lv': 'Lavabit',
      'rn': 'RiseUp',
      'ot': 'Other'
    };
    return serviceNames[serviceCode] || serviceCode.toUpperCase();
  };

  const getCountryName = (countryCode: string): string => {
    const countryNames: { [key: string]: string } = {
      '0': 'United States',
      '1': 'Russia',
      '44': 'United Kingdom',
      '49': 'Germany',
      '33': 'France',
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
      '372': 'Estonia'
    };
    return countryNames[countryCode] || `Country ${countryCode}`;
  };

  const openEditModal = (service: ServicePricing) => {
    setEditModal({
      isOpen: true,
      service,
      newPrice: service.isCustom ? service.customPrice!.toFixed(2) : service.markupPrice.toFixed(2)
    });
  };

  const closeEditModal = () => {
    setEditModal({
      isOpen: false,
      service: null,
      newPrice: ''
    });
  };

  const saveCustomPrice = async () => {
    if (!editModal.service) return;

    const newPrice = parseFloat(editModal.newPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      error('Invalid Price', 'Please enter a valid price');
      return;
    }

    if (newPrice < 0.01 || newPrice > 100) {
      error('Price Range Error', 'Price must be between $0.01 and $100.00');
      return;
    }

    try {
      setSaving(true);
      
      const customKey = `${editModal.service.countryCode}_${editModal.service.serviceCode}`;
      console.log('Saving custom price:', customKey, '=', newPrice);
      
      // Load existing custom pricing
      const customPricingDoc = await getDoc(doc(db, 'config', 'custom_pricing'));
      const existingPricing = customPricingDoc.exists() ? customPricingDoc.data() : {};
      
      // Update with new price
      const updatedPricing = {
        ...existingPricing,
        [customKey]: newPrice.toFixed(2)
      };
      
      console.log('Updated pricing object:', updatedPricing);
      
      // Save to Firebase
      await setDoc(doc(db, 'config', 'custom_pricing'), {
        ...updatedPricing,
        updatedAt: new Date(),
        updatedBy: user?.id
      });

      console.log('Custom pricing saved to Firebase successfully');

      // Log admin action
      await setDoc(doc(db, 'admin_actions', `price_update_${Date.now()}`), {
        action: 'update_service_price',
        adminUserId: user?.id,
        serviceCode: editModal.service.serviceCode,
        countryCode: editModal.service.countryCode,
        serviceName: editModal.service.serviceName,
        countryName: editModal.service.countryName,
        oldPrice: editModal.service.customPrice || editModal.service.markupPrice,
        newPrice: newPrice,
        timestamp: new Date()
      });

      success('Price Updated', `${editModal.service.serviceName} (${editModal.service.countryName}) price updated to ${formatCurrency(newPrice)}`);
      closeEditModal();
      
      // Force reload to ensure changes are reflected
      await loadServicePricing();
    } catch (err) {
      console.error('Error saving custom price:', err);
      error('Save Failed', 'Failed to save custom price');
    } finally {
      setSaving(false);
    }
  };

  const removeCustomPrice = async (service: ServicePricing) => {
    const confirmed = window.confirm(`Reset ${service.serviceName} (${service.countryName}) to automatic markup pricing?`);
    if (!confirmed) return;

    try {
      setSaving(true);
      
      const customKey = `${service.countryCode}_${service.serviceCode}`;
      
      // Load existing custom pricing
      const customPricingDoc = await getDoc(doc(db, 'config', 'custom_pricing'));
      if (customPricingDoc.exists()) {
        const existingPricing = customPricingDoc.data();
        
        // Remove the custom price
        delete existingPricing[customKey];
        
        // Save updated pricing
        await setDoc(doc(db, 'config', 'custom_pricing'), {
          ...existingPricing,
          updatedAt: new Date(),
          updatedBy: user?.id
        });

        // Log admin action
        await setDoc(doc(db, 'admin_actions', `price_reset_${Date.now()}`), {
          action: 'reset_service_price',
          adminUserId: user?.id,
          serviceCode: service.serviceCode,
          countryCode: service.countryCode,
          serviceName: service.serviceName,
          countryName: service.countryName,
          oldPrice: service.customPrice!,
          newPrice: service.markupPrice,
          timestamp: new Date()
        });

        success('Price Reset', `${service.serviceName} (${service.countryName}) price reset to automatic markup`);
        await loadServicePricing();
      }
    } catch (err) {
      console.error('Error removing custom price:', err);
      error('Reset Failed', 'Failed to reset price');
    } finally {
      setSaving(false);
    }
  };

  const updateGlobalMarkup = async () => {
    try {
      setSaving(true);
      
      if (tempMarkup < 0 || tempMarkup > 200) {
        error('Invalid Markup', 'Markup percentage must be between 0% and 200%');
        return;
      }

      console.log('Updating global markup from', markupPercentage, 'to', tempMarkup);

      await setDoc(doc(db, 'config', 'pricing'), {
        markupPercentage: tempMarkup,
        minimumPrice: 0.10,
        maximumPrice: 50.00,
        updatedAt: new Date(),
        updatedBy: user?.id
      }, { merge: true });

      console.log('Global markup saved to Firebase successfully');

      // Log admin action
      await setDoc(doc(db, 'admin_actions', `markup_update_${Date.now()}`), {
        action: 'update_global_markup',
        adminUserId: user?.id,
        oldMarkup: markupPercentage,
        newMarkup: tempMarkup,
        timestamp: new Date()
      });

      setMarkupPercentage(tempMarkup);
      success('Markup Updated', `Global markup updated to ${tempMarkup}%`);
      
      // Reload pricing to reflect changes
      await loadServicePricing();
      
      // Clear any cached pricing data to force refresh
      console.log('Markup update complete, pricing will refresh on next user request');
    } catch (err) {
      console.error('Error updating markup:', err);
      error('Update Failed', 'Failed to update global markup');
    } finally {
      setSaving(false);
    }
  };

  const exportPricingData = () => {
    try {
      const exportData = {
        services: filteredServices,
        markupPercentage,
        totalServices: services.length,
        customPrices: services.filter(s => s.isCustom).length,
        exportedAt: new Date().toISOString(),
        exportedBy: user?.id
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `service-pricing-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success('Export Complete', 'Service pricing data exported successfully');
    } catch (err) {
      error('Export Failed', 'Failed to export pricing data');
    }
  };

  const bulkUpdatePrices = async (percentage: number) => {
    const confirmed = window.confirm(`Apply ${percentage}% markup to all services without custom pricing?`);
    if (!confirmed) return;

    try {
      setSaving(true);
      
      // This would update all non-custom prices
      await setDoc(doc(db, 'config', 'pricing'), {
        markupPercentage: percentage,
        updatedAt: new Date(),
        updatedBy: user?.id
      }, { merge: true });

      success('Bulk Update Complete', `Applied ${percentage}% markup to all services`);
      await loadServicePricing();
    } catch (err) {
      console.error('Error in bulk update:', err);
      error('Bulk Update Failed', 'Failed to update prices');
    } finally {
      setSaving(false);
    }
  };

  // Get unique countries and services for filters
  const uniqueCountries = Array.from(new Set(services.map(s => s.countryCode)))
    .map(code => ({ code, name: getCountryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const uniqueServices = Array.from(new Set(services.map(s => s.serviceCode)))
    .map(code => ({ code, name: dynamicServices[code] || getServiceName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Pagination calculations
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentServices = filteredServices.slice(startIndex, startIndex + itemsPerPage);

  // Statistics
  const stats = {
    totalServices: services.length,
    customPrices: services.filter(s => s.isCustom).length,
    averageProfit: services.length > 0 ? services.reduce((sum, s) => sum + s.profit, 0) / services.length : 0,
    totalAvailable: services.reduce((sum, s) => sum + s.available, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manual Service Pricing</h2>
          <p className="text-gray-600">View and manually edit pricing for all services</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrices(!showPrices)}
          >
            {showPrices ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button variant="outline" onClick={exportPricingData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadServicePricing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Services</p>
                <p className="text-xl font-bold text-blue-600">{stats.totalServices}</p>
              </div>
              <Smartphone className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Custom Prices</p>
                <p className="text-xl font-bold text-purple-600">{stats.customPrices}</p>
              </div>
              <Edit className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Avg Profit</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(stats.averageProfit)}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Available Numbers</p>
                <p className="text-xl font-bold text-orange-600">{stats.totalAvailable}</p>
              </div>
              <Globe className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Markup Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Global Markup Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Input
                  label="Global Markup Percentage (%)"
                  type="number"
                  value={tempMarkup}
                  onChange={(e) => setTempMarkup(parseFloat(e.target.value) || 0)}
                  min="0"
                  max="200"
                  step="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current: {markupPercentage}%
                </p>
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium">Example Calculation:</p>
                <p>DaisySMS: $0.25 → User: ${(0.25 * (1 + tempMarkup / 100)).toFixed(2)}</p>
                <p className="text-green-600">Profit: ${((0.25 * (1 + tempMarkup / 100)) - 0.25).toFixed(2)}</p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={updateGlobalMarkup} 
                  disabled={saving || tempMarkup === markupPercentage}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Updating...' : 'Update Markup'}
                </Button>
              </div>
            </div>

            {/* Quick Markup Buttons */}
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => setTempMarkup(20)}>20%</Button>
              <Button variant="outline" size="sm" onClick={() => setTempMarkup(30)}>30%</Button>
              <Button variant="outline" size="sm" onClick={() => setTempMarkup(40)}>40%</Button>
              <Button variant="outline" size="sm" onClick={() => setTempMarkup(50)}>50%</Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-blue-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Global Markup Info</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                This markup applies to all services automatically. You can override individual service prices below.
                Changes take effect immediately for new rentals.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search services..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <Select
              value={filters.country}
              onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
            >
              <option value="all">All Countries</option>
              {uniqueCountries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
            <Select
              value={filters.service}
              onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
            >
              <option value="all">All Services</option>
              {uniqueServices.map(service => (
                <option key={service.code} value={service.code}>
                  {service.name}
                </option>
              ))}
            </Select>
            <Select
              value={filters.priceType}
              onChange={(e) => setFilters(prev => ({ ...prev, priceType: e.target.value }))}
            >
              <option value="all">All Prices</option>
              <option value="custom">Custom Prices</option>
              <option value="markup">Markup Prices</option>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ country: 'all', service: 'all', priceType: 'all', search: '' });
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Service Pricing ({filteredServices.length} services)</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader size="lg" text="Loading service pricing..." showText={true} className="py-8" />
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Services Found</h3>
              <p className="text-gray-600">No services match your current filters</p>
              <Button 
                onClick={() => setFilters({ country: 'all', service: 'all', priceType: 'all', search: '' })}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Service</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Country</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">DaisySMS Cost</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Auto Markup</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Current Price</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Profit</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Available</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentServices.map((service, index) => (
                      <tr key={`${service.countryCode}_${service.serviceCode}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <Smartphone className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="font-medium text-gray-900">{service.serviceName}</p>
                              <p className="text-xs text-gray-500">{service.serviceCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Globe className="w-4 h-4 text-gray-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{service.countryName}</p>
                              <p className="text-xs text-gray-500">{service.countryCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-mono text-gray-600">
                            {showPrices ? formatCurrency(service.originalPrice) : '••••'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <span className="text-sm font-mono text-blue-600">
                              {showPrices ? formatCurrency(service.markupPrice) : '••••'}
                            </span>
                            <div className="text-xs text-gray-500">
                              +{markupPercentage}%
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-mono font-bold ${
                              service.isCustom ? 'text-purple-600' : 'text-green-600'
                            }`}>
                              {showPrices ? formatCurrency(service.isCustom ? service.customPrice! : service.markupPrice) : '••••'}
                            </span>
                            {service.isCustom && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-medium">
                                Custom
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-sm font-mono font-bold ${
                            service.profit > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {showPrices ? formatCurrency(service.profit) : '••••'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-sm font-medium ${
                            service.available > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {service.available}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(service)}
                              disabled={saving}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {service.isCustom && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeCustomPrice(service)}
                                disabled={saving}
                                className="text-orange-600 hover:text-orange-700"
                                title="Reset to automatic markup"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredServices.length)} of {filteredServices.length} services
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 text-sm rounded ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              onClick={() => bulkUpdatePrices(25)}
              disabled={saving}
            >
              Apply 25% Markup
            </Button>
            <Button
              variant="outline"
              onClick={() => bulkUpdatePrices(35)}
              disabled={saving}
            >
              Apply 35% Markup
            </Button>
            <Button
              variant="outline"
              onClick={() => bulkUpdatePrices(50)}
              disabled={saving}
            >
              Apply 50% Markup
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const percentage = prompt('Enter markup percentage (0-200):');
                if (percentage && !isNaN(parseFloat(percentage))) {
                  bulkUpdatePrices(parseFloat(percentage));
                }
              }}
              disabled={saving}
            >
              Custom Markup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Price Edit Modal */}
      {editModal.isOpen && editModal.service && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Edit Service Price</h3>
              <button
                onClick={closeEditModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Service Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Service Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-medium">{editModal.service.serviceName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Country:</span>
                      <span className="font-medium">{editModal.service.countryName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available:</span>
                      <span className={`font-medium ${
                        editModal.service.available > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {editModal.service.available} numbers
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">DaisySMS Cost:</span>
                      <span className="font-mono">{formatCurrency(editModal.service.originalPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Auto Markup ({markupPercentage}%):</span>
                      <span className="font-mono text-blue-600">{formatCurrency(editModal.service.markupPrice)}</span>
                    </div>
                  </div>
                </div>

                {/* Price Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Price (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="100"
                      value={editModal.newPrice}
                      onChange={(e) => setEditModal(prev => ({ ...prev, newPrice: e.target.value }))}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Range: $0.01 - $100.00
                  </p>
                </div>

                {/* Price Comparison */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Price Analysis</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">DaisySMS Cost:</span>
                      <span className="font-mono">{formatCurrency(editModal.service.originalPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Your New Price:</span>
                      <span className="font-mono font-bold text-purple-600">
                        {editModal.newPrice ? formatCurrency(parseFloat(editModal.newPrice)) : '$0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-2">
                      <span className="text-blue-700 font-medium">Profit per Sale:</span>
                      <span className={`font-mono font-bold ${
                        editModal.newPrice && parseFloat(editModal.newPrice) > editModal.service.originalPrice
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {editModal.newPrice 
                          ? formatCurrency(Math.max(0, parseFloat(editModal.newPrice) - editModal.service.originalPrice))
                          : '$0.00'
                        }
                      </span>
                    </div>
                    {editModal.newPrice && parseFloat(editModal.newPrice) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-blue-700">Profit Margin:</span>
                        <span className="font-bold text-blue-600">
                          {((Math.max(0, parseFloat(editModal.newPrice) - editModal.service.originalPrice) / parseFloat(editModal.newPrice)) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Warning for low profit */}
                {editModal.newPrice && parseFloat(editModal.newPrice) <= editModal.service.originalPrice && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-red-800">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">Low Profit Warning</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                      This price is at or below cost. You will make little to no profit.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={closeEditModal} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={saveCustomPrice} 
                    disabled={saving || !editModal.newPrice || parseFloat(editModal.newPrice) <= 0}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Price'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}