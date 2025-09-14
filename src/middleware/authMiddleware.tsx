// Enhanced Authentication Middleware for Production Security
import React from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SecurityService } from '../services/securityService';
import { Loader } from '../components/ui/Loader';

export interface AuthValidation {
  valid: boolean;
  reason?: string;
  action?: 'logout' | 'refresh' | 'block';
}

export interface FinancialValidation {
  valid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export class AuthMiddleware {
  private static readonly MAX_SESSION_TIME = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

  // Validate user authentication with enhanced security
  static async validateUserAuth(user: User): Promise<AuthValidation> {
    try {
      if (!user || !user.uid) {
        return { valid: false, reason: 'Invalid user object', action: 'logout' };
      }

      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        return { valid: false, reason: 'User document not found', action: 'logout' };
      }

      const userData = userDoc.data();
      
      // Check if user is blocked
      if (userData.isBlocked === true) {
        return { valid: false, reason: 'Account blocked', action: 'logout' };
      }
      
      // Check if user is forced to logout
      if (userData.forceLogout === true) {
        return { valid: false, reason: 'Forced logout', action: 'logout' };
      }

      // Check email verification (if required)
      if (!user.emailVerified && import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION === 'true') {
        return { valid: false, reason: 'Email not verified', action: 'refresh' };
      }

      // Check for suspicious activity (skip for admin users)
      // First check if this is an admin user
      let isAdmin = false;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          isAdmin = userDoc.data().isAdmin === true;
        }
      } catch (adminCheckError) {
        console.warn('Could not verify admin status in auth validation:', adminCheckError);
      }

