// Email notification service for user communications  
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun';
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  apiKey: string;
  domain: string;
  enabled: boolean;
}


export class EmailService {
  // Test email configuration
  static async testEmailConfiguration(config: EmailConfig): Promise<{ success: boolean; message: string }> {
    try {
      if (!config.enabled) {
        return { success: false, message: 'Email notifications are disabled' };
      }

      // Validate configuration based on provider
      if (config.provider === 'smtp') {
        if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
          return { success: false, message: 'SMTP configuration is incomplete' };
        }
      } else if (config.provider === 'sendgrid') {
        if (!config.apiKey) {
          return { success: false, message: 'SendGrid API key is required' };
        }
      } else if (config.provider === 'mailgun') {
        if (!config.apiKey || !config.domain) {
          return { success: false, message: 'Mailgun API key and domain are required' };
        }
      }

      // Send test email
      // Call the Cloud Function to send test email
      const sendNotificationEmail = httpsCallable(functions, 'sendNotificationEmail');
      const result = await sendNotificationEmail({
        type: 'test_config',
        userEmail: config.fromEmail,
        additionalData: { fromName: config.fromName }
      });
      
      return { success: true, message: `Test email sent successfully to ${config.fromEmail}` };
    } catch (error) {
      console.error('Error testing email configuration:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Send transaction confirmation email
  static async sendTransactionConfirmation(
    userEmail: string,
    userName: string,
    transaction: {
      type: 'deposit' | 'purchase' | 'refund';
      amount: number;
      description: string;
      date: Date;
    }
  ): Promise<boolean> {
    try {
      const sendNotificationEmail = httpsCallable(functions, 'sendNotificationEmail');
      await sendNotificationEmail({
        type: 'transaction_confirmation',
        userEmail: userEmail,
        additionalData: {
          userName: userName,
          transaction: transaction
        }
      });
      return true;
    } catch (error) {
      console.error('Error sending transaction confirmation:', error);
      return false;
    }
  }

  // Send SMS code received notification
  static async sendSMSNotification(
    userEmail: string,
    userName: string,
    smsData: {
      service: string;
      number: string;
      code: string;
      receivedAt: Date;
    }
  ): Promise<boolean> {
    try {
      const sendNotificationEmail = httpsCallable(functions, 'sendNotificationEmail');
      await sendNotificationEmail({
        type: 'sms_received',
        userEmail: userEmail,
        additionalData: {
          userName: userName,
          service: smsData.service,
          number: smsData.number,
          code: smsData.code
        }
      });
      return true;
    } catch (error) {
      console.error('Error sending SMS notification:', error);
      return false;
    }
  }

  // Send low balance warning
  static async sendLowBalanceWarning(
    userEmail: string,
    userName: string,
    currentBalance: number
  ): Promise<boolean> {
    try {
      const sendNotificationEmail = httpsCallable(functions, 'sendNotificationEmail');
      await sendNotificationEmail({
        type: 'low_balance',
        userEmail: userEmail,
        additionalData: {
          userName: userName,
          currentBalance: currentBalance
        }
      });
      return true;
    } catch (error) {
      console.error('Error sending low balance warning:', error);
      return false;
    }
  }

  // Send support reply email
  static async sendSupportReply(
    userEmail: string,
    userName: string,
    originalSubject: string,
    replyMessage: string,
    adminName: string = 'Support Team'
  ): Promise<boolean> {
    try {
      const sendNotificationEmail = httpsCallable(functions, 'sendNotificationEmail');
      await sendNotificationEmail({
        type: 'support_reply',
        userEmail: userEmail,
        additionalData: {
          userName: userName,
          originalSubject: originalSubject,
          replyMessage: replyMessage,
          adminName: adminName
        }
      });
      return true;
    } catch (error) {
      console.error('Error sending support reply:', error);
      return false;
    }
  }

  // Send payment rejection email
  static async sendPaymentRejectionEmail(
    userEmail: string,
    userName: string,
    paymentData: {
      amountNGN: number;
      amountUSD: number;
      transactionReference: string;
      paymentMethod: string;
      reason: string;
      rejectedAt: Date;
    }
  ): Promise<boolean> {
    try {
      const sendNotificationEmail = httpsCallable(functions, 'sendNotificationEmail');
      await sendNotificationEmail({
        type: 'payment_rejection',
        userEmail: userEmail,
        additionalData: {
          userName: userName,
          paymentData: paymentData
        }
      });
      return true;
    } catch (error) {
      console.error('Error sending payment rejection email:', error);
      return false;
    }
  }

  // Send password reset email
  static async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetLink: string
  ): Promise<boolean> {
    try {
      const sendNotificationEmail = httpsCallable(functions, 'sendNotificationEmail');
      await sendNotificationEmail({
        type: 'password_reset',
        userEmail: userEmail,
        additionalData: {
          userName: userName,
          resetLink: resetLink
        }
      });
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  // All email templates and configuration are now handled server-side by the Cloud Function
}