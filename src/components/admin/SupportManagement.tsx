import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  User,
  Send,
  Filter,
  Download,
  RefreshCw,
  Tag,
  Star,
  MessageCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { SupportReplyModal } from './SupportReplyModal';
import { CannedResponsesModal } from './CannedResponsesModal';
import { SupportService } from '../../services/supportService';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../lib/utils';

export function SupportManagement() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [filters, setFilters] = useState({
    status: 'open',
    priority: 'all',
    category: 'all',
    assignee: 'all',
    search: ''
  });

  useEffect(() => {
    loadSupportMessages();
  }, [filters]);

  const loadSupportMessages = async () => {
    try {
      setLoading(true);
      const allMessages = await SupportService.getAllSupportMessages();
      
      // Apply filters
      let filteredMessages = allMessages;
      
      if (filters.status !== 'all') {
        filteredMessages = filteredMessages.filter(msg => msg.status === filters.status);
      }
      
      if (filters.priority !== 'all') {
        filteredMessages = filteredMessages.filter(msg => msg.priority === filters.priority);
      }
      
      if (filters.category !== 'all') {
        filteredMessages = filteredMessages.filter(msg => msg.category === filters.category);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredMessages = filteredMessages.filter(msg => 
          msg.subject?.toLowerCase().includes(searchLower) ||
          msg.message?.toLowerCase().includes(searchLower) ||
          msg.userName?.toLowerCase().includes(searchLower) ||
          msg.userEmail?.toLowerCase().includes(searchLower)
        );
      }
      
      setSupportMessages(filteredMessages);
    } catch (err) {
      console.error('Error loading support messages:', err);
      error('Load Failed', 'Failed to load support messages');
      setSupportMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const updateMessageStatus = async (messageId: string, status: string) => {
    try {
      await SupportService.updateMessageStatus(messageId, status as any);
      success('Status Updated', 'Message status has been updated');
      await loadSupportMessages();
    } catch (err) {
      console.error('Error updating message status:', err);
      error('Update Failed', 'Failed to update message status');
    }
  };

  const assignMessage = async (messageId: string, assigneeId: string) => {
    try {
      // TODO: Implement message assignment
      success('Message Assigned', 'Message has been assigned successfully');
      await loadSupportMessages();
    } catch (err) {
      console.error('Error assigning message:', err);
      error('Assignment Failed', 'Failed to assign message');
    }
  };

  const exportSupportData = () => {
    try {
      const exportData = supportMessages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt?.toISOString(),
        updatedAt: msg.updatedAt?.toISOString(),
        respondedAt: msg.respondedAt?.toISOString()
      }));
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `support-messages-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success('Export Complete', 'Support data exported successfully');
    } catch (err) {
      error('Export Failed', 'Failed to export support data');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-purple-100 text-purple-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getResponseTime = (createdAt: Date, respondedAt?: Date) => {
    if (!respondedAt) return 'Not responded';
    
    const diffMs = respondedAt.getTime() - createdAt.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(supportMessages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentMessages = supportMessages.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Support Management</h2>
          <p className="text-gray-600">Manage customer support tickets and responses</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowCannedResponses(true)}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Canned Responses
          </Button>
          <Button variant="outline" onClick={exportSupportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadSupportMessages}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Support Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Open Tickets</p>
                <p className="text-2xl font-bold text-green-600">
                  {supportMessages.filter(msg => msg.status === 'open').length}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {supportMessages.filter(msg => msg.status === 'in_progress').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Urgent Priority</p>
                <p className="text-2xl font-bold text-red-600">
                  {supportMessages.filter(msg => msg.priority === 'urgent').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Avg Response</p>
                <p className="text-2xl font-bold text-purple-600">2.4h</p>
              </div>
              <Star className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search messages..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <Select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>
            <Select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="all">All Categories</option>
              <option value="payment">Payment</option>
              <option value="technical">Technical</option>
              <option value="account">Account</option>
              <option value="billing">Billing</option>
              <option value="other">Other</option>
            </Select>
            <Select
              value={filters.assignee}
              onChange={(e) => setFilters(prev => ({ ...prev, assignee: e.target.value }))}
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              <option value="me">Assigned to Me</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Support Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Support Messages ({supportMessages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <>
          {loading ? (
            <Loader size="lg" text="Loading support messages..." className="py-8" />
          ) : supportMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Support Messages</h3>
              <p className="text-gray-600">No support messages match your current filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {supportMessages.map((message) => (
                <div key={message.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{message.subject}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(message.priority)}`}>
                          {message.priority}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(message.status)}`}>
                          {message.status.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                          {message.category}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{message.userName} ({message.userEmail})</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(message.createdAt)}</span>
                        </span>
                        {message.respondedAt && (
                          <span className="flex items-center space-x-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>Response: {getResponseTime(message.createdAt, message.respondedAt)}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm line-clamp-2">{message.message}</p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedMessage(message);
                          setShowReplyModal(true);
                        }}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Reply
                      </Button>
                      {message.status === 'open' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateMessageStatus(message.id, 'in_progress')}
                        >
                          Take
                        </Button>
                      )}
                      {message.status !== 'closed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateMessageStatus(message.id, 'closed')}
                          className="text-gray-600"
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {message.adminResponse && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          {message.respondedBy || 'Support Team'}
                        </span>
                        <span className="text-xs text-blue-600">
                          {message.respondedAt && formatDate(message.respondedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-blue-800">{message.adminResponse}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {!loading && supportMessages.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, supportMessages.length)} of {supportMessages.length} messages
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
        </CardContent>
      </Card>

      {/* Modals */}
      <SupportReplyModal
        message={selectedMessage}
        isOpen={showReplyModal}
        onClose={() => {
          setShowReplyModal(false);
          setSelectedMessage(null);
        }}
        onSuccess={() => {
          loadSupportMessages();
          setShowReplyModal(false);
          setSelectedMessage(null);
        }}
      />

      <CannedResponsesModal
        isOpen={showCannedResponses}
        onClose={() => setShowCannedResponses(false)}
      />
    </div>
  );
}