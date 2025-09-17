import { Users, DollarSign, Activity, Settings, Shield, Bell, RefreshCw, Eye } from 'lucide-react';
import { ResponsiveAdminLayout } from '../../components/admin/ResponsiveAdminLayout';
import { AdminOverview } from '../../components/admin/AdminOverview';
import { UserImpersonation } from '../../components/admin/UserImpersonation';
import { useNavigate } from 'react-router-dom';
import { DataExportTools } from '../../components/admin/DataExportTools';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loader } from '../../components/ui/Loader';
import { UserDetailsModal } from '../../components/admin/UserDetailsModal';
import { EditUserModal } from '../../components/admin/EditUserModal';
import { AddFundsModal } from '../../components/admin/AddFundsModal';
import { RefundModal } from '../../components/admin/RefundModal';
import { PaymentRejectionModal } from '../../components/admin/PaymentRejectionModal';
import { SupportReplyModal } from '../../components/admin/SupportReplyModal';
import { EmailConfigModal } from '../../components/admin/EmailConfigModal';
import { ManualPaymentService } from '../../services/manualPaymentService';
import { ManualPaymentManagement } from '../../components/admin/ManualPaymentManagement';
import { SMSNumberManagement } from '../../components/admin/SMSNumberManagement';
import { FinancialManagement } from '../../components/admin/FinancialManagement';
import { SystemConfiguration } from '../../components/admin/SystemConfiguration';
import { AdvancedUserTools } from '../../components/admin/AdvancedUserTools';
import { SecurityCompliance } from '../../components/admin/SecurityCompliance';
import { SupportManagement } from '../../components/admin/SupportManagement';
import { APIManagement } from '../../components/admin/APIManagement';
import { ManualServicePricing } from '../../components/admin/ManualServicePricing';
import { SupportService } from '../../services/supportService';
import { AdminUserService } from '../../services/adminUserService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useState, useEffect } from 'react';

