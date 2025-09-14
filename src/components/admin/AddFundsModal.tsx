import React, { useState, useEffect } from 'react';
import { X, Wallet, Plus, Minus, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { AdminUserService } from '../../services/adminUserService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency } from '../../lib/utils';

interface AddFundsModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddFundsModal({ userId, isOpen, onClose, onSuccess }: AddFundsModalProps) {
  const { user: adminUser } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    action: 'add',
    amount: '',
    reason: ''
  });

  useEffect(() => {
    if (isOpen && userId) {
      loadUser();
    }
  }, [isOpen, userId]);

  const loadUser = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUser({ id: userDoc.id, ...userDoc.data() });
      }
    } catch (err) {
      console.error('Error loading user:', err);
      error('Load Failed', 'Failed to load user data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      error('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!formData.reason.trim()) {
      error('Reason Required', 'Please provide a reason for adding funds');
      return;
    }

    if (formData.reason.trim().length < 5) {
      error('Reason Too Short', 'Reason must be at least 5 characters long');
      return;
    }

    // Check if removing funds would result in negative balance
    if (formData.action === 'remove') {
      const currentBalance = user?.walletBalance || 0;
      const removeAmount = parseFloat(formData.amount);
      if (removeAmount > currentBalance) {
        error('Insufficient Balance', `Cannot remove $${removeAmount.toFixed(2)}. User only has ${formatCurrency(currentBalance)}`);
        return;
      }
    }

    try {
      setLoading(true);
      
      const addition = {
        userId: userId,
        amount: formData.action === 'add' ? parseFloat(formData.amount) : -parseFloat(formData.amount),
        reason: formData.reason.trim(),
        adminUserId: adminUser!.id
      };

      await AdminUserService.addFundsToUser(addition);
      
      const actionText = formData.action === 'add' ? 'added' : 'removed';
      const preposition = formData.action === 'add' ? 'to' : 'from';
      success(
        `Funds ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`, 
        `Successfully ${actionText} ${formatCurrency(parseFloat(formData.amount))} ${preposition} user wallet`
      );
      handleSuccess();
    } catch (err) {
      console.error('Error adding funds:', err);
      error('Operation Failed', err instanceof Error ? err.message : `Failed to ${formData.action} funds`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ action: 'add', amount: '', reason: '' });
    onClose();
  };

  const handleSuccess = () => {
    setFormData({ action: 'add', amount: '', reason: '' });
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {formData.action === 'add' ? 'Add Funds' : 'Remove Funds'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {user && (
            <div className="mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                    <p className="text-xs text-gray-600">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-700">Balance</p>
                    <p className="text-lg font-bold text-blue-900">
                      {formatCurrency(user.walletBalance || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Action"
              value={formData.action}
              onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value }))}
            >
              <option value="add">Add Funds</option>
              <option value="remove">Remove Funds</option>
            </Select>

            <Input
              label={`Amount to ${formData.action === 'add' ? 'Add' : 'Remove'} (USD)`}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="10.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              required
            />

            <Input
              label="Reason"
              placeholder={`Why ${formData.action === 'add' ? 'add' : 'remove'} funds?`}
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              required
            />

            {formData.action === 'remove' && formData.amount && parseFloat(formData.amount) > (user?.walletBalance || 0) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-red-800 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Insufficient balance</span>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  loading || 
                  !formData.amount || 
                  !formData.reason.trim() ||
                  (formData.action === 'remove' && parseFloat(formData.amount) > (user?.walletBalance || 0))
                }
                className="flex-1"
                variant={formData.action === 'remove' ? 'outline' : 'primary'}
              >
                {formData.action === 'add' ? (
                  <Plus className="w-4 h-4 mr-2" />
                ) : (
                  <Minus className="w-4 h-4 mr-2" />
                )}
                {loading 
                  ? (formData.action === 'add' ? 'Adding...' : 'Removing...') 
                  : (formData.action === 'add' ? 'Add Funds' : 'Remove Funds')
                }
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}