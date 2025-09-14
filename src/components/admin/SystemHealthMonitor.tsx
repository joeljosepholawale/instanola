import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  Activity,
  Globe,
  Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DaisySMSService } from '../../services/daisySMS';

interface SystemHealth {
  api: 'online' | 'offline' | 'degraded';
  database: 'connected' | 'disconnected' | 'slow';
  daisySMS: 'active' | 'inactive' | 'error';
  email: 'configured' | 'not_configured' | 'error';
  payments: 'active' | 'inactive' | 'error';
  lastChecked: Date;
  uptime: number;
  responseTime: number;
  daisyBalance: number;
}

export function SystemHealthMonitor() {
  const { success, error } = useToast();
  const [health, setHealth] = useState<SystemHealth>({
    api: 'online',
    database: 'connected',
    daisySMS: 'active',
    email: 'not_configured',
    payments: 'inactive',
    lastChecked: new Date(),
    uptime: 99.9,
    responseTime: 150,
    daisyBalance: 0
  });
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadSystemHealth();
    // Check health every 5 minutes
    const interval = setInterval(checkSystemHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemHealth = async () => {
    try {
      const healthDoc = await getDoc(doc(db, 'system', 'health_status'));
      if (healthDoc.exists()) {
        const data = healthDoc.data();
        setHealth({
          api: data.api || 'online',
          database: data.database || 'connected',
          daisySMS: data.daisySMS || 'active',
          email: data.email || 'not_configured',
          payments: data.payments || 'inactive',
          lastChecked: data.lastChecked?.toDate() || new Date(),
          uptime: data.uptime || 99.9,
          responseTime: data.responseTime || 150,
          daisyBalance: data.daisyBalance || 0
        });
      }
    } catch (err) {
      console.error('Error loading system health:', err);
    }
  };

  const checkSystemHealth = async () => {
    try {
      setChecking(true);
      const startTime = Date.now();

      // Test database connection
      let dbStatus: 'connected' | 'disconnected' | 'slow' = 'connected';
      let dbResponseTime = 0;
      try {
        const dbStart = Date.now();
        await getDoc(doc(db, 'system', 'health_check'));
        dbResponseTime = Date.now() - dbStart;
        dbStatus = dbResponseTime > 1000 ? 'slow' : 'connected';
      } catch (err) {
        dbStatus = 'disconnected';
      }

      // Test DaisySMS API
      let daisyStatus: 'active' | 'inactive' | 'error' = 'active';
      let daisyBalance = 0;
      try {
        const daisyService = await DaisySMSService.createWithStoredKey();
        daisyBalance = await daisyService.getBalance();
        daisyStatus = 'active';
      } catch (err) {
        daisyStatus = 'error';
      }

      // Check email configuration
      let emailStatus: 'configured' | 'not_configured' | 'error' = 'not_configured';
      try {
        const emailDoc = await getDoc(doc(db, 'config', 'email'));
        if (emailDoc.exists() && emailDoc.data()?.enabled) {
          emailStatus = 'configured';
        }
      } catch (err) {
        emailStatus = 'error';
      }

      // Check payment configuration
      let paymentStatus: 'active' | 'inactive' | 'error' = 'inactive';
      try {
        const paymentDoc = await getDoc(doc(db, 'config', 'api_keys'));
        if (paymentDoc.exists()) {
          const keys = paymentDoc.data();
          if (keys.paymentPoint || keys.nowPayments) {
            paymentStatus = 'active';
          }
        }
      } catch (err) {
        paymentStatus = 'error';
      }

      const totalResponseTime = Date.now() - startTime;

      const newHealth: SystemHealth = {
        api: 'online',
        database: dbStatus,
        daisySMS: daisyStatus,
        email: emailStatus,
        payments: paymentStatus,
        lastChecked: new Date(),
        uptime: 99.9, // This would be calculated from actual uptime tracking
        responseTime: totalResponseTime,
        daisyBalance: daisyBalance
      };

      setHealth(newHealth);

      // Save health status
      await setDoc(doc(db, 'system', 'health_status'), {
        ...newHealth,
        lastChecked: new Date()
      });

      success('Health Check Complete', 'System health updated successfully');
    } catch (err) {
      console.error('Error checking system health:', err);
      error('Health Check Failed', 'Failed to check system health');
    } finally {
      setChecking(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'online' || status === 'connected' || status === 'active' || status === 'configured') {
      return 'text-green-600';
    } else if (status === 'slow' || status === 'degraded') {
      return 'text-yellow-600';
    } else {
      return 'text-red-600';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'online' || status === 'connected' || status === 'active' || status === 'configured') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (status === 'slow' || status === 'degraded') {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    } else {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>System Health</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkSystemHealth}
            disabled={checking}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Check Health</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Service Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">API</span>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(health.api)}
                <span className={`text-xs font-medium capitalize ${getStatusColor(health.api)}`}>
                  {health.api}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Database</span>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(health.database)}
                <span className={`text-xs font-medium capitalize ${getStatusColor(health.database)}`}>
                  {health.database}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Wifi className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">DaisySMS</span>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(health.daisySMS)}
                <span className={`text-xs font-medium capitalize ${getStatusColor(health.daisySMS)}`}>
                  {health.daisySMS}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Email</span>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(health.email)}
                <span className={`text-xs font-medium capitalize ${getStatusColor(health.email)}`}>
                  {health.email.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Payments</span>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(health.payments)}
                <span className={`text-xs font-medium capitalize ${getStatusColor(health.payments)}`}>
                  {health.payments}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Uptime</span>
              </div>
              <span className="text-xs font-medium text-green-600">
                {health.uptime}%
              </span>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{health.responseTime}ms</div>
                <div className="text-xs text-blue-700">Response Time</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">{health.uptime}%</div>
                <div className="text-xs text-green-700">Uptime</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">${health.daisyBalance.toFixed(2)}</div>
                <div className="text-xs text-purple-700">DaisySMS Balance</div>
              </div>
            </div>
          </div>

          {/* Last Check */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            Last checked: {health.lastChecked.toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}