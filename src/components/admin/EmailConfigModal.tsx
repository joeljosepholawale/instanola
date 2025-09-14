import React, { useState, useEffect } from 'react';
import { X, Mail, Server, Key, Save, TestTube, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../../hooks/useToast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface EmailConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun';
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  apiKey: string;
  domain: string;
  enabled: boolean;
}

export function EmailConfigModal({ isOpen, onClose }: EmailConfigModalProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<EmailConfig>({
    provider: 'smtp',
    fromEmail: 'noreply@proxynumsms.com',
    fromName: 'ProxyNumSMS',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpSecure: false,
    apiKey: '',
    domain: '',
    enabled: false
  });

  useEffect(() => {
    if (isOpen) {
      loadEmailConfig();
    }
  }, [isOpen]);

  const loadEmailConfig = async () => {
    try {
      setLoading(true);
      const configDoc = await getDoc(doc(db, 'config', 'email'));
      if (configDoc.exists()) {
        const data = configDoc.data();
        setConfig({
          provider: data.provider || 'smtp',
          fromEmail: data.fromEmail || 'noreply@proxynumsms.com',
          fromName: data.fromName || 'ProxyNumSMS',
          smtpHost: data.smtpHost || '',
          smtpPort: data.smtpPort || 587,
          smtpUser: data.smtpUser || '',
          smtpPass: data.smtpPass || '',
          smtpSecure: data.smtpSecure || false,
          apiKey: data.apiKey || '',
          domain: data.domain || '',
          enabled: data.enabled || false
        });
      }
    } catch (err) {
      console.error('Error loading email config:', err);
      error('Load Failed', 'Failed to load email configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validate configuration
      if (config.provider === 'smtp') {
        if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
          error('Validation Error', 'SMTP host, username, and password are required');
          return;
        }
      } else if (config.provider === 'sendgrid') {
        if (!config.apiKey) {
          error('Validation Error', 'SendGrid API key is required');
          return;
        }
      } else if (config.provider === 'mailgun') {
        if (!config.apiKey || !config.domain) {
          error('Validation Error', 'Mailgun API key and domain are required');
          return;
        }
      }

      if (!config.fromEmail) {
        error('Validation Error', 'From email address is required');
        return;
      }

      // Save configuration
      await setDoc(doc(db, 'config', 'email'), {
        ...config,
        updatedAt: new Date()
      });

      success('Configuration Saved', 'Email configuration has been saved successfully');
      onClose();
    } catch (err) {
      console.error('Error saving email config:', err);
      error('Save Failed', 'Failed to save email configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setTesting(true);
      
      // Test email by sending a test message
      const testResult = await EmailService.testEmailConfiguration(config);
      
      if (testResult.success) {
        success('Test Email Sent', testResult.message || `Test email sent to ${config.fromEmail}`);
      } else {
        error('Test Failed', testResult.message || 'Failed to send test email');
      }
    } catch (err) {
      console.error('Error testing email:', err);
      error('Test Failed', 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Email Configuration</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Provider Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Email Provider"
                value={config.provider}
                onChange={(e) => setConfig(prev => ({ ...prev, provider: e.target.value as any }))}
              >
                <option value="smtp">SMTP Server</option>
                <option value="sendgrid">SendGrid</option>
                <option value="mailgun">Mailgun</option>
              </Select>

              <div className="flex items-center space-x-2 mt-6">
                <input
                  type="checkbox"
                  id="emailEnabled"
                  checked={config.enabled}
                  onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="emailEnabled" className="text-sm font-medium text-gray-700">
                  Enable Email Notifications
                </label>
              </div>
            </div>

            {/* Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="From Email"
                type="email"
                value={config.fromEmail}
                onChange={(e) => setConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                placeholder="noreply@proxynumsms.com"
                required
              />
              <Input
                label="From Name"
                value={config.fromName}
                onChange={(e) => setConfig(prev => ({ ...prev, fromName: e.target.value }))}
                placeholder="ProxyNumSMS"
                required
              />
            </div>

            {/* Provider-specific settings */}
            {config.provider === 'smtp' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                  <Server className="w-5 h-5" />
                  <span>SMTP Configuration</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="SMTP Host"
                    value={config.smtpHost}
                    onChange={(e) => setConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                    placeholder="smtp.gmail.com"
                    required
                  />
                  <Input
                    label="SMTP Port"
                    type="number"
                    value={config.smtpPort.toString()}
                    onChange={(e) => setConfig(prev => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))}
                    placeholder="587"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="SMTP Username"
                    value={config.smtpUser}
                    onChange={(e) => setConfig(prev => ({ ...prev, smtpUser: e.target.value }))}
                    placeholder="your-email@gmail.com"
                    required
                  />
                  <Input
                    label="SMTP Password"
                    type="password"
                    value={config.smtpPass}
                    onChange={(e) => setConfig(prev => ({ ...prev, smtpPass: e.target.value }))}
                    placeholder="your-app-password"
                    required
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="smtpSecure"
                    checked={config.smtpSecure}
                    onChange={(e) => setConfig(prev => ({ ...prev, smtpSecure: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="smtpSecure" className="text-sm text-gray-700">
                    Use SSL/TLS (recommended for port 465)
                  </label>
                </div>
              </div>
            )}

            {config.provider === 'sendgrid' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                  <Key className="w-5 h-5" />
                  <span>SendGrid Configuration</span>
                </h3>
                
                <Input
                  label="SendGrid API Key"
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="SG.xxxxxxxxxxxxxxxx"
                  required
                />
              </div>
            )}

            {config.provider === 'mailgun' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                  <Key className="w-5 h-5" />
                  <span>Mailgun Configuration</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Mailgun API Key"
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="key-xxxxxxxxxxxxxxxx"
                    required
                  />
                  <Input
                    label="Mailgun Domain"
                    value={config.domain}
                    onChange={(e) => setConfig(prev => ({ ...prev, domain: e.target.value }))}
                    placeholder="mg.yourdomain.com"
                    required
                  />
                </div>
              </div>
            )}

            {/* Configuration Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Configuration Tips</h4>
              <div className="text-sm text-blue-800 space-y-1">
                {config.provider === 'smtp' && (
                  <>
                    <p>• For Gmail: Use app passwords, not your regular password</p>
                    <p>• Common ports: 587 (TLS), 465 (SSL), 25 (unsecured)</p>
                    <p>• Enable "Less secure app access" if using regular SMTP</p>
                  </>
                )}
                {config.provider === 'sendgrid' && (
                  <>
                    <p>• Get your API key from SendGrid dashboard</p>
                    <p>• Verify your sender identity in SendGrid</p>
                    <p>• API key should start with "SG."</p>
                  </>
                )}
                {config.provider === 'mailgun' && (
                  <>
                    <p>• Get API key from Mailgun dashboard</p>
                    <p>• Use your verified domain</p>
                    <p>• Domain should be like "mg.yourdomain.com"</p>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleTestEmail} 
                disabled={testing || !config.enabled}
                variant="outline"
                className="flex-1"
              >
                <TestTube className="w-4 h-4 mr-2" />
                {testing ? 'Testing...' : 'Test Email'}
              </Button>
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Config'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}