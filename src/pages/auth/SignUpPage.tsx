import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Gift, Star, Sparkles } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { SEOHead } from '../../components/SEO/SEOHead';

export function SignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for referral code in URL params
    const urlParams = new URLSearchParams(location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      validateReferralCode(refCode);
    }
  }, [location]);

  const validateReferralCode = async (code: string) => {
    try {
      const q = query(collection(db, 'users'), where('referralCode', '==', code));
      const querySnapshot = await getDocs(q);
      setReferralValid(!querySnapshot.empty);
    } catch (error) {
      console.error('Error validating referral code:', error);
      setReferralValid(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Generate referral code for new user
      const newUserReferralCode = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create user document in Firestore with both currency balances
      const userData: any = {
        name: formData.name,
        email: formData.email,
        walletBalance: 0,
        walletBalanceNGN: 0, // Add NGN balance
        isAdmin: false,
        referralCode: newUserReferralCode,
        loyaltyPoints: 0,
        totalLoyaltyPoints: 0,
        referralEarningsAvailable: 0,
        referralEarningsTotal: 0,
        referralEarningsPaid: false,
        createdAt: new Date()
      };

      // Add referral code if valid
      if (referralCode && referralValid) {
        userData.referredBy = referralCode;
      }

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific Firebase auth errors with user-friendly messages
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('This email address is already registered. Please use a different email or try signing in.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/operation-not-allowed':
          setError('Email/password accounts are not enabled. Please contact support.');
          break;
        case 'auth/weak-password':
          setError('Password is too weak. Please choose a stronger password.');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Please check your internet connection and try again.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.');
          break;
        default:
          setError('Registration failed. Please try again or contact support if the problem persists.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Create Your Account"
        description="Sign up for InstantNums to get instant virtual phone numbers for SMS verification. Join thousands of users worldwide."
        url="https://instantnums.com/signup"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-900 to-green-900 flex">
      {/* Left Side - Features & Benefits */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-emerald-600/20 to-green-700/20 backdrop-blur-sm border-r border-white/10">
        <div className="flex flex-col justify-center px-12">
          <div className="max-w-lg">
            <h3 className="text-4xl font-black text-white mb-8">
              Join thousands using{' '}
              <span className="text-amber-400">InstantNums</span>
            </h3>
            
            {/* Benefits List */}
            <div className="space-y-6 mb-12">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Free Sign Up</h4>
                  <p className="text-emerald-200">
                    No setup fees, no monthly charges. Only pay for what you use.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Premium Quality</h4>
                  <p className="text-emerald-200">
                    High success rates with numbers from trusted providers worldwide.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Instant Access</h4>
                  <p className="text-emerald-200">
                    Start receiving SMS codes immediately after registration.
                  </p>
                </div>
              </div>
            </div>

            {/* Social Proof */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="text-center mb-4">
                <div className="text-3xl font-black text-amber-400">10,000+</div>
                <div className="text-emerald-200">Happy Customers</div>
              </div>
              <div className="flex items-center justify-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />
                ))}
              </div>
              <p className="text-sm text-emerald-200 text-center mt-2">
                "Best SMS verification service I've used!"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
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
            <h2 className="text-4xl font-black text-white mb-4">
              Join{' '}
              <span className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                InstantNums
              </span>{' '}
              Today
            </h2>
            <p className="text-xl text-emerald-200">
              Create your free account in seconds
            </p>
          </div>

          {/* Registration Form */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Name Input */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-emerald-200 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-emerald-300" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      className="block w-full pl-10 pr-3 py-4 bg-white/10 border border-white/20 rounded-xl placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent backdrop-blur-sm"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-emerald-200 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-emerald-300" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="block w-full pl-10 pr-3 py-4 bg-white/10 border border-white/20 rounded-xl placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent backdrop-blur-sm"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-emerald-200 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-emerald-300" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      className="block w-full pl-10 pr-10 py-4 bg-white/10 border border-white/20 rounded-xl placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent backdrop-blur-sm"
                      placeholder="Create a password (min 6 characters)"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        className="text-emerald-300 hover:text-emerald-200 transition-colors"
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

                {/* Confirm Password Input */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-emerald-200 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-emerald-300" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="block w-full pl-10 pr-3 py-4 bg-white/10 border border-white/20 rounded-xl placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent backdrop-blur-sm"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start space-x-3">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-5 w-5 text-emerald-500 focus:ring-emerald-400 border-white/30 rounded bg-white/10 mt-1"
                />
                <label htmlFor="terms" className="text-sm text-emerald-200 leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" className="text-amber-400 hover:text-amber-300 font-medium">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-amber-400 hover:text-amber-300 font-medium">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Create Account Button */}
              <div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-200"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating your account...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      Create Free Account
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </div>
                  )}
                </Button>
              </div>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-emerald-200">
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className="font-bold text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>

          {/* Back to Home */}
          <div className="text-center">
            <Link 
              to="/" 
              className="text-emerald-300 hover:text-emerald-200 transition-colors font-medium"
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
