import React, { useState, useEffect } from 'react';
import { Shield, User, Key, Mail, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface FirstAdminSetupProps {
  onComplete: () => void;
}

export function FirstAdminSetup({ onComplete }: FirstAdminSetupProps) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [adminData, setAdminData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [systemConfig, setSystemConfig] = useState({
    siteName: 'InstantNums',
    supportEmail: 'support@instantnums.com',
    currency: 'USD',
    timezone: 'UTC'
  });
  const [apiKeys, setApiKeys] = useState({
    daisySMS: '',
    paymentPoint: '',
    nowPayments: '',
    sendGrid: ''
  });
  const [emailConfig, setEmailConfig] = useState({
    provider: 'smtp',
    fromEmail: 'noreply@instantnums.com',
    fromName: 'InstantNums',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: ''
  });

  const handleAdminSetup = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Make current user admin
      await updateDoc(doc(db, 'users', user.id), {
        isAdmin: true,
        adminSetupAt: new Date(),
        updatedAt: new Date()
      });

      // Create admin profile
      await setDoc(doc(db, 'admin_profiles', user.id), {
        userId: user.id,
        name: adminData.name,
        email: adminData.email,
        role: 'super_admin',
        permissions: ['all'],
        createdAt: new Date()
      });

      success('Admin Setup Complete', 'You are now an administrator');
      setStep(2);
    } catch (err) {
      console.error('Error setting up admin:', err);
      error('Setup Failed', 'Failed to setup admin account');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemConfig = async () => {
    try {
      setLoading(true);
      
      await setDoc(doc(db, 'config', 'system'), {
        ...systemConfig,
        setupComplete: false,
        createdAt: new Date(),
        createdBy: user?.id
      });

      success('System Config Saved', 'System configuration saved');
      setStep(3);
    } catch (err) {
      console.error('Error saving system config:', err);
      error('Save Failed', 'Failed to save system configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeysSetup = async () => {
    try {
      setLoading(true);
      
      await setDoc(doc(db, 'config', 'api_keys'), {
        ...apiKeys,
        createdAt: new Date(),
        createdBy: user?.id
      });

      success('API Keys Saved', 'API keys configuration saved');
      setStep(4);
    } catch (err) {
      console.error('Error saving API keys:', err);
      error('Save Failed', 'Failed to save API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSetup = async () => {
    try {
      setLoading(true);
      
      await setDoc(doc(db, 'config', 'email'), {
        ...emailConfig,
        enabled: true,
        createdAt: new Date(),
        createdBy: user?.id
      });

      success('Email Config Saved', 'Email configuration saved');
      setStep(5);
    } catch (err) {
      console.error('Error saving email config:', err);
      error('Save Failed', 'Failed to save email configuration');
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async () => {
    try {
      setLoading(true);
      
      // Mark setup as complete
      await updateDoc(doc(db, 'config', 'system'), {
        setupComplete: true,
        completedAt: new Date(),
        completedBy: user?.id
      });

      // Create initial system stats
      await setDoc(doc(db, 'system', 'profit_tracking'), {
        totalProfit: 0,
        totalDaisySpent: 0,
        totalUserCharged: 0,
        totalRentals: 0,
        totalRefunds: 0,
        createdAt: new Date()
      });

      success('Setup Complete!', 'Admin panel is ready to use');
      onComplete();
    } catch (err) {
      console.error('Error completing setup:', err);
      error('Setup Failed', 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Setup</h1>
          <p className="text-gray-600">Configure your admin panel for the first time</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4, 5].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNum 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step > stepNum ? <CheckCircle className="w-4 h-4" /> : stepNum}
              </div>
              {stepNum < 5 && (
                <div className={`w-12 h-1 mx-2 ${
                  step > stepNum ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-6 sm:p-8">
            {/* Step 1: Admin Account */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <User className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Setup Admin Account</h2>
                  <p className="text-gray-600">Configure your administrator profile</p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Admin Name"
                    value={adminData.name}
                    onChange={(e) => setAdminData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your full name"
                    required
                  />
                  <Input
                    label="Admin Email"
                    type="email"
                    value={adminData.email}
                    onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@yoursite.com"
                    required
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">Admin Privileges</span>
                  </div>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• Full access to all admin features</li>
                    <li>• User management and financial controls</li>
                    <li>• System configuration and monitoring</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleAdminSetup} 
                  disabled={loading || !adminData.name || !adminData.email}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Setting up...' : 'Setup Admin Account'}
                </Button>
              </div>
            )}

            {/* Step 2: System Configuration */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">System Configuration</h2>
                  <p className="text-gray-600">Configure basic system settings</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Site Name"
                    value={systemConfig.siteName}
                    onChange={(e) => setSystemConfig(prev => ({ ...prev, siteName: e.target.value }))}
                    placeholder="InstantNums"
                  />
                  <Input
                    label="Support Email"
                    type="email"
                    value={systemConfig.supportEmail}
                    onChange={(e) => setSystemConfig(prev => ({ ...prev, supportEmail: e.target.value }))}
                    placeholder="support@instantnums.com"
                  />
                  <Select
                    label="Default Currency"
                    value={systemConfig.currency}
                    onChange={(e) => setSystemConfig(prev => ({ ...prev, currency: e.target.value }))}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </Select>
                  <Select
                    label="Timezone"
                    value={systemConfig.timezone}
                    onChange={(e) => setSystemConfig(prev => ({ ...prev, timezone: e.target.value }))}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                  </Select>
                </div>

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleSystemConfig} disabled={loading} className="flex-1">
                    {loading ? 'Saving...' : 'Continue'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: API Keys */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <Key className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">API Configuration</h2>
                  <p className="text-gray-600">Configure third-party service API keys</p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="DaisySMS API Key"
                    type="password"
                    value={apiKeys.daisySMS}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, daisySMS: e.target.value }))}
                    placeholder="Enter DaisySMS API key"
                  />
                  <Input
                    label="PaymentPoint API Key (Optional)"
                    type="password"
                    value={apiKeys.paymentPoint}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, paymentPoint: e.target.value }))}
                    placeholder="Enter PaymentPoint API key"
                  />
                  <Input
                    label="NowPayments API Key (Optional)"
                    type="password"
                    value={apiKeys.nowPayments}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, nowPayments: e.target.value }))}
                    placeholder="Enter NowPayments API key"
                  />
                  <Input
                    label="SendGrid API Key (Optional)"
                    type="password"
                    value={apiKeys.sendGrid}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, sendGrid: e.target.value }))}
                    placeholder="Enter SendGrid API key"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-yellow-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Required</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    DaisySMS API key is required for SMS services. Other keys can be configured later.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={handleApiKeysSetup} 
                    disabled={loading || !apiKeys.daisySMS}
                    className="flex-1"
                  >
                    {loading ? 'Saving...' : 'Continue'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Email Configuration */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Email Configuration</h2>
                  <p className="text-gray-600">Setup email notifications (optional)</p>
                </div>

                <div className="space-y-4">
                  <Select
                    label="Email Provider"
                    value={emailConfig.provider}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, provider: e.target.value }))}
                  >
                    <option value="smtp">SMTP Server</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="mailgun">Mailgun</option>
                  </Select>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="From Email"
                      type="email"
                      value={emailConfig.fromEmail}
                      onChange={(e) => setEmailConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                      placeholder="noreply@yoursite.com"
                    />
                    <Input
                      label="From Name"
                      value={emailConfig.fromName}
                      onChange={(e) => setEmailConfig(prev => ({ ...prev, fromName: e.target.value }))}
                      placeholder="Your Site Name"
                    />
                  </div>

                  {emailConfig.provider === 'smtp' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="SMTP Host"
                        value={emailConfig.smtpHost}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                        placeholder="smtp.gmail.com"
                      />
                      <Input
                        label="SMTP Port"
                        type="number"
                        value={emailConfig.smtpPort.toString()}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))}
                        placeholder="587"
                      />
                      <Input
                        label="SMTP Username"
                        value={emailConfig.smtpUser}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpUser: e.target.value }))}
                        placeholder="your-email@gmail.com"
                      />
                      <Input
                        label="SMTP Password"
                        type="password"
                        value={emailConfig.smtpPass}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpPass: e.target.value }))}
                        placeholder="your-app-password"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Email configuration is optional. You can skip this step and configure it later in the admin panel.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                    Back
                  </Button>
                  <Button variant="outline" onClick={() => setStep(5)} className="flex-1">
                    Skip
                  </Button>
                  <Button onClick={handleEmailSetup} disabled={loading} className="flex-1">
                    {loading ? 'Saving...' : 'Continue'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Complete */}
            {step === 5 && (
              <div className="space-y-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
                  <p className="text-gray-600">Your admin panel is ready to use</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-medium text-green-900 mb-3">What's Next?</h3>
                  <ul className="text-sm text-green-800 space-y-2 text-left">
                    <li>• Monitor user activity and payments</li>
                    <li>• Review and approve manual payments</li>
                    <li>• Configure additional settings as needed</li>
                    <li>• Set up email notifications</li>
                    <li>• Monitor system health and security</li>
                  </ul>
                </div>

                <Button onClick={completeSetup} disabled={loading} size="lg" className="w-full">
                  {loading ? 'Finalizing...' : 'Enter Admin Panel'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}