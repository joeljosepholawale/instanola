// Security hook for component-level security enforcement
import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { SecurityService } from '../services/securityService';
import { useAuth } from './useAuth';

export interface SecurityState {
  isSecure: boolean;
  securityScore: number;
  threats: string[];
  lastCheck: Date;
}

export function useSecurity() {
  const { user } = useAuth();
  const [securityState, setSecurityState] = useState<SecurityState>({
    isSecure: true,
    securityScore: 100,
    threats: [],
    lastCheck: new Date()
  });
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitReset, setRateLimitReset] = useState<number>(0);
  const securityCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize security monitoring
  useEffect(() => {
    initializeSecurity();
    
    // Run security checks every 5 minutes
    securityCheckInterval.current = setInterval(performSecurityCheck, 5 * 60 * 1000);
    
    return () => {
      if (securityCheckInterval.current) {
        clearInterval(securityCheckInterval.current);
      }
    };
  }, []);

  // Clean up on user change
  useEffect(() => {
    if (user) {
      validateCurrentSession();
    }
  }, [user]);

  const initializeSecurity = async () => {
    try {
      await SecurityService.initializeSecurity();
      await performSecurityCheck();
    } catch (error) {
      console.error('Error initializing security:', error);
    }
  };

  const performSecurityCheck = async () => {
    try {
      const audit = await SecurityService.performSecurityAudit();
      
      setSecurityState({
        isSecure: audit.score >= 80,
        securityScore: audit.score,
        threats: audit.issues,
        lastCheck: new Date()
      });
      
      // Clean up old security data
      await SecurityService.cleanupSecurityData();
    } catch (error) {
      console.error('Error performing security check:', error);
    }
  };

  const validateCurrentSession = async () => {
    if (!user) return;
    
    try {
      const sessionValidation = await SecurityService.validateSession(user);
      
      if (!sessionValidation.valid) {
        console.warn('Invalid session detected:', sessionValidation.reason);
        
        if (sessionValidation.action === 'logout') {
          // Force logout would be handled by the auth service
          console.warn('Session requires logout:', sessionValidation.reason);
        }
      }
    } catch (error) {
      console.error('Error validating session:', error);
    }
  };

  // Check if action is allowed (rate limiting + security)
  const checkActionSecurity = async (action: string, metadata: Record<string, any> = {}): Promise<{
    allowed: boolean;
    reason?: string;
    resetIn?: number;
  }> => {
    if (!user) {
      return { allowed: false, reason: 'Authentication required' };
    }

    try {
      // Check rate limits
      const rateLimit = SecurityService.checkAdvancedRateLimit(user.id, action);
      
      if (!rateLimit.allowed) {
        setRateLimited(true);
        setRateLimitReset(rateLimit.resetIn || 60);
        
        // Start countdown
        if (rateLimit.resetIn) {
          const countdown = setInterval(() => {
            setRateLimitReset(prev => {
              if (prev <= 1) {
                setRateLimited(false);
                clearInterval(countdown);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
        
        return { 
          allowed: false, 
          reason: rateLimit.reason,
          resetIn: rateLimit.resetIn
        };
      }
      
      // Check for suspicious activity
      const isSuspicious = await SecurityService.detectSuspiciousActivity(user.id, action, metadata);
      
      if (isSuspicious) {
        return { 
          allowed: false, 
          reason: 'Suspicious activity detected. Please contact support.' 
        };
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('Error checking action security:', error);
      return { allowed: true }; // Allow on error to not break UX
    }
  };

  // Validate admin access
  const validateAdminAccess = async (): Promise<{ valid: boolean; reason?: string }> => {
    if (!user) {
      return { valid: false, reason: 'Not authenticated' };
    }

    try {
      return await SecurityService.validateAdminAccess(user.id);
    } catch (error) {
      console.error('Error validating admin access:', error);
      return { valid: false, reason: 'Validation error' };
    }
  };

  // Detect payment fraud
  const detectPaymentFraud = async (paymentData: {
    amount: number;
    method: string;
  }): Promise<{ isFraud: boolean; reason?: string }> => {
    if (!user) {
      return { isFraud: false };
    }

    try {
      // Get recent payment frequency
      const recentPayments = JSON.parse(localStorage.getItem(`payments_${user.id}`) || '[]')
        .filter((payment: any) => Date.now() - payment.timestamp < 60 * 60 * 1000);
      
      const fraudCheck = await SecurityService.detectPaymentFraud({
        userId: user.id,
        amount: paymentData.amount,
        method: paymentData.method,
        frequency: recentPayments.length
      });
      
      // Store payment for frequency tracking
      recentPayments.push({ 
        amount: paymentData.amount, 
        method: paymentData.method, 
        timestamp: Date.now() 
      });
      localStorage.setItem(`payments_${user.id}`, JSON.stringify(recentPayments));
      
      return {
        isFraud: fraudCheck.isFraud,
        reason: fraudCheck.reason
      };
    } catch (error) {
      console.error('Error detecting payment fraud:', error);
      return { isFraud: false };
    }
  };

  // Sanitize input for display
  const sanitizeInput = (input: string, type: 'email' | 'phone' | 'name' | 'text' | 'amount' = 'text'): {
    valid: boolean;
    sanitized: string;
    error?: string;
  } => {
    return SecurityService.validateAndSanitizeInput(input, type);
  };

  return {
    securityState,
    rateLimited,
    rateLimitReset,
    checkActionSecurity,
    validateAdminAccess,
    detectPaymentFraud,
    sanitizeInput,
    performSecurityCheck
  };
}