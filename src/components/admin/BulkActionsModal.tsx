import React, { useState } from 'react';
import { X, Users, Mail, DollarSign, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../../hooks/useToast';
import { AdminUserService } from '../../services/adminUserService';
import { useAuth } from '../../hooks/useAuth';

interface BulkActionsModalProps {
  selectedUsers: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkActionsModal({ selectedUsers, isOpen, onClose, onSuccess }: BulkActionsModalProps) {
  const { user: adminUser } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!action) {
      error('Action Required', 'Please select an action to perform');
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let failCount = 0;

      for (const userId of selectedUsers) {
        try {
          switch (action) {
            case 'add_funds':
              if (!amount || !reason) {
                throw new Error('Amount and reason required for adding funds');
              }
              await AdminUserService.addFundsToUser({
                userId,
                amount: parseFloat(amount),
                reason,
                adminUserId: adminUser!.id
              });
              break;

            case 'block_users':
              await AdminUserService.updateUserStatus(userId, adminUser!.id, {
                isBlocked: true,
                notes: reason || 'Bulk blocked by admin'
              });
              break;

            case 'unblock_users':
              await AdminUserService.updateUserStatus(userId, adminUser!.id, {
                isBlocked: false,
                notes: reason || 'Bulk unblocked by admin'
              });
              break;

            case 'send_email':
              // TODO: Implement bulk email sending
              console.log('Would send email to user:', userId);
              break;

            default:
              throw new Error('Unknown action');
          }
          successCount++;
        } catch (err) {
          console.error(`Error processing user ${userId}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        success(
          'Bulk Action Complete',
          `Successfully processed ${successCount} users${failCount > 0 ? `, ${failCount} failed` : ''}`
        );
      } else {
        error('Bulk Action Failed', 'No users were processed successfully');
      }

      onSuccess();
    } catch (err) {
      console.error('Error in bulk action:', err);
      error('Bulk Action Failed', 'Failed to process bulk action');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAction('');
    setAmount('');
    setReason('');
    setEmailSubject('');
    setEmailMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Bulk Actions</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-blue-800">
                <Users className="w-4 h-4" />
                <span className="font-medium">{selectedUsers.length} users selected</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              required
            >
              <option value="">Select an action...</option>
              <option value="add_funds">Add Funds to All</option>
              <option value="block_users">Block Users</option>
              <option value="unblock_users">Unblock Users</option>
              <option value="send_email">Send Email</option>
            </Select>

            {action === 'add_funds' && (
              <>
                <Input
                  label="Amount (USD)"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="10.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <Input
                  label="Reason"
                  placeholder="Why are you adding funds?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </>
            )}

            {(action === 'block_users' || action === 'unblock_users') && (
              <Input
                label="Reason"
                placeholder={`Why ${action === 'block_users' ? 'block' : 'unblock'} these users?`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}

            {action === 'send_email' && (
              <>
                <Input
                  label="Email Subject"
                  placeholder="Subject line for the email"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Message
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Email content..."
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {action && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-yellow-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Bulk Action Warning</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  This action will be applied to {selectedUsers.length} users. 
                  This action cannot be undone.
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !action} className="flex-1">
                {loading ? 'Processing...' : `Apply to ${selectedUsers.length} Users`}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}