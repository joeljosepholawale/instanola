import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Logo } from './components/ui/Logo';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { PricingPage } from './pages/PricingPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { ContactPage } from './pages/ContactPage';
import ApiDocsPage from './pages/ApiDocsPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { NumbersPage as NumbersPageNew } from './pages/dashboard/NumbersPageDaisy';
import { RentalsPage } from './pages/dashboard/RentalsPage';
import { WalletPage } from './pages/dashboard/WalletPage';
import { ApiPage } from './pages/dashboard/ApiPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { ReferEarnPage } from './pages/dashboard/ReferEarnPage';
import { FAQsPage } from './pages/dashboard/FAQsPage';
import { AdminPage } from './pages/admin/AdminPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Loader } from './components/ui/Loader';
import { ToastContainer } from './components/ui/Toast';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import { validateConfig } from './lib/config';
import { SecurityProvider } from './components/security/SecurityProvider';

function App() {
  const { user, loading, error } = useAuth();
  const { toasts, removeToast } = useToast();
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Validate configuration on app start
  React.useEffect(() => {
    const configValidation = validateConfig();
    if (!configValidation.valid) {
      console.warn('Missing environment variables:', configValidation.missing);
    }
  }, []);

  // Add a small delay to prevent flash redirects
  React.useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setIsInitialized(true);
      }, 100); // Small delay to ensure auth state is stable

      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Show loading screen while auth state is being determined OR during initialization
  // This prevents the flash between login/dashboard pages
  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-amber-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <Logo size="lg" />
          </div>
          <Loader size="lg" text="Loading ProxyNum..." showText={true} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-4">
            <Logo size="lg" />
          </div>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  return (
    <SecurityProvider>
      <Router>
        <div className="min-h-screen bg-white flex flex-col">
          {/* Only show Header for non-logged in users */}
          {!user && <Header />}
          <main className={user ? "flex-1 min-h-screen" : "flex-1"}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/api-docs" element={<ApiDocsPage />} />
              
              {/* Auth Routes */}
              <Route 
                path="/login" 
                element={user ? <Navigate to="/dashboard" /> : <LoginPage />} 
              />
              <Route 
                path="/signup" 
                element={user ? <Navigate to="/dashboard" /> : <SignUpPage />} 
              />
              <Route 
                path="/forgot-password" 
                element={user ? <Navigate to="/dashboard" /> : <ForgotPasswordPage />} 
              />
              
              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={user ? <DashboardLayout><NumbersPageNew /></DashboardLayout> : <Navigate to="/login" />} 
              />
              <Route 
                path="/dashboard/numbers" 
                element={user ? <DashboardLayout><NumbersPageNew /></DashboardLayout> : <Navigate to="/login" />} 
              />
              <Route 
                path="/dashboard/rentals" 
                element={user ? <DashboardLayout><RentalsPage /></DashboardLayout> : <Navigate to="/login" />} 
              />
              <Route 
                path="/dashboard/wallet" 
                element={user ? <DashboardLayout><WalletPage /></DashboardLayout> : <Navigate to="/login" />} 
              />
              <Route 
                path="/dashboard/api" 
                element={user ? <DashboardLayout><ApiPage /></DashboardLayout> : <Navigate to="/login" />} 
              />
              <Route 
                path="/dashboard/settings" 
                element={user ? <DashboardLayout><SettingsPage /></DashboardLayout> : <Navigate to="/login" />} 
              />
              <Route 
                path="/dashboard/refer-earn" 
                element={user ? <DashboardLayout><ReferEarnPage /></DashboardLayout> : <Navigate to="/login" />} 
              />
              <Route 
                path="/dashboard/faqs" 
                element={user ? <DashboardLayout><FAQsPage /></DashboardLayout> : <Navigate to="/login" />} 
              />
              <Route 
                path="/admin" 
                element={user?.isAdmin === true ? <AdminPage /> : <Navigate to="/dashboard" />} 
              />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          {/* Only show Footer for non-logged in users */}
          {!user && <Footer />}
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        

      </Router>
    </SecurityProvider>
  );
}

export default App;