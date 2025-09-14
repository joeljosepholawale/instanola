import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  MoreVertical,
  Copy,
  X,
  Calendar,
  Zap,
  Filter,
  Search
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loader } from '../../components/ui/Loader';
import { useAuth } from '../../hooks/useAuth';
import { useStatusPolling } from '../../hooks/useStatusPolling';
import { useToast } from '../../hooks/useToast';
import { DaisySMSService } from '../../services/daisySMS';
import { formatCurrency, formatDate } from '../../lib/utils';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function RentalsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [rentals, setRentals] = useState<any[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<any[]>([]);
  const [showSMSText, setShowSMSText] = useState<string | null>(null);
  const [smsTextData, setSmsTextData] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    service: 'all',
    search: ''
  });

  // Define handleStatusUpdate before useStatusPolling
  const handleStatusUpdate = async (rentalId: string, statusData: { status: string; code?: string }) => {
    try {
      await updateDoc(doc(db, 'rentals', rentalId), {
        status: statusData.status,
        ...(statusData.code && { code: statusData.code }),
        lastChecked: new Date()
      });
      
      setRentals(prev => prev.map(rental => 
        rental.id === rentalId 
          ? { ...rental, status: statusData.status, code: statusData.code }
          : rental
      ));

      if (statusData.code) {
        success('SMS Received!', `Code: ${statusData.code}`);
      }
    } catch (err) {
      console.error('Error updating rental status:', err);
    }
  };

  // Status polling for waiting rentals
  useStatusPolling({
    rentals: rentals.filter(r => r.status === 'waiting'),
    onStatusUpdate: handleStatusUpdate,
    enabled: true,
    interval: 3000
  });

  useEffect(() => {
    if (user) {
      loadRentals();
    }
  }, [user]);

  useEffect(() => {
    // Apply filters
    let filtered = rentals;

    if (filters.status !== 'all') {
      filtered = filtered.filter(rental => rental.status === filters.status);
    }

    if (filters.service !== 'all') {
      filtered = filtered.filter(rental => rental.serviceCode === filters.service);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(rental => 
        rental.number?.toString().includes(filters.search) ||
        rental.service?.toLowerCase().includes(searchLower) ||
        rental.id?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredRentals(filtered);
  }, [rentals, filters]);

  const loadRentals = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const rentalsQuery = query(
        collection(db, 'rentals'),
        where('userId', '==', user.id)
      );
      const snapshot = await getDocs(rentalsQuery);
      const rentalData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          expiresAt: doc.data().expiresAt?.toDate() || new Date(),
          completedAt: doc.data().completedAt?.toDate(),
          cancelledAt: doc.data().cancelledAt?.toDate()
        }))
        .filter(rental => 
          rental.status !== 'cancelled' // Show all active rentals (both short-term and long-term)
        );
      
      setRentals(rentalData);
    } catch (err) {
      console.error('Error loading rentals:', err);
      setRentals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRental = async (rentalId: string) => {
    try {
      // Immediately update UI for better UX
      setRentals(prev => prev.map(rental => 
        rental.id === rentalId 
          ? { ...rental, status: 'cancelling' }
          : rental
      ));

      const rental = rentals.find(r => r.id === rentalId);
      if (!rental) return;

      // Get the exact amount the user paid for this rental from the rental record
      const exactUserPrice = rental.userPrice || 0;
      
      if (exactUserPrice <= 0) {
        throw new Error('Invalid rental price for refund calculation');
      }

      console.log('Cancelling rental with exact refund amount:', {
        rentalId: rentalId,
        userPrice: rental.userPrice,
        actualPrice: rental.actualPrice,
        exactRefundAmount: exactUserPrice
      });

      const daisyService = await DaisySMSService.createWithStoredKey();
      await daisyService.cancelActivation(rentalId, user!.id);
      
      success('Rental Cancelled', 'Number cancelled and refunded');
     
      // Update UI immediately instead of reloading
      setRentals(prev => prev.map(rental => 
        rental.id === rentalId 
          ? { ...rental, status: 'cancelled', cancelledAt: new Date() }
          : rental
      ));
      
      // Reload data in background for consistency
      loadRentals();
    } catch (err) {
      console.error('Error cancelling rental:', err);
      // Revert UI state on error
      setRentals(prev => prev.map(rental => 
        rental.id === rentalId 
          ? { ...rental, status: 'waiting' }
          : rental
      ));
      error('Cancel Failed', 'Failed to cancel rental');
    }
  };

  const handleShowSMSText = (rental: any) => {
    setSmsTextData(rental);
    setShowSMSText(rental.id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Copied!', 'Text copied to clipboard');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">Success</span>;
      case 'waiting':
        return <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full">Waiting</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-full">Cancelled</span>;
      case 'cancelling':
        return <span className="px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">Cancelling...</span>;
      default:
        return <span className="px-3 py-1 bg-gray-500 text-white text-xs font-medium rounded-full">Unknown</span>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'waiting':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelling':
        return <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRentalDuration = (rental: any) => {
    if (rental.durationType === 'short-term') {
      return '30 minutes';
    }
    
    if (rental.duration && rental.durationUnit) {
      return `${rental.duration} ${rental.durationUnit}${rental.duration > 1 ? 's' : ''}`;
    }
    
    return '30 minutes';
  };

  const isRentalExpired = (rental: any) => {
    if (!rental.expiresAt) return false;
    return new Date() > rental.expiresAt;
  };

  const getTimeRemaining = (rental: any) => {
    if (!rental.expiresAt || rental.status !== 'waiting') return null;
    
    const now = new Date();
    const expires = rental.expiresAt;
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size="lg" text="Loading rentals..." showText={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Rentals</h1>
          <p className="text-gray-600">Manage your rented phone numbers</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Search by number, service, or ID..."
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
            </div>
          </CardContent>
        </Card>

        {/* Rentals List */}
        {filteredRentals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rentals Found</h3>
              <p className="text-gray-600 mb-4">
                {filters.status !== 'all' || filters.service !== 'all' || filters.search
                  ? 'No rentals match your current filters'
                  : 'You haven\'t rented any numbers yet'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRentals.map((rental) => (
              <Card key={rental.id}>
                <CardContent className="p-4">
                  {/* Desktop Layout */}
                  <div className="hidden md:block">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Smartphone className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900">{rental.service}</h3>
                            {getStatusBadge(rental.status)}
                            {rental.renewable && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                Renewable
                              </span>
                            )}
                            {rental.autoRenew && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                Auto-renew
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {rental.number} • Duration: {getRentalDuration(rental)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Base: {formatCurrency(rental.daisyPrice || 0)}
                          </p>
                          {rental.isCustomPrice && (
                            <p className="text-xs text-purple-600 font-medium">Custom Price</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {rental.code || '-'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatCurrency(rental.actualPrice || rental.userPrice || 0)}
                          </div>
                          {rental.status === 'waiting' && (
                            <div className="text-xs text-orange-600 font-medium">
                              Profit: {formatCurrency(Math.max(0, (rental.actualPrice || rental.userPrice || 0) - (rental.daisyPrice || 0)))}
                            </div>
                          )}
                          {rental.isCustomPrice && (
                            <div className="text-xs text-purple-600 font-medium">Custom</div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {rental.status === 'waiting' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelRental(rental.id)}
                            >
                              Cancel
                            </Button>
                          )}
                          {rental.status === 'completed' && rental.renewable && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600"
                            >
                              Renew
                            </Button>
                          )}
                          <button
                            onClick={() => handleShowSMSText(rental)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="md:hidden">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Smartphone className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900">{rental.service}</h3>
                            {getStatusBadge(rental.status)}
                        {rental.isCustomPrice && (
                          <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-medium mt-1">
                            Custom Price
                          </span>
                        )}
                          </div>
                          <p className="text-sm text-gray-600">{rental.number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          {rental.code || '-'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(rental.userPrice || 0)}
                        </div>
                        {rental.daisyPrice && (
                          <div className="text-xs text-gray-500">
                            Profit: {formatCurrency((rental.userPrice || 0) - (rental.daisyPrice || 0))}
                          </div>
                        )}
                        {rental.daisyPrice && (
                          <div className="text-xs text-gray-500">
                            Base: {formatCurrency(rental.daisyPrice)} • Profit: {formatCurrency(Math.max(0, (rental.actualPrice || rental.userPrice || 0) - (rental.daisyPrice || 0)))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <div>Duration: {getRentalDuration(rental)}</div>
                        {rental.status === 'waiting' && (
                          <div className="text-orange-600 font-medium">
                            {getTimeRemaining(rental)}
                          </div>
                        )}
                        {rental.isCustomPrice && (
                          <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-medium mt-1">
                            Custom Price
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {rental.status === 'waiting' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelRental(rental.id)}
                          >
                            Cancel
                          </Button>
                        )}
                        {rental.status === 'completed' && rental.renewable && (
                          <Button
                            variant="outline"
                            className="text-green-600"
                          >
                            Renew
                          </Button>
                        )}
                        <button
                          onClick={() => handleShowSMSText(rental)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Additional info for mobile */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>ID: {rental.id.substring(0, 8)}...</span>
                        <span>{formatDate(rental.createdAt)}</span>
                      </div>
                      {(rental.renewable || rental.autoRenew) && (
                        <div className="flex items-center space-x-2 mt-1">
                          {rental.renewable && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              Renewable
                            </span>
                          )}
                          {rental.autoRenew && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              Auto-renew
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SMS Text Popup */}
      {showSMSText && smsTextData && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">SMS Details</h3>
              <button
                onClick={() => setShowSMSText(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-900">
                  {smsTextData.service} code: <span className="font-bold">{smsTextData.code || 'Waiting...'}</span>
                </p>
                {smsTextData.code && (
                  <button
                    onClick={() => copyToClipboard(smsTextData.code)}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Copy Code
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Phone</p>
                  <p className="font-mono">{smsTextData.number}</p>
                </div>
                <div>
                  <p className="text-gray-600">Service</p>
                  <p>{smsTextData.service}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className="capitalize">{smsTextData.status}</p>
                </div>
                <div>
                  <p className="text-gray-600">Cost</p>
                  <p>{formatCurrency(smsTextData.userPrice || 0)}</p>
                  {smsTextData.daisyPrice && (
                    <p className="text-xs text-gray-500">
                      Base: {formatCurrency(smsTextData.daisyPrice)} • Profit: {formatCurrency(Math.max(0, (smsTextData.actualPrice || smsTextData.userPrice || 0) - (smsTextData.daisyPrice || 0)))}
                    </p>
                  )}
                  {smsTextData.isCustomPrice && (
                    <p className="text-xs text-purple-600 font-medium">Custom Pricing</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-600">Duration</p>
                  <p>{getRentalDuration(smsTextData)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Expires</p>
                  <p className="text-xs">
                    {smsTextData.expiresAt ? formatDate(smsTextData.expiresAt) : 'N/A'}
                  </p>
                </div>
              </div>

              {smsTextData.renewable && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-blue-800 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>This number can be renewed for extended use</span>
                  </div>
                </div>
              )}

              {smsTextData.autoRenew && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-green-800 text-sm">
                    <RefreshCw className="w-4 h-4" />
                    <span>Auto-renewal is enabled for this number</span>
                  </div>
                </div>
              )}

              {smsTextData.code && (
                <Button
                  onClick={() => copyToClipboard(smsTextData.code)}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}