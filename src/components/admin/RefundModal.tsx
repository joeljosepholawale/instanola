import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PaymentRefundService } from '../../services/paymentRefundService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency } from '../../lib/utils';

interface RefundModalProps {
  transactionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RefundModal({ transactionId, isOpen, onClose, onSuccess }: RefundModalProps) {
  const { user: adminUser } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen && transactionId) {
      loadTransaction();
    }
  }, [isOpen, transactionId]);

  const loadTransaction = async () => {
    try {
      const transactionDoc = await getDoc(doc(db, 'transactions', transactionId));
      if (transactionDoc.exists()) {
        setTransaction({ id: transactionDoc.id, ...transactionDoc.data() });
      }
    } catch (err) {
      console.error('Error loading transaction:', err);
      error('Load Failed', 'Failed to load transaction data');
    }
  };

  const handleRefund = async () => {
    if (!reason.trim()) {
      error('Reason Required', 'Please provide a reason for the refund');
      return;
    }

    try {
      setLoading(true);
      
      await PaymentRefundService.manualRefund(transactionId, adminUser!.id, reason);
      
      success('Refund Processed', 'Manual refund has been processed successfully');
      onSuccess();
    } catch (err) {
      console.error('Error processing refund:', err);
      error('Refund Failed', 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Process Refund</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {transaction && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Transaction Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono">{transaction.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold">{formatCurrency(Math.abs(transaction.amount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="capitalize">{transaction.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="capitalize">{transaction.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <span className="capitalize">{transaction.provider?.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              <Input
                label="Refund Reason"
                placeholder="Explain why this refund is being processed..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-yellow-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Refund Warning</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  This will add {formatCurrency(Math.abs(transaction.amount))} back to the user's wallet 
                  and send them an email notification.
                </p>
              </div>

              <div className="flex space-x-3">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleRefund} disabled={loading} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {loading ? 'Processing...' : 'Process Refund'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}