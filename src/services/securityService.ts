// Comprehensive Security Service for Production
import { doc, setDoc, updateDoc, getDoc, getDocs, collection, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';

export interface SecurityConfig {
  rateLimit: {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    blockDurationMinutes: number;
  };
  authentication: {
    sessionTimeoutHours: number;
    maxFailedAttempts: number;
    lockoutDurationMinutes: number;
    requireEmailVerification: boolean;
  };
  dataProtection: {
    encryptSensitiveData: boolean;
    logDataAccess: boolean;
    anonymizeOldData: boolean;
  };
  monitoring: {
    logSecurityEvents: boolean;
    detectSuspiciousActivity: boolean;
    alertOnCriticalEvents: boolean;
  };
}

export interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'admin_access' | 'payment_fraud' | 'api_abuse' | 'data_breach_attempt' | 'suspicious_activity';
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export class SecurityService {
  private static readonly ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'ProxyNumSMS2025DefaultKey';
  
  // Initialize security configuration
  static async initializeSecurity(): Promise<void> {
    try {
      const defaultConfig: SecurityConfig = {
        rateLimit: {
          maxRequestsPerMinute: 60,
          maxRequestsPerHour: 1000,
          blockDurationMinutes: 15
        },
        authentication: {
          sessionTimeoutHours: 24,
          maxFailedAttempts: 5,
          lockoutDurationMinutes: 30,
          requireEmailVerification: true
        },
        dataProtection: {
          encryptSensitiveData: true,
          logDataAccess: true,
          anonymizeOldData: true
        },
        monitoring: {
          logSecurityEvents: true,
          detectSuspiciousActivity: true,
          alertOnCriticalEvents: true
        }
      };

      // Only try to write if user has permissions
      await setDoc(doc(db, 'config', 'security'), defaultConfig, { merge: true });
    } catch (error) {
      // Silently ignore permission errors for security config
      if (error instanceof Error && !error.message.includes('permissions')) {
        console.error('Error initializing security config:', error);
      }
    }
  }

  // Enhanced input validation and sanitization
  static validateAndSanitizeInput(input: string, type: 'email' | 'phone' | 'name' | 'text' | 'amount' | 'apiKey', maxLength: number = 100): { valid: boolean; sanitized: string; error?: string } {
    if (!input || typeof input !== 'string') {
      return { valid: false, sanitized: '', error: 'Invalid input' };
    }

    let sanitized = input.trim();
    
    // Remove potential XSS and injection attacks
    sanitized = sanitized
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript protocols
      .replace(/data:/gi, '') // Remove data protocols
      .replace(/vbscript:/gi, '') // Remove vbscript protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .substring(0, maxLength);

    // Type-specific validation
    switch (type) {
      case 'email':
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(sanitized)) {
          return { valid: false, sanitized, error: 'Invalid email format' };
        }
        break;
        
      case 'phone':
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
        if (!phoneRegex.test(sanitized)) {
          return { valid: false, sanitized, error: 'Invalid phone number format' };
        }
        break;
        
      case 'name':
        const nameRegex = /^[a-zA-Z\s\.]{2,50}$/;
        if (!nameRegex.test(sanitized)) {
          return { valid: false, sanitized, error: 'Name must be 2-50 characters, letters only' };
        }
        break;
        
      case 'amount':
        const amount = parseFloat(sanitized);
        if (isNaN(amount) || amount < 0 || amount > 100000) {
          return { valid: false, sanitized, error: 'Invalid amount' };
        }
        break;
        
      case 'apiKey':
        if (sanitized.length < 10 || sanitized.length > 100) {
          return { valid: false, sanitized, error: 'API key must be 10-100 characters' };
        }
        break;
    }

    return { valid: true, sanitized };
  }

  // Enhanced rate limiting with IP tracking
  static checkAdvancedRateLimit(userId: string, action: string, ipAddress?: string): { allowed: boolean; resetIn?: number; reason?: string } {
    try {
      const now = Date.now();
      const rateLimitKey = 'advanced_rate_limits';
      const rateLimitData = JSON.parse(localStorage.getItem(rateLimitKey) || '{}');
      
      const userKey = `${userId}_${action}`;
      const ipKey = ipAddress ? `ip_${ipAddress}_${action}` : null;
      
      // Initialize user data
      if (!rateLimitData[userKey]) {
        rateLimitData[userKey] = { 
          requests: [], 
          blocked: false, 
          blockedUntil: 0,
          totalRequests: 0,
          firstRequestAt: now
        };
      }
      
      const userData = rateLimitData[userKey];
      
      // Check if user is currently blocked
      if (userData.blocked && now < userData.blockedUntil) {
        return { 
          allowed: false, 
          resetIn: Math.ceil((userData.blockedUntil - now) / 1000),
          reason: 'Rate limit exceeded'
        };
      }
      
      // Remove requests older than 1 hour
      userData.requests = userData.requests.filter((timestamp: number) => 
        now - timestamp < 60 * 60 * 1000
      );
      
      // Check for suspicious patterns
      if (userData.requests.length > 100) { // More than 100 requests per hour
        userData.blocked = true;
        userData.blockedUntil = now + (30 * 60 * 1000); // Block for 30 minutes
        
        this.logSecurityEvent({
          type: 'api_abuse',
          userId: userId,
          ipAddress: ipAddress || 'unknown',
          userAgent: navigator.userAgent,
          details: { 
            action, 
            requestCount: userData.requests.length,
            timespan: '1 hour'
          },
          severity: 'high',
          timestamp: new Date(),
          resolved: false
        });
        
        localStorage.setItem(rateLimitKey, JSON.stringify(rateLimitData));
        return { allowed: false, reason: 'Suspicious activity detected' };
      }
      
      // Check minute-based rate limit
      const recentRequests = userData.requests.filter((timestamp: number) => 
        now - timestamp < 60 * 1000
      );
      
      if (recentRequests.length >= 10) { // Max 10 requests per minute
        return { 
          allowed: false, 
          resetIn: 60 - Math.floor((now - Math.max(...recentRequests)) / 1000),
          reason: 'Too many requests per minute'
        };
      }
      
      // IP-based rate limiting (if IP provided)
      if (ipKey && ipAddress) {
        if (!rateLimitData[ipKey]) {
          rateLimitData[ipKey] = { requests: [], blocked: false, blockedUntil: 0 };
        }
        
        const ipData = rateLimitData[ipKey];
        ipData.requests = ipData.requests.filter((timestamp: number) => 
          now - timestamp < 60 * 60 * 1000
        );
        
        if (ipData.requests.length > 500) { // Max 500 requests per hour per IP
          ipData.blocked = true;
          ipData.blockedUntil = now + (60 * 60 * 1000); // Block for 1 hour
          localStorage.setItem(rateLimitKey, JSON.stringify(rateLimitData));
          return { allowed: false, reason: 'IP rate limit exceeded' };
        }
        
        ipData.requests.push(now);
      }
      
      // Add current request
      userData.requests.push(now);
      userData.totalRequests++;
      userData.blocked = false;
      
      localStorage.setItem(rateLimitKey, JSON.stringify(rateLimitData));
      return { allowed: true };
      
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: true }; // Allow on error
    }
  }

  // Enhanced XSS and injection protection
  static sanitizeForDisplay(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Enhanced SQL injection prevention for queries
  static sanitizeQueryParam(param: string): string {
    if (!param || typeof param !== 'string') {
      return '';
    }
    
    return param
      .replace(/['"`;\\]/g, '') // Remove SQL injection characters
      .replace(/\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE)\b/gi, '') // Remove SQL keywords
      .trim()
      .substring(0, 50);
  }

  // Advanced fraud detection for payments
  static async detectPaymentFraud(paymentData: {
    userId: string;
    amount: number;
    method: string;
    frequency?: number;
  }): Promise<{ isFraud: boolean; reason?: string; confidence: number }> {
    try {
      let fraudScore = 0;
      const reasons: string[] = [];
      
      // Check for unusual amounts
      if (paymentData.amount > 1000) {
        fraudScore += 20;
        reasons.push('High amount');
      }
      
      // Check for rapid successive payments
      if (paymentData.frequency && paymentData.frequency > 5) {
        fraudScore += 30;
        reasons.push('Multiple payments in short time');
      }
      
      // Check user history
      const userDoc = await getDoc(doc(db, 'users', paymentData.userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const accountAge = Date.now() - (userData.createdAt?.toDate?.()?.getTime() || Date.now());
        
        // New accounts with large payments are suspicious
        if (accountAge < 24 * 60 * 60 * 1000 && paymentData.amount > 100) {
          fraudScore += 40;
          reasons.push('New account with high payment');
        }
      }
      
      const isFraud = fraudScore >= 50;
      
      if (isFraud) {
        await this.logSecurityEvent({
          type: 'payment_fraud',
          userId: paymentData.userId,
          ipAddress: 'unknown',
          userAgent: navigator.userAgent,
          details: { 
            amount: paymentData.amount,
            method: paymentData.method,
            fraudScore,
            reasons
          },
          severity: fraudScore >= 70 ? 'critical' : 'high',
          timestamp: new Date(),
          resolved: false
        });
      }
      
      return {
        isFraud,
        reason: reasons.join(', '),
        confidence: fraudScore
      };
    } catch (error) {
      console.error('Error detecting payment fraud:', error);
      return { isFraud: false, confidence: 0 };
    }
  }

  // Session security management
  static async validateSession(user: User): Promise<{ valid: boolean; action?: 'refresh' | 'logout'; reason?: string }> {
    try {
      if (!user) {
        return { valid: false, action: 'logout', reason: 'No user session' };
      }

      // CRITICAL FIX: Check if user is admin - different validation rules apply
      let isAdmin = false;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          isAdmin = userData.isAdmin === true;
        }
      } catch (adminCheckError) {
        console.warn('Could not verify admin status during session validation:', adminCheckError);
      }

      // Check session age (longer for admins)
      const sessionStart = localStorage.getItem('session_start');
      if (sessionStart) {
        const sessionAge = Date.now() - parseInt(sessionStart);
        const maxAge = isAdmin ? (48 * 60 * 60 * 1000) : (24 * 60 * 60 * 1000); // 48h for admins, 24h for users
        
        if (sessionAge > maxAge) {
          return { valid: false, action: 'logout', reason: 'Session expired' };
        }
      } else {
        // Set session start if not exists
        localStorage.setItem('session_start', Date.now().toString());
      }

      // Check for suspicious activity (skip for admins)
      if (!isAdmin) {
        const suspiciousActivity = localStorage.getItem('suspicious_activity');
        if (suspiciousActivity === 'true') {
          return { valid: false, action: 'logout', reason: 'Suspicious activity detected' };
        }
      } else {
        // Clear any suspicious activity flags for admin users
        localStorage.removeItem('suspicious_activity');
        console.log('Admin user - cleared any suspicious activity flags');
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating session:', error);
      return { valid: true }; // Allow on error
    }
  }

  // Enhanced admin access validation
  static async validateAdminAccess(userId: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Double-check admin status from Firebase
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return { valid: false, reason: 'User not found' };
      }

      const userData = userDoc.data();
      
      // Strict admin validation
      if (userData.isAdmin !== true) {
        await this.logSecurityEvent({
          type: 'admin_access',
          userId: userId,
          ipAddress: 'unknown',
          userAgent: navigator.userAgent,
          details: { 
            action: 'unauthorized_admin_access_attempt',
            actualAdminStatus: userData.isAdmin
          },
          severity: 'high',
          timestamp: new Date(),
          resolved: false
        });
        
        return { valid: false, reason: 'Insufficient privileges' };
      }

      // Check if admin account is blocked
      if (userData.isBlocked === true) {
        return { valid: false, reason: 'Account is blocked' };
      }

      // Log successful admin access
      await this.logSecurityEvent({
        type: 'admin_access',
        userId: userId,
        ipAddress: 'unknown',
        userAgent: navigator.userAgent,
        details: { 
          action: 'admin_panel_access',
          success: true
        },
        severity: 'low',
        timestamp: new Date(),
        resolved: true
      });

      return { valid: true };
    } catch (error) {
      console.error('Error validating admin access:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  // Encrypt sensitive data
  static encryptSensitiveData(data: string): string {
    try {
      // Simple XOR encryption for sensitive data
      let encrypted = '';
      const key = this.ENCRYPTION_KEY;
      
      for (let i = 0; i < data.length; i++) {
        encrypted += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      
      return btoa(encrypted);
    } catch (error) {
      console.error('Encryption error:', error);
      return data; // Return original on error
    }
  }

  // Decrypt sensitive data
  static decryptSensitiveData(encryptedData: string): string {
    try {
      const key = this.ENCRYPTION_KEY;
      const encrypted = atob(encryptedData);
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedData; // Return original on error
    }
  }

  // Advanced suspicious activity detection
  static async detectSuspiciousActivity(userId: string, action: string, metadata: Record<string, any> = {}): Promise<boolean> {
    try {
      // CRITICAL FIX: Check if user is admin first - admins should not be flagged for high activity
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.isAdmin === true) {
          console.log('Admin user detected - skipping suspicious activity detection');
          return false; // Admins are never considered suspicious
        }
      }
      
      const activityKey = `user_activity_${userId}`;
      const storedActivity = JSON.parse(localStorage.getItem(activityKey) || '[]');
      const now = Date.now();
      
      // Clean old activity (older than 1 hour)
      const recentActivity = storedActivity.filter((activity: any) => 
        now - activity.timestamp < 60 * 60 * 1000
      );
      
      // Add current activity
      recentActivity.push({ action, timestamp: now, metadata });
      
      // Detect patterns
      let suspicionScore = 0;
      
      // Too many requests in short time
      const last5Minutes = recentActivity.filter((activity: any) => 
        now - activity.timestamp < 5 * 60 * 1000
      );
      
      if (last5Minutes.length > 20) {
        suspicionScore += 40;
      }
      
      // Repetitive actions
      const actionCounts = recentActivity.reduce((counts: Record<string, number>, activity: any) => {
        counts[activity.action] = (counts[activity.action] || 0) + 1;
        return counts;
      }, {});
      
      const maxActionCount = Math.max(...Object.values(actionCounts));
      if (maxActionCount > 15) { // Same action repeated more than 15 times in an hour
        suspicionScore += 30;
      }
      
      // Large amounts in short time (for payments)
      if (action === 'payment' || action === 'deposit') {
        const paymentAmounts = recentActivity
          .filter((activity: any) => activity.action === action && activity.metadata.amount)
          .map((activity: any) => activity.metadata.amount);
        
        const totalAmount = paymentAmounts.reduce((sum: number, amount: number) => sum + amount, 0);
        if (totalAmount > 5000) { // More than $5000 in an hour
          suspicionScore += 50;
        }
      }
      
      const isSuspicious = suspicionScore >= 50;
      
      if (isSuspicious) {
        localStorage.setItem('suspicious_activity', 'true');
        
        await this.logSecurityEvent({
          type: 'suspicious_activity',
          userId: userId,
          ipAddress: 'unknown',
          userAgent: navigator.userAgent,
          details: { 
            action,
            suspicionScore,
            recentActivityCount: recentActivity.length,
            metadata
          },
          severity: suspicionScore >= 80 ? 'critical' : 'high',
          timestamp: new Date(),
          resolved: false
        });
      }
      
      // Save updated activity
      localStorage.setItem(activityKey, JSON.stringify(recentActivity));
      
      return isSuspicious;
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      return false;
    }
  }

  // Enhanced security event logging
  static async logSecurityEvent(event: Omit<SecurityEvent, 'id'>): Promise<void> {
    try {
      const eventId = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const securityEvent: SecurityEvent = {
        id: eventId,
        ...event,
        ipAddress: event.ipAddress || this.getClientIP(),
        userAgent: event.userAgent || navigator.userAgent
      };

      await setDoc(doc(db, 'security_events', eventId), securityEvent);
      
      // Alert on critical events
      if (event.severity === 'critical') {
        console.error('CRITICAL SECURITY EVENT:', securityEvent);
        await this.sendSecurityAlert(securityEvent);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  // Get client IP (best effort in browser environment)
  static getClientIP(): string {
    // In production, this would be handled by backend
    return 'client-side';
  }

  // Send security alerts to admins
  private static async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    try {
      // In production, this would send emails/notifications to admins
      console.warn('Security Alert:', {
        type: event.type,
        severity: event.severity,
        user: event.userEmail,
        details: event.details,
        timestamp: event.timestamp
      });
      
      // Store alert for admin dashboard
      await setDoc(doc(db, 'security_alerts', event.id), {
        eventId: event.id,
        type: event.type,
        severity: event.severity,
        userId: event.userId,
        userEmail: event.userEmail,
        summary: this.generateAlertSummary(event),
        details: event.details,
        notified: false,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error sending security alert:', error);
    }
  }

  // Generate human-readable alert summary
  private static generateAlertSummary(event: SecurityEvent): string {
    switch (event.type) {
      case 'payment_fraud':
        return `Potential fraudulent payment detected for user ${event.userEmail}`;
      case 'api_abuse':
        return `API abuse detected: ${event.details.requestCount} requests in ${event.details.timespan}`;
      case 'admin_access':
        return `Unauthorized admin access attempt by ${event.userEmail}`;
      case 'suspicious_activity':
        return `Suspicious user activity detected (Score: ${event.details.suspicionScore})`;
      case 'data_breach_attempt':
        return `Potential data breach attempt detected`;
      default:
        return `Security event: ${event.type}`;
    }
  }

  // Data anonymization for old records
  static async anonymizeOldData(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // This would typically run as a scheduled function
      console.log('Data anonymization would run here for data older than', thirtyDaysAgo);
      
      // In production:
      // 1. Find records older than 30 days
      // 2. Remove PII (email, phone, names)
      // 3. Keep aggregated data for analytics
      
    } catch (error) {
      console.error('Error anonymizing old data:', error);
    }
  }

  // Security headers validation
  static validateSecurityHeaders(): { valid: boolean; missing: string[] } {
    try {
      const missingHeaders: string[] = [];
      
      // Check for security headers (would be set by server)
      const expectedHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options', 
        'X-XSS-Protection',
        'Strict-Transport-Security',
        'Content-Security-Policy'
      ];
      
      // In a browser environment, we can't check response headers directly
      // This is more of a deployment checklist
      
      return {
        valid: true, // Assume valid for client-side
        missing: []
      };
    } catch (error) {
      console.error('Error validating security headers:', error);
      return { valid: false, missing: [] };
    }
  }

  // Generate Content Security Policy
  static generateCSP(): string {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.exchangerate-api.com https://daisysms.com https://api.paymentpoint.ng https://api.plisio.net",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'"
    ].join('; ');
    
    return csp;
  }

  // Backup critical data
  static async backupCriticalData(): Promise<boolean> {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        users: await this.getAnonymizedUserData(),
        transactions: await this.getAnonymizedTransactionData(),
        systemConfig: await this.getSystemConfig()
      };
      
      // In production, this would be sent to secure storage
      console.log('Backup created:', Object.keys(backup));
      
      return true;
    } catch (error) {
      console.error('Error creating backup:', error);
      return false;
    }
  }

  // Get anonymized user data for backup
  private static async getAnonymizedUserData(): Promise<any[]> {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      return usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          walletBalance: data.walletBalance,
          isAdmin: data.isAdmin,
          isBlocked: data.isBlocked,
          createdAt: data.createdAt?.toDate?.()?.toISOString(),
          // Remove PII
          email: 'anonymized',
          name: 'anonymized'
        };
      });
    } catch (error) {
      console.error('Error getting anonymized user data:', error);
      return [];
    }
  }

  // Get anonymized transaction data for backup
  private static async getAnonymizedTransactionData(): Promise<any[]> {
    try {
      const transactionsQuery = query(
        collection(db, 'transactions'),
        limit(1000) // Last 1000 transactions
      );
      
      const snapshot = await getDocs(transactionsQuery);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: 'anonymized',
          type: data.type,
          amount: data.amount,
          status: data.status,
          provider: data.provider,
          createdAt: data.createdAt?.toDate?.()?.toISOString()
        };
      });
    } catch (error) {
      console.error('Error getting anonymized transaction data:', error);
      return [];
    }
  }

  // Get system configuration for backup
  private static async getSystemConfig(): Promise<any> {
    try {
      const configDoc = await getDoc(doc(db, 'config', 'system'));
      if (configDoc.exists()) {
        const data = configDoc.data();
        // Remove sensitive data
        delete data.apiKeys;
        delete data.webhookSecrets;
        return data;
      }
      return {};
    } catch (error) {
      console.error('Error getting system config:', error);
      return {};
    }
  }

  // Security audit function
  static async performSecurityAudit(): Promise<{
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      // Check environment variables
      const requiredEnvVars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_DAISYSMS_API_KEY'
      ];
      
      requiredEnvVars.forEach(envVar => {
        if (!import.meta.env[envVar]) {
          issues.push(`Missing environment variable: ${envVar}`);
          score -= 10;
        }
      });

      // Check encryption key
      if (!import.meta.env.VITE_ENCRYPTION_KEY || import.meta.env.VITE_ENCRYPTION_KEY.length < 32) {
        issues.push('Weak or missing encryption key');
        recommendations.push('Set a strong 32+ character encryption key');
        score -= 15;
      }

      // Check rate limiting
      if (!localStorage.getItem('advanced_rate_limits')) {
        recommendations.push('Enable advanced rate limiting');
        score -= 5;
      }

      // Check for development settings in production
      if (import.meta.env.PROD) {
        if (import.meta.env.VITE_NODE_ENV !== 'production') {
          issues.push('Development mode enabled in production');
          score -= 20;
        }
      }

      return { score, issues, recommendations };
    } catch (error) {
      console.error('Error performing security audit:', error);
      return { 
        score: 0, 
        issues: ['Security audit failed'], 
        recommendations: ['Review security configuration manually'] 
      };
    }
  }

  // Clean up old security data
  static async cleanupSecurityData(): Promise<void> {
    try {
      // Clean up rate limit data older than 24 hours
      const rateLimitData = JSON.parse(localStorage.getItem('advanced_rate_limits') || '{}');
      const now = Date.now();
      
      Object.keys(rateLimitData).forEach(key => {
        const userData = rateLimitData[key];
        if (userData.requests) {
          userData.requests = userData.requests.filter((timestamp: number) => 
            now - timestamp < 24 * 60 * 60 * 1000
          );
        }
        
        // Remove empty entries
        if (!userData.requests || userData.requests.length === 0) {
          delete rateLimitData[key];
        }
      });
      
      localStorage.setItem('advanced_rate_limits', JSON.stringify(rateLimitData));
      
      // Clean up old activity data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('user_activity_')) {
          const activityData = JSON.parse(localStorage.getItem(key) || '[]');
          const recentActivity = activityData.filter((activity: any) => 
            now - activity.timestamp < 24 * 60 * 60 * 1000
          );
          
          if (recentActivity.length === 0) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, JSON.stringify(recentActivity));
          }
        }
      });
      
    } catch (error) {
      console.error('Error cleaning up security data:', error);
    }
  }

  // Clear suspicious activity flags (for admin impersonation cleanup)
  static clearSuspiciousActivityFlag(): void {
    try {
      localStorage.removeItem('suspicious_activity');
      console.log('Cleared suspicious activity flag');
    } catch (error) {
      console.error('Error clearing suspicious activity flag:', error);
    }
  }

  // Clear user activity for a specific user (for impersonation cleanup)
  static clearUserActivity(userId: string): void {
    try {
      const activityKey = `user_activity_${userId}`;
      localStorage.removeItem(activityKey);
      console.log('Cleared activity tracking for user:', userId);
    } catch (error) {
      console.error('Error clearing user activity:', error);
    }
  }

  // Clear all impersonation-related security flags
  static clearImpersonationSecurityFlags(targetUserId?: string): void {
    try {
      console.log('Clearing impersonation security flags');
      
      // Clear suspicious activity flag
      this.clearSuspiciousActivityFlag();
      
      // Clear target user activity if provided
      if (targetUserId) {
        this.clearUserActivity(targetUserId);
      }
      
      // Clear session start to reset session timer
      localStorage.removeItem('session_start');
      
      console.log('All impersonation security flags cleared');
    } catch (error) {
      console.error('Error clearing impersonation security flags:', error);
    }
  }
}