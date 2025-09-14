import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Eye, 
  EyeOff,
  Save,
  Mail,
  Phone,
  Globe,
  Key,
  Download,
  Trash2,
  RefreshCw,
  Copy,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { updateProfile, updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

export function SettingsPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    country: 'US'
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    smsNotifications: false
  });

  const [apiData, setApiData] = useState({
    apiKey: '',
    showApiKey: false,
    usage: {
      requestsToday: 0,
      requestsThisMonth: 0,
      lastUsed: null as Date | null
    }
  });

  useEffect(() => {
    loadUserSettings();
  }, [user]);

  const loadUserSettings = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        setProfileData(prev => ({
          ...prev,
          name: userData.name || user.name || '',
          email: userData.email || user.email || '',
          phone: userData.phone || '',
          country: userData.country || 'US'
        }));

        setSecurityData(prev => ({
          ...prev,
          emailNotifications: userData.emailNotifications ?? true,
          smsNotifications: userData.smsNotifications ?? false
        }));

        setApiData(prev => ({
          ...prev,
          apiKey: userData.apiKey || generateApiKey(),
          usage: {
            requestsToday: userData.apiUsage?.requestsToday || 0,
            requestsThisMonth: userData.apiUsage?.requestsThisMonth || 0,
            lastUsed: userData.apiUsage?.lastUsed?.toDate() || null
          }
        }));
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const generateApiKey = () => {
    return 'pk_live_' + Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email)) {
        showError('Invalid Email', 'Please enter a valid email address');
        return;
      }

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: profileData.name
        });

        if (profileData.email !== user.email) {
          await updateEmail(auth.currentUser, profileData.email);
        }
      }

      await updateDoc(doc(db, 'users', user.id), {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        country: profileData.country,
        updatedAt: new Date()
      });

      success('Profile Updated', 'Your profile has been updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.code === 'auth/requires-recent-login') {
        showError('Authentication Required', 'Please log out and log back in to update your email');
      } else {
        showError('Update Failed', error.message || 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auth.currentUser) return;

    if (!securityData.currentPassword) {
      showError('Current Password Required', 'Please enter your current password');
      return;
    }

    if (securityData.newPassword !== securityData.confirmPassword) {
      showError('Password Mismatch', 'New passwords do not match');
      return;
    }

    if (securityData.newPassword.length < 6) {
      showError('Password Too Short', 'Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      const credential = EmailAuthProvider.credential(
        auth.currentUser.email!,
        securityData.currentPassword
      );
      
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, securityData.newPassword);
      
      setSecurityData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      success('Password Updated', 'Your password has been changed successfully');
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        showError('Wrong Password', 'Current password is incorrect');
      } else {
        showError('Password Update Failed', error.message || 'Failed to update password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', user.id), {
        emailNotifications: securityData.emailNotifications,
        smsNotifications: securityData.smsNotifications,
        updatedAt: new Date()
      });

      success('Settings Updated', 'Your notification preferences have been saved');
    } catch (error) {
      console.error('Error updating notifications:', error);
      showError('Update Failed', 'Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiData.apiKey).then(() => {
      success('Copied!', 'API key copied to clipboard');
    }).catch(() => {
      showError('Copy Failed', 'Failed to copy API key');
    });
  };

  const generateNewApiKey = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const newKey = generateApiKey();
      
      await updateDoc(doc(db, 'users', user.id), {
        apiKey: newKey,
        apiKeyCreatedAt: new Date(),
        updatedAt: new Date()
      });

      setApiData(prev => ({ ...prev, apiKey: newKey }));
      success('New API Key', 'New API key generated and saved');
    } catch (error) {
      console.error('Error generating API key:', error);
      showError('Generate Failed', 'Failed to generate new API key');
    } finally {
      setLoading(false);
    }
  };

  const toggleApiKeyVisibility = () => {
    setApiData(prev => ({ ...prev, showApiKey: !prev.showApiKey }));
  };

  const downloadApiKey = () => {
    const element = document.createElement('a');
    const file = new Blob([`API_KEY=${apiData.apiKey}`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'instantnums-api-key.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    success('Downloaded', 'API key downloaded to file');
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'security', name: 'Security', icon: Lock },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'api', name: 'API', icon: Key }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-3 space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Settings
          </h1>
          <p className="text-sm text-gray-600">
            Manage your account preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-1 py-2 px-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <Input
                  label="Full Name"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
                <Input
                  label="Phone Number"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
                <Select
                  label="Country"
                  value={profileData.country}
                  onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value }))}
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="NG">Nigeria</option>
                  <option value="IN">India</option>
                </Select>
                <Button type="submit" disabled={loading} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Change Password</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="relative">
                    <Input
                      label="Current Password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={securityData.currentPassword}
                      onChange={(e) => setSecurityData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-9 text-gray-400"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      label="New Password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={securityData.newPassword}
                      onChange={(e) => setSecurityData(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-9 text-gray-400"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={securityData.confirmPassword}
                    onChange={(e) => setSecurityData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                  <Button type="submit" disabled={loading} className="w-full">
                    <Lock className="w-4 h-4 mr-2" />
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-600">Receive updates via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={securityData.emailNotifications}
                  onChange={(e) => setSecurityData(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">SMS Notifications</h4>
                  <p className="text-sm text-gray-600">Receive updates via SMS</p>
                </div>
                <input
                  type="checkbox"
                  checked={securityData.smsNotifications}
                  onChange={(e) => setSecurityData(prev => ({ ...prev, smsNotifications: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <Button onClick={handleNotificationUpdate} disabled={loading} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* API Tab */}
        {activeTab === 'api' && (
          <div className="space-y-4">
            {/* API Key Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">API Access</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your API Key
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Input
                        type={apiData.showApiKey ? 'text' : 'password'}
                        value={apiData.apiKey || 'No API key generated'}
                        readOnly
                        className="font-mono text-sm pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={toggleApiKeyVisibility}
                      >
                        {apiData.showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyApiKey}
                      disabled={!apiData.apiKey}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    onClick={generateNewApiKey}
                    disabled={loading}
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {loading ? 'Generating...' : 'New Key'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadApiKey}
                    disabled={!apiData.apiKey}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open('/api-docs', '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Docs
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* API Usage Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-blue-600 font-medium">Today</p>
                    <p className="text-xl font-bold text-blue-900">{apiData.usage.requestsToday}</p>
                    <p className="text-xs text-blue-600">requests</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-sm text-green-600 font-medium">This Month</p>
                    <p className="text-xl font-bold text-green-900">{apiData.usage.requestsThisMonth}</p>
                    <p className="text-xs text-green-600">requests</p>
                  </div>
                </div>
                
                {apiData.usage.lastUsed && (
                  <div className="text-sm text-gray-600">
                    Last used: {apiData.usage.lastUsed.toLocaleDateString()} at {apiData.usage.lastUsed.toLocaleTimeString()}
                  </div>
                )}
                {!apiData.usage.lastUsed && (
                  <div className="text-sm text-gray-500">
                    API key has not been used yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">API Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                      <Key className="w-4 h-4 mr-2" />
                      Rate Limits
                    </h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• 100 requests per minute</p>
                      <p>• 10,000 requests per month</p>
                      <p>• Resets at midnight UTC</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <h4 className="font-medium text-amber-900 mb-2 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Security Guidelines
                    </h4>
                    <div className="text-sm text-amber-800 space-y-1">
                      <p>• Never share your API key publicly</p>
                      <p>• Use environment variables in production</p>
                      <p>• Regenerate if compromised</p>
                      <p>• Monitor usage regularly</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h4 className="font-medium text-gray-900 mb-2">Base URL</h4>
                    <code className="text-sm bg-white px-2 py-1 rounded border font-mono">
                      https://api.instantnums.com/v1
                    </code>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h4 className="font-medium text-gray-900 mb-2">Authentication</h4>
                    <code className="text-sm bg-white px-2 py-1 rounded border font-mono block">
                      Authorization: Bearer YOUR_API_KEY
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}