export function AdminPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Security: Verify admin access
  useEffect(() => {
    if (user && user.isAdmin !== true) {
      console.warn('Non-admin user attempted to access admin panel:', user.email);
      error('Access Denied', 'You do not have admin privileges');
      navigate('/dashboard');
      return;
    } else if (user && user.isAdmin === true) {
      console.log('✅ Admin user verified, access granted:', user.email);
      // Clear any security flags that might cause logout loops
      localStorage.removeItem('suspicious_activity');
      localStorage.removeItem('session_blocked');
    }
  }, [user, navigate, error]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<any>(null);
  
  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState<any>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // Modal states
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('');
  const [selectedSupportMessage, setSelectedSupportMessage] = useState<any>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showPaymentRejection, setShowPaymentRejection] = useState(false);
  const [showSupportReply, setShowSupportReply] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  
  // Filter states
  const [userFilter, setUserFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('pending');
  const [supportStatusFilter, setSupportStatusFilter] = useState('open');
  const [dateRange, setDateRange] = useState('7d');
  const [stats, setStats] = useState<any>({});

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load all necessary data with error handling
      try {
        const usersData = await AdminUserService.getAllUsers();
        setUsers(usersData);
      } catch (err) {
        console.error('Error loading users:', err);
        setUsers([]);
      }
      
      try {
        const paymentsData = await ManualPaymentService.getAllPayments();
        setPendingPayments(paymentsData);
      } catch (err) {
        console.error('Error loading payments:', err);
        setPendingPayments([]);
      }
      
      try {
        const messages = await SupportService.getAllSupportMessages();
        setSupportMessages(messages);
      } catch (err) {
        console.error('Error loading support messages:', err);
        setSupportMessages([]);
      }
      
      // Load system stats after data is available
      await loadSystemStats();
      await loadRecentActivity();
      
    } catch (err) {
      console.error('Error loading admin data:', err);
      error('Load Failed', 'Failed to load some admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = (userId: string) => {
    setImpersonating(true);
    setImpersonatedUser({ id: userId });
    // In a real implementation, you would switch the user context
  };

  const handleStopImpersonation = () => {
    setImpersonating(false);
    setImpersonatedUser(null);
  };

  const loadSystemStats = async () => {
    try {
      // Load various system statistics
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => !u.isBlocked).length,
        totalRevenue: 0,
        pendingPayments: pendingPayments.length,
        openTickets: supportMessages.filter(m => m.status === 'open').length,
        systemHealth: 'healthy'
      };

      // Load financial stats
      try {
        const profitDoc = await getDoc(doc(db, 'system', 'profit_tracking'));
        if (profitDoc.exists()) {
          const profitData = profitDoc.data();
          stats.totalRevenue = profitData.totalProfit || 0;
          stats.totalDaisySpent = profitData.totalDaisySpent || 0;
          stats.totalUserCharged = profitData.totalUserCharged || 0;
          stats.totalRentals = profitData.totalRentals || 0;
        }
      } catch (err) {
        console.warn('Could not load profit tracking:', err);
      }

      setSystemStats(stats);
    } catch (err) {
      console.error('Error loading system stats:', err);
      setSystemStats({});
    }
  };

  const loadRecentActivity = async () => {
    try {
      const activity = await AdminUserService.getAdminActivityLog();
      setRecentActivity(activity.slice(0, 10)); // Last 10 activities
    } catch (err) {
      console.error('Error loading recent activity:', err);
      setRecentActivity([]);
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      const success = await ManualPaymentService.approvePayment(paymentId, user!.id);
      if (success) {
        success('Payment Approved', 'Payment has been approved and funds added to user wallet');
        await loadAdminData();
      } else {
        error('Approval Failed', 'Failed to approve payment');
      }
    } catch (err) {
      console.error('Error approving payment:', err);
      error('Approval Failed', 'Failed to approve payment');
    }
  };

  const handleRejectPayment = async (paymentId: string, reason: string) => {
    try {
      const rejected = await ManualPaymentService.rejectPayment(paymentId, user!.id, reason);
      if (rejected) {
        success('Payment Rejected', 'Payment has been rejected and user notified');
        await loadAdminData();
      } else {
        error('Rejection Failed', 'Failed to reject payment');
      }
    } catch (err) {
      console.error('Error rejecting payment:', err);
      error('Rejection Failed', 'Failed to reject payment');
    }
  };

  const exportData = (type: 'users' | 'payments' | 'support' | 'activity') => {
    try {
      let data: any[] = [];
      let filename = '';

      switch (type) {
        case 'users':
          data = users;
          filename = 'users-export';
          break;
        case 'payments':
          data = pendingPayments;
          filename = 'payments-export';
          break;
        case 'support':
          data = supportMessages;
          filename = 'support-export';
          break;
        case 'activity':
          data = recentActivity;
          filename = 'activity-export';
          break;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success('Export Complete', `${type} data exported successfully`);
    } catch (err) {
      error('Export Failed', `Failed to export ${type} data`);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(userFilter.toLowerCase()) ||
                         user.email?.toLowerCase().includes(userFilter.toLowerCase());
    const matchesStatus = userStatusFilter === 'all' || 
                         (userStatusFilter === 'active' && !user.isBlocked && !user.isAdmin) ||
                         (userStatusFilter === 'admin' && user.isAdmin) ||
                         (userStatusFilter === 'blocked' && user.isBlocked);
    return matchesSearch && matchesStatus;
  });

  const filteredPayments = pendingPayments.filter(payment => 
    paymentStatusFilter === 'all' || payment.status === paymentStatusFilter
  );

  const filteredSupport = supportMessages.filter(message => 
    supportStatusFilter === 'all' || message.status === supportStatusFilter
  );

  useEffect(() => {
    loadAdminData();
  }, []);

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </Card>
      </div>
    );
  }


  return (
    <>
    <ResponsiveAdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {/* Impersonation Banner */}
      {impersonating && (
        <div className="bg-orange-100 border border-orange-300 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-orange-800">
              <Eye className="w-4 h-4" />
              <span className="font-medium">
                Viewing as: {impersonatedUser?.name || 'User'}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={handleStopImpersonation}>
              Stop Impersonation
            </Button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {loading ? (
        <Loader size="lg" text="Loading admin data..." className="py-12" />
      ) : (
        <>
          {activeTab === 'overview' && <AdminOverview />}
          {activeTab === 'payments' && <ManualPaymentManagement />}
          {activeTab === 'sms' && <SMSNumberManagement />}
          {activeTab === 'financial' && <FinancialManagement />}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <AdvancedUserTools />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <UserImpersonation
                  onSuccess={() => {
                    // Navigate to dashboard when impersonation starts
                    navigate('/dashboard');
                  }}
                />
                <DataExportTools />
              </div>
            </div>
          )}
          {activeTab === 'support' && <SupportManagement />}
          {activeTab === 'security' && <SecurityCompliance />}
          {activeTab === 'api' && <APIManagement />}
          {activeTab === 'manual-service' && <ManualServicePricing />}
          {activeTab === 'config' && <SystemConfiguration />}
        </>
      )}
    </ResponsiveAdminLayout>

    {/* Global Modals */}
    <UserDetailsModal
      userId={selectedUserId}
      isOpen={showUserDetails}
      onClose={() => setShowUserDetails(false)}
    />

    <EditUserModal
      userId={selectedUserId}
      isOpen={showEditUser}
      onClose={() => setShowEditUser(false)}
      onSuccess={() => {
        loadAdminData();
        setShowEditUser(false);
      }}
    />

    <AddFundsModal
      userId={selectedUserId}
      isOpen={showAddFunds}
      onClose={() => setShowAddFunds(false)}
      onSuccess={() => {
        loadAdminData();
        setShowAddFunds(false);
      }}
    />

    <RefundModal
      transactionId={selectedTransactionId}
      isOpen={showRefund}
      onClose={() => setShowRefund(false)}
      onSuccess={() => {
        loadAdminData();
        setShowRefund(false);
      }}
    />

    <PaymentRejectionModal
      payment={pendingPayments.find(p => p.id === selectedPaymentId)}
      isOpen={showPaymentRejection}
      onClose={() => setShowPaymentRejection(false)}
      onReject={handleRejectPayment}
    />

    <SupportReplyModal
      message={selectedSupportMessage}
      isOpen={showSupportReply}
      onClose={() => setShowSupportReply(false)}
      onSuccess={() => {
        loadAdminData();
        setShowSupportReply(false);
      }}
    />

    <EmailConfigModal
      isOpen={showEmailConfig}
      onClose={() => setShowEmailConfig(false)}
    />
    </>
  );
}

export default AdminPage;