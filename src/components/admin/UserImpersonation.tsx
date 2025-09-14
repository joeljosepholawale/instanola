import React, { useState } from 'react';
import { User, Eye, Shield, AlertTriangle, LogIn, LogOut, Search, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency } from '../../lib/utils';
import { SecurityService } from '../../services/securityService';

interface UserImpersonationProps {
  onSuccess?: () => void;
}

export function UserImpersonation({ onSuccess }: UserImpersonationProps) {
  const { user: adminUser, realUser, impersonatedUser, isImpersonating, startImpersonation, stopImpersonation } = useAuth();
  const { success, error } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      error('Search Term Required', 'Please enter a user ID, email, or name');
      return;
    }

    try {
      setLoading(true);
      setSearchResults([]);
      
      console.log('Searching for users with term:', searchTerm);
      
      // Search by multiple criteria
      const usersRef = collection(db, 'users');
      let results: any[] = [];

      // Try to find by ID first
      try {
        const userDoc = await getDoc(doc(db, 'users', searchTerm));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          results.push({ 
            id: userDoc.id, 
            ...userData,
            createdAt: userData.createdAt?.toDate() || new Date(),
            lastActive: userData.lastActive?.toDate()
          });
          console.log('Found user by ID:', userDoc.id);
        }
      } catch (err) {
        console.log('ID search failed, continuing with other searches');
      }

      // Search by email if no results and search term contains @
      if (results.length === 0 && searchTerm.includes('@')) {
        console.log('Searching by email:', searchTerm);
        const emailQuery = query(usersRef, where('email', '==', searchTerm));
        const emailSnapshot = await getDocs(emailQuery);
        emailSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          results.push({ 
            id: doc.id, 
            ...userData,
            createdAt: userData.createdAt?.toDate() || new Date(),
            lastActive: userData.lastActive?.toDate()
          });
          console.log('Found user by email:', doc.id);
        });
      }

      // Search by name (partial match) if still no results
      if (results.length === 0) {
        console.log('Searching by name pattern:', searchTerm);
        const allUsersSnapshot = await getDocs(usersRef);
        const nameMatches = allUsersSnapshot.docs
          .map(doc => {
            const userData = doc.data();
            return { 
              id: doc.id, 
              ...userData,
              createdAt: userData.createdAt?.toDate() || new Date(),
              lastActive: userData.lastActive?.toDate()
            };
          })
          .filter(user => 
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .slice(0, 5); // Limit to 5 results
        results = nameMatches;
        console.log('Found users by name/email pattern:', results.length);
      }
      
      if (results.length === 0) {
        error('No Users Found', 'No users found matching your search');
        return;
      }

      // Filter out admin users and blocked users
      const validResults = results.filter(user => {
        const isAdmin = user.isAdmin === true;
        const isBlocked = user.isBlocked === true;
        console.log(`User ${user.email}: isAdmin=${isAdmin}, isBlocked=${isBlocked}`);
        return !isAdmin && !isBlocked;
      });
      
      console.log('Valid results after filtering:', validResults.length);
      
      if (validResults.length === 0) {
        error('No Valid Users', 'Cannot impersonate admin users or blocked users');
        return;
      }

      setSearchResults(validResults);
      if (validResults.length === 1) {
        setTargetUser(validResults[0]);
        console.log('Auto-selected single result:', validResults[0].email);
      }
    } catch (err) {
      console.error('Error searching user:', err);
      error('Search Failed', 'Failed to search for user');
    } finally {
      setLoading(false);
    }
  };

  const handleStartImpersonation = async () => {
    if (!targetUser || !adminUser?.isAdmin) {
      error('Missing Data', 'Please select a user and ensure you are logged in as admin');
      return;
    }

    try {
      setLoading(true);
      console.log('Starting impersonation:', {
        admin: adminUser.email,
        target: targetUser.email,
        targetId: targetUser.id,
        targetBalance: targetUser.walletBalance
      });

      // Store admin session data before switching
      const adminSessionData = {
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        impersonationStartedAt: new Date().toISOString(),
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        targetName: targetUser.name
      };
      
      // Store in localStorage for persistence across page reloads
      localStorage.setItem('admin_impersonation_session', JSON.stringify(adminSessionData));
      // Log impersonation start
      await setDoc(doc(db, 'admin_actions', `impersonate_start_${targetUser.id}_${Date.now()}`), {
        action: 'impersonation_start',
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        targetUserName: targetUser.name,
        timestamp: new Date(),
        reason: 'Admin support assistance'
      });

      // Actually switch to the target user's authentication
      await switchToUserAccount(targetUser);
      success('Impersonation Started', `Now viewing as ${targetUser.name || targetUser.email}`);
      
      // Show instructions to user
      setTimeout(() => {
        alert(`✅ Impersonation Active!\n\nYou are now logged in as: ${targetUser.name}\nEmail: ${targetUser.email}\nBalance: $${(targetUser.walletBalance || 0).toFixed(2)}\n\n🔹 You have full access to their account\n🔹 All actions will be performed as this user\n🔹 Click "Stop Impersonation" to return to admin`);
      }, 500);
      
      // Clear search state
      setTargetUser(null);
      setSearchTerm('');
      setSearchResults([]);
      
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error starting impersonation:', err);
      error('Impersonation Failed', err instanceof Error ? err.message : 'Failed to start impersonation');
    } finally {
      setLoading(false);
    }
  };

  // Switch to target user's account (simulate login)
  const switchToUserAccount = async (targetUser: any) => {
    try {
      // Create a custom user token for the target user
      // This simulates logging in as that user
      const customUserData = {
        uid: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.name,
        emailVerified: true
      };
      
      // Store the target user's session data
      const userSessionData = {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        walletBalance: targetUser.walletBalance || 0,
        walletBalanceNGN: targetUser.walletBalanceNGN || 0,
        isAdmin: false, // Target user is never admin during impersonation
        createdAt: targetUser.createdAt || new Date(),
        isImpersonated: true
      };
      
      // Store in localStorage to persist across navigation
      localStorage.setItem('impersonated_user_session', JSON.stringify(userSessionData));
      
      // Force a page reload to switch context completely
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
      
    } catch (error) {
      console.error('Error switching to user account:', error);
      throw error;
    }
  };
  const handleStopImpersonation = async () => {
    // Check if we're in an impersonation session
    const adminSession = localStorage.getItem('admin_impersonation_session');
    if (!adminSession) {
      error('Invalid State', 'No active impersonation to stop');
      return;
    }

    try {
      setLoading(true);
      
      const sessionData = JSON.parse(adminSession);
      console.log('Stopping impersonation:', sessionData);

      // Log impersonation end
      await setDoc(doc(db, 'admin_actions', `impersonate_end_${sessionData.targetUserId}_${Date.now()}`), {
        action: 'impersonation_end',
        adminUserId: sessionData.adminUserId,
        adminEmail: sessionData.adminEmail,
        targetUserId: sessionData.targetUserId,
        targetUserEmail: sessionData.targetEmail,
        targetUserName: sessionData.targetName,
        timestamp: new Date()
      });

      // Clear impersonation session data
      localStorage.removeItem('admin_impersonation_session');
      localStorage.removeItem('impersonated_user_session');
      
      // Clear security flags that might prevent admin re-login
      SecurityService.clearImpersonationSecurityFlags(sessionData.targetUserId);
      
      setTargetUser(null);
      setSearchTerm('');
      setSearchResults([]);
      success('Impersonation Ended', 'Returned to admin view');
      
      // Redirect back to admin panel
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1000);
      
    } catch (err) {
      console.error('Error ending impersonation:', err);
      error('Stop Failed', 'Failed to stop impersonation');
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (user: any) => {
    console.log('Selecting user for impersonation:', user.email);
    setTargetUser(user);
    setSearchResults([]);
    setSearchTerm(user.email);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="w-5 h-5" />
          <span>User Impersonation</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isImpersonating ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-blue-800 mb-3">
                <Eye className="w-5 h-5" />
                <span className="font-medium">Currently Impersonating</span>
              </div>
              <div className="bg-white rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">User:</span>
                  <span className="font-medium text-gray-900">{impersonatedUser?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Email:</span>
                  <span className="font-medium text-gray-900">{impersonatedUser?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Balance:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(impersonatedUser?.walletBalance || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">ID:</span>
                  <span className="font-mono text-xs text-gray-700">{impersonatedUser?.id}</span>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-orange-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium text-sm">Admin Notice</span>
              </div>
              <div className="mt-1 text-xs text-orange-700">
                <p>You are viewing the system as <strong>{impersonatedUser?.name}</strong></p>
                <p>All actions will be performed as this user</p>
                <p>Real admin: <strong>{realUser?.name}</strong></p>
              </div>
            </div>

            <Button 
              onClick={handleStopImpersonation} 
              disabled={loading}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {loading ? 'Stopping...' : 'Stop Impersonation'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <Shield className="w-4 h-4" />
                <span className="font-semibold">🔒 Security Warning</span>
              </div>
              <p className="text-sm text-red-700 mt-2 leading-relaxed">
                Impersonation gives you <strong>full access</strong> to another user's account. 
                All actions are logged and audited for security.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Search User (ID, Email, or Name)
              </label>
              <div className="flex space-x-2">
              <Input
                placeholder="Search user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    searchUsers();
                  }
                }}
                className="flex-1 transition-all focus:ring-2 focus:ring-blue-500"
              />
              <Button 
                onClick={searchUsers} 
                disabled={loading}
                className="px-4 bg-blue-600 hover:bg-blue-700 text-white transition-all"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 1 && (
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Search Results ({searchResults.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => selectUser(user)}
                      className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <div className="text-sm">
                        <p className="font-semibold text-gray-900">{user.name}</p>
                        <p className="text-gray-600 font-mono text-xs">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          💰 {formatCurrency(user.walletBalance || 0)} • 
                          {user.isBlocked ? '🚫 Blocked' : '✅ Active'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {targetUser && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center space-x-2 text-blue-800 mb-3">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">✅ User Selected</span>
                </div>
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="font-semibold text-gray-900">{targetUser?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="font-mono text-sm text-gray-900">{targetUser?.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Balance:</span>
                    <span className="font-bold text-green-600 text-lg">
                      {formatCurrency(targetUser?.walletBalance || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`font-semibold px-2 py-1 rounded text-xs ${
                      targetUser.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {targetUser.isBlocked ? '🚫 Blocked' : '✅ Active'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">ID:</span>
                    <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                      {targetUser?.id?.substring(0, 12)}...
                    </span>
                  </div>
                </div>
                
                {targetUser.isBlocked ? (
                  <div className="mt-2 text-xs text-red-600 text-center bg-red-50 py-2 rounded">
                    🚫 Cannot impersonate blocked users
                  </div>
                ) : (
                  <Button 
                    onClick={handleStartImpersonation} 
                    disabled={loading || targetUser.isBlocked}
                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 transition-all"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {loading ? 'Switching Account...' : 'Login as This User'}
                  </Button>
                )}
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="font-medium text-gray-900 mb-2 text-sm">📋 Usage Guidelines</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>🎯 Only use for legitimate support purposes</p>
                <p>🔍 Search by user ID, email, or name</p>
                <p>🚫 Cannot impersonate admin users or blocked users</p>
                <p>📝 All actions are logged and audited</p>
                <p>🔄 Click "Exit" to return to admin view</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}