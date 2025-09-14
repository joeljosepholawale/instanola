import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  BarChart3,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { formatCurrency } from '../../lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface RevenueData {
  totalRevenue: number;
  totalProfit: number;
  totalDaisySpent: number;
  totalUserCharged: number;
  totalRentals: number;
  totalRefunds: number;
  profitMargin: number;
  averageOrderValue: number;
}

export function RevenueAnalytics() {
  const [data, setData] = useState<RevenueData>({
    totalRevenue: 0,
    totalProfit: 0,
    totalDaisySpent: 0,
    totalUserCharged: 0,
    totalRentals: 0,
    totalRefunds: 0,
    profitMargin: 0,
    averageOrderValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadRevenueData();
  }, [timeRange]);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      
      // Load profit tracking data
      const profitDoc = await getDoc(doc(db, 'system', 'profit_tracking'));
      if (profitDoc.exists()) {
        const profitData = profitDoc.data();
        
        const totalUserCharged = profitData.totalUserCharged || 0;
        const totalDaisySpent = profitData.totalDaisySpent || 0;
        const totalProfit = totalUserCharged - totalDaisySpent;
        const totalRentals = profitData.totalRentals || 0;
        const totalRefunds = profitData.totalRefunds || 0;
        
        setData({
          totalRevenue: totalUserCharged,
          totalProfit: totalProfit,
          totalDaisySpent: totalDaisySpent,
          totalUserCharged: totalUserCharged,
          totalRentals: totalRentals,
          totalRefunds: totalRefunds,
          profitMargin: totalUserCharged > 0 ? (totalProfit / totalUserCharged) * 100 : 0,
          averageOrderValue: totalRentals > 0 ? totalUserCharged / totalRentals : 0
        });
      }
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportRevenueData = () => {
    try {
      const exportData = {
        ...data,
        exportedAt: new Date().toISOString(),
        timeRange: timeRange
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting revenue data:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 3 Months</option>
                <option value="1y">Last Year</option>
                <option value="all">All Time</option>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={loadRevenueData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportRevenueData}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(data.totalRevenue)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              From {data.totalRentals} rentals
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Net Profit</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.totalProfit)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {data.profitMargin.toFixed(1)}% margin
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">DaisySMS Costs</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(data.totalDaisySpent)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-red-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Provider costs
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Avg Order Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(data.averageOrderValue)}
                </p>
              </div>
              <PieChart className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Per rental
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-gray-900">User Payments</span>
                <span className="font-bold text-blue-600">{formatCurrency(data.totalUserCharged)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="font-medium text-gray-900">DaisySMS Costs</span>
                <span className="font-bold text-red-600">-{formatCurrency(data.totalDaisySpent)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="font-medium text-gray-900">Refunds</span>
                <span className="font-bold text-orange-600">-{formatCurrency(data.totalRefunds)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-bold text-gray-900">Net Profit</span>
                  <span className="font-bold text-green-600 text-lg">{formatCurrency(data.totalProfit)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Profit Margin</span>
                <div className="text-right">
                  <span className="font-bold text-green-600">{data.profitMargin.toFixed(1)}%</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${Math.min(data.profitMargin, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Rentals</span>
                <span className="font-semibold text-gray-900">{data.totalRentals.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Average Order Value</span>
                <span className="font-semibold text-gray-900">{formatCurrency(data.averageOrderValue)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Refund Rate</span>
                <span className="font-semibold text-gray-900">
                  {data.totalUserCharged > 0 ? ((data.totalRefunds / data.totalUserCharged) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Interactive revenue chart coming soon</p>
              <p className="text-xs text-gray-400 mt-1">
                Will show daily/weekly/monthly revenue trends
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}