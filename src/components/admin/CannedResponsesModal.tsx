import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Plus, Edit, Trash2, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../hooks/useToast';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface CannedResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: Date;
}

export function CannedResponsesModal({ isOpen, onClose }: CannedResponsesModalProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general'
  });

  useEffect(() => {
    if (isOpen) {
      loadCannedResponses();
    }
  }, [isOpen]);

  const loadCannedResponses = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'canned_responses'));
      const cannedResponses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as CannedResponse[];
      
      setResponses(cannedResponses.sort((a, b) => a.title.localeCompare(b.title)));
    } catch (err) {
      console.error('Error loading canned responses:', err);
      error('Load Failed', 'Failed to load canned responses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      error('Missing Fields', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const responseId = editingId || `response_${Date.now()}`;
      const responseData = {
        id: responseId,
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        createdAt: editingId ? responses.find(r => r.id === editingId)?.createdAt || new Date() : new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'canned_responses', responseId), responseData);
      
      success(
        editingId ? 'Response Updated' : 'Response Added', 
        `Canned response ${editingId ? 'updated' : 'created'} successfully`
      );
      
      setFormData({ title: '', content: '', category: 'general' });
      setShowAddForm(false);
      setEditingId(null);
      await loadCannedResponses();
    } catch (err) {
      console.error('Error saving canned response:', err);
      error('Save Failed', 'Failed to save canned response');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (response: CannedResponse) => {
    setFormData({
      title: response.title,
      content: response.content,
      category: response.category
    });
    setEditingId(response.id);
    setShowAddForm(true);
  };

  const handleDelete = async (responseId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this canned response?');
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'canned_responses', responseId));
      success('Response Deleted', 'Canned response deleted successfully');
      await loadCannedResponses();
    } catch (err) {
      console.error('Error deleting canned response:', err);
      error('Delete Failed', 'Failed to delete canned response');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', category: 'general' });
    setShowAddForm(false);
    setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Canned Responses</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-4">
                {editingId ? 'Edit Response' : 'Add New Response'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Title"
                  placeholder="Response title..."
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="payment">Payment</option>
                    <option value="technical">Technical</option>
                    <option value="account">Account</option>
                    <option value="billing">Billing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Response Content
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter the response content..."
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    required
                  />
                </div>

                <div className="flex space-x-3">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : editingId ? 'Update' : 'Add Response'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Add Button */}
          {!showAddForm && (
            <div className="mb-6">
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Response
              </Button>
            </div>
          )}

          {/* Responses List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading responses...</p>
              </div>
            ) : responses.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Canned Responses</h3>
                <p className="text-gray-600">Create your first canned response to get started.</p>
              </div>
            ) : (
              responses.map((response) => (
                <div key={response.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{response.title}</h4>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {response.category}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(response)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(response.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{response.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}