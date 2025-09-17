import React, { useState } from 'react';
import { X, MessageCircle, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { SupportService } from '../../services/supportService';
import { useAuth } from '../../hooks/useAuth';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupportModal({ isOpen, onClose, onSuccess }: SupportModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'submitting' | 'success'>('form');
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'other',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please log in to submit a support request');
      return;
    }

    if (!formData.subject.trim()) {
      setError('Subject is required');
      return;
    }

    if (!formData.message.trim()) {
      setError('Message is required');
      return;
    }

    if (formData.subject.trim().length < 3) {
      setError('Subject must be at least 3 characters long');
      return;
    }

    if (formData.message.trim().length < 10) {
      setError('Message must be at least 10 characters long');
      return;
    }

    if (formData.subject.trim().length > 200) {
      setError('Subject cannot exceed 200 characters');
      return;
    }

    if (formData.message.trim().length > 5000) {
      setError('Message cannot exceed 5000 characters');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setStep('submitting');

      const supportRequest = {
        userId: user.id,
        userName: user.name || 'User',
        userEmail: user.email,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        category: formData.category as 'payment' | 'technical' | 'account' | 'billing' | 'other',
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent'
      };

      await SupportService.submitSupportRequest(supportRequest);
      setStep('success');
      
    } catch (error) {
      console.error('Support submission error:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit support request');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setFormData({
      subject: '',
      message: '',
      category: 'other',
      priority: 'medium'
    });
    setError('');
    onClose();
  };

  const handleSuccess = () => {
    onSuccess();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Contact Support</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'form' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 text-blue-800">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-medium">How can we help you?</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Our support team typically responds within 24 hours.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="payment">Payment Issues</option>
                  <option value="technical">Technical Problems</option>
                  <option value="account">Account Issues</option>
                  <option value="billing">Billing Questions</option>
                  <option value="other">Other</option>
                </Select>

                <Select
                  label="Priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>

                <Input
                  label="Subject"
                  placeholder="Brief description of your issue"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 text-gray-900"
                    placeholder="Please describe your issue in detail..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-red-800 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? 'Submitting...' : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Support Request
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}

          {step === 'submitting' && (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Submitting Request</h3>
              <p className="text-gray-600">
                Please wait while we process your support request...
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Submitted</h3>
              <p className="text-gray-600 mb-4">
                Your support request has been submitted successfully. 
                Our team will respond within 24 hours.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Subject:</strong> {formData.subject}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  You'll receive an email notification when we respond.
                </p>
              </div>
              <Button onClick={handleSuccess} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}