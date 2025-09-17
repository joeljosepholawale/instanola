import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Shield, Wallet, RefreshCw, Eye } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { DaisySMSService } from '../../services/daisySMS';
import { formatCurrency } from '../../lib/utils';
import { SecurityService } from '../../services/securityService';

export function Header() {
  const { user, isImpersonating, adminSession } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceNGN, setBalanceNGN] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(1600);

  const handleSignOut = async () => {
    try {
      // Clear any impersonation session
      localStorage.removeItem('admin_impersonation_session');
      localStorage.removeItem('impersonated_user_session');
      
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleStopImpersonation = () => {
    // Get session data before clearing
    const adminSession = localStorage.getItem('admin_impersonation_session');
    let targetUserId: string | undefined;
    
    if (adminSession) {
      try {
        const sessionData = JSON.parse(adminSession);
        targetUserId = sessionData.targetUserId;
      } catch (error) {
        console.error('Error parsing admin session:', error);
      }
    }
    
    // Clear impersonation session
    localStorage.removeItem('admin_impersonation_session');
    localStorage.removeItem('impersonated_user_session');
    
    // Clear security flags that might prevent admin re-login
    SecurityService.clearImpersonationSecurityFlags(targetUserId);
    
    // Redirect to admin panel
    window.location.href = '/admin';
  };
  const fetchBalance = async () => {
    if (!user) return;
    
    try {
      // Only show loading if we don't have a balance yet
      if (balance === 0 && balanceNGN === 0) {
        setLoadingBalance(true);
      }
      
      // Get user balance from Firebase
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newBalance = userData.walletBalance || 0;
        const newBalanceNGN = userData.walletBalanceNGN || 0;
        
        // Always update balances to ensure accuracy
        setBalance(newBalance);
        setBalanceNGN(newBalanceNGN);
      }
      
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadExchangeRate = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      setExchangeRate(data.rates.NGN || 1600);
    } catch (error) {
      console.warn('Failed to load exchange rate, using fallback');
      setExchangeRate(1600);
    }
  };

  const formatNaira = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
  };

  useEffect(() => {
    if (user) {
      fetchBalance();
      loadExchangeRate();
      // Refresh balance every 30 seconds for accuracy
      const interval = setInterval(fetchBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [user]); // Remove balance dependencies to prevent infinite loops

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'How It Works', href: '/how-it-works' },
    { name: 'API Docs', href: '/api-docs' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-green-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Logo />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-gray-600 hover:text-green-700 px-3 py-2 text-sm font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-green-600 after:transform after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-center"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth & Balance */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                {/* Impersonation Banner */}
                {isImpersonating && adminSession && (
                  <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg px-4 py-2 shadow-lg animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4" />
                        <div>
                          <div className="text-sm font-bold">
                            Viewing as: {user?.name || user?.email}
                          </div>
                          <div className="text-xs text-red-100">
                            Admin: {adminSession?.adminName} • Balance: ${(user?.walletBalance || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={handleStopImpersonation}
                        className="text-xs py-1 px-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-0 transition-all"
                      >
                        Exit Impersonation
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* USD Balance Display */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl px-4 py-2 font-bold text-sm shadow-lg">
                  {loadingBalance ? (
                    <div className="animate-pulse">...</div>
                  ) : (
                    <div className="text-center">
                      <div>${balance.toFixed(2)}</div>
                    </div>
                  )}
                </div>
                {user?.isAdmin && !isImpersonating && (
                  <Link to="/admin">
                    <Button size="sm" className="ml-2 text-xs py-1 px-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Panel
                    </Button>
                  </Link>
                )}
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-green-700 hover:bg-green-50">
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                {/* Admin Login Link for non-admin users */}
                {!user.isAdmin && (
                  <Link to="/admin/login">
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-red-600 hover:bg-red-50">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-gray-600 hover:text-red-600 hover:bg-red-50">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-green-700 hover:bg-green-50">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-300">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-3 ml-4">
            {/* Mobile USD Balance */}
            {user && (
              <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg px-3 py-1 text-xs font-bold shadow-lg">
                {loadingBalance ? '...' : `$${balance.toFixed(2)}`}
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              {/* Mobile Impersonation Banner */}
              {isImpersonating && adminSession && (
                <div className="mx-4 mb-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-3 shadow-lg animate-pulse">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-bold">Impersonation Active</span>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={handleStopImpersonation}
                      className="text-xs py-1 px-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-0 transition-all"
                    >
                      Stop
                    </Button>
                  </div>
                  <div className="text-xs text-red-100 space-y-0.5">
                    <div className="font-medium">👤 {user?.name || user?.email}</div>
                    <div className="flex items-center justify-between">
                      <span>💰 ${(user?.walletBalance || 0).toFixed(2)}</span>
                      <span>🛡️ {adminSession?.adminName?.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                {user ? (
                  <div className="space-y-2">
                    {user.isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      to="/dashboard"
                      className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className="block px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}