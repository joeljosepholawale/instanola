import React, { useState, useEffect } from 'react';
import { 
  Code, 
  Key, 
  Activity, 
  Globe, 
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Settings,
  BarChart3,
  Users,
  Zap,
  Save
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { useToast } from '../../hooks/useToast';
import { collection, getDocs, doc, setDoc, updateDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDate } from '../../lib/utils';

interface APIUsage {
  userId: string;
  userEmail: string;
  apiKey: string;
  requestCount: number;
  lastRequest: Date;
  rateLimitHits: number;
  endpoints: { [key: string]: number };
}

interface WebhookLog {
  id: string;
  url: string;
  method: string;
  status: number;
  responseTime: number;
  payload: any;
  timestamp: Date;
  success: boolean;
}

export function APIManagement() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [apiUsage, setApiUsage] = useState<APIUsage[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [rateLimits, setRateLimits] = useState({
    requestsPerMinute: 100,
    requestsPerHour: 1000,
    requestsPerDay: 10000
  });
  const [filters, setFilters] = useState({
    timeRange: '24h',
    status: 'all',
    endpoint: 'all'
  });

  useEffect(() => {
    loadAPIData();
  }, [filters]);

  const loadAPIData = async () => {
    try {
      setLoading(true);
      
      // Load API usage data
      await loadAPIUsage();
      
      // Load webhook logs
      await loadWebhookLogs();
      
      // Load API keys
      await loadAPIKeys();
      
    } catch (err) {
      console.error('Error loading API data:', err);
      error('Load Failed', 'Failed to load API data');
    } finally {
      setLoading(false);
    }
  };

  const loadAPIUsage = async () => {
    try {
      // Load API usage from logs (this would be from actual API request logs)
      const usageSnapshot = await getDocs(collection(db, 'api_usage'));
      const usage = usageSnapshot.docs.map(doc => ({
        ...doc.data(),
        lastRequest: doc.data().lastRequest?.toDate() || new Date()
      })) as APIUsage[];
      
      setApiUsage(usage);
    } catch (err) {
      console.error('Error loading API usage:', err);
      setApiUsage([]);
    }
  };

  const loadWebhookLogs = async () => {
    try {
      const webhooksSnapshot = await getDocs(collection(db, 'webhook_logs'));
      const webhooks = webhooksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as WebhookLog[];
      
      // Apply time range filter
      if (filters.timeRange !== 'all') {
        const now = new Date();
        const hours = parseInt(filters.timeRange.replace('h', ''));
        const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
        const filtered = webhooks.filter(log => log.timestamp >= cutoff);
        setWebhookLogs(filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      } else {
        setWebhookLogs(webhooks.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      }
    } catch (err) {
      console.error('Error loading webhook logs:', err);
      setWebhookLogs([]);
    }
  };

  const loadAPIKeys = async () => {
    try {
      const keysSnapshot = await getDocs(collection(db, 'api_keys'));
      const keys = keysSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastUsed: doc.data().lastUsed?.toDate()
      }));
      
      setApiKeys(keys);
    } catch (err) {
      console.error('Error loading API keys:', err);
      setApiKeys([]);
    }
  };

  const updateRateLimits = async () => {
    try {
      await setDoc(doc(db, 'config', 'api_rate_limits'), {
        ...rateLimits,
        updatedAt: new Date()
      });
      
      success('Rate Limits Updated', 'API rate limits have been updated');
    } catch (err) {
      console.error('Error updating rate limits:', err);
      error('Update Failed', 'Failed to update rate limits');
    }
  };

  const revokeAPIKey = async (keyId: string, userId: string) => {
    try {
      await updateDoc(doc(db, 'api_keys', keyId), {
        revoked: true,
        revokedAt: new Date(),
        revokedBy: 'admin'
      });

      // Also update user document
      await updateDoc(doc(db, 'users', userId), {
        apiKeyRevoked: true,
        apiKeyRevokedAt: new Date()
      });

      success('API Key Revoked', 'API key has been revoked successfully');
      await loadAPIKeys();
    } catch (err) {
      console.error('Error revoking API key:', err);
      error('Revoke Failed', 'Failed to revoke API key');
    }
  };

  const exportAPIData = () => {
    try {
      const exportData = {
        apiUsage: apiUsage.map(usage => ({
          ...usage,
          lastRequest: usage.lastRequest.toISOString()
        })),
        webhookLogs: webhookLogs.map(log => ({
          ...log,
          timestamp: log.timestamp.toISOString()
        })),
        apiKeys: apiKeys.map(key => ({
          ...key,
          createdAt: key.createdAt.toISOString(),
          lastUsed: key.lastUsed?.toISOString()
        })),
        rateLimits,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-management-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success('Export Complete', 'API data exported successfully');
    } catch (err) {
      error('Export Failed', 'Failed to export API data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Management</h2>
          <p className="text-gray-600">Monitor API usage, webhooks, and manage rate limits</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportAPIData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadAPIData}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* API Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Requests</p>
                <p className="text-2xl font-bold text-blue-600">
                  {apiUsage.reduce((sum, usage) => sum + usage.requestCount, 0)}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Last 24 hours
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active API Keys</p>
                <p className="text-2xl font-bold text-green-600">
                  {apiKeys.filter(key => !key.revoked).length}
                </p>
              </div>
              <Key className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {apiKeys.filter(key => key.revoked).length} revoked
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Rate Limit Hits</p>
                <p className="text-2xl font-bold text-orange-600">
                  {apiUsage.reduce((sum, usage) => sum + usage.rateLimitHits, 0)}
                </p>
              </div>
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Blocked requests
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Webhook Success</p>
                <p className="text-2xl font-bold text-purple-600">
                  {webhookLogs.length > 0 ? 
                    Math.round((webhookLogs.filter(log => log.success).length / webhookLogs.length) * 100) : 0
                  }%
                </p>
              </div>
              <Globe className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Success rate
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limit Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Rate Limit Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Requests per Minute"
              type="number"
              value={rateLimits.requestsPerMinute}
              onChange={(e) => setRateLimits(prev => ({ 
                ...prev, 
                requestsPerMinute: parseInt(e.target.value) || 0 
              }))}
            />
            <Input
              label="Requests per Hour"
              type="number"
              value={rateLimits.requestsPerHour}
              onChange={(e) => setRateLimits(prev => ({ 
                ...prev, 
                requestsPerHour: parseInt(e.target.value) || 0 
              }))}
            />
            <Input
              label="Requests per Day"
              type="number"
              value={rateLimits.requestsPerDay}
              onChange={(e) => setRateLimits(prev => ({ 
                ...prev, 
                requestsPerDay: parseInt(e.target.value) || 0 
              }))}
            />
          </div>
          <div className="mt-4">
            <Button onClick={updateRateLimits}>
              <Save className="w-4 h-4 mr-2" />
              Update Rate Limits
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle>API Usage by User</CardTitle>
        </CardHeader>
        <CardContent>
          <>
          {loading ? (
            <Loader size="lg" text="Loading API usage..." className="py-8" />
          ) : apiUsage.length === 0 ? (
            <div className="text-center py-8">
              <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No API Usage</h3>
              <p className="text-gray-600">No API usage data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">API Key</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Requests</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Rate Limits</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Last Request</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiUsage.map((usage) => (
                    <tr key={usage.userId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{usage.userEmail}</p>
                          <p className="text-sm text-gray-600">{usage.userId.substring(0, 8)}...</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {usage.apiKey.substring(0, 12)}...
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-gray-900">{usage.requestCount}</p>
                          <p className="text-xs text-gray-500">Total requests</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm text-gray-900">{usage.rateLimitHits} hits</p>
                          <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className={`h-2 rounded-full ${
                                usage.rateLimitHits > 10 ? 'bg-red-500' : 
                                usage.rateLimitHits > 5 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min((usage.rateLimitHits / 20) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(usage.lastRequest)}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeAPIKey(usage.userId, usage.userId)}
                          className="text-red-600"
                        >
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {!loading && apiUsage.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, apiUsage.length)} of {apiUsage.length} users
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
        </CardContent>
      </Card>

      {/* Webhook Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <span>Webhook Monitoring</span>
            </div>
            <Select
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="all">All Time</option>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {webhookLogs.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Webhook Logs</h3>
              <p className="text-gray-600">Webhook activity will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhookLogs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      log.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {log.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{log.method} {log.url}</p>
                      <p className="text-sm text-gray-600">
                        Status: {log.status} • Response: {log.responseTime}ms
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {formatDate(log.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}