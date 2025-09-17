import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Phone, 
  Wallet, 
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  HelpCircle,
  Gift,
  Home,
  CreditCard,
  Shield
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [balance, setBalance] = useState({ usd: 0, ngn: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Fund Wallet', href: '/dashboard/wallet', icon: Wallet },
    { name: 'Buy Numbers', href: '/dashboard/numbers', icon: Phone },
    { name: 'Rent Numbers', href: '/dashboard/rentals', icon: CreditCard },
    { name: 'API Access', href: '/dashboard/api', icon: Globe },
    { name: 'Refer & Earn', href: '/dashboard/refer-earn', icon: Gift },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    { name: 'FAQs', href: '/dashboard/faqs', icon: HelpCircle },
    // Admin-only navigation
    ...(user?.isAdmin ? [
      { name: 'Admin Panel', href: '/admin', icon: Shield, adminOnly: true }
    ] : [])
  ];



  useEffect(() => {
    if (user) {
      fetchBalance();
    }
  }, [user]);

  const fetchBalance = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setBalance({
          usd: data.walletBalance || 0,
          ngn: data.walletBalanceNGN || 0
        });
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
              <Logo size="sm" />
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-6 py-6">
              <ul className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === tab.href || 
                    (tab.href === '/admin' && location.pathname.startsWith('/admin'));
                  
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? (tab.adminOnly ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-600' : 'bg-blue-50 text-blue-700 border-r-2 border-blue-600')
                            : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? (tab.adminOnly ? 'text-purple-600' : 'text-blue-600') : 'text-gray-400'}`} />
                        {item.name}
                        {tab.adminOnly && (
                          <span className="ml-auto bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                            Admin
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Logout Section */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="px-4 mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">LOGOUT</h3>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all duration-200"
              >
                <LogOut className="w-5 h-5 mr-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 lg:pl-80">
          {/* Top navigation */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  
                  {/* Logo for mobile */}
                  <div className="ml-4 lg:hidden">
                    <Logo size="sm" />
                  </div>

                  {/* Breadcrumb */}
                  <div className="hidden lg:block">
                    <div className="flex items-center space-x-2 text-sm">
                      <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                        Dashboard
                      </Link>
                      <span className="text-gray-400">/</span>
                      <span className="text-gray-900 font-medium">Home</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Balance Display */}
                  <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl px-4 py-2 font-bold text-sm shadow-lg">
                    <div className="text-center">
                      <div>${balance.usd.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* User Profile Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    </button>

                    {/* Dropdown Menu */}
                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                        <div className="px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {user?.name || 'User'}
                              </div>
                              <div className="text-sm text-gray-500">{user?.email}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="py-2">
                          <Link
                            to="/dashboard/settings"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4 mr-3" />
                            Profile
                          </Link>
                          <Link
                            to="/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Phone className="w-4 h-4 mr-3" />
                            Buy Numbers
                          </Link>
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              handleSignOut();
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="w-4 h-4 mr-3" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="min-h-screen">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;