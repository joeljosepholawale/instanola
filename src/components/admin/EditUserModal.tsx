import React, { useState, useEffect } from 'react';
import { X, User, Shield, AlertTriangle, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AdminUserService } from '../../services/adminUserService';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface EditUserModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserModal({ userId, isOpen, onClose, onSuccess }: EditUserModalProps) {
  const { success, error } = useToast();
  const { user: adminUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    isAdmin: false,
    isBlocked: false,
    notes: ''
  });

  useEffect(() => {
    if (isOpen && userId) {
      loadUser();
    }
  }, [isOpen, userId]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() };
        setUser(userData);
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          isAdmin: userData.isAdmin || false,
          isBlocked: userData.isBlocked || false,
          notes: userData.notes || ''
        });
      }
    } catch (err) {
      console.error('Error loading user:', err);
      error('Load Failed', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const updates = {
        name: formData.name,
        email: formData.email,
        isAdmin: formData.isAdmin,
        isBlocked: formData.isBlocked,
        notes: formData.notes
      };

      // Security: Use actual admin user ID
      if (!adminUser?.id) {
        throw new Error('Admin user not found');
      }
      
      await AdminUserService.updateUserStatus(userId, adminUser.id, updates);
      
      success('User Updated', 'User information has been updated successfully');
      onSuccess();
    } catch (err) {
      console.error('Error updating user:', err);
      error('Update Failed', 'Failed to update user information');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading user data...</p>
            </div>
          ) : user ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Admin Access</h4>
                    <p className="text-sm text-gray-600">Grant administrative privileges</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isAdmin}
                    onChange={(e) => setFormData(prev => ({ ...prev, isAdmin: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Block User</h4>
                    <p className="text-sm text-gray-600">Prevent user from accessing the platform</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isBlocked}
                    onChange={(e) => setFormData(prev => ({ ...prev, isBlocked: e.target.checked }))}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Internal notes about this user..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              {formData.isBlocked && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-red-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Warning</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    Blocking this user will prevent them from logging in and using the platform.
                  </p>
                </div>
              )}

              <div className="flex space-x-3">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">User not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}