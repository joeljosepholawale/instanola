// System initialization service for first-time setup
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SystemInitConfig {
  siteName: string;
  supportEmail: string;
  currency: string;
  timezone: string;
  adminUserId: string;
}

export interface APIKeysConfig {
  daisySMS: string;
  paymentPoint?: string;
  nowPayments?: string;
  sendGrid?: string;
  mailgun?: string;
}

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun';
  fromEmail: string;
  fromName: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  apiKey?: string;
  domain?: string;
  enabled: boolean;
}

export class SystemInitializationService {
  // Check if system setup is required
  static async isSetupRequired(): Promise<boolean> {
    try {
      const systemDoc = await getDoc(doc(db, 'config', 'system'));
      return !systemDoc.exists() || !systemDoc.data()?.setupComplete;
    } catch (error) {
      console.error('Error checking setup status:', error);
      return true;
    }
  }

  // Initialize system configuration
  static async initializeSystem(config: SystemInitConfig): Promise<boolean> {
    try {
      // Create system configuration
      await setDoc(doc(db, 'config', 'system'), {
        siteName: config.siteName,
        supportEmail: config.supportEmail,
        currency: config.currency,
        timezone: config.timezone,
        setupComplete: false,
        maintenanceMode: false,
        registrationEnabled: true,
        maxUsersPerIP: 5,
        sessionTimeout: 24,
        apiRateLimit: 100,
        webhookRetries: 3,
        autoRefundEnabled: true,
        debugMode: false,
        createdAt: new Date(),
        createdBy: config.adminUserId
      });

      // Initialize profit tracking
      await setDoc(doc(db, 'system', 'profit_tracking'), {
        totalProfit: 0,
        totalDaisySpent: 0,
        totalUserCharged: 0,
        totalRentals: 0,
        totalRefunds: 0,
        totalRefundCount: 0,
        createdAt: new Date()
      });

      // Initialize system health status
      await setDoc(doc(db, 'system', 'health_status'), {
        api: 'online',
        database: 'connected',
        daisySMS: 'inactive',
        email: 'not_configured',
        payments: 'inactive',
        lastChecked: new Date(),
        uptime: 100,
        responseTime: 0,
        daisyBalance: 0
      });

      return true;
    } catch (error) {
      console.error('Error initializing system:', error);
      return false;
    }
  }

  // Setup API keys
  static async setupAPIKeys(keys: APIKeysConfig, adminUserId: string): Promise<boolean> {
    try {
      await setDoc(doc(db, 'config', 'api_keys'), {
        ...keys,
        createdAt: new Date(),
        createdBy: adminUserId
      });

      // Test DaisySMS connection if key provided
      if (keys.daisySMS) {
        try {
          const { DaisySMSService } = await import('./daisySMS');
          const daisyService = new DaisySMSService(keys.daisySMS);
          await daisyService.getBalance();
          
          // Update health status
          await updateDoc(doc(db, 'system', 'health_status'), {
            daisySMS: 'active',
            lastChecked: new Date()
          });
        } catch (error) {
          console.warn('DaisySMS API key test failed:', error);
          await updateDoc(doc(db, 'system', 'health_status'), {
            daisySMS: 'error',
            lastChecked: new Date()
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error setting up API keys:', error);
      return false;
    }
  }

  // Setup email configuration
  static async setupEmail(config: EmailConfig, adminUserId: string): Promise<boolean> {
    try {
      await setDoc(doc(db, 'config', 'email'), {
        ...config,
        createdAt: new Date(),
        createdBy: adminUserId
      });

      // Update health status
      await updateDoc(doc(db, 'system', 'health_status'), {
        email: config.enabled ? 'configured' : 'not_configured',
        lastChecked: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error setting up email:', error);
      return false;
    }
  }

  // Complete system setup
  static async completeSetup(adminUserId: string): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'config', 'system'), {
        setupComplete: true,
        completedAt: new Date(),
        completedBy: adminUserId
      });

      // Log setup completion
      await setDoc(doc(db, 'admin_actions', `setup_complete_${Date.now()}`), {
        action: 'system_setup_complete',
        adminUserId: adminUserId,
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error completing setup:', error);
      return false;
    }
  }

  // Get system configuration
  static async getSystemConfig(): Promise<any> {
    try {
      const systemDoc = await getDoc(doc(db, 'config', 'system'));
      return systemDoc.exists() ? systemDoc.data() : null;
    } catch (error) {
      console.error('Error getting system config:', error);
      return null;
    }
  }

  // Reset system (admin only - dangerous operation)
  static async resetSystem(adminUserId: string, confirmationCode: string): Promise<boolean> {
    if (confirmationCode !== 'RESET_SYSTEM_CONFIRM') {
      throw new Error('Invalid confirmation code');
    }

    try {
      // Mark system as requiring setup
      await updateDoc(doc(db, 'config', 'system'), {
        setupComplete: false,
        resetAt: new Date(),
        resetBy: adminUserId
      });

      // Log system reset
      await setDoc(doc(db, 'admin_actions', `system_reset_${Date.now()}`), {
        action: 'system_reset',
        adminUserId: adminUserId,
        timestamp: new Date(),
        confirmationCode: confirmationCode
      });

      return true;
    } catch (error) {
      console.error('Error resetting system:', error);
      return false;
    }
  }
}