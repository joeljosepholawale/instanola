import React, { useState } from 'react';
import { X, AlertTriangle, Ban, MessageSquare, Image, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface PaymentRejectionModalProps {
  payment: any;
  isOpen: boolean;
  onClose: () => void;
  onReject: (paymentId: string, reason: string) => Promise<void>;
}

export function PaymentRejectionModal({ payment, isOpen, onClose, onReject }: PaymentRejectionModalProps) {
  const [reason, setReason] = useState('');
  const [predefinedReason, setPredefinedReason] = useState('');
  const [loading, setLoading] = useState(false);

  const predefinedReasons = [
    { value: '', label: 'Select a reason...' },
    { value: 'insufficient_proof', label: 'Insufficient payment proof' },
    { value: 'invalid_reference', label: 'Invalid transaction reference' },
    { value: 'amount_mismatch', label: 'Amount does not match payment' },
    { value: 'duplicate_payment', label: 'Duplicate payment request' },
    { value: 'suspicious_activity', label: 'Suspicious activity detected' },
    { value: 'incomplete_information', label: 'Incomplete payment information' },
    { value: 'payment_not_found', label: 'Payment not found in our records' },
    { value: 'custom', label: 'Custom reason (specify below)' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalReason = predefinedReason === 'custom' ? reason : 
                       predefinedReasons.find(r => r.value === predefinedReason)?.label || reason;
    
    if (!finalReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setLoading(true);
      await onReject(payment.id, finalReason);
      handleClose();
    } catch (error) {
      console.error('Error rejecting payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setPredefinedReason('');
    onClose();
  };

  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Reject Payment</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Payment Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Payment Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">₦{payment.amountNGN?.toLocaleString()} (${payment.amountUSD?.toFixed(2)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sender:</span>
                <span className="font-medium">{payment.senderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reference:</span>
                <span className="font-mono text-xs">{payment.transactionReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Method:</span>
                <span className="capitalize">{payment.paymentMethod?.replace('_', ' ')}</span>
              </div>
              {payment.receiptUrl && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Receipt:</span>
                  <button
                    onClick={() => window.open(payment.receiptUrl, '_blank')}
                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <Image className="w-3 h-3" />
                    <span>View Receipt</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Rejection Reason"
              value={predefinedReason}
              onChange={(e) => setPredefinedReason(e.target.value)}
              required
            >
              {predefinedReasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </Select>

            {(predefinedReason === 'custom' || predefinedReason === '') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {predefinedReason === 'custom' ? 'Custom Reason' : 'Reason for Rejection'}
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Explain why this payment is being rejected..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required={predefinedReason === 'custom' || predefinedReason === ''}
                />
              </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Rejection Warning</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                This will permanently reject the payment request and notify the user via email. 
                This action cannot be undone.
              </p>
            </div>

            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || (!reason.trim() && predefinedReason === '') || (!reason.trim() && predefinedReason === 'custom')}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <Ban className="w-4 h-4 mr-2" />
                {loading ? 'Rejecting...' : 'Reject Payment'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}