import React, { useState } from 'react';
import { 
  Menu, 
  X, 
  Users, 
  DollarSign, 
  Activity, 
  Settings, 
  Shield, 
  Bell,
  BarChart3,
  Database,
  Edit
} from 'lucide-react';
import { Button } from '../ui/Button';

interface ResponsiveAdminLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export function ResponsiveAdminLayout({ activeTab, onTabChange, children }: ResponsiveAdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3, color: 'text-blue-600' },
    { id: 'payments', name: 'Manual Payments', icon: DollarSign, color: 'text-green-600' },
    { id: 'sms', name: 'SMS Management', icon: Activity, color: 'text-purple-600' },
    { id: 'financial', name: 'Financial', icon: DollarSign, color: 'text-blue-600' },
    { id: 'users', name: 'User Tools', icon: Users, color: 'text-indigo-600' },
    { id: 'manual-service', name: 'Manual Service', icon: Edit, color: 'text-green-600' },
    { id: 'support', name: 'Support', icon: Bell, color: 'text-orange-600' },
    { id: 'security', name: 'Security', icon: Shield, color: 'text-red-600' },
    { id: 'api', name: 'API Management', icon: Database, color: 'text-gray-600' },
    { id: 'config', name: 'Configuration', icon: Settings, color: 'text-gray-600' }
  ];

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">
          {tabs.find(tab => tab.id === activeTab)?.name || 'Admin Panel'}
        </h1>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Mobile close button */}
          <div className="lg:hidden absolute top-4 right-4">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
            <p className="text-sm text-gray-600 mt-1">System Management</p>
          </div>

          {/* Navigation */}
          <nav className="p-4">
            <ul className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? tab.color : 'text-gray-400'}`} />
                      <span className="truncate">{tab.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}