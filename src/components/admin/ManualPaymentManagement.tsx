import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Image,
  ExternalLink,
  Download,
  Filter,
  Search,
  AlertTriangle,
  DollarSign,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { PaymentRejectionModal } from './PaymentRejectionModal';
import { ManualPaymentService } from '../../services/manualPaymentService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatCurrency, formatDate } from '../../lib/utils';

export function ManualPaymentManagement() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [filters, setFilters] = useState({
    status: 'pending',
    dateRange: '7d',
    search: '',
    paymentMethod: 'all'
  });

  useEffect(() => {
    loadPayments();
  }, [filters]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const allPayments = await ManualPaymentService.getAllPayments();
      
      // Apply filters
      let filteredPayments = allPayments;
      
      if (filters.status !== 'all') {
        filteredPayments = filteredPayments.filter(p => p.status === filters.status);
      }
      
      if (filters.paymentMethod !== 'all') {
        filteredPayments = filteredPayments.filter(p => p.paymentMethod === filters.paymentMethod);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredPayments = filteredPayments.filter(p => 
          p.senderName?.toLowerCase().includes(searchLower) ||
          p.transactionReference?.toLowerCase().includes(searchLower) ||
          p.senderPhone?.includes(filters.search)
        );
      }
      
      // Date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const days = parseInt(filters.dateRange.replace('d', ''));
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filteredPayments = filteredPayments.filter(p => p.submittedAt >= cutoff);
      }
      
      setPayments(filteredPayments);
    } catch (err) {
      console.error('Error loading payments:', err);
      error('Load Failed', 'Failed to load manual payments');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId: string) => {
    try {
      setProcessing(paymentId);
      const approved = await ManualPaymentService.approvePayment(paymentId, user!.id);
      
      if (approved) {
        success('Payment Approved', 'Payment has been approved and funds added to user wallet');
        await loadPayments();
      } else {
        error('Approval Failed', 'Failed to approve payment');
      }
    } catch (err) {
      console.error('Error approving payment:', err);
      error('Approval Failed', 'Failed to approve payment');
    } finally {
      setProcessing('');
    }
  };

  const handleReject = async (paymentId: string, reason: string) => {
    try {
      setProcessing(paymentId);
      const rejected = await ManualPaymentService.rejectPayment(paymentId, user!.id, reason);
      
      if (rejected) {
        success('Payment Rejected', 'Payment has been rejected and user notified');
        await loadPayments();
        setShowRejectionModal(false);
      } else {
        error('Rejection Failed', 'Failed to reject payment');
      }
    } catch (err) {
      console.error('Error rejecting payment:', err);
      error('Rejection Failed', 'Failed to reject payment');
    } finally {
      setProcessing('');
    }
  };

  const exportPayments = () => {
    try {
      const exportData = payments.map(payment => ({
        id: payment.id,
        userId: payment.userId,
        senderName: payment.senderName,
        senderPhone: payment.senderPhone,
        amountNGN: payment.amountNGN,
        amountUSD: payment.amountUSD,
        exchangeRate: payment.exchangeRate,
        transactionReference: payment.transactionReference,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        submittedAt: payment.submittedAt?.toISOString(),
        reviewedAt: payment.reviewedAt?.toISOString(),
        reviewedBy: payment.reviewedBy,
        rejectionReason: payment.rejectionReason
      }));
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manual-payments-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success('Export Complete', 'Manual payments data exported successfully');
    } catch (err) {
      error('Export Failed', 'Failed to export payments data');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(payments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPayments = payments.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manual Payment Management</h2>
          <p className="text-gray-600">Review and process manual Naira payments</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportPayments}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search by name, phone, or reference..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <Select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="pending">Pending Payments</option>
              <option value="approved">Approved Payments</option>
              <option value="rejected">Rejected Payments</option>
              <option value="all">All Payments</option>
            </Select>
            <Select
              value={filters.paymentMethod}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
            >
              <option value="all">All Methods</option>
              <option value="opay">OPAY</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </Select>
            <Select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Manual Payments ({payments.length})</span>
            <Button variant="ghost" size="sm" onClick={loadPayments}>
              <Eye className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader size="lg" text="Loading payments..." className="py-8" />
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payments Found</h3>
              <p className="text-gray-600">No manual payments match your current filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Sender</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Method</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Reference</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{payment.senderName}</p>
                          <p className="text-sm text-gray-600">{payment.userEmail || 'No email'}</p>
                          {payment.senderPhone && (
                            <p className="text-xs text-gray-500">{payment.senderPhone}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-gray-900">₦{payment.amountNGN?.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">${payment.amountUSD?.toFixed(2)}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize text-sm">
                          {payment.paymentMethod?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-mono text-sm">{payment.transactionReference}</p>
                          {payment.receiptUrl && (
                            <button
                              onClick={() => window.open(payment.receiptUrl, '_blank')}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1 mt-1"
                            >
                              <Image className="w-3 h-3" />
                              <span>View Receipt</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(payment.status)}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(payment.submittedAt)}
                      </td>
                      <td className="py-3 px-4">
                        {payment.status === 'pending' && (
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(payment.id)}
                              disabled={processing === payment.id}
                            >
                              {processing === payment.id ? (
                                <Clock className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowRejectionModal(true);
                              }}
                              disabled={processing === payment.id}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            {payment.receiptUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(payment.receiptUrl, '_blank')}
                                title="View Receipt"
                              >
                                <Image className="w-4 h-4" />
                              </Button>
                            )}
                            {payment.receiptUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(payment.receiptUrl, '_blank')}
                                title="View Receipt Image"
                              >
                                <Image className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                        {payment.status === 'rejected' && payment.rejectionReason && (
                          <div className="text-xs text-red-600" title={payment.rejectionReason}>
                            Reason: {payment.rejectionReason.substring(0, 20)}...
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, payments.length)} of {payments.length} payments
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
          )}
        </CardContent>
      </Card>

      {/* Payment Rejection Modal */}
      <PaymentRejectionModal
        payment={selectedPayment}
        isOpen={showRejectionModal}
        onClose={() => {
          setShowRejectionModal(false);
          setSelectedPayment(null);
        }}
        onReject={handleReject}
      />
    </div>
  );
}