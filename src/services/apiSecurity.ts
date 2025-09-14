// API Security Service - Protect sensitive data and API calls
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    requestsPerHour: number;
    blockDuration: number; // minutes
  };
  apiKeyRotation: {
    enabled: boolean;
    rotationInterval: number; // days
    lastRotated: Date;
  };
  encryption: {
    enabled: boolean;
    algorithm: string;
  };
  monitoring: {
    logFailedRequests: boolean;
    alertOnSuspiciousActivity: boolean;
    maxFailedAttempts: number;
  };
}

export interface APISecurityEvent {
  id: string;
  type: 'rate_limit_exceeded' | 'invalid_api_key' | 'suspicious_request' | 'failed_authentication';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  details: any;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class APISecurityService {
  private static readonly RATE_LIMIT_KEY = 'api_rate_limits';
  private static readonly SECURITY_CONFIG_KEY = 'api_security_config';

  // Initialize security configuration
  static async initializeSecurity(): Promise<void> {
    try {
      const defaultConfig: SecurityConfig = {
        rateLimiting: {
          enabled: true,
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          blockDuration: 15
        },
        apiKeyRotation: {
          enabled: false,
          rotationInterval: 30,
          lastRotated: new Date()
        },
        encryption: {
          enabled: true,
          algorithm: 'XOR'
        },
        monitoring: {
          logFailedRequests: true,
          alertOnSuspiciousActivity: true,
          maxFailedAttempts: 5
        }
      };

      await setDoc(doc(db, 'config', this.SECURITY_CONFIG_KEY), defaultConfig);
    } catch (error) {
      console.error('Error initializing security config:', error);
    }
  }

  // Check rate limits for API calls
  static checkRateLimit(userId: string, endpoint: string): boolean {
    try {
      const now = Date.now();
      const rateLimitData = JSON.parse(localStorage.getItem(this.RATE_LIMIT_KEY) || '{}');
      const userKey = `${userId}_${endpoint}`;
      
      if (!rateLimitData[userKey]) {
        rateLimitData[userKey] = { requests: [], blocked: false, blockedUntil: 0 };
      }
      
      const userLimits = rateLimitData[userKey];
      
      // Check if user is currently blocked
      if (userLimits.blocked && now < userLimits.blockedUntil) {
        return false;
      }
      
      // Remove old requests (older than 1 hour)
      userLimits.requests = userLimits.requests.filter((timestamp: number) => 
        now - timestamp < 60 * 60 * 1000
      );
      
      // Check hourly limit
      if (userLimits.requests.length >= 100) {
        userLimits.blocked = true;
        userLimits.blockedUntil = now + (15 * 60 * 1000); // Block for 15 minutes
        localStorage.setItem(this.RATE_LIMIT_KEY, JSON.stringify(rateLimitData));
        
        this.logSecurityEvent({
          type: 'rate_limit_exceeded',
          userId: userId,
          details: { endpoint, requestCount: userLimits.requests.length },
          severity: 'medium'
        });
        
        return false;
      }
      
      // Check minute limit (last 60 seconds)
      const recentRequests = userLimits.requests.filter((timestamp: number) => 
        now - timestamp < 60 * 1000
      );
      
      if (recentRequests.length >= 10) {
        return false;
      }
      
      // Add current request
      userLimits.requests.push(now);
      userLimits.blocked = false;
      
      localStorage.setItem(this.RATE_LIMIT_KEY, JSON.stringify(rateLimitData));
      return true;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return true; // Allow request if rate limiting fails
    }
  }

  // Encrypt sensitive data
  static encryptData(data: string, key?: string): string {
    try {
      const encryptionKey = key || this.getEncryptionKey();
      let encrypted = '';
      
      for (let i = 0; i < data.length; i++) {
        encrypted += String.fromCharCode(
          data.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length)
        );
      }
      
      return btoa(encrypted);
    } catch (error) {
      console.error('Encryption failed:', error);
      return data;
    }
  }

