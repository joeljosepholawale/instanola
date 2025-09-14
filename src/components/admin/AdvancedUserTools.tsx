import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Eye, 
  Edit, 
  Ban, 
  CheckCircle, 
  Search,
  Filter,
  Download,
  UserCheck,
  MessageSquare,
  Activity,
  Clock,
  DollarSign,
  Shield,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { UserDetailsModal } from './UserDetailsModal';
import { EditUserModal } from './EditUserModal';
import { AddFundsModal } from './AddFundsModal';
import { BulkActionsModal } from './BulkActionsModal';
import { AdminUserService } from '../../services/adminUserService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatCurrency, formatDate } from '../../lib/utils';

export function AdvancedUserTools() {
  const { user: adminUser } = useAuth();
  const { success, error } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  
  // Modal states
  const [selectedUserId, setSelectedUserId] = useState('');
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await AdminUserService.getAllUsers();
      
      // Load additional statistics for each user
      const usersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          try {
            const stats = await AdminUserService.getUserStatistics(user.id);
            return { ...user, ...stats };
          } catch (error) {
            console.warn(`Failed to load stats for user ${user.id}:`, error);
            return user;
          }
        })
      );
      
      setUsers(usersWithStats);
    } catch (err) {
      console.error('Error loading users:', err);
      error('Load Failed', 'Failed to load user data');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: string, data?: any) => {
    try {
      console.log(`Admin action: ${action} for user ${userId}`);
      
      switch (action) {
        case 'block':
          await AdminUserService.updateUserStatus(userId, adminUser!.id, {
            isBlocked: true,
            notes: data?.reason || 'Blocked by admin'
          });
          success('User Blocked', 'User has been blocked and cannot access the platform');
          break;
          
        case 'unblock':
          await AdminUserService.updateUserStatus(userId, adminUser!.id, {
            isBlocked: false,
            notes: data?.reason || 'Unblocked by admin'
          });
          success('User Unblocked', 'User can now access the platform');
          break;
          
        case 'make_admin':
          await AdminUserService.updateUserStatus(userId, adminUser!.id, {
            isAdmin: true,
            notes: 'Promoted to admin'
          });
          success('Admin Promoted', 'User has been promoted to admin');
          break;
          
        case 'remove_admin':
          await AdminUserService.updateUserStatus(userId, adminUser!.id, {
            isAdmin: false,
            notes: 'Admin privileges removed'
          });
          success('Admin Removed', 'Admin privileges have been removed');
          break;
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      // Force reload users to reflect changes immediately
      setTimeout(async () => {
        await loadUsers();
      }, 1000);
      
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      error('Action Failed', err instanceof Error ? err.message : `Failed to ${action} user`);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const exportUsers = () => {
    try {
      const exportData = filteredUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        walletBalance: user.walletBalance,
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked,
        totalSpent: user.totalSpent,
        totalRentals: user.totalRentals,
        successRate: user.successRate,
        createdAt: user.createdAt?.toISOString(),
        lastActive: user.lastActive?.toISOString()
      }));
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success('Export Complete', 'User data exported successfully');
    } catch (err) {
      error('Export Failed', 'Failed to export user data');
    }
  };

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = user.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
                           user.email?.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = filters.status === 'all' || 
                           (filters.status === 'admin' && user.isAdmin) ||
                           (filters.status === 'blocked' && user.isBlocked) ||
                           (filters.status === 'active' && !user.isBlocked && !user.isAdmin);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[filters.sortBy];
      const bValue = b[filters.sortBy];
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced User Tools</h2>
          <p className="text-gray-600">Comprehensive user management and administration</p>
        </div>
        <div className="flex items-center space-x-2">
          {selectedUsers.length > 0 && (
            <Button onClick={() => setShowBulkActions(true)}>
              <Users className="w-4 h-4 mr-2" />
              Bulk Actions ({selectedUsers.length})
            </Button>
          )}
          <Button variant="outline" onClick={exportUsers}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadUsers}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <Select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="all">All Users</option>
              <option value="active">Active Users</option>
              <option value="admin">Admins</option>
              <option value="blocked">Blocked Users</option>
            </Select>
            <Select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            >
              <option value="createdAt">Join Date</option>
              <option value="name">Name</option>
              <option value="walletBalance">Balance</option>
              <option value="totalSpent">Total Spent</option>
              <option value="totalRentals">Total Rentals</option>
            </Select>
            <Select
              value={filters.sortOrder}
              onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Users ({filteredUsers.length})</span>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">Select All</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader size="lg" text="Loading users..." className="py-8" />
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
              <p className="text-gray-600">No users match your current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === filteredUsers.length}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Balance</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Activity</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Joined</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {user.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(user.walletBalance || 0)}
                          </p>
                          {user.totalSpent && (
                            <p className="text-xs text-gray-500">
                              Spent: {formatCurrency(user.totalSpent)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <p className="text-gray-900">{user.totalRentals || 0} rentals</p>
                          <p className="text-xs text-gray-500">
                            {user.successRate || 0}% success rate
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col space-y-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.isAdmin ? 'bg-purple-100 text-purple-800' :
                            user.isBlocked ? 'bg-red-100 text-red-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.isAdmin ? 'Admin' : user.isBlocked ? 'Blocked' : 'Active'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setShowUserDetails(true);
                            }}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setShowEditUser(true);
                            }}
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setShowAddFunds(true);
                            }}
                            title="Add Funds"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                          {user.isBlocked ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUserAction(user.id, 'unblock')}
                              title="Unblock User"
                              className="text-green-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUserAction(user.id, 'block')}
                              title="Block User"
                              className="text-red-600"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
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
          loadUsers();
          setShowEditUser(false);
        }}
      />

      <AddFundsModal
        userId={selectedUserId}
        isOpen={showAddFunds}
        onClose={() => setShowAddFunds(false)}
        onSuccess={() => {
          loadUsers();
          setShowAddFunds(false);
        }}
      />

      <BulkActionsModal
        selectedUsers={selectedUsers}
        isOpen={showBulkActions}
        onClose={() => setShowBulkActions(false)}
        onSuccess={() => {
          loadUsers();
          setSelectedUsers([]);
          setShowBulkActions(false);
        }}
      />
    </div>
  );
}