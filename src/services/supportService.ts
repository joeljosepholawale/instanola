// Support messaging service
import { doc, setDoc, getDocs, collection, query, where, orderBy, updateDoc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EmailService } from './emailService';
import { SecurityService } from './securityService';

export interface SupportMessage {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'payment' | 'technical' | 'account' | 'billing' | 'other';
  createdAt: Date;
  updatedAt: Date;
  adminResponse?: string;
  respondedAt?: Date;
  respondedBy?: string;
}

export interface SupportRequest {
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  category: 'payment' | 'technical' | 'account' | 'billing' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export class SupportService {
  // Submit a new support request
  static async submitSupportRequest(request: SupportRequest): Promise<string> {
    try {
      const messageId = `support_${request.userId}_${Date.now()}`;
      
      // Security validation and sanitization
      const sanitizedSubject = SecurityService.validateAndSanitizeInput(request.subject, 'text', 200);
      const sanitizedMessage = SecurityService.validateAndSanitizeInput(request.message, 'text', 5000);
      
      if (!sanitizedSubject.valid) {
        throw new Error(`Invalid subject: ${sanitizedSubject.error}`);
      }
      
      if (!sanitizedMessage.valid) {
        throw new Error(`Invalid message: ${sanitizedMessage.error}`);
      }
      
      // Additional security checks
      if (sanitizedMessage.sanitized.length < 10) {
        throw new Error('Message must be at least 10 characters long');
      }
      
      if (sanitizedSubject.sanitized.length < 3) {
        throw new Error('Subject must be at least 3 characters long');
      }
      
      const supportMessage: SupportMessage = {
        id: messageId,
        userId: request.userId,
        userName: request.userName,
        userEmail: request.userEmail,
        subject: sanitizedSubject.sanitized,
        message: sanitizedMessage.sanitized,
        status: 'open',
        priority: request.priority || 'medium',
        category: request.category,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to Firebase
      await setDoc(doc(db, 'support_messages', messageId), supportMessage);

      // Log security event for admin monitoring
      await SecurityService.logSecurityEvent({
        type: 'admin_access',
        userId: request.userId,
        ipAddress: 'unknown',
        userAgent: navigator.userAgent,
        details: { 
          action: 'support_message_submitted',
          category: request.category,
          priority: request.priority 
        },
        severity: 'low',
        timestamp: new Date(),
        resolved: true
      });

      // Send notification email to user
      try {
        await EmailService.sendTransactionConfirmation(
          request.userEmail,
          request.userName,
          {
            type: 'deposit',
            amount: 0,
            description: `Support request submitted: ${request.subject}`,
            date: new Date()
          }
        );
      } catch (emailError) {
        console.warn('Failed to send support confirmation email:', emailError);
      }

      return messageId;
    } catch (error) {
      console.error('Error submitting support request:', error);
      throw error;
    }
  }

  // Get all support messages (admin only)
  static async getAllSupportMessages(limitCount: number = 50): Promise<SupportMessage[]> {
    try {
      const messagesQuery = query(
        collection(db, 'support_messages'),
        orderBy('createdAt', 'desc'),
        limit(limitCount) // Add limit for performance
      );
      
      const snapshot = await getDocs(messagesQuery);
      console.log(`Loaded ${snapshot.docs.length} support messages for admin`);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        respondedAt: doc.data().respondedAt?.toDate()
      })) as SupportMessage[];
    } catch (error) {
      console.error('Error fetching support messages:', error);
      return [];
    }
  }

  // Get user's support messages
  static async getUserSupportMessages(userId: string): Promise<SupportMessage[]> {
    try {
      const messagesQuery = query(
        collection(db, 'support_messages'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(messagesQuery);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        respondedAt: doc.data().respondedAt?.toDate()
      })) as SupportMessage[];
    } catch (error) {
      console.error('Error fetching user support messages:', error);
      return [];
    }
  }

  // Respond to support message (admin only)
  static async respondToMessage(
    messageId: string,
    adminUserId: string,
    response: string,
    adminName: string = 'Support Team'
  ): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'support_messages', messageId), {
        adminResponse: response,
        respondedAt: new Date(),
        respondedBy: adminUserId,
        status: 'resolved',
        updatedAt: new Date()
      });

      // Get message data and send response email to user
      const { getDoc } = await import('firebase/firestore');
      const messageDoc = await getDoc(doc(db, 'support_messages', messageId));
      if (messageDoc.exists()) {
        const messageData = messageDoc.data();
        try {
          const { EmailService } = await import('./emailService');
          await EmailService.sendSupportReply(
            messageData.userEmail,
            messageData.userName,
            messageData.subject,
            response,
            adminName
          );
        } catch (emailError) {
          console.warn('Failed to send support response email:', emailError);
        }
      }

      return true;
    } catch (error) {
      console.error('Error responding to support message:', error);
      return false;
    }
  }

  // Update message status (admin only)
  static async updateMessageStatus(
    messageId: string,
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
  ): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'support_messages', messageId), {
        status: status,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error updating message status:', error);
      return false;
    }
  }
}