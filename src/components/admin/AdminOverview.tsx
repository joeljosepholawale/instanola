import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  Activity, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Smartphone,
  Mail,
  Shield
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { SystemHealthMonitor } from './SystemHealthMonitor';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../lib/utils';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function AdminOverview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    adminUsers: 0,
    totalRevenue: 0,
    totalProfit: 0,
    pendingPayments: 0,
    activeRentals: 0,
    openTickets: 0,
    todaySignups: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (user?.isAdmin) {
      loadOverviewData();
    }
  }, [user?.isAdmin]);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      
      // Load users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      // Calculate user stats
      const totalUsers = users.length;
      const activeUsers = users.filter(u => !u.isBlocked).length;
      const blockedUsers = users.filter(u => u.isBlocked).length;
      const adminUsers = users.filter(u => u.isAdmin).length;
      
      // Today's signups
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySignups = users.filter(u => u.createdAt >= today).length;

      // Load financial data
      let totalRevenue = 0;
      let totalProfit = 0;
      try {
        const profitDoc = await getDoc(doc(db, 'system', 'profit_tracking'));
        if (profitDoc.exists()) {
          const profitData = profitDoc.data();
          totalRevenue = profitData.totalUserCharged || 0;
          totalProfit = profitData.totalProfit || 0;
        }
      } catch (err) {
        console.warn('Could not load profit data:', err);
      }

      // Load pending payments
      let pendingPayments = 0;
      try {
        const paymentsSnapshot = await getDocs(
          query(collection(db, 'manual_payments'), where('status', '==', 'pending'))
        );
        pendingPayments = paymentsSnapshot.size;
      } catch (err) {
        console.warn('Could not load pending payments:', err);
      }

      // Load active rentals
      let activeRentals = 0;
      try {
        const rentalsSnapshot = await getDocs(
          query(collection(db, 'rentals'), where('status', '==', 'waiting'))
        );
        activeRentals = rentalsSnapshot.size;
      } catch (err) {
        console.warn('Could not load active rentals:', err);
      }

      // Load open support tickets
      let openTickets = 0;
      try {
        const supportSnapshot = await getDocs(
          query(collection(db, 'support_messages'), where('status', '==', 'open'))
        );
        openTickets = supportSnapshot.size;
      } catch (err) {
        console.warn('Could not load support tickets:', err);
      }

      setStats({
        totalUsers,
        activeUsers,
        blockedUsers,
        adminUsers,
        totalRevenue,
        totalProfit,
        pendingPayments,
        activeRentals,
        openTickets,
        todaySignups
      });

      // Load recent activity
      await loadRecentActivity();
      
      // Load system alerts
      await loadSystemAlerts();

    } catch (err) {
      console.error('Error loading overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const actionsSnapshot = await getDocs(
        query(
          collection(db, 'admin_actions'),
          orderBy('timestamp', 'desc'),
          limit(10)
        )
      );
      
      const activities = actionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      
      setRecentActivity(activities);
    } catch (err) {
      console.warn('Could not load recent activity:', err);
      setRecentActivity([]);
    }
  };

  const loadSystemAlerts = async () => {
    try {
      // Check for various alert conditions
      const alertList = [];

      // Low DaisySMS balance
      try {
        const healthDoc = await getDoc(doc(db, 'system', 'health_status'));
        if (healthDoc.exists()) {
          const health = healthDoc.data();
          if (health.daisyBalance < 10) {
            alertList.push({
              type: 'warning',
              title: 'Low DaisySMS Balance',
              message: `DaisySMS balance is $${health.daisyBalance.toFixed(2)}`,
              action: 'Top up DaisySMS account'
            });
          }
        }
      } catch (err) {
        console.warn('Could not check DaisySMS balance:', err);
      }

      // Pending payments
      if (stats.pendingPayments > 0) {
        alertList.push({
          type: 'info',
          title: 'Pending Payments',
          message: `${stats.pendingPayments} manual payments awaiting review`,
          action: 'Review payments'
        });
      }

      // Open support tickets
      if (stats.openTickets > 0) {
        alertList.push({
          type: 'info',
          title: 'Open Support Tickets',
          message: `${stats.openTickets} support tickets need attention`,
          action: 'Review tickets'
        });
      }

      setAlerts(alertList);
    } catch (err) {
      console.warn('Could not load system alerts:', err);
      setAlerts([]);
    }
  };

  if (loading) {
    return <Loader size="lg" text="Loading admin overview..." className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Admin Overview</h1>
        <p className="text-gray-600">System status and key metrics at a glance</p>
      </div>

      {/* System Alerts */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {alerts.map((alert, index) => (
            <div key={index} className={`border rounded-lg p-4 ${
              alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              alert.type === 'error' ? 'bg-red-50 border-red-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    alert.type === 'warning' ? 'text-yellow-600' :
                    alert.type === 'error' ? 'text-red-600' :
                    'text-blue-600'
                  }`} />
                  <div>
                    <h4 className={`font-medium ${
                      alert.type === 'warning' ? 'text-yellow-900' :
                      alert.type === 'error' ? 'text-red-900' :
                      'text-blue-900'
                    }`}>
                      {alert.title}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      alert.type === 'warning' ? 'text-yellow-700' :
                      alert.type === 'error' ? 'text-red-700' :
                      'text-blue-700'
                    }`}>
                      {alert.message}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  {alert.action}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Users</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 text-xs lg:text-sm text-gray-600">
              {stats.todaySignups} new today
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Revenue</p>
                <p className="text-xl lg:text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 text-xs lg:text-sm text-gray-600">
              Profit: {formatCurrency(stats.totalProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Rentals</p>
                <p className="text-xl lg:text-2xl font-bold text-purple-600">{stats.activeRentals}</p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 text-xs lg:text-sm text-gray-600">
              SMS numbers in use
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending Items</p>
                <p className="text-xl lg:text-2xl font-bold text-orange-600">
                  {stats.pendingPayments + stats.openTickets}
                </p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 text-xs lg:text-sm text-gray-600">
              {stats.pendingPayments} payments, {stats.openTickets} tickets
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealthMonitor />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Recent Admin Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Activity</h3>
                <p className="text-gray-600">Admin actions will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 6).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Shield className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {activity.action?.replace(/_/g, ' ') || 'Admin action'}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {activity.reason || 'System action'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">
                        {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {recentActivity.length > 6 && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm">
                      View All ({recentActivity.length})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active Users</span>
                <div className="text-right">
                  <span className="font-bold text-green-600">{stats.activeUsers}</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Blocked Users</span>
                <div className="text-right">
                  <span className="font-bold text-red-600">{stats.blockedUsers}</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${(stats.blockedUsers / Math.max(stats.totalUsers, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Admin Users</span>
                <span className="font-semibold text-purple-600">{stats.adminUsers}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Today's Signups</span>
                <span className="font-semibold text-blue-600">{stats.todaySignups}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalRevenue)}
                </div>
                <div className="text-sm text-green-700">Total Revenue</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.totalProfit)}
                </div>
                <div className="text-sm text-blue-700">Net Profit</div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Profit Margin</span>
                <span className="font-semibold text-gray-900">
                  {stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-purple-600" />
                  <span className="text-gray-600 text-sm">Active Rentals</span>
                </div>
                <span className="font-bold text-purple-600">{stats.activeRentals}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-yellow-600" />
                  <span className="text-gray-600 text-sm">Pending Payments</span>
                </div>
                <span className="font-bold text-yellow-600">{stats.pendingPayments}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600 text-sm">Open Tickets</span>
                </div>
                <span className="font-bold text-blue-600">{stats.openTickets}</span>
              </div>
              
              <div className="pt-3 border-t">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">98.5%</div>
                  <div className="text-xs text-gray-600">System Health</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}