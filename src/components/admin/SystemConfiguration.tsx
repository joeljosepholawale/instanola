import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Server, 
  Database, 
  Mail, 
  Key,
  Globe,
  Shield,
  AlertTriangle,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  TestTube,
  CheckCircle,
  XCircle,
  MessageSquare,
  Smartphone
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { EmailConfigModal } from './EmailConfigModal';
import { AnnouncementManager } from './AnnouncementManager';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { APISecurityService } from '../../services/apiSecurity';

interface SystemConfig {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxUsersPerIP: number;
  sessionTimeout: number;
  apiRateLimit: number;
  webhookRetries: number;
  emailProvider: string;
  smsProvider: string;
  paymentProviders: string[];
  defaultCurrency: string;
  minWalletBalance: number;
  maxWalletBalance: number;
  autoRefundEnabled: boolean;
  debugMode: boolean;
}

export function SystemConfiguration() {
  const { success, error } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [config, setConfig] = useState<SystemConfig>({
    maintenanceMode: false,
    registrationEnabled: true,
    maxUsersPerIP: 5,
    sessionTimeout: 24,
    apiRateLimit: 100,
    webhookRetries: 3,
    emailProvider: 'smtp',
    smsProvider: 'daisysms',
    paymentProviders: ['paymentpoint', 'nowpayments'],
    defaultCurrency: 'USD',
    minWalletBalance: 0,
    maxWalletBalance: 10000,
    autoRefundEnabled: true,
    debugMode: false
  });

  const [pricingConfig, setPricingConfig] = useState({
    markupPercentage: 30,
    minimumPrice: 0.10,
    maximumPrice: 50.00
  });

  const [apiKeys, setApiKeys] = useState({
    daisySMS: '',
    paymentPoint: '',
    nowPayments: '',
    sendGrid: '',
    mailgun: ''
  });

  const [systemStatus, setSystemStatus] = useState({
    database: 'connected',
    email: 'configured',
    payments: 'active',
    sms: 'active'
  });

  useEffect(() => {
    loadSystemConfig();
    loadAPIKeys();
    loadPricingConfig();
    checkSystemStatus();
  }, []);

  const loadSystemConfig = async () => {
    try {
      setLoading(true);
      const configDoc = await getDoc(doc(db, 'config', 'system'));
      if (configDoc.exists()) {
        const data = configDoc.data();
        setConfig({
          maintenanceMode: data.maintenanceMode || false,
          registrationEnabled: data.registrationEnabled ?? true,
          maxUsersPerIP: data.maxUsersPerIP || 5,
          sessionTimeout: data.sessionTimeout || 24,
          apiRateLimit: data.apiRateLimit || 100,
          webhookRetries: data.webhookRetries || 3,
          emailProvider: data.emailProvider || 'smtp',
          smsProvider: data.smsProvider || 'daisysms',
          paymentProviders: data.paymentProviders || ['paymentpoint', 'nowpayments'],
          defaultCurrency: data.defaultCurrency || 'USD',
          minWalletBalance: data.minWalletBalance || 0,
          maxWalletBalance: data.maxWalletBalance || 10000,
          autoRefundEnabled: data.autoRefundEnabled ?? true,
          debugMode: data.debugMode || false
        });
      }
    } catch (err) {
      console.error('Error loading system config:', err);
      error('Load Failed', 'Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadPricingConfig = async () => {
    try {
      const pricingDoc = await getDoc(doc(db, 'config', 'pricing'));
      if (pricingDoc.exists()) {
        const data = pricingDoc.data();
        setPricingConfig({
          markupPercentage: data.markupPercentage || 30,
          minimumPrice: data.minimumPrice || 0.10,
          maximumPrice: data.maximumPrice || 50.00
        });
      }
    } catch (err) {
      console.error('Error loading pricing config:', err);
    }
  };

  const loadAPIKeys = async () => {
    try {
      const keysDoc = await getDoc(doc(db, 'config', 'api_keys'));
      if (keysDoc.exists()) {
        const data = keysDoc.data();
        setApiKeys({
          daisySMS: data.daisySMS || '',
          paymentPoint: data.paymentPoint || '',
          nowPayments: data.nowPayments || '',
          sendGrid: data.sendGrid || '',
          mailgun: data.mailgun || ''
        });
      }
    } catch (err) {
      console.error('Error loading API keys:', err);
    }
  };

  const checkSystemStatus = async () => {
    try {
      // Check database connection
      await getDoc(doc(db, 'config', 'system'));
      
      // Check email configuration
      const emailDoc = await getDoc(doc(db, 'config', 'email'));
      const emailConfigured = emailDoc.exists() && emailDoc.data()?.enabled;
      
      // Check payment providers
      const paymentDoc = await getDoc(doc(db, 'config', 'payments'));
      const paymentsActive = paymentDoc.exists();
      
      // Check SMS provider
      const smsDoc = await getDoc(doc(db, 'config', 'daisysms'));
      const smsActive = smsDoc.exists() && smsDoc.data()?.apiKey;
      
      setSystemStatus({
        database: 'connected',
        email: emailConfigured ? 'configured' : 'not_configured',
        payments: paymentsActive ? 'active' : 'not_configured',
        sms: smsActive ? 'active' : 'not_configured'
      });
    } catch (err) {
      console.error('Error checking system status:', err);
      setSystemStatus({
        database: 'error',
        email: 'error',
        payments: 'error',
        sms: 'error'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'configured':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'not_configured':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'configured':
      case 'active':
        return 'text-green-600';
      case 'not_configured':
        return 'text-yellow-600';
      default:
        return 'text-red-600';
    }
  };

  const saveSystemConfig = async () => {
    try {
      setSaving(true);
      
      await setDoc(doc(db, 'config', 'system'), {
        ...config,
        updatedAt: new Date()
      });
      
      success('Configuration Saved', 'System configuration has been updated');
    } catch (err) {
      console.error('Error saving system config:', err);
      error('Save Failed', 'Failed to save system configuration');
    } finally {
      setSaving(false);
    }
  };

  const savePricingConfig = async () => {
    try {
      setSaving(true);
      
      // Validate markup percentage range
      if (pricingConfig.markupPercentage < 0 || pricingConfig.markupPercentage > 100) {
        error('Invalid Markup', 'Markup percentage must be between 0% and 100%');
        return;
      }
      
      // Validate minimum price
      if (pricingConfig.minimumPrice < 0.01 || pricingConfig.minimumPrice > 10) {
        error('Invalid Minimum Price', 'Minimum price must be between $0.01 and $10.00');
        return;
      }
      
      // Validate maximum price
      if (pricingConfig.maximumPrice < pricingConfig.minimumPrice || pricingConfig.maximumPrice > 100) {
        error('Invalid Maximum Price', 'Maximum price must be greater than minimum and less than $100.00');
        return;
      }
      
      await setDoc(doc(db, 'config', 'pricing'), {
        ...pricingConfig,
        updatedBy: user?.id,
        updatedAt: new Date()
      });
      
      success('Pricing Updated', 'Pricing configuration has been updated');
      
      // Reload the config to confirm it was saved
      await loadPricingConfig();
    } catch (err) {
      console.error('Error saving pricing config:', err);
      error('Save Failed', 'Failed to save pricing configuration');
    } finally {
      setSaving(false);
    }
  };

  const saveAPIKeys = async () => {
    try {
      setSaving(true);
      
      // Validate and encrypt API keys before storing
      const secureKeys: any = {};
      
      for (const [provider, key] of Object.entries(apiKeys)) {
        if (key && key.trim()) {
          if (!APISecurityService.validateApiKey(key, provider)) {
            error('Invalid API Key', `${provider} API key format is invalid`);
            return;
          }
          secureKeys[provider] = APISecurityService.encryptData(key);
        }
      }
      
      await setDoc(doc(db, 'config', 'api_keys'), {
        ...secureKeys,
        encrypted: true,
        updatedAt: new Date(),
        updatedBy: 'admin'
      });
      
      success('API Keys Saved', 'API keys have been updated');
    } catch (err) {
      console.error('Error saving API keys:', err);
      error('Save Failed', 'Failed to save API keys');
    } finally {
      setSaving(false);
    }
  };

  const testAPIKey = async (provider: string, apiKey: string) => {
    try {
      if (!APISecurityService.validateApiKey(apiKey, provider)) {
        error('Invalid Format', `${provider} API key format is invalid`);
        return;
      }
      
      // Test API key based on provider
      switch (provider) {
        case 'daisySMS':
          // Test DaisySMS API key
          const response = await fetch('/api/stubs/handler_api.php?action=getBalance&api_key=' + apiKey);
          const result = await response.text();
          if (result.startsWith('ACCESS_BALANCE:')) {
            success('API Key Valid', 'DaisySMS API key is working correctly');
          } else {
            error('API Key Invalid', 'DaisySMS API key is not valid');
          }
          break;
        default:
          success('Test Skipped', `API key testing for ${provider} is not implemented yet`);
      }
    } catch (err) {
      console.error(`Error testing ${provider} API key:`, err);
      error('Test Failed', `Failed to test ${provider} API key`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Configuration</h2>
          <p className="text-gray-600">Configure system settings and integrations</p>
        </div>
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <Button variant="outline" onClick={checkSystemStatus}>
            <RefreshCw className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Check Status</span>
            <span className="sm:hidden">Status</span>
          </Button>
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="w-5 h-5" />
            <span>System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Database</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus.database)}
                <span className={`text-sm font-medium capitalize ${getStatusColor(systemStatus.database)}`}>
                  {systemStatus.database}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Email</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus.email)}
                <span className={`text-sm font-medium capitalize ${getStatusColor(systemStatus.email)}`}>
                  {systemStatus.email.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Payments</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus.payments)}
                <span className={`text-sm font-medium capitalize ${getStatusColor(systemStatus.payments)}`}>
                  {systemStatus.payments.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">SMS</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus.sms)}
                <span className={`text-sm font-medium capitalize ${getStatusColor(systemStatus.sms)}`}>
                  {systemStatus.sms}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>General Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* System Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Maintenance Mode</h4>
                    <p className="text-sm text-gray-600">Disable user access for maintenance</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.maintenanceMode}
                    onChange={(e) => setConfig(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">User Registration</h4>
                    <p className="text-sm text-gray-600">Allow new user registrations</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.registrationEnabled}
                    onChange={(e) => setConfig(prev => ({ ...prev, registrationEnabled: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Auto Refunds</h4>
                    <p className="text-sm text-gray-600">Automatically process failed payment refunds</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.autoRefundEnabled}
                    onChange={(e) => setConfig(prev => ({ ...prev, autoRefundEnabled: e.target.checked }))}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Debug Mode</h4>
                    <p className="text-sm text-gray-600">Enable detailed logging and debugging</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.debugMode}
                    onChange={(e) => setConfig(prev => ({ ...prev, debugMode: e.target.checked }))}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                </div>
              </div>

              <div className="space-y-4 order-first lg:order-last">
                <Input
                  label="Max Users per IP"
                  type="number"
                  value={config.maxUsersPerIP}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxUsersPerIP: parseInt(e.target.value) || 0 }))}
                  min="1"
                  max="50"
                />

                <Input
                  label="Session Timeout (hours)"
                  type="number"
                  value={config.sessionTimeout}
                  onChange={(e) => setConfig(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 0 }))}
                  min="1"
                  max="168"
                />

                <Input
                  label="API Rate Limit (per minute)"
                  type="number"
                  value={config.apiRateLimit}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiRateLimit: parseInt(e.target.value) || 0 }))}
                  min="10"
                  max="1000"
                />

                <Input
                  label="Webhook Retries"
                  type="number"
                  value={config.webhookRetries}
                  onChange={(e) => setConfig(prev => ({ ...prev, webhookRetries: parseInt(e.target.value) || 0 }))}
                  min="0"
                  max="10"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <Button onClick={saveSystemConfig} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5" />
              <span>API Keys</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowApiKeys(!showApiKeys)}
            >
              {showApiKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DaisySMS API Key
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    type={showApiKeys ? 'text' : 'password'}
                    value={apiKeys.daisySMS}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, daisySMS: e.target.value }))}
                    placeholder="Enter DaisySMS API key"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testAPIKey('daisySMS', apiKeys.daisySMS)}
                  >
                    <TestTube className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PaymentPoint API Key
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    type={showApiKeys ? 'text' : 'password'}
                    value={apiKeys.paymentPoint}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, paymentPoint: e.target.value }))}
                    placeholder="Enter PaymentPoint API key"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testAPIKey('paymentPoint', apiKeys.paymentPoint)}
                  >
                    <TestTube className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NowPayments API Key
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    type={showApiKeys ? 'text' : 'password'}
                    value={apiKeys.nowPayments}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, nowPayments: e.target.value }))}
                    placeholder="Enter NowPayments API key"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testAPIKey('nowPayments', apiKeys.nowPayments)}
                  >
                    <TestTube className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SendGrid API Key
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    type={showApiKeys ? 'text' : 'password'}
                    value={apiKeys.sendGrid}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, sendGrid: e.target.value }))}
                    placeholder="Enter SendGrid API key"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testAPIKey('sendGrid', apiKeys.sendGrid)}
                  >
                    <TestTube className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button onClick={saveAPIKeys} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save API Keys'}
              </Button>
              <Button variant="outline" onClick={() => setShowEmailConfig(true)}>
                <Mail className="w-4 h-4 mr-2" />
                Email Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Service Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Pricing Configuration */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-4">Pricing Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Markup Percentage (%)"
                  type="number"
                  value={pricingConfig.markupPercentage}
                  onChange={(e) => setPricingConfig(prev => ({ 
                    ...prev, 
                    markupPercentage: parseFloat(e.target.value) || 0 
                  }))}
                  min="0"
                  max="100"
                  step="1"
                />
                <Input
                  label="Minimum Price ($)"
                  type="number"
                  value={pricingConfig.minimumPrice}
                  onChange={(e) => setPricingConfig(prev => ({ 
                    ...prev, 
                    minimumPrice: parseFloat(e.target.value) || 0 
                  }))}
                  min="0.01"
                  step="0.01"
                />
                <Input
                  label="Maximum Price ($)"
                  type="number"
                  value={pricingConfig.maximumPrice}
                  onChange={(e) => setPricingConfig(prev => ({ 
                    ...prev, 
                    maximumPrice: parseFloat(e.target.value) || 0 
                  }))}
                  min="1"
                  step="0.01"
                />
              </div>
              <div className="mt-4 text-sm text-blue-800">
                <p>• Current markup: {pricingConfig.markupPercentage}% above DaisySMS cost</p>
                <p>• Example: DaisySMS $0.25 → User pays ${(0.25 * (1 + pricingConfig.markupPercentage / 100)).toFixed(2)}</p>
                <p>• This affects all new number rentals immediately</p>
              </div>
              <Button onClick={savePricingConfig} disabled={saving} className="mt-4">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Pricing'}
              </Button>
            </div>

            {/* Provider Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Select
                label="Email Provider"
                value={config.emailProvider}
                onChange={(e) => setConfig(prev => ({ ...prev, emailProvider: e.target.value }))}
              >
                <option value="smtp">SMTP Server</option>
                <option value="sendgrid">SendGrid</option>
                <option value="mailgun">Mailgun</option>
              </Select>
            </div>

            <div>
              <Select
                label="SMS Provider"
                value={config.smsProvider}
                onChange={(e) => setConfig(prev => ({ ...prev, smsProvider: e.target.value }))}
              >
                <option value="daisysms">DaisySMS</option>
                <option value="sms_activate">SMS-Activate</option>
                <option value="5sim">5SIM</option>
              </Select>
            </div>

            <div>
              <Select
                label="Default Currency"
                value={config.defaultCurrency}
                onChange={(e) => setConfig(prev => ({ ...prev, defaultCurrency: e.target.value }))}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="NGN">NGN</option>
              </Select>
            </div>

            <div>
              <Input
                label="Max Wallet Balance"
                type="number"
                value={config.maxWalletBalance}
                onChange={(e) => setConfig(prev => ({ ...prev, maxWalletBalance: parseInt(e.target.value) || 0 }))}
                min="100"
                max="100000"
              />
            </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcement Management */}
      <AnnouncementManager />

      {/* Email Configuration Modal */}
      <EmailConfigModal
        isOpen={showEmailConfig}
        onClose={() => setShowEmailConfig(false)}
      />
    </div>
  );
}