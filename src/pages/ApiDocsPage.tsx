import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { 
  Book, 
  Code, 
  Key, 
  Send, 
  Smartphone, 
  CreditCard, 
  Shield, 
  Globe,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Zap,
  CheckCircle,
  Terminal,
  Layers,
  Settings
} from 'lucide-react';

const ApiDocsPage = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const sections = [
    { id: 'overview', title: 'Overview', icon: Book },
    { id: 'quickstart', title: 'Quick Start', icon: Zap },
    { id: 'authentication', title: 'Authentication', icon: Key },
    { id: 'numbers', title: 'Number Rental', icon: Smartphone },
    { id: 'sms', title: 'SMS Management', icon: Send },
    { id: 'payments', title: 'Payments', icon: CreditCard },
    { id: 'webhooks', title: 'Webhooks', icon: Globe },
    { id: 'errors', title: 'Error Codes', icon: Shield },
  ];

  const endpoints = {
    numbers: [
      {
        method: 'POST',
        path: '/api/numbers/rent',
        title: 'Rent a Number',
        description: 'Rent a virtual number for SMS verification',
        params: {
          service: 'string - Service code (e.g., "tg", "wa", "ig")',
          country: 'string - Country code (e.g., "0" for any, "1" for USA)',
          maxPrice: 'number - Maximum price willing to pay (optional)',
          duration: 'string - Rental duration (optional, e.g., "30 minutes")',
        },
        response: {
          id: 'string - Rental ID',
          number: 'string - Phone number',
          service: 'string - Service code',
          country: 'string - Country code',
          cost: 'number - Cost in USD',
          expiresAt: 'string - Expiration timestamp'
        }
      },
      {
        method: 'GET',
        path: '/api/numbers/{id}/sms',
        title: 'Get SMS Messages',
        description: 'Retrieve SMS messages for a rented number',
        params: {
          id: 'string - Rental ID'
        },
        response: {
          messages: 'array - Array of SMS messages',
          count: 'number - Total message count'
        }
      }
    ]
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gray-900 via-emerald-900 to-green-900 text-white rounded-3xl p-8 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
              Build with{' '}
              <span className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                InstantNums
              </span>{' '}
              API
            </h2>
            <p className="text-xl text-emerald-200 mb-8 leading-relaxed">
              Integrate virtual phone numbers into your applications with our powerful, developer-friendly REST API.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => setActiveSection('quickstart')}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-xl"
                size="lg"
              >
                <Zap className="w-5 h-5 mr-2" />
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Link to="/signup">
                <Button 
                  variant="outline" 
                  className="border-2 border-white/30 text-white hover:bg-white/10"
                  size="lg"
                >
                  Create Account
                  <ExternalLink className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
              <div className="text-green-400 mb-2">// Quick Example</div>
              <div className="text-blue-300">const</div>
              <div className="text-white"> response = </div>
              <div className="text-yellow-300">await</div>
              <div className="text-blue-300"> fetch</div>
              <div className="text-white">(</div>
              <div className="text-amber-300">'https://api.instantnums.com/v1/numbers/rent'</div>
              <div className="text-white">, {`{`}</div>
              <div className="ml-4 text-white">method: </div>
              <div className="text-amber-300">'POST'</div>
              <div className="text-white">,</div>
              <div className="ml-4 text-white">headers: {`{`}</div>
              <div className="ml-8 text-white">Authorization: </div>
              <div className="text-amber-300">'Bearer YOUR_API_KEY'</div>
              <div className="ml-4 text-white">{`}`}</div>
              <div className="text-white">{`});`}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-emerald-200 shadow-xl bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Lightning Fast</h3>
            <p className="text-gray-600">Get virtual numbers instantly with our optimized API endpoints.</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200 shadow-xl bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Global Coverage</h3>
            <p className="text-gray-600">Access virtual numbers from 150+ countries worldwide.</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise Security</h3>
            <p className="text-gray-600">Bank-level security with API key authentication and rate limiting.</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-black text-gray-900 mb-2">Trusted by Developers</h3>
          <p className="text-gray-600 text-lg">Join thousands of developers building with InstantNums API</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-4xl font-black text-emerald-600">99.9%</div>
            <div className="text-gray-600 font-medium">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-amber-600">&lt;100ms</div>
            <div className="text-gray-600 font-medium">Avg Response</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-green-600">150+</div>
            <div className="text-gray-600 font-medium">Countries</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-blue-600">24/7</div>
            <div className="text-gray-600 font-medium">Support</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuickStart = () => (
    <div className="space-y-8">
      <Card className="border-0 bg-gradient-to-br from-emerald-50 to-green-50 shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-black text-gray-900 flex items-center">
            <Zap className="w-8 h-8 text-emerald-600 mr-3" />
            Quick Start Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Step 1 */}
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Get Your API Key</h3>
              <p className="text-gray-600 mb-4">Create an account and generate your API key from the dashboard.</p>
              <Card className="bg-gray-900 text-white p-4 rounded-lg">
                <div className="font-mono text-sm">
                  <div className="text-green-400">// Your API key will look like this</div>
                  <div className="text-amber-300">const API_KEY = 'ik_live_abcd1234...';</div>
                </div>
              </Card>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Make Your First Request</h3>
              <p className="text-gray-600 mb-4">Rent a virtual number for SMS verification.</p>
              <Card className="bg-gray-900 text-white p-4 rounded-lg">
                <div className="font-mono text-sm space-y-2">
                  <div className="text-blue-300">const</div>
                  <div className="text-white"> response = </div>
                  <div className="text-yellow-300">await</div>
                  <div className="text-blue-300"> fetch</div>
                  <div className="text-white">(</div>
                  <div className="text-amber-300">'https://api.instantnums.com/v1/numbers/rent'</div>
                  <div className="text-white">, {`{`}</div>
                  <div className="ml-4 text-white">method: </div>
                  <div className="text-amber-300">'POST'</div>
                  <div className="text-white">,</div>
                  <div className="ml-4 text-white">headers: {`{`}</div>
                  <div className="ml-8 text-white">'Authorization': </div>
                  <div className="text-amber-300">`Bearer ${'${API_KEY}'}`</div>
                  <div className="text-white">,</div>
                  <div className="ml-8 text-white">'Content-Type': </div>
                  <div className="text-amber-300">'application/json'</div>
                  <div className="ml-4 text-white">{`}`},</div>
                  <div className="ml-4 text-white">body: </div>
                  <div className="text-blue-300">JSON</div>
                  <div className="text-white">.stringify({`{`}</div>
                  <div className="ml-8 text-white">service: </div>
                  <div className="text-amber-300">'telegram'</div>
                  <div className="text-white">,</div>
                  <div className="ml-8 text-white">country: </div>
                  <div className="text-amber-300">'US'</div>
                  <div className="ml-4 text-white">{`})`}</div>
                  <div className="text-white">{`});`}</div>
                </div>
              </Card>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Receive SMS Messages</h3>
              <p className="text-gray-600 mb-4">Check for incoming SMS messages on your rented number.</p>
              <Card className="bg-gray-900 text-white p-4 rounded-lg">
                <div className="font-mono text-sm space-y-2">
                  <div className="text-green-400">// Response will contain the rented number</div>
                  <div className="text-white">{`{`}</div>
                  <div className="ml-4 text-white">id: </div>
                  <div className="text-amber-300">'rental_123'</div>
                  <div className="text-white">,</div>
                  <div className="ml-4 text-white">number: </div>
                  <div className="text-amber-300">'+1234567890'</div>
                  <div className="text-white">,</div>
                  <div className="ml-4 text-white">service: </div>
                  <div className="text-amber-300">'telegram'</div>
                  <div className="text-white">,</div>
                  <div className="ml-4 text-white">cost: </div>
                  <div className="text-yellow-300">0.50</div>
                  <div className="text-white">{`}`}</div>
                </div>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAuthentication = () => (
    <div className="space-y-8">
      <Card className="border-2 border-emerald-200 shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-black text-gray-900 flex items-center">
            <Key className="w-8 h-8 text-emerald-600 mr-3" />
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <h3 className="text-xl font-bold text-emerald-800 mb-3 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              API Key Authentication
            </h3>
            <p className="text-emerald-700 mb-4">
              All API requests must be authenticated using your API key in the Authorization header.
            </p>
            <Card className="bg-gray-900 text-white p-4 rounded-lg">
              <div className="font-mono text-sm">
                <div className="text-white">Authorization: Bearer YOUR_API_KEY</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-green-50 border border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center text-lg">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-green-700">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-1 flex-shrink-0" />
                    Keep your API key secure and never expose it in client-side code
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-1 flex-shrink-0" />
                    Use environment variables to store your API key
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-1 flex-shrink-0" />
                    Regenerate your API key if compromised
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-800 flex items-center text-lg">
                  <Settings className="w-5 h-5 mr-2" />
                  Rate Limits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-amber-700">
                  <div className="flex justify-between items-center">
                    <span>Requests per minute:</span>
                    <span className="font-bold">100</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Concurrent requests:</span>
                    <span className="font-bold">10</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Monthly quota:</span>
                    <span className="font-bold">50,000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'quickstart':
        return renderQuickStart();
      case 'authentication':
        return renderAuthentication();
      case 'numbers':
        return <div className="text-center py-12"><p className="text-gray-600">Number Rental documentation coming soon...</p></div>;
      case 'sms':
        return <div className="text-center py-12"><p className="text-gray-600">SMS Management documentation coming soon...</p></div>;
      case 'payments':
        return <div className="text-center py-12"><p className="text-gray-600">Payments documentation coming soon...</p></div>;
      case 'webhooks':
        return <div className="text-center py-12"><p className="text-gray-600">Webhooks documentation coming soon...</p></div>;
      case 'errors':
        return <div className="text-center py-12"><p className="text-gray-600">Error Codes documentation coming soon...</p></div>;
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-amber-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-emerald-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center space-x-3">
                <Logo className="h-8 w-auto" />
              </Link>
              <div className="hidden sm:block w-px h-8 bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <Code className="w-8 h-8 text-emerald-600" />
                <div>
                  <h1 className="text-2xl font-black text-gray-900">API Documentation</h1>
                  <p className="text-emerald-600 font-medium">InstantNums Developer API</p>
                </div>
              </div>
            </div>
            <Link to="/dashboard">
              <Button className="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 shadow-lg">
                <ExternalLink className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-24">
              <Card className="border-2 border-white/50 bg-white/70 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <Book className="w-5 h-5 mr-2" />
                    Navigation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <nav className="space-y-2">
                    {sections.map((section) => {
                      const IconComponent = section.icon;
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all duration-200 ${
                            activeSection === section.id
                              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg transform scale-[1.02]'
                              : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          <IconComponent className="w-5 h-5 flex-shrink-0" />
                          <span className="font-medium">{section.title}</span>
                          {activeSection === section.id && (
                            <ArrowRight className="w-4 h-4 ml-auto" />
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocsPage;
