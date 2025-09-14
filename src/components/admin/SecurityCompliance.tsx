import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Eye, 
  Ban,
  Download,
  RefreshCw,
  Clock,
  Globe,
  User,
  Activity,
  FileText,
  Database
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { collection, getDocs, doc, setDoc, updateDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDate, formatCurrency } from '../../lib/utils';
import { APISecurityService } from '../../services/apiSecurity';

interface SecurityEvent {
  id: string;
  type: 'failed_login' | 'suspicious_activity' | 'admin_action' | 'data_export' | 'api_abuse';
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
}

interface BlockedIP {
  id: string;
  ipAddress: string;
  reason: string;
  blockedAt: Date;
  blockedBy: string;
  expiresAt?: Date;
  permanent: boolean;
}

export function SecurityCompliance() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [newBlockIP, setNewBlockIP] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    eventType: 'all',
    severity: 'all',
    timeRange: '7d',
    resolved: 'all'
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(securityEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = securityEvents.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    // Add a small delay to ensure user data is fully loaded
    const timer = setTimeout(() => {
      if (user?.isAdmin === true) {
        loadSecurityData();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [user?.isAdmin]);

  useEffect(() => {
    if (user?.isAdmin) {
      loadSecurityData();
    }
  }, [filters, user?.isAdmin]);

  const loadSecurityData = async () => {
    // Double-check admin status before loading
    if (!user?.isAdmin) {
      console.log('User is not admin, skipping security data load');
      setLoading(false);
      return;
    }
    
    console.log('Loading security data for admin user:', user.email);
    
    try {
      setLoading(true);
      
      // Load security events
      await loadSecurityEvents();
      
      // Load blocked IPs
      await loadBlockedIPs();
      
      // Load audit log
      await loadAuditLog();
      
    } catch (err) {
      console.error('Error loading security data:', err);
      error('Load Failed', 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityEvents = async () => {
    if (!user?.isAdmin) {
      console.log('User is not admin, skipping security events load');
      return;
    }
    
    try {
      console.log('Loading security events...');
      const eventsSnapshot = await getDocs(collection(db, 'security_events'));
      let events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as SecurityEvent[];

      // Log admin access to security panel
      await APISecurityService.logSecurityEvent({
        type: 'admin_action',
        userId: user.id,
        details: {
          action: 'security_panel_access',
          adminEmail: user.email
        },
        severity: 'low'
      });
      
      // Apply filters
      if (filters.eventType !== 'all') {
        events = events.filter(event => event.type === filters.eventType);
      }
      
      if (filters.severity !== 'all') {
        events = events.filter(event => event.severity === filters.severity);
      }
      
      if (filters.resolved !== 'all') {
        events = events.filter(event => 
          filters.resolved === 'resolved' ? event.resolved : !event.resolved
        );
      }

      // Time range filter
      if (filters.timeRange !== 'all') {
        const now = new Date();
        const days = parseInt(filters.timeRange.replace('d', ''));
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        events = events.filter(event => event.timestamp >= cutoff);
      }

      // Sort by timestamp (newest first)
      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setSecurityEvents(events);
      console.log('Security events loaded:', events.length);
    } catch (err) {
      console.error('Error loading security events:', err);
      setSecurityEvents([]);
    }
  };

  const loadBlockedIPs = async () => {
    if (!user?.isAdmin) {
      console.log('User is not admin, skipping blocked IPs load');
      return;
    }
    
    try {
      console.log('Loading blocked IPs...');
      const blockedSnapshot = await getDocs(collection(db, 'blocked_ips'));
      const blocked = blockedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        blockedAt: doc.data().blockedAt?.toDate() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate()
      })) as BlockedIP[];
      
      setBlockedIPs(blocked.sort((a, b) => b.blockedAt.getTime() - a.blockedAt.getTime()));
      console.log('Blocked IPs loaded:', blocked.length);
    } catch (err) {
      console.error('Error loading blocked IPs:', err);
      setBlockedIPs([]);
    }
  };

  const loadAuditLog = async () => {
    if (!user?.isAdmin) {
      console.log('User is not admin, skipping audit log load');
      return;
    }
    
    try {
      console.log('Loading audit log...');
      const auditSnapshot = await getDocs(collection(db, 'admin_actions'));
      const audit = auditSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      
      setAuditLog(audit.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 50));
      console.log('Audit log loaded:', audit.length);
    } catch (err) {
      console.error('Error loading audit log:', err);
      setAuditLog([]);
    }
  };

  const blockIP = async () => {
    if (!newBlockIP.trim() || !blockReason.trim()) {
      error('Missing Information', 'Please provide IP address and reason');
      return;
    }

    // Basic IP validation
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(newBlockIP)) {
      error('Invalid IP', 'Please enter a valid IP address');
      return;
    }

    try {
      const blockId = `block_${Date.now()}`;
      const blockData: BlockedIP = {
        id: blockId,
        ipAddress: newBlockIP,
        reason: blockReason,
        blockedAt: new Date(),
        blockedBy: 'admin', // Should be actual admin user ID
        permanent: true
      };

      await setDoc(doc(db, 'blocked_ips', blockId), blockData);
      
      // Log security action
      await setDoc(doc(db, 'security_events', `ip_block_${Date.now()}`), {
        type: 'admin_action',
        details: {
          action: 'ip_blocked',
          ipAddress: newBlockIP,
          reason: blockReason
        },
        ipAddress: newBlockIP,
        userAgent: navigator.userAgent,
        severity: 'medium',
        timestamp: new Date(),
        resolved: true
      });

      success('IP Blocked', `IP address ${newBlockIP} has been blocked`);
      setNewBlockIP('');
      setBlockReason('');
      await loadBlockedIPs();
    } catch (err) {
      console.error('Error blocking IP:', err);
      error('Block Failed', 'Failed to block IP address');
    }
  };

  const unblockIP = async (blockId: string, ipAddress: string) => {
    try {
      await updateDoc(doc(db, 'blocked_ips', blockId), {
        unblocked: true,
        unblockedAt: new Date(),
        unblockedBy: 'admin'
      });

      success('IP Unblocked', `IP address ${ipAddress} has been unblocked`);
      await loadBlockedIPs();
    } catch (err) {
      console.error('Error unblocking IP:', err);
      error('Unblock Failed', 'Failed to unblock IP address');
    }
  };

  const resolveSecurityEvent = async (eventId: string) => {
    try {
      await updateDoc(doc(db, 'security_events', eventId), {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: 'admin'
      });

      success('Event Resolved', 'Security event has been marked as resolved');
      await loadSecurityEvents();
    } catch (err) {
      console.error('Error resolving security event:', err);
      error('Resolve Failed', 'Failed to resolve security event');
    }
  };

  const exportSecurityData = () => {
    try {
      const exportData = {
        securityEvents: securityEvents.map(event => ({
          ...event,
          timestamp: event.timestamp.toISOString()
        })),
        blockedIPs: blockedIPs.map(ip => ({
          ...ip,
          blockedAt: ip.blockedAt.toISOString(),
          expiresAt: ip.expiresAt?.toISOString()
        })),
        auditLog: auditLog.map(log => ({
          ...log,
          timestamp: log.timestamp.toISOString()
        })),
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-compliance-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success('Export Complete', 'Security data exported successfully');
    } catch (err) {
      error('Export Failed', 'Failed to export security data');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'failed_login':
        return <Lock className="w-4 h-4 text-red-500" />;
      case 'suspicious_activity':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'admin_action':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'data_export':
        return <Download className="w-4 h-4 text-purple-500" />;
      case 'api_abuse':
        return <Activity className="w-4 h-4 text-red-500" />;
      default:
        return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };
  const runSecurityScan = async () => {
    try {
      setLoading(true);
      
      // Initialize security if not already done
      await APISecurityService.initializeSecurity();
      
      // Run security checks
      const originValid = APISecurityService.validateRequestOrigin();
      if (!originValid) {
        await APISecurityService.logSecurityEvent({
          type: 'suspicious_request',
          details: { action: 'invalid_origin', origin: window.location.hostname },
          severity: 'medium'
        });
      }
      
      // Clean up old events
      await APISecurityService.cleanupSecurityEvents();
      
      success('Security Scan Complete', 'Security scan completed successfully');
      await loadSecurityData();
    } catch (err) {
      console.error('Error running security scan:', err);
      error('Security Scan Failed', 'Failed to run security scan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Security & Compliance</h2>
          <p className="text-gray-600">Monitor security events and manage access controls</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={runSecurityScan} disabled={loading}>
            <Shield className="w-4 h-4 mr-2" />
            Security Scan
          </Button>
          <Button variant="outline" onClick={exportSecurityData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadSecurityData}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Security Events</p>
                <p className="text-2xl font-bold text-red-600">
                  {securityEvents.filter(e => !e.resolved).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {securityEvents.filter(e => e.severity === 'critical').length} critical
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Blocked IPs</p>
                <p className="text-2xl font-bold text-orange-600">{blockedIPs.length}</p>
              </div>
              <Ban className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Active blocks
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Failed Logins</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {securityEvents.filter(e => e.type === 'failed_login').length}
                </p>
              </div>
              <Lock className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Last 7 days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Audit Entries</p>
                <p className="text-2xl font-bold text-blue-600">{auditLog.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Admin actions logged
            </div>
          </CardContent>
        </Card>
      </div>

      {/* IP Blocking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Ban className="w-5 h-5" />
            <span>IP Address Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Block New IP */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Block IP Address</h3>
              <Input
                placeholder="IP Address (e.g., 192.168.1.1)"
                value={newBlockIP}
                onChange={(e) => setNewBlockIP(e.target.value)}
              />
              <Input
                placeholder="Reason for blocking"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
              <Button onClick={blockIP} className="w-full">
                <Ban className="w-4 h-4 mr-2" />
                Block IP Address
              </Button>
            </div>

            {/* Blocked IPs List */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Currently Blocked IPs</h3>
              {blockedIPs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No blocked IP addresses</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {blockedIPs.slice(0, 10).map((blocked) => (
                    <div key={blocked.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div>
                        <p className="font-mono text-sm font-medium text-gray-900">{blocked.ipAddress}</p>
                        <p className="text-xs text-gray-600">{blocked.reason}</p>
                        <p className="text-xs text-gray-500">{formatDate(blocked.blockedAt)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unblockIP(blocked.id, blocked.ipAddress)}
                        className="text-green-600 border-green-300"
                      >
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Security Events</span>
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={filters.eventType}
                onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
              >
                <option value="all">All Events</option>
                <option value="failed_login">Failed Logins</option>
                <option value="suspicious_activity">Suspicious Activity</option>
                <option value="admin_action">Admin Actions</option>
                <option value="data_export">Data Exports</option>
                <option value="api_abuse">API Abuse</option>
              </Select>
              <Select
                value={filters.severity}
                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader size="lg" text="Loading security events..." className="py-8" />
          ) : securityEvents.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Security Events</h3>
              <p className="text-gray-600">No security events match your current filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900 capitalize">
                            {event.type.replace('_', ' ')}
                          </h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(event.severity)}`}>
                            {event.severity}
                          </span>
                          {!event.resolved && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                              Unresolved
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>IP:</strong> {event.ipAddress}</p>
                          {event.userEmail && <p><strong>User:</strong> {event.userEmail}</p>}
                          <p><strong>Time:</strong> {formatDate(event.timestamp)}</p>
                          {event.details && (
                            <p><strong>Details:</strong> {JSON.stringify(event.details)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {!event.resolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resolveSecurityEvent(event.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, securityEvents.length)} of {securityEvents.length} events
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Admin Audit Log</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLog.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Audit Entries</h3>
              <p className="text-gray-600">Admin actions will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Activity className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {entry.action?.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {entry.reason || entry.amount ? 
                          `${entry.reason || ''} ${entry.amount ? formatCurrency(entry.amount) : ''}`.trim() :
                          'Admin action performed'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {formatDate(entry.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}