      if (!isAdmin) {
        const isSuspicious = await SecurityService.detectSuspiciousActivity(
          user.uid || '', 
          'auth_validation', 
          {
            email: user.email || '',
            lastSignIn: user.metadata?.lastSignInTime,
            creationTime: user.metadata?.creationTime
          }
        );

        if (isSuspicious) {
          return { valid: false, reason: 'Suspicious activity detected', action: 'logout' };
        }
      } else {
        console.log('Admin user bypassing suspicious activity check during auth validation');
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating user auth:', error);
      return { valid: false, reason: 'Validation error', action: 'logout' };
    }
  }

  // Enhanced session management
  static manageUserSession(user: User): void {
    try {
      if (!user?.uid) return;

      const sessionKey = `user_session_${user.uid}`;
      const sessionData = {
        userId: user.uid,
        email: user.email || '',
        lastActivity: Date.now(),
        sessionId: Math.random().toString(36).substring(2)
      };

      // Store session data
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      localStorage.setItem('current_session', user.uid);

      // Set session timeout
      setTimeout(() => {
        this.invalidateSession('Session timeout');
      }, this.MAX_SESSION_TIME);
    } catch (error) {
      console.error('Error managing user session:', error);
    }
  }

  // Invalidate user session
  static invalidateSession(reason: string): void {
    try {
      const currentSession = localStorage.getItem('current_session');
      
      if (currentSession) {
        localStorage.removeItem(`user_session_${currentSession}`);
        localStorage.removeItem('current_session');
        
        // Clear any security flags
        localStorage.removeItem('suspicious_activity');
        
        // Log session invalidation
        console.log('Session invalidated:', reason);
      }
    } catch (error) {
      console.error('Error invalidating session:', error);
    }
  }

  // Check for concurrent sessions
  static async detectConcurrentSessions(userId: string): Promise<boolean> {
    try {
      const sessionKey = `user_session_${userId}`;
      const storedSession = localStorage.getItem(sessionKey);
      
      if (!storedSession) {
        return false;
      }

      const sessionData = JSON.parse(storedSession);
      const currentSessionId = sessionData.sessionId;
      
      // In a real implementation, you'd check against a server-side session store
      // For now, we'll check localStorage patterns
      const allKeys = Object.keys(localStorage);
      const userSessions = allKeys.filter(key => 
        key.startsWith(`user_session_${userId}`) && key !== sessionKey
      );

      return userSessions.length > 0;
    } catch (error) {
      console.error('Error detecting concurrent sessions:', error);
      return false;
    }
  }

  // Validate request origin
  static validateRequestOrigin(): { valid: boolean; reason?: string } {
    try {
      const allowedOrigins = [
        'localhost',
        '127.0.0.1',
        'proxynumsms.com',
        'bolt.host',
        'netlify.app',
        'vercel.app',
        'webcontainer-api.io'
      ];
      
      const currentOrigin = window.location.hostname;
      const isValid = allowedOrigins.some(origin => 
        currentOrigin.includes(origin) || currentOrigin === origin
      );
      
      if (!isValid) {
        return { valid: false, reason: `Invalid origin: ${currentOrigin}` };
      }
      
      return { valid: true };
    } catch (error) {
      console.error('Error validating request origin:', error);
      return { valid: false, reason: 'Origin validation error' };
    }
  }

  // Enhanced bot detection
  static detectBotBehavior(): { isBot: boolean; reason?: string; confidence: number } {
    try {
      let botScore = 0;
      const reasons: string[] = [];

      // Check user agent
      const userAgent = navigator.userAgent;
      const botPatterns = [
        /bot/i, /spider/i, /crawler/i, /scraper/i,
        /headless/i, /phantom/i, /automation/i,
        /selenium/i, /webdriver/i, /puppeteer/i
      ];

      if (botPatterns.some(pattern => pattern.test(userAgent))) {
        botScore += 60;
        reasons.push('Bot user agent detected');
      }

      // Check for missing browser features
      if (!window.navigator.plugins || window.navigator.plugins.length === 0) {
        botScore += 20;
        reasons.push('No browser plugins');
      }

      // Check for headless browser indicators
      if (window.navigator.webdriver) {
        botScore += 70;
        reasons.push('WebDriver detected');
      }

      // Check for missing screen data
      if (!window.screen || window.screen.width === 0 || window.screen.height === 0) {
        botScore += 30;
        reasons.push('Invalid screen dimensions');
      }

      // Check for rapid mouse movements (if mouse events exist)
      const rapidActivity = localStorage.getItem('rapid_activity');
      if (rapidActivity === 'true') {
        botScore += 25;
        reasons.push('Rapid activity detected');
      }

      const isBot = botScore >= 50;
      
      return {
        isBot,
        reason: reasons.join(', '),
        confidence: Math.min(botScore, 100)
      };
    } catch (error) {
      console.error('Error detecting bot behavior:', error);
      return { isBot: false, confidence: 0 };
    }
  }

  // Validate financial input with enhanced security
  static validateFinancialInput(data: {
    amount: number;
    currency: string;
    userId: string;
  }): FinancialValidation {
    const errors: string[] = [];
    let sanitizedData = { ...data };

    try {
      // Amount validation
      if (typeof data.amount !== 'number' || isNaN(data.amount)) {
        errors.push('Invalid amount format');
      } else {
        // Check for suspicious amounts
        if (data.amount < 0) {
          errors.push('Amount cannot be negative');
        }
        if (data.amount > 100000) {
          errors.push('Amount exceeds maximum limit ($100,000)');
        }
        if (data.amount > 0 && data.amount < 0.01) {
          errors.push('Amount too small (minimum $0.01)');
        }
        
        // Round to 2 decimal places
        sanitizedData.amount = Math.round(data.amount * 100) / 100;
      }

      // Currency validation
      const allowedCurrencies = ['USD', 'NGN', 'EUR', 'GBP'];
      if (!allowedCurrencies.includes(data.currency?.toUpperCase?.())) {
        errors.push('Unsupported currency');
      } else {
        sanitizedData.currency = data.currency.toUpperCase();
      }

      // User ID validation
      if (!data.userId || typeof data.userId !== 'string' || data.userId.length < 10) {
        errors.push('Invalid user ID');
      }

      return {
        valid: errors.length === 0,
        errors,
        sanitizedData
      };
    } catch (error) {
      console.error('Error validating financial input:', error);
      return {
        valid: false,
        errors: ['Validation error occurred']
      };
    }
  }

  // Log data access for compliance
  static async logDataAccess(
    userId: string, 
    dataType: string, 
    operation: 'read' | 'write' | 'delete',
    recordIds?: string[]
  ): Promise<void> {
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      await setDoc(doc(db, 'data_access_logs', `${userId}_${Date.now()}`), {
        userId: userId,
        dataType: dataType,
        operation: operation,
        recordIds: recordIds || [],
        timestamp: new Date(),
        ipAddress: 'client-side',
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.error('Error logging data access:', error);
    }
  }

  // Validate password strength
  static validatePasswordStrength(password: string): { valid: boolean; score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 2;
    else feedback.push('Password should be at least 8 characters');

    if (password.length >= 12) score += 1;
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');
    
    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Add numbers');
    
    if (/[^a-zA-Z0-9]/.test(password)) score += 2;
    else feedback.push('Add special characters');

    // Check for common passwords
    const commonPasswords = ['password', '123456', 'admin', 'user', 'test'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      score = Math.max(0, score - 3);
      feedback.push('Avoid common passwords');
    }

    return {
      valid: score >= 4,
      score: Math.min(score, 8),
      feedback
    };
  }

  // Generate secure session token
  static generateSessionToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Check device fingerprint for security
  static generateDeviceFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
      }
      
      const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvas: canvas.toDataURL()
      };

      return btoa(JSON.stringify(fingerprint)).substring(0, 32);
    } catch (error) {
      console.error('Error generating device fingerprint:', error);
      return 'unknown';
    }
  }
}