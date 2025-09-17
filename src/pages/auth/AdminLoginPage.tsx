import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Key, Users } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { SEOHead } from '../../components/SEO/SEOHead';
import { useAuth } from '../../hooks/useAuth';

export function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already logged in as admin
  React.useEffect(() => {
    if (user?.isAdmin) {
      navigate('/admin');
    } else if (user && !user.isAdmin) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Wait a moment for user data to load
      setTimeout(() => {
        // The useEffect above will handle the redirect based on admin status
      }, 1000);
      
    } catch (error: any) {
      console.error('Admin login error:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          setError('No admin account found with this email address.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Please check your credentials.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/user-disabled':
          setError('This admin account has been disabled.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.');
          break;
        case 'auth/invalid-credential':
          setError('Invalid admin credentials. Please check your email and password.');
          break;
        default:
          setError('Admin login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Admin Login"
        description="Admin access to InstantNums management panel"
        url="https://instantnums.com/admin/login"
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-purple-900 flex">
        {/* Left Side - Admin Info */}
        <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-red-600/20 to-purple-700/20 backdrop-blur-sm border-r border-white/10">
          <div className="flex flex-col justify-center px-12">
            <div className="max-w-lg">
              <h3 className="text-4xl font-black text-white mb-8">
                Admin Access to{' '}
                <span className="text-red-400">InstantNums</span>
              </h3>
              
              <div className="space-y-8">
                {/* Feature 1 */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">User Management</h4>
                    <p className="text-red-200">
                      Manage users, balances, and account permissions
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">System Security</h4>
                    <p className="text-purple-200">
                      Monitor security events and manage access controls
                    </p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Key className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Financial Control</h4>
                    <p className="text-red-200">
                      Manage payments, refunds, and financial operations
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="mt-12 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-4">
                  <Shield className="w-6 h-6 text-red-400" />
                  <span className="font-bold text-white">Secure Admin Access</span>
                </div>
                <div className="text-red-200 text-sm space-y-2">
                  <p>• All admin actions are logged and audited</p>
                  <p>• Enhanced security monitoring active</p>
                  <p>• Two-factor authentication recommended</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Admin Login Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            {/* Logo */}
            <div className="text-center">
              <Link to="/" className="inline-block">
                <Logo className="h-12 w-auto" />
              </Link>
            </div>

            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-4xl font-black text-white mb-4">
                Admin Access to{' '}
                <span className="bg-gradient-to-r from-red-400 to-purple-500 bg-clip-text text-transparent">
                  InstantNums
                </span>
              </h2>
              <p className="text-xl text-red-200">
                Secure administrator login
              </p>
            </div>

            {/* Login Form */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Email Input */}
                  <div>
                    <label htmlFor="admin-email" className="block text-sm font-medium text-red-200 mb-2">
                      Admin Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-red-300" />
                      </div>
                      <input
                        id="admin-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="block w-full pl-10 pr-3 py-4 bg-white/10 border border-white/20 rounded-xl placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent backdrop-blur-sm"
                        placeholder="Enter your admin email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label htmlFor="admin-password" className="block text-sm font-medium text-red-200 mb-2">
                      Admin Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-red-300" />
                      </div>
                      <input
                        id="admin-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        className="block w-full pl-10 pr-10 py-4 bg-white/10 border border-white/20 rounded-xl placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent backdrop-blur-sm"
                        placeholder="Enter your admin password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          type="button"
                          className="text-red-300 hover:text-red-200 transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Notice */}
                <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-center space-x-2 text-purple-200 text-sm">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">Secure Admin Login</span>
                  </div>
                  <p className="text-purple-300 text-xs mt-1">
                    All admin login attempts are monitored and logged for security.
                  </p>
                </div>

                {/* Sign In Button */}
                <div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-200"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Authenticating...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Shield className="w-5 h-5 mr-2" />
                        Admin Sign In
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </div>
                    )}
                  </Button>
                </div>
              </form>

              {/* Regular Login Link */}
              <div className="mt-6 text-center">
                <p className="text-red-200">
                  Not an admin?{' '}
                  <Link 
                    to="/login" 
                    className="font-bold text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Regular user login
                  </Link>
                </p>
              </div>
            </div>

            {/* Back to Home */}
            <div className="text-center">
              <Link 
                to="/" 
                className="text-red-300 hover:text-red-200 transition-colors font-medium"
              >
                ← Back to InstantNums Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}