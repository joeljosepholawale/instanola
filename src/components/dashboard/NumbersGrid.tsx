import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  MessageSquare, 
  Clock, 
  CreditCard, 
  Filter,
  Search,
  ArrowRight,
  CheckCircle,
  Zap,
  Heart,
  Star
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface NumbersGridProps {
  countries: any[];
  selectedCountry: string;
  selectedService: string;
  onCountryChange: (country: string) => void;
  onServiceChange: (service: string) => void;
  onPurchase: (country: string, service: string) => void;
  loading: boolean;
}

export function NumbersGrid({
  countries,
  selectedCountry,
  selectedService,
  onCountryChange,
  onServiceChange,
  onPurchase,
  loading
}: NumbersGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('popularity');

  const getServiceIcon = (serviceCode: string) => {
    const icons: { [key: string]: JSX.Element } = {
      'tg': <MessageSquare className="w-5 h-5" />,
      'wa': <MessageSquare className="w-5 h-5" />,
      'ig': <Star className="w-5 h-5" />,
      'fb': <Globe className="w-5 h-5" />,
      'tw': <Globe className="w-5 h-5" />,
      'go': <Globe className="w-5 h-5" />,
    };
    return icons[serviceCode] || <MessageSquare className="w-5 h-5" />;
  };

  const getServiceColor = (serviceCode: string) => {
    const colors: { [key: string]: string } = {
      'tg': 'from-blue-500 to-blue-600',
      'wa': 'from-green-500 to-green-600',
      'ig': 'from-pink-500 to-purple-600',
      'fb': 'from-blue-600 to-indigo-700',
      'tw': 'from-sky-400 to-blue-500',
      'go': 'from-red-500 to-red-600',
    };
    return colors[serviceCode] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-green-50 to-yellow-100">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-yellow-400 text-green-900 rounded-full text-sm font-bold mb-6">
              <Zap className="w-4 h-4 mr-2" />
              Get Numbers Instantly
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Choose Your Perfect Number
            </h1>
            <p className="text-xl text-green-100 max-w-3xl mx-auto">
              Premium virtual numbers from trusted providers worldwide. 
              Instant activation with guaranteed SMS delivery.
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border-b border-green-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-green-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
            
            <Select
              value={selectedCountry}
              onChange={(e) => onCountryChange(e.target.value)}
              className="border-green-300 focus:border-green-500 focus:ring-green-500"
            >
              <option value="all">All Countries</option>
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>

            <Select
              value={selectedService}
              onChange={(e) => onServiceChange(e.target.value)}
              className="border-green-300 focus:border-green-500 focus:ring-green-500"
            >
              <option value="all">All Services</option>
              <option value="tg">Telegram</option>
              <option value="wa">WhatsApp</option>
              <option value="ig">Instagram</option>
              <option value="fb">Facebook</option>
            </Select>

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border-green-300 focus:border-green-500 focus:ring-green-500"
            >
              <option value="popularity">Most Popular</option>
              <option value="price">Lowest Price</option>
              <option value="availability">Best Availability</option>
              <option value="speed">Fastest Delivery</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Numbers Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="space-y-4">
                  <div className="h-20 bg-gray-200 rounded-lg"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Featured Services */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">🔥 Popular Choices</h2>
                  <p className="text-gray-600">Most requested by our users</p>
                </div>
                <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
                  View All
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {['tg', 'wa', 'ig', 'fb'].map((service, index) => (
                  <Card 
                    key={service} 
                    className="relative overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300 border-0"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${getServiceColor(service)} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                    <div className="relative p-6 text-center">
                      <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${getServiceColor(service)} flex items-center justify-center text-white shadow-lg`}>
                        {getServiceIcon(service)}
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">
                        {service === 'tg' && 'Telegram'}
                        {service === 'wa' && 'WhatsApp'}
                        {service === 'ig' && 'Instagram'}
                        {service === 'fb' && 'Facebook'}
                      </h3>
                      <div className="text-sm text-gray-600 mb-4">
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Available Now</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-700 mb-1">
                          $0.25
                        </div>
                        <div className="text-xs text-gray-500">
                          ≈ ₦400
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* All Countries Grid */}
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">🌍 All Countries</h2>
                <p className="text-gray-600">Choose from our global network of premium numbers</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {countries.map((country, index) => (
                  <Card 
                    key={country.code}
                    className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white overflow-hidden relative cursor-pointer"
                  >
                    {/* Country Flag Pattern */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-yellow-200 to-transparent opacity-50"></div>
                    
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                          <Globe className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                          Popular
                        </div>
                      </div>

                      <h3 className="font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">
                        {country.name}
                      </h3>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Available Services:</span>
                          <span className="font-medium text-gray-900">8+</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Delivery Speed:</span>
                          <div className="flex items-center">
                            <Zap className="w-3 h-3 text-yellow-500 mr-1" />
                            <span className="font-medium text-gray-900">Instant</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Success Rate:</span>
                          <span className="font-medium text-green-600">99.5%</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Starting from:</span>
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-700">$0.15</div>
                            <div className="text-xs text-gray-500">≈ ₦240</div>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => onPurchase(country.code, 'tg')}
                          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          Select Numbers
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
