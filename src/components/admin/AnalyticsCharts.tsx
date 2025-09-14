import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity,
  Calendar,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';

interface AnalyticsData {
  revenue: { date: string; amount: number }[];
  users: { date: string; count: number }[];
  services: { name: string; usage: number; revenue: number }[];
  countries: { name: string; usage: number }[];
}

export function AnalyticsCharts() {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData>({
    revenue: [],
    users: [],
    services: [],
    countries: []
  });

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Simulate analytics data - in real app, this would come from Firebase aggregations
      const mockData: AnalyticsData = {
        revenue: [
          { date: '2025-01-20', amount: 125.50 },
          { date: '2025-01-21', amount: 89.25 },
          { date: '2025-01-22', amount: 156.75 },
          { date: '2025-01-23', amount: 203.40 },
          { date: '2025-01-24', amount: 178.90 },
          { date: '2025-01-25', amount: 234.60 },
          { date: '2025-01-26', amount: 198.30 }
        ],
        users: [
          { date: '2025-01-20', count: 5 },
          { date: '2025-01-21', count: 3 },
          { date: '2025-01-22', count: 8 },
          { date: '2025-01-23', count: 12 },
          { date: '2025-01-24', count: 7 },
          { date: '2025-01-25', count: 15 },
          { date: '2025-01-26', count: 9 }
        ],
        services: [
          { name: 'Telegram', usage: 45, revenue: 1250.50 },
          { name: 'WhatsApp', usage: 32, revenue: 890.25 },
          { name: 'Instagram', usage: 23, revenue: 650.75 },
          { name: 'Discord', usage: 18, revenue: 420.30 },
          { name: 'Twitter', usage: 15, revenue: 380.90 },
          { name: 'Facebook', usage: 12, revenue: 290.40 }
        ],
        countries: [
          { name: 'United States', usage: 65 },
          { name: 'United Kingdom', usage: 18 },
          { name: 'Canada', usage: 12 },
          { name: 'Germany', usage: 8 },
          { name: 'France', usage: 6 },
          { name: 'Others', usage: 11 }
        ]
      };
      
      setData(mockData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = data.revenue.reduce((sum, item) => sum + item.amount, 0);
  const totalUsers = data.users.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h3>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 3 Months</option>
              <option value="1y">Last Year</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              +12.5% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">New Users</p>
                <p className="text-2xl font-bold text-blue-600">{totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              +8.3% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Avg. Order Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(totalRevenue / Math.max(totalUsers, 1))}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              +5.7% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">98.5%</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              +0.8% from last period
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LineChart className="w-5 h-5" />
              <span>Revenue Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-50 rounded-lg p-4">
              <div className="h-full flex items-end justify-between space-x-2">
                {data.revenue.map((item, index) => {
                  const height = (item.amount / Math.max(...data.revenue.map(r => r.amount))) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${item.date}: ${formatCurrency(item.amount)}`}
                      />
                      <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left">
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>User Growth</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-50 rounded-lg p-4">
              <div className="h-full flex items-end justify-between space-x-2">
                {data.users.map((item, index) => {
                  const height = (item.count / Math.max(...data.users.map(u => u.count))) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-green-500 rounded-t"
                        style={{ height: `${height}%` }}
                        title={`${item.date}: ${item.count} users`}
                      />
                      <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left">
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service and Country Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="w-5 h-5" />
              <span>Popular Services</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.services.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="font-medium text-gray-900">{service.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(service.revenue)}
                    </div>
                    <div className="text-xs text-gray-500">{service.usage}% usage</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Popular Countries</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.countries.map((country, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="font-medium text-gray-900">{country.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{country.usage}%</div>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${country.usage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}