  // Decrypt sensitive data
  static decryptData(encryptedData: string, key?: string): string {
    try {
      const encryptionKey = key || this.getEncryptionKey();
      const encrypted = atob(encryptedData);
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length)
        );
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedData;
    }
  }

  // Get encryption key (should be from environment in production)
  private static getEncryptionKey(): string {
    return import.meta.env.VITE_ENCRYPTION_KEY || 'ProxyNumSMS2025SecureDefaultKey';
  }

  // Validate API key format
  static validateApiKey(apiKey: string, provider: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Remove potential injections
    const sanitized = apiKey.replace(/[<>'"]/g, '');
    
    switch (provider) {
      case 'daisysms':
        return sanitized.length >= 10 && sanitized.length <= 100;
      case 'nowpayments':
        return sanitized.length >= 20 && sanitized.length <= 100;
      case 'paymentpoint':
        return sanitized.length >= 15 && sanitized.length <= 100;
      default:
        return sanitized.length >= 10;
    }
  }

  // Sanitize user input
  static sanitizeInput(input: string, maxLength: number = 100): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    return input
      .replace(/[<>'"]/g, '') // Remove potential script injections
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/data:/gi, '') // Remove data: protocols
      .substring(0, maxLength)
      .trim();
  }

  // Log security events
  static async logSecurityEvent(event: Omit<APISecurityEvent, 'id' | 'timestamp' | 'ipAddress' | 'userAgent'>): Promise<void> {
    try {
      const securityEvent: APISecurityEvent = {
        id: `security_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        ...event,
        ipAddress: 'unknown', // Would need backend to get real IP
        userAgent: navigator.userAgent,
        timestamp: new Date()
      };

      await setDoc(doc(db, 'security_events', securityEvent.id), securityEvent);
      
      // Alert on high severity events
      if (event.severity === 'high' || event.severity === 'critical') {
        console.warn('High severity security event:', securityEvent);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  // Validate request origin
  static validateRequestOrigin(): boolean {
    try {
      const allowedOrigins = [
        'localhost',
        '127.0.0.1',
        'proxynumsms.com',
        'bolt.host',
        'netlify.app',
        'vercel.app'
      ];
      
      const currentOrigin = window.location.hostname;
      return allowedOrigins.some(origin => currentOrigin.includes(origin));
    } catch (error) {
      console.error('Error validating origin:', error);
      return true; // Allow if validation fails
    }
  }

  // Secure API key storage
  static async storeApiKey(provider: string, apiKey: string, adminUserId: string): Promise<boolean> {
    try {
      // Validate API key
      if (!this.validateApiKey(apiKey, provider)) {
        throw new Error('Invalid API key format');
      }

      // Encrypt API key
      const encryptedKey = this.encryptData(apiKey);
      
      // Store in Firebase with metadata
      await setDoc(doc(db, 'config', `${provider}_api`), {
        apiKey: encryptedKey,
        provider: provider,
        createdAt: new Date(),
        createdBy: adminUserId,
        lastUsed: null,
        rotationRequired: false,
        encrypted: true
      });

      // Log security event
      await this.logSecurityEvent({
        type: 'failed_authentication',
        userId: adminUserId,
        details: { action: 'api_key_updated', provider },
        severity: 'low'
      });

      return true;
    } catch (error) {
      console.error('Error storing API key:', error);
      return false;
    }
  }

  // Get stored API key securely
  static async getApiKey(provider: string): Promise<string | null> {
    try {
      const configDoc = await getDoc(doc(db, 'config', `${provider}_api`));
      
      if (!configDoc.exists()) {
        return null;
      }

      const data = configDoc.data();
      
      if (data.encrypted) {
        return this.decryptData(data.apiKey);
      }
      
      return data.apiKey;
    } catch (error) {
      console.error('Error retrieving API key:', error);
      return null;
    }
  }

  // Monitor API usage
  static async recordApiUsage(userId: string, endpoint: string, success: boolean, responseTime: number): Promise<void> {
    try {
      const usageId = `usage_${userId}_${Date.now()}`;
      
      await setDoc(doc(db, 'api_usage', usageId), {
        userId: userId,
        endpoint: endpoint,
        success: success,
        responseTime: responseTime,
        timestamp: new Date(),
        userAgent: navigator.userAgent
      });

      // Update user's API usage statistics
      await updateDoc(doc(db, 'users', userId), {
        lastApiCall: new Date(),
        totalApiCalls: increment(1),
        ...(success ? { successfulApiCalls: increment(1) } : { failedApiCalls: increment(1) })
      });
    } catch (error) {
      console.error('Error recording API usage:', error);
    }
  }

  // Check for suspicious activity
  static async checkSuspiciousActivity(userId: string, action: string): Promise<boolean> {
    try {
      // Check for rapid successive requests
      const recentActivity = JSON.parse(localStorage.getItem(`activity_${userId}`) || '[]');
      const now = Date.now();
      
      // Remove old activity (older than 5 minutes)
      const filteredActivity = recentActivity.filter((timestamp: number) => 
        now - timestamp < 5 * 60 * 1000
      );
      
      // Check for suspicious patterns
      if (filteredActivity.length > 50) { // More than 50 requests in 5 minutes
        await this.logSecurityEvent({
          type: 'suspicious_request',
          userId: userId,
          details: { action, requestCount: filteredActivity.length },
          severity: 'high'
        });
        return true;
      }
      
      // Add current activity
      filteredActivity.push(now);
      localStorage.setItem(`activity_${userId}`, JSON.stringify(filteredActivity));
      
      return false;
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
      return false;
    }
  }

  // Generate secure API key for users
  static generateSecureApiKey(): string {
    const prefix = 'pk_live_';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = prefix;
    
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  // Validate request headers for security
  static validateRequestHeaders(headers: Headers): boolean {
    try {
      // Check for required headers
      const contentType = headers.get('content-type');
      const userAgent = headers.get('user-agent');
      
      if (!userAgent || userAgent.length < 10) {
        return false;
      }
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i
      ];
      
      return !suspiciousPatterns.some(pattern => pattern.test(userAgent));
    } catch (error) {
      console.error('Error validating headers:', error);
      return true; // Allow if validation fails
    }
  }

  // Clean up old security events
  static async cleanupSecurityEvents(): Promise<void> {
    try {
      // This would typically be run as a scheduled task
      // Remove events older than 30 days
      console.log('Security cleanup would run here in production');
    } catch (error) {
      console.error('Error cleaning up security events:', error);
    }
  }
}