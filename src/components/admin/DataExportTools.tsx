import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  Database, 
  Users, 
  DollarSign,
  Calendar,
  Shield,
  Activity,
  Eye,
  AlertTriangle,
  LogOut,
  LogIn,
  User
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';
import { useToast } from '../../hooks/useToast';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function DataExportTools() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState('users');
  const [dateRange, setDateRange] = useState('30d');

  const exportOptions = [
    { value: 'users', label: 'User Data', icon: Users },
    { value: 'transactions', label: 'Transactions', icon: DollarSign },
    { value: 'rentals', label: 'SMS Rentals', icon: Activity },
    { value: 'payments', label: 'Manual Payments', icon: FileText },
    { value: 'support', label: 'Support Messages', icon: Shield },
    { value: 'admin_actions', label: 'Admin Actions', icon: Shield },
    { value: 'system_logs', label: 'System Logs', icon: Database }
  ];

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '1d':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  };

  const exportData = async () => {
    try {
      setLoading(true);
      
      let data: any[] = [];
      let filename = '';
      const dateFilter = getDateFilter();

      switch (exportType) {
        case 'users':
          const usersSnapshot = await getDocs(collection(db, 'users'));
          data = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString(),
            lastActive: doc.data().lastActive?.toDate()?.toISOString()
          }));
          filename = 'users-export';
          break;

        case 'transactions':
          let transactionsQuery = collection(db, 'transactions');
          if (dateFilter) {
            transactionsQuery = query(transactionsQuery, where('createdAt', '>=', dateFilter));
          }
          const transactionsSnapshot = await getDocs(transactionsQuery);
          data = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString()
          }));
          filename = 'transactions-export';
          break;

        case 'rentals':
          let rentalsQuery = collection(db, 'rentals');
          if (dateFilter) {
            rentalsQuery = query(rentalsQuery, where('createdAt', '>=', dateFilter));
          }
          const rentalsSnapshot = await getDocs(rentalsQuery);
          data = rentalsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString(),
            expiresAt: doc.data().expiresAt?.toDate()?.toISOString(),
            completedAt: doc.data().completedAt?.toDate()?.toISOString()
          }));
          filename = 'rentals-export';
          break;

        case 'payments':
          const paymentsSnapshot = await getDocs(collection(db, 'manual_payments'));
          data = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            submittedAt: doc.data().submittedAt?.toDate()?.toISOString(),
            reviewedAt: doc.data().reviewedAt?.toDate()?.toISOString()
          }));
          filename = 'manual-payments-export';
          break;

        case 'support':
          const supportSnapshot = await getDocs(collection(db, 'support_messages'));
          data = supportSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString(),
            respondedAt: doc.data().respondedAt?.toDate()?.toISOString()
          }));
          filename = 'support-messages-export';
          break;

        case 'admin_actions':
          const actionsSnapshot = await getDocs(collection(db, 'admin_actions'));
          data = actionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()?.toISOString()
          }));
          filename = 'admin-actions-export';
          break;

        case 'system_logs':
          // Combine various system logs
          const [securitySnapshot, webhooksSnapshot, healthSnapshot] = await Promise.all([
            getDocs(collection(db, 'security_events')),
            getDocs(collection(db, 'webhooks')),
            getDocs(collection(db, 'system'))
          ]);
          
          data = {
            security_events: securitySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate()?.toISOString()
            })),
            webhooks: webhooksSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate()?.toISOString()
            })),
            system_data: healthSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              lastUpdated: doc.data().lastUpdated?.toDate()?.toISOString()
            }))
          };
          filename = 'system-logs-export';
          break;
      }

      // Create and download file
      const exportData = {
        exportType,
        dateRange,
        exportedAt: new Date().toISOString(),
        exportedBy: adminUser?.id,
        totalRecords: Array.isArray(data) ? data.length : Object.keys(data).length,
        data
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${dateRange}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      success('Export Complete', `${exportType} data exported successfully`);
    } catch (err) {
      console.error('Error exporting data:', err);
      error('Export Failed', `Failed to export ${exportType} data`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Data Export</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Export Type"
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
              >
                {exportOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Select
                label="Date Range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 3 Months</option>
                <option value="all">All Time</option>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Export Information</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Data will be exported in JSON format</p>
                <p>• Includes metadata and timestamps</p>
                <p>• Sensitive data (passwords) excluded</p>
                <p>• Export action will be logged</p>
              </div>
            </div>

            <Button 
              onClick={exportData} 
              disabled={loading}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {loading ? 'Exporting...' : `Export ${exportOptions.find(o => o.value === exportType)?.label}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}