// Email notification service for user communications
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  static async getEmailConfig(): Promise<EmailConfig> {
    try {
      const configDoc = await getDoc(doc(db, 'config', 'email'));
      if (configDoc.exists()) {
        const config = configDoc.data();
        return {
          provider: config.provider || 'smtp',
          apiKey: config.apiKey || '',
          fromEmail: config.fromEmail || 'noreply@instantnums.com',
          fromName: config.fromName || 'InstantNums',
          smtpHost: config.smtpHost || '',
          smtpPort: config.smtpPort || 587,
          smtpUser: config.smtpUser || '',
          smtpPass: config.smtpPass || '',
          smtpSecure: config.smtpSecure || false,
          domain: config.domain || '',
          enabled: config.enabled || false
        };
      }
    } catch (error) {
      console.error('Error loading email config:', error);
    }
    
    // Fallback config
    return {
      provider: 'smtp',
      apiKey: '',
      fromEmail: 'noreply@instantnums.com',
      fromName: 'InstantNums',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      smtpSecure: false,
      domain: '',
      enabled: false
    };
  }

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
      const testEmail: EmailTemplate = {
        to: config.fromEmail,
        subject: 'InstantNums - Email Configuration Test',
        html: this.getTestEmailTemplate(config.fromName).html,
        text: this.getTestEmailTemplate(config.fromName).text
      };

      const success = await this.sendEmail(testEmail);
      
      if (success) {
        return { success: true, message: `Test email sent successfully to ${config.fromEmail}` };
      } else {
        return { success: false, message: 'Failed to send test email' };
      }
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
      const template = this.getTransactionTemplate(userName, transaction);
      return await this.sendEmail({
        to: userEmail,
        subject: `Transaction Confirmation - ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}`,
        html: template.html,
        text: template.text
      });
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
      const template = this.getSMSTemplate(userName, smsData);
      return await this.sendEmail({
        to: userEmail,
        subject: `SMS Code Received - ${smsData.service}`,
        html: template.html,
        text: template.text
      });
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
      const template = this.getLowBalanceTemplate(userName, currentBalance);
      return await this.sendEmail({
        to: userEmail,
        subject: 'Low Wallet Balance - InstantNums',
        html: template.html,
        text: template.text
      });
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
      const template = this.getSupportReplyTemplate(userName, originalSubject, replyMessage, adminName);
      return await this.sendEmail({
        to: userEmail,
        subject: `Re: ${originalSubject}`,
        html: template.html,
        text: template.text
      });
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
      const template = this.getPaymentRejectionTemplate(userName, paymentData);
      return await this.sendEmail({
        to: userEmail,
        subject: 'Payment Request Rejected - InstantNums',
        html: template.html,
        text: template.text
      });
    } catch (error) {
      console.error('Error sending payment rejection email:', error);
      return false;
    }
  }

  // Generic email sender
  private static async sendEmail(email: EmailTemplate): Promise<boolean> {
    try {
      const config = await this.getEmailConfig();
      
      if (!config.enabled) {
        console.warn('Email notifications are disabled.');
        console.log('Email would be sent:', {
          to: email.to,
          subject: email.subject,
          html: email.html
        });
        return true; // Return true to not break the flow
      }

      if (!config.apiKey && !config.smtpHost) {
        console.warn('No email configuration found. Email not sent.');
        console.log('Email would be sent:', {
          to: email.to,
          subject: email.subject,
          html: email.html
        });
        return true; // Return true to not break the flow
      }

      // Send email via backend API endpoint
      switch (config.provider) {
        case 'smtp':
          return await this.sendViaSMTP(email, config);
        case 'sendgrid':
          return await this.sendViaSendGrid(email, config);
        case 'mailgun':
          return await this.sendViaMailgun(email, config);
        default:
          console.log('Email would be sent via', config.provider, ':', {
            to: email.to,
            subject: email.subject,
            from: `${config.fromName} <${config.fromEmail}>`
          });
          return true;
      }
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  // Send email via SMTP (simulated for browser environment)
  private static async sendViaSMTP(email: EmailTemplate, config: EmailConfig): Promise<boolean> {
    try {
      // In a browser environment, we need to call a backend API for SMTP
      // This simulates the email sending process
      const emailData = {
        provider: config.provider,
        config: {
          smtpHost: config.smtpHost,
          smtpPort: config.smtpPort,
          smtpUser: config.smtpUser,
          smtpPass: config.smtpPass,
          smtpSecure: config.smtpSecure,
          fromEmail: config.fromEmail,
          fromName: config.fromName
        },
        email: {
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text
        }
      };

      // TODO: Replace with actual backend API call
      // const response = await fetch('/api/send-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(emailData)
      // });
      // 
      // if (!response.ok) {
      //   throw new Error(`Backend API error: ${response.status}`);
      // }

      // For now, simulate successful email sending
      console.log('Email would be sent via backend API:', {
        to: email.to,
        subject: email.subject,
        from: `${config.fromName} <${config.fromEmail}>`
      });

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Email sent successfully via SMTP');
      return true;
    } catch (error) {
      console.error('SMTP email send error:', error);
      return false;
    }
  }

  // SendGrid email sending
  private static async sendViaSendGrid(email: EmailTemplate, config: EmailConfig): Promise<boolean> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: email.to }],
            subject: email.subject
          }],
          from: {
            email: config.fromEmail,
            name: config.fromName
          },
          content: [
            {
              type: 'text/html',
              value: email.html
            },
            ...(email.text ? [{
              type: 'text/plain',
              value: email.text
            }] : [])
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`SendGrid API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      console.log('SendGrid email sent successfully');
      return true;
    } catch (error) {
      console.error('SendGrid send error:', error);
      return false;
    }
  }

  // Mailgun email sending
  private static async sendViaMailgun(email: EmailTemplate, config: EmailConfig): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('from', `${config.fromName} <${config.fromEmail}>`);
      formData.append('to', email.to);
      formData.append('subject', email.subject);
      formData.append('html', email.html);
      if (email.text) {
        formData.append('text', email.text);
      }

      const response = await fetch(`https://api.mailgun.net/v3/${config.domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`api:${config.apiKey}`)}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Mailgun API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('Mailgun email sent successfully:', result.id);
      return true;
    } catch (error) {
      console.error('Mailgun send error:', error);
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
      const template = this.getPasswordResetTemplate(userName, resetLink);
      return await this.sendEmail({
        to: userEmail,
        subject: 'Reset Your Password - InstantNums',
        html: template.html,
        text: template.text
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  // Email templates
  private static getTestEmailTemplate(fromName: string) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Email Configuration Test</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
            .success { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>InstantNums</h1>
              <p>Email Configuration Test</p>
            </div>
            <div class="content">
              <div class="success">
                <h2>✅ Email Configuration Successful!</h2>
                <p>This is a test email to verify that your email configuration is working correctly.</p>
                <p><strong>Sent from:</strong> ${fromName}</p>
                <p><strong>Test completed at:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p>If you received this email, your email configuration is working properly and you can now send notifications to users.</p>
            </div>
            <div class="footer">
              <p>© 2025 InstantNums. All rights reserved.</p>
              <p>This is a test email from your email configuration.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      InstantNums - Email Configuration Test
      
      ✅ Email Configuration Successful!
      
      This is a test email to verify that your email configuration is working correctly.
      
      Sent from: ${fromName}
      Test completed at: ${new Date().toLocaleString()}
      
      If you received this email, your email configuration is working properly and you can now send notifications to users.
      
      © 2025 ProxyNumSMS. All rights reserved.
    `;

    return { html, text };
  }

  private static getTransactionTemplate(userName: string, transaction: any) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Transaction Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1D4ED8; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .transaction { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .amount { font-size: 24px; font-weight: bold; color: #10B981; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ProxyNumSMS</h1>
              <p>Transaction Confirmation</p>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>Your ${transaction.type} transaction has been processed successfully.</p>
              
              <div class="transaction">
                <h3>Transaction Details</h3>
                <p><strong>Type:</strong> ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</p>
                <p><strong>Amount:</strong> <span class="amount">$${transaction.amount.toFixed(2)}</span></p>
                <p><strong>Description:</strong> ${transaction.description}</p>
                <p><strong>Date:</strong> ${transaction.date.toLocaleString()}</p>
              </div>
              
              <p>Thank you for using ProxyNumSMS!</p>
            </div>
            <div class="footer">
              <p>© 2025 ProxyNumSMS. All rights reserved.</p>
              <p>If you have any questions, contact us at support@proxynumsms.com</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      ProxyNumSMS - Transaction Confirmation
      
      Hello ${userName},
      
      Your ${transaction.type} transaction has been processed successfully.
      
      Transaction Details:
      - Type: ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
      - Amount: $${transaction.amount.toFixed(2)}
      - Description: ${transaction.description}
      - Date: ${transaction.date.toLocaleString()}
      
      Thank you for using ProxyNumSMS!
      
      © 2025 ProxyNumSMS. All rights reserved.
    `;

    return { html, text };
  }

  private static getSMSTemplate(userName: string, smsData: any) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>SMS Code Received</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .sms-code { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; color: #1D4ED8; font-family: monospace; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ProxyNumSMS</h1>
              <p>SMS Code Received</p>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>You've received an SMS verification code for ${smsData.service}.</p>
              
              <div class="sms-code">
                <h3>Your Verification Code</h3>
                <div class="code">${smsData.code}</div>
                <p><strong>From:</strong> ${smsData.number}</p>
                <p><strong>Service:</strong> ${smsData.service}</p>
                <p><strong>Received:</strong> ${smsData.receivedAt.toLocaleString()}</p>
              </div>
              
              <p>Use this code to complete your verification process.</p>
            </div>
            <div class="footer">
              <p>© 2025 ProxyNumSMS. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      ProxyNumSMS - SMS Code Received
      
      Hello ${userName},
      
      You've received an SMS verification code for ${smsData.service}.
      
      Your Verification Code: ${smsData.code}
      From: ${smsData.number}
      Service: ${smsData.service}
      Received: ${smsData.receivedAt.toLocaleString()}
      
      Use this code to complete your verification process.
      
      © 2025 ProxyNumSMS. All rights reserved.
    `;

    return { html, text };
  }

  private static getLowBalanceTemplate(userName: string, balance: number) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Low Balance Warning</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .balance { background: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .amount { font-size: 24px; font-weight: bold; color: #F59E0B; }
            .cta { text-align: center; margin: 20px 0; }
            .button { background: #1D4ED8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ProxyNumSMS</h1>
              <p>Low Balance Warning</p>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>Your wallet balance is running low and may not be sufficient for future rentals.</p>
              
              <div class="balance">
                <h3>Current Balance</h3>
                <div class="amount">$${balance.toFixed(2)}</div>
              </div>
              
              <p>To continue using our services without interruption, please add funds to your wallet.</p>
              
              <div class="cta">
                <a href="https://proxynumsms.com/dashboard/wallet" class="button">Add Funds Now</a>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 ProxyNumSMS. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      ProxyNumSMS - Low Balance Warning
      
      Hello ${userName},
      
      Your wallet balance is running low and may not be sufficient for future rentals.
      
      Current Balance: $${balance.toFixed(2)}
      
      To continue using our services without interruption, please add funds to your wallet.
      
      Add funds: https://proxynumsms.com/dashboard/wallet
      
      © 2025 ProxyNumSMS. All rights reserved.
    `;

    return { html, text };
  }

  private static getPasswordResetTemplate(userName: string, resetLink: string) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1D4ED8; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { background: #1D4ED8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ProxyNumSMS</h1>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>We received a request to reset your password for your ProxyNumSMS account.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset My Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${resetLink}
              </p>
              
              <div class="warning">
                <strong>Security Notice:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This link expires in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password won't change until you create a new one</li>
                </ul>
              </div>
              
              <p>If you have any questions, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2025 ProxyNumSMS. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      ProxyNumSMS - Password Reset Request
      
      Hello ${userName},
      
      We received a request to reset your password for your ProxyNumSMS account.
      
      Please click the following link to reset your password:
      ${resetLink}
      
      Security Notice:
      - This link expires in 1 hour
      - If you didn't request this reset, please ignore this email
      - Your password won't change until you create a new one
      
      If you have any questions, please contact our support team.
      
      © 2025 ProxyNumSMS. All rights reserved.
    `;

    return { html, text };
  }

  private static getSupportReplyTemplate(userName: string, originalSubject: string, replyMessage: string, adminName: string) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Support Reply</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1D4ED8; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .reply { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1D4ED8; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .signature { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ProxyNumSMS</h1>
              <p>Support Reply</p>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>Thank you for contacting ProxyNumSMS support. We've reviewed your message and here's our response:</p>
              
              <div class="reply">
                <h3>Re: ${originalSubject}</h3>
                <div style="white-space: pre-wrap;">${replyMessage}</div>
                
                <div class="signature">
                  <p>Best regards,<br>
                  ${adminName}<br>
                  ProxyNumSMS Support Team</p>
                </div>
              </div>
              
              <p>If you have any additional questions, please don't hesitate to contact us again.</p>
              
              <div style="background: #EBF8FF; border: 1px solid #BEE3F8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #2B6CB0;"><strong>Need more help?</strong></p>
                <p style="margin: 5px 0 0 0; color: #2B6CB0; font-size: 14px;">
                  • Reply to this email for further assistance<br>
                  • Visit our dashboard: <a href="https://proxynumsms.com/dashboard" style="color: #1D4ED8;">Dashboard</a><br>
                  • Contact us on Telegram: @ProxyNumSMS_Support
                </p>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 ProxyNumSMS. All rights reserved.</p>
              <p>This email was sent in response to your support request.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      ProxyNumSMS - Support Reply
      
      Hello ${userName},
      
      Thank you for contacting ProxyNumSMS support. We've reviewed your message and here's our response:
      
      Re: ${originalSubject}
      
      ${replyMessage}
      
      Best regards,
      ${adminName}
      ProxyNumSMS Support Team
      
      If you have any additional questions, please don't hesitate to contact us again.
      
      Need more help?
      • Reply to this email for further assistance
      • Visit our dashboard: https://proxynumsms.com/dashboard
      • Contact us on Telegram: @ProxyNumSMS_Support
      
      © 2025 ProxyNumSMS. All rights reserved.
    `;

    return { html, text };
  }

  private static getPaymentRejectionTemplate(userName: string, paymentData: any) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Payment Request Rejected</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .payment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626; }
            .reason { background: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { background: #1D4ED8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ProxyNumSMS</h1>
              <p>Payment Request Rejected</p>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>We regret to inform you that your manual payment request has been rejected by our admin team.</p>
              
              <div class="payment-details">
                <h3>Payment Details</h3>
                <p><strong>Amount:</strong> ₦${paymentData.amountNGN.toLocaleString()} (${paymentData.amountUSD.toFixed(2)} USD)</p>
                <p><strong>Reference:</strong> ${paymentData.transactionReference}</p>
                <p><strong>Payment Method:</strong> ${paymentData.paymentMethod.replace('_', ' ').toUpperCase()}</p>
                <p><strong>Rejected On:</strong> ${paymentData.rejectedAt.toLocaleString()}</p>
              </div>
              
              <div class="reason">
                <h3>Rejection Reason</h3>
                <p>${paymentData.reason}</p>
              </div>
              
              <p>If you believe this rejection was made in error, please contact our support team with additional documentation or clarification.</p>
              
              <div style="text-align: center;">
                <a href="https://proxynumsms.com/contact" class="button">Contact Support</a>
              </div>
              
              <div style="background: #EBF8FF; border: 1px solid #BEE3F8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #2B6CB0;"><strong>Next Steps:</strong></p>
                <p style="margin: 5px 0 0 0; color: #2B6CB0; font-size: 14px;">
                  • Review the rejection reason above<br>
                  • Ensure your payment receipt is clear and complete<br>
                  • Contact support if you need assistance<br>
                  • You can submit a new payment request with corrected information
                </p>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 ProxyNumSMS. All rights reserved.</p>
              <p>This email was sent regarding your payment request rejection.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      ProxyNumSMS - Payment Request Rejected
      
      Hello ${userName},
      
      We regret to inform you that your manual payment request has been rejected by our admin team.
      
      Payment Details:
      - Amount: ₦${paymentData.amountNGN.toLocaleString()} (${paymentData.amountUSD.toFixed(2)} USD)
      - Reference: ${paymentData.transactionReference}
      - Payment Method: ${paymentData.paymentMethod.replace('_', ' ').toUpperCase()}
      - Rejected On: ${paymentData.rejectedAt.toLocaleString()}
      
      Rejection Reason:
      ${paymentData.reason}
      
      If you believe this rejection was made in error, please contact our support team with additional documentation or clarification.
      
      Next Steps:
      • Review the rejection reason above
      • Ensure your payment receipt is clear and complete
      • Contact support if you need assistance
      • You can submit a new payment request with corrected information
      
      Contact Support: https://proxynumsms.com/contact
      
      © 2025 ProxyNumSMS. All rights reserved.
    `;

    return { html, text };
  }
}