import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Download,
  Calendar,
  PieChart,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { useToast } from '../../hooks/useToast';
import { collection, getDocs, doc, getDoc, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency, formatDate } from '../../lib/utils';

export function FinancialManagement() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [financialData, setFinancialData] = useState<any>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [profitTracking, setProfitTracking] = useState<any>({});

  useEffect(() => {
    loadFinancialData();
  }, [timeRange]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);

      // Load profit tracking data
      const profitDoc = await getDoc(doc(db, 'system', 'profit_tracking'));
      if (profitDoc.exists()) {
        setProfitTracking(profitDoc.data());
      }

      // Load limited transactions for performance (latest 500)
      const transactionsQuery = query(
        collection(db, 'transactions'),
        orderBy('createdAt', 'desc'),
        limit(500)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const allTransactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      console.log(`Loaded ${allTransactions.length} transactions for financial management`);

      // Filter by time range
      const filteredTransactions = filterByTimeRange(allTransactions, timeRange);
      setTransactions(filteredTransactions);

      // Load refund data
      const refundSnapshot = await getDocs(collection(db, 'failed_refunds'));
      const allRefunds = refundSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        attemptedAt: doc.data().attemptedAt?.toDate() || new Date()
      }));
      setRefunds(allRefunds);

      // Calculate financial metrics
      const metrics = calculateFinancialMetrics(filteredTransactions, profitDoc.data());
      setFinancialData(metrics);

    } catch (err) {
      console.error('Error loading financial data:', err);
      error('Load Failed', 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const filterByTimeRange = (data: any[], range: string) => {
    const now = new Date();
    let cutoff = new Date();

    switch (range) {
      case '1d':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return data;
    }

    return data.filter(item => item.createdAt >= cutoff);
  };

  const calculateFinancialMetrics = (transactions: any[], profitData: any) => {
    const deposits = transactions.filter(t => t.type === 'deposit' && t.status === 'completed');
    const purchases = transactions.filter(t => t.type === 'purchase' && t.status === 'completed');
    const refundTxns = transactions.filter(t => t.type === 'refund' && t.status === 'completed');

    const totalDeposits = deposits.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPurchases = purchases.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    const totalRefunds = refundTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalDaisyCosts = purchases.reduce((sum, t) => sum + (t.daisyPrice || 0), 0);
    const totalProfit = purchases.reduce((sum, t) => sum + (t.profit || 0), 0);

    return {
      totalDeposits,
      totalPurchases,
      totalRefunds,
      totalDaisyCosts,
      totalProfit,
      netRevenue: totalDeposits - totalRefunds,
      profitMargin: totalPurchases > 0 ? (totalProfit / totalPurchases) * 100 : 0,
      refundRate: totalDeposits > 0 ? (totalRefunds / totalDeposits) * 100 : 0,
      transactionCount: transactions.length,
      averageTransactionValue: transactions.length > 0 ? totalDeposits / deposits.length : 0
    };
  };

  const exportFinancialData = () => {
    try {
      const exportData = {
        timeRange,
        metrics: financialData,
        profitTracking,
        transactions: transactions.map(t => ({
          ...t,
          createdAt: t.createdAt.toISOString()
        })),
        refunds: refunds.map(r => ({
          ...r,
          attemptedAt: r.attemptedAt.toISOString()
        })),
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success('Export Complete', 'Financial data exported successfully');
    } catch (err) {
      error('Export Failed', 'Failed to export financial data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Management</h2>
          <p className="text-gray-600">Monitor revenue, costs, and profitability</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 3 Months</option>
            <option value="all">All Time</option>
          </Select>
          <Button variant="outline" onClick={exportFinancialData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <Loader size="lg" text="Loading financial data..." className="py-12" />
      ) : (
        <>
          {/* Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(financialData.totalDeposits || 0)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  From {financialData.transactionCount || 0} transactions
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Net Profit</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(financialData.totalProfit || 0)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-500" />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {(financialData.profitMargin || 0).toFixed(1)}% margin
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">DaisySMS Costs</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(financialData.totalDaisyCosts || 0)}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-500" />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Provider expenses
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Refunds</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(financialData.totalRefunds || 0)}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-orange-500" />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {(financialData.refundRate || 0).toFixed(1)}% of deposits
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
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-gray-900">User Deposits</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(financialData.totalDeposits || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="font-medium text-gray-900">DaisySMS Costs</span>
                    <span className="font-bold text-red-600">
                      -{formatCurrency(financialData.totalDaisyCosts || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="font-medium text-gray-900">Refunds Issued</span>
                    <span className="font-bold text-orange-600">
                      -{formatCurrency(financialData.totalRefunds || 0)}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="font-bold text-gray-900">Net Profit</span>
                      <span className="font-bold text-blue-600 text-lg">
                        {formatCurrency(financialData.totalProfit || 0)}
                      </span>
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
                      <span className="font-bold text-green-600">
                        {(financialData.profitMargin || 0).toFixed(1)}%
                      </span>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(financialData.profitMargin || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Refund Rate</span>
                    <div className="text-right">
                      <span className="font-bold text-orange-600">
                        {(financialData.refundRate || 0).toFixed(1)}%
                      </span>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-orange-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(financialData.refundRate || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Avg Transaction</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(financialData.averageTransactionValue || 0)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Transactions</span>
                    <span className="font-semibold text-gray-900">
                      {(financialData.transactionCount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {transactions.filter(t => t.type === 'deposit').length}
                  </div>
                  <div className="text-sm text-green-700">Deposits</div>
                  <div className="text-xs text-green-600 mt-1">
                    {formatCurrency(transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + (t.amount || 0), 0))}
                  </div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {transactions.filter(t => t.type === 'purchase').length}
                  </div>
                  <div className="text-sm text-blue-700">Purchases</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {formatCurrency(transactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0))}
                  </div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {transactions.filter(t => t.type === 'refund').length}
                  </div>
                  <div className="text-sm text-orange-700">Refunds</div>
                  <div className="text-xs text-orange-600 mt-1">
                    {formatCurrency(transactions.filter(t => t.type === 'refund').reduce((sum, t) => sum + (t.amount || 0), 0))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Financial Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transactions</h3>
                  <p className="text-gray-600">No financial activity in selected time range</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.type === 'deposit' ? 'bg-green-100 text-green-600' :
                          transaction.type === 'refund' ? 'bg-orange-100 text-orange-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {transaction.type === 'deposit' ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : transaction.type === 'refund' ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : (
                            <DollarSign className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {transaction.description?.replace(/<[^>]*>/g, '') || 'Transaction'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatDate(transaction.createdAt)} • {transaction.provider || 'System'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}
                          {formatCurrency(Math.abs(transaction.amount || 0))}
                        </p>
                        {transaction.profit && (
                          <p className="text-xs text-blue-600">
                            Profit: {formatCurrency(transaction.profit)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Failed Refunds */}
          {refunds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span>Failed Refunds ({refunds.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {refunds.map((refund) => (
                    <div key={refund.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div>
                        <p className="font-medium text-red-900">
                          Refund Failed: {formatCurrency(refund.amount || 0)}
                        </p>
                        <p className="text-sm text-red-700">
                          User: {refund.userId?.substring(0, 8)}... • {refund.reason}
                        </p>
                        <p className="text-xs text-red-600">
                          {formatDate(refund.attemptedAt)} • {refund.error}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300"
                      >
                        Retry
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}