import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  User, 
  DollarSign, 
  Mail, 
  Shield, 
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Clock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { AdminUserService } from '../../services/adminUserService';
import { formatDate } from '../../lib/utils';

interface AdminActivity {
  id: string;
  action: string;
  adminUserId: string;
  targetUserId?: string;
  amount?: number;
  reason?: string;
  timestamp: Date;
  details?: any;
}

export function AdminActivityLog() {
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const activityLog = await AdminUserService.getAdminActivityLog();
      setActivities(activityLog);
    } catch (error) {
      console.error('Error loading admin activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'add_funds':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'update_user_status':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'approve_manual_payment':
        return <Shield className="w-4 h-4 text-green-600" />;
      case 'reject_manual_payment':
        return <Shield className="w-4 h-4 text-red-600" />;
      case 'send_support_reply':
        return <Mail className="w-4 h-4 text-purple-600" />;
      case 'manual_refund':
        return <RefreshCw className="w-4 h-4 text-orange-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'add_funds':
      case 'approve_manual_payment':
        return 'bg-green-50 border-green-200';
      case 'reject_manual_payment':
        return 'bg-red-50 border-red-200';
      case 'update_user_status':
        return 'bg-blue-50 border-blue-200';
      case 'send_support_reply':
        return 'bg-purple-50 border-purple-200';
      case 'manual_refund':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatActionDescription = (activity: AdminActivity) => {
    switch (activity.action) {
      case 'add_funds':
        return `Added ${activity.amount ? `$${activity.amount.toFixed(2)}` : 'funds'} to user wallet`;
      case 'update_user_status':
        return 'Updated user account status';
      case 'approve_manual_payment':
        return `Approved manual payment${activity.amount ? ` of $${activity.amount.toFixed(2)}` : ''}`;
      case 'reject_manual_payment':
        return `Rejected manual payment${activity.amount ? ` of $${activity.amount.toFixed(2)}` : ''}`;
      case 'send_support_reply':
        return 'Replied to support ticket';
      case 'manual_refund':
        return `Processed manual refund${activity.amount ? ` of $${activity.amount.toFixed(2)}` : ''}`;
      default:
        return activity.action.replace(/_/g, ' ');
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || activity.action === filter;
    
    // Date range filter
    const now = new Date();
    const activityDate = activity.timestamp;
    let matchesDate = true;
    
    switch (dateRange) {
      case '1d':
        matchesDate = (now.getTime() - activityDate.getTime()) <= 24 * 60 * 60 * 1000;
        break;
      case '7d':
        matchesDate = (now.getTime() - activityDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        matchesDate = (now.getTime() - activityDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
        break;
    }
    
    return matchesSearch && matchesFilter && matchesDate;
  });

  const exportActivities = () => {
    try {
      const blob = new Blob([JSON.stringify(filteredActivities, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-activity-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting activities:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Admin Activity Log</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={loadActivities} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportActivities}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Input
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Actions</option>
            <option value="add_funds">Fund Additions</option>
            <option value="update_user_status">User Updates</option>
            <option value="approve_manual_payment">Payment Approvals</option>
            <option value="reject_manual_payment">Payment Rejections</option>
            <option value="send_support_reply">Support Replies</option>
            <option value="manual_refund">Manual Refunds</option>
          </Select>
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </Select>
        </div>

        {/* Activity List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading activities...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Activities Found</h3>
            <p className="text-gray-600">No admin activities match your current filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((activity) => (
              <div 
                key={activity.id} 
                className={`border rounded-lg p-4 ${getActionColor(activity.action)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      {getActionIcon(activity.action)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 capitalize">
                        {formatActionDescription(activity)}
                      </h4>
                      {activity.reason && (
                        <p className="text-sm text-gray-600 mt-1">{activity.reason}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(activity.timestamp)}</span>
                        </span>
                        {activity.targetUserId && (
                          <span>Target: {activity.targetUserId.substring(0, 8)}...</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {activity.amount && (
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">
                        ${activity.amount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}