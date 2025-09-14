import React, { useState, useEffect } from 'react';
import { X, User, Wallet, Activity, Calendar, Mail, Phone, Globe, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Loader } from '../ui/Loader';
import { formatCurrency, formatDate } from '../../lib/utils';
import { AdminUserService } from '../../services/adminUserService';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface UserDetailsModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserDetailsModal({ userId, isOpen, onClose }: UserDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && userId) {
      loadUserDetails();
    }
  }, [isOpen, userId]);

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      
      // Load user data
      const allUsers = await AdminUserService.getAllUsers();
      const userData = allUsers.find(u => u.id === userId);
      setUser(userData);
      
      // Load user statistics
      const stats = await AdminUserService.getUserStatistics(userId);
      setUserStats(stats);
      
      // Load user transactions
      try {
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', userId),
          limit(10)
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const userTransactions = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        setTransactions(userTransactions);
      } catch (error) {
        console.warn('Could not load user transactions:', error);
        setTransactions([]);
      }
      
      // Load user rentals
      try {
        const rentalsQuery = query(
          collection(db, 'rentals'),
          where('userId', '==', userId),
          limit(10)
        );
        const rentalsSnapshot = await getDocs(rentalsQuery);
        const userRentals = rentalsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          expiresAt: doc.data().expiresAt?.toDate() || new Date()
        }));
        setRentals(userRentals);
      } catch (error) {
        console.warn('Could not load user rentals:', error);
        setRentals([]);
      }
      
    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">User Details</h2>
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
            <Loader size="lg" text="Loading user details..." className="py-12" />
          ) : user ? (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="w-5 h-5" />
                      <span>Profile</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium text-gray-900">{user.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium text-gray-900">{user.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.isAdmin ? 'bg-purple-100 text-purple-800' :
                          user.isBlocked ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.isAdmin ? 'Admin' : user.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Joined</p>
                        <p className="font-medium text-gray-900">{formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Wallet className="w-5 h-5" />
                      <span>Wallet</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {formatCurrency(user.walletBalance || 0)}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">Current Balance</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5" />
                      <span>Statistics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Spent</span>
                        <span className="font-semibold">{formatCurrency(userStats.totalSpent || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Rentals</span>
                        <span className="font-semibold">{userStats.totalRentals || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Success Rate</span>
                        <span className="font-semibold text-green-600">{userStats.successRate || 0}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No transactions</p>
                    ) : (
                      <div className="space-y-3">
                        {transactions.map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {transaction.description?.replace(/<[^>]*>/g, '') || 'Transaction'}
                              </p>
                              <p className="text-xs text-gray-600">{formatDate(transaction.createdAt)}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold text-sm ${
                                transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">{transaction.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Rentals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {rentals.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No rentals</p>
                    ) : (
                      <div className="space-y-3">
                        {rentals.map((rental) => (
                          <div key={rental.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-gray-900 text-sm">{rental.service}</p>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                rental.status === 'completed' ? 'bg-green-100 text-green-800' :
                                rental.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {rental.status}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>{rental.number?.toString().replace(/[^0-9+]/g, '') || 'N/A'}</span>
                              <span>{formatCurrency(rental.userPrice || 0)}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(rental.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
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