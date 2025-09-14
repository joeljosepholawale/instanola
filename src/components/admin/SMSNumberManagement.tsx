import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Users, 
  Clock, 
  XCircle, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Eye,
  Ban,
  Key,
  Settings,
  Download,
  Filter
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { useToast } from '../../hooks/useToast';
import { collection, getDocs, query, where, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DaisySMSService } from '../../services/daisySMS';
import { formatDate, formatCurrency } from '../../lib/utils';

export function SMSNumberManagement() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeRentals, setActiveRentals] = useState<any[]>([]);
  const [smsStats, setSmsStats] = useState<any>({});
  const [daisyBalance, setDaisyBalance] = useState<number>(0);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [processing, setProcessing] = useState<string>('');
  const [filters, setFilters] = useState({
    status: 'all',
    service: 'all',
    country: 'all',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    loadSMSData();
  }, [filters]);

  const loadSMSData = async () => {
    try {
      setLoading(true);
      
      // Load all active rentals
      const rentalsSnapshot = await getDocs(collection(db, 'rentals'));
      let allRentals = rentalsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate() || new Date(),
        completedAt: doc.data().completedAt?.toDate(),
        cancelledAt: doc.data().cancelledAt?.toDate()
      }));

      // Apply filters
      if (filters.status !== 'all') {
        allRentals = allRentals.filter(rental => rental.status === filters.status);
      }
      if (filters.service !== 'all') {
        allRentals = allRentals.filter(rental => rental.serviceCode === filters.service);
      }
      if (filters.country !== 'all') {
        allRentals = allRentals.filter(rental => rental.countryCode === filters.country);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        allRentals = allRentals.filter(rental => 
          rental.number?.toString().includes(filters.search) ||
          rental.service?.toLowerCase().includes(searchLower) ||
          rental.id?.toLowerCase().includes(searchLower)
        );
      }

      // Sort by creation date (newest first)
      allRentals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setActiveRentals(allRentals);

      // Calculate SMS statistics
      const stats = {
        totalRentals: allRentals.length,
        activeRentals: allRentals.filter(r => r.status === 'waiting').length,
        completedRentals: allRentals.filter(r => r.status === 'completed').length,
        cancelledRentals: allRentals.filter(r => r.status === 'cancelled').length,
        totalRevenue: allRentals.reduce((sum, r) => sum + (r.userPrice || 0), 0),
        totalCosts: allRentals.reduce((sum, r) => sum + (r.daisyPrice || 0), 0),
        totalProfit: allRentals.reduce((sum, r) => sum + (r.profit || 0), 0),
        successRate: allRentals.length > 0 ? 
          (allRentals.filter(r => r.status === 'completed').length / allRentals.length * 100) : 0
      };
      setSmsStats(stats);

      // Load DaisySMS balance and API key
      await loadDaisySMSConfig();

    } catch (err) {
      console.error('Error loading SMS data:', err);
      error('Load Failed', 'Failed to load SMS management data');
    } finally {
      setLoading(false);
    }
  };

  const loadDaisySMSConfig = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'config', 'daisysms'));
      if (configDoc.exists()) {
        const config = configDoc.data();
        setApiKey(config.apiKey || '');
        
        // Get DaisySMS balance
        if (config.apiKey) {
          try {
            const daisyService = new DaisySMSService(config.apiKey);
            const balance = await daisyService.getBalance();
            setDaisyBalance(balance);
          } catch (balanceError) {
            console.warn('Failed to get DaisySMS balance:', balanceError);
            setDaisyBalance(0);
          }
        }
      }
    } catch (err) {
      console.error('Error loading DaisySMS config:', err);
    }
  };

  const updateApiKey = async () => {
    try {
      setProcessing('api_key');
      
      if (!apiKey.trim()) {
        error('Invalid API Key', 'Please enter a valid DaisySMS API key');
        return;
      }

      // Test the API key
      const daisyService = new DaisySMSService(apiKey);
      await daisyService.getBalance();

      // Save to Firebase
      await setDoc(doc(db, 'config', 'daisysms'), {
        apiKey: apiKey,
        updatedAt: new Date()
      });

      success('API Key Updated', 'DaisySMS API key has been updated successfully');
      setShowApiKeyForm(false);
      await loadDaisySMSConfig();
    } catch (err) {
      console.error('Error updating API key:', err);
      error('Update Failed', 'Invalid API key or connection failed');
    } finally {
      setProcessing('');
    }
  };

  const forceCancel = async (rentalId: string) => {
    try {
      setProcessing(rentalId);
      
      const rental = activeRentals.find(r => r.id === rentalId);
      if (!rental) {
        error('Rental Not Found', 'Could not find rental to cancel');
        return;
      }

      // Cancel via DaisySMS API
      const daisyService = await DaisySMSService.createWithStoredKey();
      await daisyService.cancelActivation(rentalId, rental.userId);

      success('Rental Cancelled', 'Rental has been cancelled and user refunded');
      await loadSMSData();
    } catch (err) {
      console.error('Error cancelling rental:', err);
      error('Cancel Failed', 'Failed to cancel rental');
    } finally {
      setProcessing('');
    }
  };

  const exportSMSData = () => {
    try {
      const exportData = {
        rentals: activeRentals,
        statistics: smsStats,
        daisyBalance: daisyBalance,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sms-management-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting SMS data:', err);
      error('Export Failed', 'Failed to export SMS data');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'waiting':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SMS Number Management</h2>
          <p className="text-gray-600">Monitor and manage all SMS rentals and DaisySMS integration</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportSMSData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setShowApiKeyForm(true)}>
            <Key className="w-4 h-4 mr-2" />
            API Settings
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Rentals</p>
                <p className="text-2xl font-bold text-yellow-600">{smsStats.activeRentals || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{(smsStats.successRate || 0).toFixed(1)}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(smsStats.totalRevenue || 0)}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">DaisySMS Balance</p>
                <p className="text-2xl font-bold text-purple-600">${daisyBalance.toFixed(2)}</p>
              </div>
              <Smartphone className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Key Management Modal */}
      {showApiKeyForm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">DaisySMS API Configuration</h3>
              <button
                onClick={() => setShowApiKeyForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <Input
                  label="DaisySMS API Key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your DaisySMS API key"
                />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">API Key Instructions</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Get your API key from DaisySMS dashboard</li>
                    <li>• Key will be tested before saving</li>
                    <li>• Balance will be checked automatically</li>
                  </ul>
                </div>
                <div className="flex space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowApiKeyForm(false)} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={updateApiKey} 
                    disabled={processing === 'api_key'} 
                    className="flex-1"
                  >
                    {processing === 'api_key' ? 'Testing...' : 'Save & Test'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search by number, ID, or service..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <Select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="all">All Status</option>
              <option value="waiting">Waiting</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Select
              value={filters.service}
              onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
            >
              <option value="all">All Services</option>
              <option value="tg">Telegram</option>
              <option value="wa">WhatsApp</option>
              <option value="ig">Instagram</option>
              <option value="fb">Facebook</option>
              <option value="tw">Twitter</option>
              <option value="ds">Discord</option>
            </Select>
            <Select
              value={filters.country}
              onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
            >
              <option value="all">All Countries</option>
              <option value="0">United States</option>
              <option value="1">Russia</option>
              <option value="18">United Kingdom</option>
              <option value="44">Germany</option>
              <option value="78">France</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rentals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>SMS Rentals ({activeRentals.length})</span>
            <Button variant="ghost" size="sm" onClick={loadSMSData}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader size="lg" text="Loading SMS rentals..." className="py-8" />
          ) : activeRentals.length === 0 ? (
            <div className="text-center py-8">
              <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rentals Found</h3>
              <p className="text-gray-600">No SMS rentals match your current filters</p>
            </div>
          ) : (
            <>
              {/* Calculate pagination values */}
              {(() => {
                const totalPages = Math.ceil(activeRentals.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedRentals = activeRentals.slice(startIndex, startIndex + itemsPerPage);
                
                return (
                  <>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Rental ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Number</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Service</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Code</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Cost</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                    {paginatedRentals.map((rental) => (
                    <tr key={rental.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm text-blue-600">
                        {rental.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{rental.userId?.substring(0, 8)}...</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">
                        {rental.number?.toString().replace(/[^0-9+]/g, '') || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{rental.service}</p>
                          <p className="text-gray-600">{rental.country}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(rental.status)}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(rental.status)}`}>
                            {rental.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {rental.code ? (
                          <span className="font-mono text-sm font-bold text-green-600">
                            {rental.code}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <p className="font-semibold text-green-600">
                            {formatCurrency(rental.userPrice || 0)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Cost: {formatCurrency(rental.daisyPrice || 0)}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(rental.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {rental.status === 'waiting' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => forceCancel(rental.id)}
                              disabled={processing === rental.id}
                              className="text-red-600 hover:text-red-700"
                            >
                              {processing === rental.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Ban className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
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
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, activeRentals.length)} of {activeRentals.length} rentals
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
                );
              })()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}