import React, { useState } from 'react';
import { 
  Code, 
  Copy, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Book,
  Terminal,
  Key,
  Zap,
  Shield,
  Globe,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Settings,
  Smartphone,
  Send
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export function ApiPage() {
  const [apiKey, setApiKey] = useState('ik_live_1234567890abcdef...');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState('getBalance');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const endpoints = [
    {
      id: 'getBalance',
      name: 'Get Balance',
      method: 'GET',
      endpoint: '/api/v1/balance',
      description: 'Retrieve your current account balance in USD and NGN',
      example: `curl -X GET "https://api.instantnums.com/v1/balance" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
      response: `{
  "status": "success",
  "data": {
    "usd": 25.50,
    "ngn": 40800.00,
    "currency": "USD"
  }
}`
    },
    {
      id: 'getPricing',
      name: 'Get Pricing',
      method: 'GET', 
      endpoint: '/api/v1/pricing',
      description: 'Get current pricing for all countries and services',
      example: `curl -X GET "https://api.instantnums.com/v1/pricing" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: `{
  "status": "success",
  "data": {
    "countries": {
      "US": {
        "telegram": 0.50,
        "whatsapp": 0.70,
        "instagram": 0.45
      }
    }
  }
}`
    },
    {
      id: 'rentNumber',
      name: 'Rent Number',
      method: 'POST',
      endpoint: '/api/v1/numbers/rent',
      description: 'Rent a virtual number for SMS verification',
      example: `curl -X POST "https://api.instantnums.com/v1/numbers/rent" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "service": "telegram",
    "country": "US",
    "maxPrice": 1.00
  }'`,
      response: `{
  "status": "success",
  "data": {
    "id": "rental_123456",
    "number": "+1234567890",
    "service": "telegram",
    "country": "US",
    "cost": 0.50,
    "expiresAt": "2024-01-15T10:30:00Z"
  }
}`
    },
    {
      id: 'getSms',
      name: 'Get SMS',
      method: 'GET',
      endpoint: '/api/v1/numbers/{id}/sms',
      description: 'Retrieve SMS messages for a rented number',
      example: `curl -X GET "https://api.instantnums.com/v1/numbers/rental_123456/sms" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: `{
  "status": "success",
  "data": {
    "messages": [
      {
        "id": "msg_789",
        "from": "12345",
        "text": "Your verification code is: 123456",
        "receivedAt": "2024-01-15T10:25:00Z"
      }
    ]
  }
}`
    }
  ];

  const selectedEndpointData = endpoints.find(e => e.id === selectedEndpoint);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-amber-50 p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">
              InstantNums
            </span>{' '}
            API Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Manage your API integration and test endpoints
          </p>
        </div>

        {/* API Key Management */}
        <Card className="border-2 border-emerald-200 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
              <Key className="w-6 h-6 text-emerald-600 mr-3" />
              API Key Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-emerald-800">Your API Key</h3>
                  <p className="text-emerald-600">Use this key to authenticate your API requests</p>
                </div>
                <Button
                  onClick={() => setShowApiKey(!showApiKey)}
                  variant="outline"
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              
              <div className="flex items-center space-x-3">
                <Input
                  value={showApiKey ? apiKey : '•'.repeat(32)}
                  readOnly
                  className="font-mono text-sm bg-white/50"
                />
                <Button
                  onClick={() => copyToClipboard(apiKey)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="outline" className="border-gray-300">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-green-50 border border-green-200">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-green-700">Active</div>
                  <div className="text-green-600 text-sm">Status</div>
                </CardContent>
              </Card>
              
              <Card className="bg-amber-50 border border-amber-200">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-amber-700">8,450</div>
                  <div className="text-amber-600 text-sm">Requests Today</div>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-50 border border-blue-200">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-blue-700">91,550</div>
                  <div className="text-blue-600 text-sm">Remaining</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* API Documentation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Endpoints List */}
          <Card className="border-2 border-amber-200 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                <Terminal className="w-6 h-6 text-amber-600 mr-3" />
                API Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {endpoints.map((endpoint) => (
                  <button
                    key={endpoint.id}
                    onClick={() => setSelectedEndpoint(endpoint.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                      selectedEndpoint === endpoint.id
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg transform scale-[1.02]'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                          endpoint.method === 'GET' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-blue-500 text-white'
                        }`}>
                          {endpoint.method}
                        </span>
                        <span className="font-bold">{endpoint.name}</span>
                      </div>
                      {endpoint.id === 'rentNumber' && (
                        <Smartphone className="w-4 h-4" />
                      )}
                      {endpoint.id === 'getSms' && (
                        <Send className="w-4 h-4" />
                      )}
                    </div>
                    <p className={`text-sm ${
                      selectedEndpoint === endpoint.id ? 'text-yellow-100' : 'text-gray-600'
                    }`}>
                      {endpoint.description}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Endpoint Details */}
          <Card className="border-2 border-green-200 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                <Code className="w-6 h-6 text-green-600 mr-3" />
                {selectedEndpointData?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedEndpointData && (
                <>
                  <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-xl border border-green-200">
                    <span className={`px-3 py-1 text-sm font-bold rounded-lg ${
                      selectedEndpointData.method === 'GET' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      {selectedEndpointData.method}
                    </span>
                    <code className="text-green-700 font-mono font-bold">
                      {selectedEndpointData.endpoint}
                    </code>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-600">{selectedEndpointData.description}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-bold text-gray-900">Example Request</h4>
                      <Button
                        onClick={() => copyToClipboard(selectedEndpointData.example)}
                        variant="outline"
                        size="sm"
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <Card className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto">
                      <pre className="font-mono text-sm whitespace-pre-wrap">
                        <code>{selectedEndpointData.example}</code>
                      </pre>
                    </Card>
                  </div>

                  {selectedEndpointData.response && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-bold text-gray-900">Example Response</h4>
                        <Button
                          onClick={() => copyToClipboard(selectedEndpointData.response)}
                          variant="outline"
                          size="sm"
                          className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <Card className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto">
                        <pre className="font-mono text-sm">
                          <code>{selectedEndpointData.response}</code>
                        </pre>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card className="border-2 border-blue-200 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
              <Book className="w-6 h-6 text-blue-600 mr-3" />
              Documentation & Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border border-emerald-200 hover:border-emerald-300 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Book className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Full Documentation</h3>
                  <p className="text-gray-600 text-sm mb-4">Complete API reference with examples</p>
                  <Button 
                    variant="outline"
                    className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Docs
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-amber-200 hover:border-amber-300 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Rate Limits</h3>
                  <p className="text-gray-600 text-sm mb-4">100 requests/min, 50k monthly</p>
                  <Button 
                    variant="outline"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-green-200 hover:border-green-300 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Webhooks</h3>
                  <p className="text-gray-600 text-sm mb-4">Real-time SMS notifications</p>
                  <Button 
                    variant="outline"
                    className="w-full border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ApiPage;
