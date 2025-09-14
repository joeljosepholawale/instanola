import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Save,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  MapPin
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDate } from '../../lib/utils';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  position: 'top' | 'center' | 'bottom';
  active: boolean;
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
}

export function AnnouncementManager() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error',
    position: 'center' as 'top' | 'center' | 'bottom',
    expiresIn: '7' // days
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'announcements'));
      const announcementList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate()
      })) as Announcement[];
      
      setAnnouncements(announcementList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (err) {
      console.error('Error loading announcements:', err);
      error('Load Failed', 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      error('Missing Fields', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const announcementId = editingId || `announcement_${Date.now()}`;
      const expiresAt = formData.expiresIn !== 'never' 
        ? new Date(Date.now() + parseInt(formData.expiresIn) * 24 * 60 * 60 * 1000)
        : undefined;
      
      const announcementData = {
        id: announcementId,
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        position: formData.position,
        active: true,
        createdAt: editingId ? announcements.find(a => a.id === editingId)?.createdAt || new Date() : new Date(),
        createdBy: user!.id,
        expiresAt: expiresAt,
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'announcements', announcementId), announcementData);
      
      success(
        editingId ? 'Announcement Updated' : 'Announcement Created', 
        `Announcement ${editingId ? 'updated' : 'created'} successfully`
      );
      
      resetForm();
      await loadAnnouncements();
    } catch (err) {
      console.error('Error saving announcement:', err);
      error('Save Failed', 'Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      position: announcement.position,
      expiresIn: announcement.expiresAt 
        ? Math.ceil((announcement.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)).toString()
        : 'never'
    });
    setEditingId(announcement.id);
    setShowForm(true);
  };

  const handleDelete = async (announcementId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this announcement?');
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'announcements', announcementId));
      success('Announcement Deleted', 'Announcement deleted successfully');
      await loadAnnouncements();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      error('Delete Failed', 'Failed to delete announcement');
    }
  };

  const toggleActive = async (announcementId: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, 'announcements', announcementId), {
        active: !currentActive,
        updatedAt: new Date()
      });
      
      success(
        currentActive ? 'Announcement Paused' : 'Announcement Activated',
        `Announcement ${currentActive ? 'paused' : 'activated'} successfully`
      );
      
      await loadAnnouncements();
    } catch (err) {
      console.error('Error toggling announcement:', err);
      error('Update Failed', 'Failed to update announcement status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'info',
      position: 'center',
      expiresIn: '7'
    });
    setShowForm(false);
    setEditingId(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'top':
        return '⬆️';
      case 'bottom':
        return '⬇️';
      default:
        return '🎯';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Announcement Manager</span>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Announcement
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Create/Edit Form */}
        {showForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-4">
              {editingId ? 'Edit Announcement' : 'Create New Announcement'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Title"
                placeholder="Announcement title..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter the announcement message... (Emojis and line breaks supported)"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  required
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">Message Preview</h4>
                <div className="bg-white border rounded-lg p-3">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    {formData.message || 'Your message will appear here...'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </Select>

                <Select
                  label="Position"
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value as any }))}
                >
                  <option value="top">Top of Screen</option>
                  <option value="center">Center (Modal)</option>
                  <option value="bottom">Bottom of Screen</option>
                </Select>

                <Select
                  label="Expires In"
                  value={formData.expiresIn}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresIn: e.target.value }))}
                >
                  <option value="1">1 Day</option>
                  <option value="3">3 Days</option>
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                  <option value="never">Never</option>
                </Select>
              </div>

              <div className="flex space-x-3">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Announcements List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Announcements</h3>
              <p className="text-gray-600">Create your first announcement to get started.</p>
            </div>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getTypeIcon(announcement.type)}
                      <h4 className="font-semibold text-gray-900">{announcement.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(announcement.type)}`}>
                        {announcement.type}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                        {getPositionIcon(announcement.position)} {announcement.position}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        announcement.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {announcement.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm mb-2">{announcement.message}</p>
                    <div className="bg-white border rounded-lg p-3 mb-2">
                      <div className="text-sm text-gray-800 whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {announcement.message}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Created: {formatDate(announcement.createdAt)}</span>
                      </span>
                      {announcement.expiresAt && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Expires: {formatDate(announcement.expiresAt)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(announcement.id, announcement.active)}
                    >
                      {announcement.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(announcement)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(announcement.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Telegram Community Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 text-blue-800 mb-2">
            <Users className="w-5 h-5" />
            <span className="font-medium">Telegram Community Prompt</span>
          </div>
          <p className="text-sm text-blue-700">
            The Telegram community join prompt (@ProxyNumSMS_Support) is automatically shown to users every 12 hours. 
            This is a permanent feature and cannot be disabled from the admin panel.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}