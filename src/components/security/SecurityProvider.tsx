// Security context provider for app-wide security monitoring
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { SecurityService } from '../../services/securityService';
import { AuthMiddleware } from '../../middleware/authMiddleware';

interface SecurityContextType {
  isSecure: boolean;
  securityScore: number;
  threats: string[];
  checkActionSecurity: (action: string, metadata?: any) => Promise<{ allowed: boolean; reason?: string }>;
  validateFinancialOperation: (data: any) => { valid: boolean; errors: string[] };
  logUserAction: (action: string, metadata?: any) => void;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [securityState, setSecurityState] = useState({
    isSecure: true,
    securityScore: 100,
    threats: [] as string[]
  });

  useEffect(() => {
    // Initialize security monitoring
    initializeSecurityMonitoring();
    
    // Run security audit on app start
    runSecurityAudit();
    
    // Set up periodic security checks
    const securityInterval = setInterval(runSecurityAudit, 10 * 60 * 1000); // Every 10 minutes
    
    return () => {
      clearInterval(securityInterval);
    };
  }, []);

  useEffect(() => {
    if (user) {
      // Validate user session on user change
      validateUserSession();
      
      // Check for concurrent sessions
      checkConcurrentSessions();
    }
  }, [user]);

  const initializeSecurityMonitoring = async () => {
    try {
      await SecurityService.initializeSecurity();
      
      // Apply development security headers
      if (import.meta.env.DEV) {
        const { applyDevelopmentSecurity } = await import('../../lib/securityHeaders');
        applyDevelopmentSecurity();
      }
      
      // Skip aggressive origin and bot detection that was causing issues
      // These were causing users to get auto-logged out unnecessarily
      
    } catch (error) {
      console.error('Error initializing security monitoring:', error);
    }
  };

  const runSecurityAudit = async () => {
    try {
      const audit = await SecurityService.performSecurityAudit();
      
      setSecurityState({
        isSecure: audit.score >= 80,
        securityScore: audit.score,
        threats: audit.issues
      });
      
      // Log security status
      if (audit.score < 80) {
        console.warn('Low security score:', audit.score, 'Issues:', audit.issues);
      }
    } catch (error) {
      console.error('Error running security audit:', error);
    }
  };

  const validateUserSession = async () => {
    if (!user) return;
    
    try {
      const validation = await AuthMiddleware.validateUserAuth(user);
      
      if (!validation.valid) {
        console.warn('Invalid user session:', validation.reason);
        
        if (validation.action === 'logout') {
          // The auth hook will handle the actual logout
          AuthMiddleware.invalidateSession(validation.reason || 'Session invalid');
        }
      }
    } catch (error) {
      console.error('Error validating user session:', error);
    }
  };

  const checkConcurrentSessions = async () => {
    // Skip aggressive concurrent session detection that was causing auto-logout
    return;
  };

  const checkActionSecurity = async (action: string, metadata: any = {}): Promise<{ allowed: boolean; reason?: string }> => {
    if (!user) {
      return { allowed: false, reason: 'Authentication required' };
    }

    try {
      // Check rate limits
      const rateLimit = SecurityService.checkAdvancedRateLimit(user.id, action);
      if (!rateLimit.allowed) {
        return { allowed: false, reason: rateLimit.reason };
      }
      
      // Skip aggressive suspicious activity detection that causes auto-logout
      // This was too aggressive and causing legitimate users to be logged out
      
      // For financial operations, additional checks
      if (action.includes('payment') || action.includes('deposit') || action.includes('withdraw')) {
        const fraudCheck = await SecurityService.detectPaymentFraud({
          userId: user.id,
          amount: metadata.amount || 0,
          method: metadata.method || 'unknown'
        });
        
        if (fraudCheck.isFraud) {
          return { allowed: false, reason: 'Payment security check failed' };
        }
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('Error checking action security:', error);
      return { allowed: true }; // Allow on error to not break UX
    }
  };

  const validateFinancialOperation = (data: {
    amount: number;
    currency: string;
    userId: string;
  }): { valid: boolean; errors: string[] } => {
    return AuthMiddleware.validateFinancialInput(data);
  };

  const logUserAction = async (action: string, metadata: any = {}) => {
    if (!user) return;
    
    try {
      // Log to data access logs for compliance
      await AuthMiddleware.logDataAccess(
        user.id, 
        metadata.dataType || 'user_action', 
        'write',
        metadata.recordIds
      );
      
      // Update user activity tracking
      const activityKey = `user_activity_${user.id}`;
      const activity = JSON.parse(localStorage.getItem(activityKey) || '[]');
      activity.push({
        action,
        metadata,
        timestamp: Date.now()
      });
      
      // Keep only last 100 actions
      if (activity.length > 100) {
        activity.splice(0, activity.length - 100);
      }
      
      localStorage.setItem(activityKey, JSON.stringify(activity));
    } catch (error) {
      console.error('Error logging user action:', error);
    }
  };

  const contextValue: SecurityContextType = {
    isSecure: securityState.isSecure,
    securityScore: securityState.securityScore,
    threats: securityState.threats,
    checkActionSecurity,
    validateFinancialOperation,
    logUserAction
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}