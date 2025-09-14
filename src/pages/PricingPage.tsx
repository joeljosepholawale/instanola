import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Globe, 
  CheckCircle, 
  MessageSquare, 
  Smartphone,
  Zap,
  Star,
  ArrowRight,
  Shield,
  DollarSign,
  Clock
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

interface ServicePrice {
  service: string;
  name: string;
  icon: string;
  price: number;
  popular?: boolean;
}

interface CountryPricing {
  country: string;
  countryName: string;
  flag: string;
  services: ServicePrice[];
}

export function PricingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedService, setSelectedService] = useState('all');

  // Mock pricing data similar to DaisySMS structure
  const countries: CountryPricing[] = [
    {
      country: 'US',
      countryName: 'United States',
      flag: '🇺🇸',
      services: [
        { service: 'telegram', name: 'Telegram', icon: '✈️', price: 0.50, popular: true },
        { service: 'whatsapp', name: 'WhatsApp', icon: '💬', price: 0.70, popular: true },
        { service: 'instagram', name: 'Instagram', icon: '📸', price: 0.45 },
        { service: 'facebook', name: 'Facebook', icon: '📘', price: 0.55 },
        { service: 'twitter', name: 'Twitter', icon: '🐦', price: 0.40 },
        { service: 'google', name: 'Google', icon: '🔍', price: 0.35 },
        { service: 'discord', name: 'Discord', icon: '🎮', price: 0.60 },
        { service: 'tiktok', name: 'TikTok', icon: '🎵', price: 0.65 }
      ]
    },
    {
      country: 'GB',
      countryName: 'United Kingdom',
      flag: '🇬🇧',
      services: [
        { service: 'telegram', name: 'Telegram', icon: '✈️', price: 0.45 },
        { service: 'whatsapp', name: 'WhatsApp', icon: '💬', price: 0.65 },
        { service: 'instagram', name: 'Instagram', icon: '📸', price: 0.40 },
        { service: 'facebook', name: 'Facebook', icon: '📘', price: 0.50 },
        { service: 'twitter', name: 'Twitter', icon: '🐦', price: 0.35 },
        { service: 'google', name: 'Google', icon: '🔍', price: 0.30 }
      ]
    },
    {
      country: 'NG',
      countryName: 'Nigeria',
      flag: '🇳🇬',
      services: [
        { service: 'telegram', name: 'Telegram', icon: '✈️', price: 0.25, popular: true },
        { service: 'whatsapp', name: 'WhatsApp', icon: '💬', price: 0.35, popular: true },
        { service: 'instagram', name: 'Instagram', icon: '📸', price: 0.20 },
        { service: 'facebook', name: 'Facebook', icon: '📘', price: 0.30 },
        { service: 'twitter', name: 'Twitter', icon: '🐦', price: 0.18 },
        { service: 'google', name: 'Google', icon: '🔍', price: 0.15 }
      ]
    },
    {
      country: 'DE',
      countryName: 'Germany',
      flag: '🇩🇪',
      services: [
        { service: 'telegram', name: 'Telegram', icon: '✈️', price: 0.42 },
        { service: 'whatsapp', name: 'WhatsApp', icon: '💬', price: 0.58 },
        { service: 'instagram', name: 'Instagram', icon: '📸', price: 0.38 },
        { service: 'facebook', name: 'Facebook', icon: '📘', price: 0.48 }
      ]
    },
    {
      country: 'FR',
      countryName: 'France',
      flag: '🇫🇷',
      services: [
        { service: 'telegram', name: 'Telegram', icon: '✈️', price: 0.40 },
        { service: 'whatsapp', name: 'WhatsApp', icon: '💬', price: 0.55 },
        { service: 'instagram', name: 'Instagram', icon: '📸', price: 0.35 },
        { service: 'facebook', name: 'Facebook', icon: '📘', price: 0.45 }
      ]
    }
  ];

  const popularServices = [
    { service: 'telegram', name: 'Telegram', icon: '✈️', description: 'Secure messaging platform' },
    { service: 'whatsapp', name: 'WhatsApp', icon: '💬', description: 'Popular messaging app' },
    { service: 'instagram', name: 'Instagram', icon: '📸', description: 'Photo sharing social media' },
    { service: 'facebook', name: 'Facebook', icon: '📘', description: 'Social networking platform' },
    { service: 'google', name: 'Google', icon: '🔍', description: 'Google services verification' },
    { service: 'discord', name: 'Discord', icon: '🎮', description: 'Gaming and community chat' }
  ];

  const filteredCountries = countries.filter(country => {
    const matchesSearch = 
      country.countryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.country.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCountry = selectedCountry === 'all' || country.country === selectedCountry;
    
    const matchesService = selectedService === 'all' || 
      country.services.some(s => s.service === selectedService);
    
    return matchesSearch && matchesCountry && matchesService;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-amber-50">
      
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-emerald-900 to-green-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl lg:text-6xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              Simple
            </span> Pay-per-Use Pricing
          </h1>
          <p className="text-2xl text-emerald-200 mb-8 max-w-4xl mx-auto leading-relaxed">
            No subscriptions, no commitments. Pay only for the SMS codes you successfully receive.
          </p>
          
          {/* Key Features */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="flex items-center space-x-2 bg-emerald-500/20 px-6 py-3 rounded-full border border-emerald-400/30">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-200 font-medium">No setup fees</span>
            </div>
            <div className="flex items-center space-x-2 bg-amber-500/20 px-6 py-3 rounded-full border border-amber-400/30">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="text-amber-200 font-medium">Instant activation</span>
            </div>
            <div className="flex items-center space-x-2 bg-green-500/20 px-6 py-3 rounded-full border border-green-400/30">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-green-200 font-medium">Money-back guarantee</span>
            </div>
          </div>

          <Link to="/signup">
            <Button 
              size="xl" 
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
            >
              <Zap className="mr-3 w-6 h-6" />
              Start Using InstantNums
              <ArrowRight className="ml-3 w-6 h-6" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Popular Services Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-100 to-amber-100 rounded-full text-emerald-800 text-sm font-bold mb-6">
              <Star className="w-4 h-4 mr-2" />
              Most Popular Services
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Trusted by <span className="text-emerald-600">Millions</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get instant SMS verification for the world's most popular platforms
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularServices.map((service) => (
              <Card key={service.service} className="border-2 border-gray-200 hover:border-emerald-300 transition-all duration-200 hover:shadow-xl transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">
                      {service.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{service.name}</h3>
                      <p className="text-gray-600 text-sm">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Starting from</span>
                    <span className="text-2xl font-black text-emerald-600">$0.15</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="py-16 bg-gradient-to-r from-emerald-50 to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Find Your <span className="text-emerald-600">Perfect</span> Rate
            </h2>
            <p className="text-xl text-gray-600">
              Search through 150+ countries and 50+ services to find the best pricing
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/50 shadow-xl mb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search countries or services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-lg border-2 border-gray-200 focus:border-emerald-500"
                />
              </div>
              
              <Select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="h-12 text-lg border-2 border-gray-200"
              >
                <option value="all">All Countries</option>
                <option value="US">🇺🇸 United States</option>
                <option value="GB">🇬🇧 United Kingdom</option>
                <option value="NG">🇳🇬 Nigeria</option>
                <option value="DE">🇩🇪 Germany</option>
                <option value="FR">🇫🇷 France</option>
              </Select>

              <Select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="h-12 text-lg border-2 border-gray-200"
              >
                <option value="all">All Services</option>
                <option value="telegram">✈️ Telegram</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="instagram">📸 Instagram</option>
                <option value="facebook">📘 Facebook</option>
                <option value="google">🔍 Google</option>
                <option value="discord">🎮 Discord</option>
              </Select>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="space-y-8">
            {filteredCountries.map((country) => (
              <Card key={country.country} className="border-2 border-white/50 bg-white/70 backdrop-blur-sm shadow-xl">
                <div className="p-8">
                  {/* Country Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">{country.flag}</div>
                      <div>
                        <h3 className="text-3xl font-black text-gray-900">{country.countryName}</h3>
                        <p className="text-emerald-600 font-medium">{country.services.length} services available</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Starting from</div>
                      <div className="text-3xl font-black text-emerald-600">
                        ${Math.min(...country.services.map(s => s.price)).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Services Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {country.services
                      .filter(service => selectedService === 'all' || service.service === selectedService)
                      .map((service) => (
                      <div 
                        key={service.service}
                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                          service.popular 
                            ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50' 
                            : 'border-gray-200 bg-white hover:border-emerald-300'
                        }`}
                      >
                        {service.popular && (
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                            POPULAR
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="text-2xl">{service.icon}</div>
                          <div>
                            <h4 className="font-bold text-gray-900">{service.name}</h4>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-black text-emerald-600">
                            ${service.price.toFixed(2)}
                          </span>
                          <Button 
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs px-4"
                          >
                            <Smartphone className="w-3 h-3 mr-1" />
                            Get Number
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              How Our <span className="text-emerald-600">Pricing</span> Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Fair, transparent pricing with no hidden fees or commitments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-2 border-emerald-200 shadow-xl bg-gradient-to-br from-emerald-50 to-green-50">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Pay Only for Success</h3>
                <p className="text-gray-600 leading-relaxed">
                  You're only charged when you successfully receive an SMS code. No code, no charge.
                </p>
              </div>
            </Card>

            <Card className="border-2 border-amber-200 shadow-xl bg-gradient-to-br from-amber-50 to-yellow-50">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Instant Refunds</h3>
                <p className="text-gray-600 leading-relaxed">
                  If you don't receive your SMS within 20 minutes, get an automatic refund to try again.
                </p>
              </div>
            </Card>

            <Card className="border-2 border-green-200 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Global Coverage</h3>
                <p className="text-gray-600 leading-relaxed">
                  Access virtual numbers from 150+ countries with competitive rates worldwide.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-20 bg-gradient-to-br from-emerald-50 to-amber-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Pricing <span className="text-emerald-600">Questions?</span>
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about our transparent pricing model
            </p>
          </div>

          <div className="space-y-6">
            <Card className="border-2 border-white/50 bg-white/70 backdrop-blur-sm shadow-xl">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What happens if I don't receive an SMS?
                </h3>
                <p className="text-gray-600">
                  You get a full refund automatically if no SMS is received within 20 minutes. You can then try a different number or service at no additional cost.
                </p>
              </div>
            </Card>

            <Card className="border-2 border-white/50 bg-white/70 backdrop-blur-sm shadow-xl">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Are there any hidden fees?
                </h3>
                <p className="text-gray-600">
                  No hidden fees, subscriptions, or commitments. The price you see is exactly what you pay for a successful SMS reception.
                </p>
              </div>
            </Card>

            <Card className="border-2 border-white/50 bg-white/70 backdrop-blur-sm shadow-xl">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How do I add funds to my account?
                </h3>
                <p className="text-gray-600">
                  You can add funds via PaymentPoint (Nigerian bank transfer), Plisio (cryptocurrency), or manual payment methods. Minimum deposit is $2 or ₦500.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-br from-gray-900 via-emerald-900 to-green-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-black text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-emerald-200 mb-8">
            Join thousands of satisfied customers using InstantNums
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button 
                size="xl" 
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-xl"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/api-docs">
              <Button 
                variant="outline" 
                size="xl" 
                className="w-full sm:w-auto border-2 border-white/30 text-white hover:bg-white/10"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                View API Docs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PricingPage;
