import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare, User, Clock, Tag } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../../hooks/useToast';
import { SupportService } from '../../services/supportService';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../lib/utils';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface SupportReplyModalProps {
  message: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
}

export function SupportReplyModal({ message, isOpen, onClose, onSuccess }: SupportReplyModalProps) {
  const { user: adminUser } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('resolved');
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [selectedCannedResponse, setSelectedCannedResponse] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCannedResponses();
      if (message) {
        setStatus(message.status === 'open' ? 'in_progress' : 'resolved');
      }
    }
  }, [isOpen, message]);

  const loadCannedResponses = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'canned_responses'));
      const responses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CannedResponse[];
      setCannedResponses(responses);
    } catch (err) {
      console.error('Error loading canned responses:', err);
    }
  };

  const handleCannedResponseSelect = (responseId: string) => {
    const response = cannedResponses.find(r => r.id === responseId);
    if (response) {
      setReply(response.content);
    }
    setSelectedCannedResponse(responseId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reply.trim()) {
      error('Reply Required', 'Please enter a reply message');
      return;
    }

    try {
      setLoading(true);
      
      // Send reply
      await SupportService.respondToMessage(message.id, adminUser!.id, reply, adminUser?.name || 'Support Team');
      
      // Update status if changed
      if (status !== message.status) {
        await SupportService.updateMessageStatus(message.id, status as any);
      }
      
      success('Reply Sent', 'Your reply has been sent to the user');
      onSuccess();
    } catch (err) {
      console.error('Error sending reply:', err);
      error('Send Failed', 'Failed to send reply');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReply('');
    setSelectedCannedResponse('');
    setStatus('resolved');
    onClose();
  };

  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Reply to Support Message</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Original Message */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{message.userName}</h3>
                  <p className="text-sm text-gray-600">{message.userEmail}</p>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(message.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <Tag className="w-4 h-4" />
                  <span className="capitalize">{message.category}</span>
                </div>
              </div>
            </div>
            
            <div className="mb-3">
              <h4 className="font-semibold text-gray-900 mb-2">{message.subject}</h4>
              <div className="text-gray-700 whitespace-pre-wrap">{message.message}</div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                message.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                message.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                message.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {message.priority} priority
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                message.status === 'open' ? 'bg-green-100 text-green-800' :
                message.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                message.status === 'resolved' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {message.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Canned Responses */}
            {cannedResponses.length > 0 && (
              <Select
                label="Use Canned Response (Optional)"
                value={selectedCannedResponse}
                onChange={(e) => handleCannedResponseSelect(e.target.value)}
              >
                <option value="">Select a canned response...</option>
                {cannedResponses
                  .filter(response => response.category === message.category || response.category === 'general')
                  .map((response) => (
                    <option key={response.id} value={response.id}>
                      {response.title}
                    </option>
                  ))}
              </Select>
            )}

            {/* Reply Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reply Message
              </label>
              <textarea
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type your reply to the user..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                required
              />
            </div>

            {/* Status Update */}
            <Select
              label="Update Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>

            {/* Preview */}
            {reply && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Email Preview</h4>
                <div className="text-sm text-blue-800">
                  <p><strong>To:</strong> {message.userEmail}</p>
                  <p><strong>Subject:</strong> Re: {message.subject}</p>
                  <div className="mt-2 p-3 bg-white rounded border">
                    <div className="whitespace-pre-wrap">{reply}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}