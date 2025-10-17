import nodemailer from 'nodemailer';
import { createEmailTransporter } from '../config/email';
import { logger } from '../utils/logger';
import { EmailNotification, EmailTemplateData, UserProfile } from '../types';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = createEmailTransporter();
  }

  /**
   * Send email notification
   */
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      const result = await this.transporter.sendMail({
        from: `"${process.env.ADMIN_NAME || 'Mayhem Creations'}" <${process.env.SMTP_USER}>`,
        to: notification.to,
        subject: notification.subject,
        html: notification.html,
        text: notification.text
      });

      logger.info(`📧 Email sent successfully to ${notification.to}. Message ID: ${result.messageId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to send email to ${notification.to}:`, error);
      return false;
    }
  }

  /**
   * Send admin notification for new customer message
   */
  async sendAdminNotification(profile: UserProfile, message: string): Promise<boolean> {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      logger.error('❌ ADMIN_EMAIL not configured');
      return false;
    }

    const customerName = this.getCustomerDisplayName(profile);
    const isGuest = profile.isGuest;
    
    const subject = `New ${isGuest ? 'Guest' : 'Customer'} Message - ${customerName}`;
    const html = this.generateAdminNotificationHTML({
      customerName,
      customerEmail: profile.email || 'Not provided',
      message,
      timestamp: new Date().toISOString(),
      isGuest,
      adminName: process.env.ADMIN_NAME || 'Admin',
      companyName: 'Mayhem Creations'
    });

    return this.sendEmail({
      to: adminEmail,
      subject,
      html,
      text: this.generateAdminNotificationText({
        customerName,
        customerEmail: profile.email || 'Not provided',
        message,
        timestamp: new Date().toISOString(),
        isGuest,
        adminName: process.env.ADMIN_NAME || 'Admin',
        companyName: 'Mayhem Creations'
      })
    });
  }

  /**
   * Send customer notification for admin message
   */
  async sendCustomerNotification(profile: UserProfile, message: string): Promise<boolean> {
    // Don't send emails to users without email addresses
    if (!profile.email) {
      logger.info(`📧 Skipping email notification for user without email ${profile.id}`);
      return true;
    }

    const customerName = this.getCustomerDisplayName(profile);
    
    const subject = `New Message from Mayhem Creations Support`;
    const html = this.generateCustomerNotificationHTML({
      customerName,
      customerEmail: profile.email,
      message,
      timestamp: new Date().toISOString(),
      isGuest: profile.isGuest,
      adminName: process.env.ADMIN_NAME || 'Support Team',
      companyName: 'Mayhem Creations'
    });

    return this.sendEmail({
      to: profile.email,
      subject,
      html,
      text: this.generateCustomerNotificationText({
        customerName,
        customerEmail: profile.email,
        message,
        timestamp: new Date().toISOString(),
        isGuest: profile.isGuest,
        adminName: process.env.ADMIN_NAME || 'Support Team',
        companyName: 'Mayhem Creations'
      })
    });
  }

  /**
   * Get customer display name
   */
  private getCustomerDisplayName(profile: UserProfile): string {
    if (profile.isGuest) {
      return 'Guest User';
    }
    
    const firstName = profile.firstName || '';
    const lastName = profile.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    return fullName || 'Customer';
  }

  /**
   * Generate admin notification HTML
   */
  private generateAdminNotificationHTML(data: EmailTemplateData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New ${data.isGuest ? 'Guest' : 'Customer'} Message</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .message-box { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0; }
          .customer-info { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .badge-guest { background: #ff9800; color: white; }
          .badge-customer { background: #4caf50; color: white; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>New ${data.isGuest ? 'Guest' : 'Customer'} Message</h2>
          <p>You have received a new message in the chat system.</p>
        </div>
        
        <div class="customer-info">
          <h3>Customer Information</h3>
          <p><strong>Name:</strong> ${data.customerName}</p>
          <p><strong>Email:</strong> ${data.customerEmail}</p>
          <p><strong>Type:</strong> <span class="badge ${data.isGuest ? 'badge-guest' : 'badge-customer'}">${data.isGuest ? 'Guest User' : 'Registered Customer'}</span></p>
          <p><strong>Time:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="message-box">
          <h3>Message Content</h3>
          <p>${data.message}</p>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from the ${data.companyName} chat system.</p>
          <p>Please log into the admin panel to respond to this message.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate admin notification text
   */
  private generateAdminNotificationText(data: EmailTemplateData): string {
    return `
New ${data.isGuest ? 'Guest' : 'Customer'} Message

Customer Information:
- Name: ${data.customerName}
- Email: ${data.customerEmail}
- Type: ${data.isGuest ? 'Guest User' : 'Registered Customer'}
- Time: ${new Date(data.timestamp).toLocaleString()}

Message Content:
${data.message}

This is an automated notification from the ${data.companyName} chat system.
Please log into the admin panel to respond to this message.
    `.trim();
  }

  /**
   * Generate customer notification HTML
   */
  private generateCustomerNotificationHTML(data: EmailTemplateData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Message from ${data.companyName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
          .message-box { background: #e8f5e8; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
          .cta-button { display: inline-block; background: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>New Message from ${data.companyName}</h2>
          <p>You have received a new message from our support team.</p>
        </div>
        
        <div class="message-box">
          <h3>Message from ${data.adminName}</h3>
          <p>${data.message}</p>
          <p><em>Sent at: ${new Date(data.timestamp).toLocaleString()}</em></p>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/chat" class="cta-button">View Full Conversation</a>
        </div>
        
        <div class="footer">
          <p>This message was sent from the ${data.companyName} chat system.</p>
          <p>If you need immediate assistance, please contact us directly.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate customer notification text
   */
  private generateCustomerNotificationText(data: EmailTemplateData): string {
    return `
New Message from ${data.companyName}

Message from ${data.adminName}:
${data.message}

Sent at: ${new Date(data.timestamp).toLocaleString()}

To view the full conversation, please visit: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/chat

This message was sent from the ${data.companyName} chat system.
If you need immediate assistance, please contact us directly.
    `.trim();
  }

  /**
   * Send conversation summary email to customer
   */
  async sendConversationSummary(profile: UserProfile, messages: Array<{
    text: string;
    sender: 'user' | 'admin';
    timestamp: Date;
    type: string;
  }>): Promise<boolean> {
    if (!profile.email) {
      logger.info(`📧 Skipping conversation summary for user without email ${profile.id}`);
      return true;
    }

    const customerName = this.getCustomerDisplayName(profile);
    
    const subject = `Chat Conversation Summary - Mayhem Creations`;
    const html = this.generateConversationSummaryHTML({
      customerName,
      customerEmail: profile.email,
      messages,
      isGuest: profile.isGuest,
      companyName: 'Mayhem Creations'
    });

    return this.sendEmail({
      to: profile.email,
      subject,
      html,
      text: this.generateConversationSummaryText({
        customerName,
        customerEmail: profile.email,
        messages,
        isGuest: profile.isGuest,
        companyName: 'Mayhem Creations'
      })
    });
  }

  /**
   * Send unread messages notification to admin
   */
  async sendUnreadMessagesNotification(customerName: string, customerEmail: string | null, unreadCount: number, lastMessage: string, isGuest: boolean): Promise<boolean> {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      logger.error('❌ ADMIN_EMAIL not configured');
      return false;
    }

    const subject = `Unread Messages from ${isGuest ? 'Guest' : 'Customer'} - ${customerName}`;
    const html = this.generateUnreadMessagesHTML({
      customerName,
      customerEmail,
      unreadCount,
      lastMessage,
      isGuest,
      adminName: process.env.ADMIN_NAME || 'Admin',
      companyName: 'Mayhem Creations'
    });

    return this.sendEmail({
      to: adminEmail,
      subject,
      html,
      text: this.generateUnreadMessagesText({
        customerName,
        customerEmail,
        unreadCount,
        lastMessage,
        isGuest,
        adminName: process.env.ADMIN_NAME || 'Admin',
        companyName: 'Mayhem Creations'
      })
    });
  }

  /**
   * Generate conversation summary HTML
   */
  private generateConversationSummaryHTML(data: {
    customerName: string;
    customerEmail: string;
    messages: Array<{
      text: string;
      sender: 'user' | 'admin';
      timestamp: Date;
      type: string;
    }>;
    isGuest: boolean;
    companyName: string;
  }): string {
    const messageList = data.messages.map(msg => `
      <div class="message ${msg.sender === 'user' ? 'user-message' : 'admin-message'}">
        <div class="message-header">
          <strong>${msg.sender === 'user' ? 'You' : 'Support Team'}</strong>
          <span class="timestamp">${new Date(msg.timestamp).toLocaleString()}</span>
        </div>
        <div class="message-content">${msg.text}</div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chat Conversation Summary - ${data.companyName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
          .summary-box { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0; }
          .message { margin: 15px 0; padding: 10px; border-radius: 8px; }
          .user-message { background: #e8f5e8; border-left: 4px solid #4caf50; }
          .admin-message { background: #f3e5f5; border-left: 4px solid #9c27b0; }
          .message-header { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; color: #666; }
          .message-content { font-size: 14px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
          .cta-button { display: inline-block; background: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Chat Conversation Summary</h2>
          <p>Here's a summary of your recent conversation with our support team.</p>
        </div>
        
        <div class="summary-box">
          <h3>Recent Messages</h3>
          <div class="messages">
            ${messageList}
          </div>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/chat" class="cta-button">Continue Conversation</a>
        </div>
        
        <div class="footer">
          <p>This conversation summary was sent from the ${data.companyName} chat system.</p>
          <p>If you need immediate assistance, please contact us directly.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate conversation summary text
   */
  private generateConversationSummaryText(data: {
    customerName: string;
    customerEmail: string;
    messages: Array<{
      text: string;
      sender: 'user' | 'admin';
      timestamp: Date;
      type: string;
    }>;
    isGuest: boolean;
    companyName: string;
  }): string {
    const messageList = data.messages.map(msg => 
      `${msg.sender === 'user' ? 'You' : 'Support Team'} (${new Date(msg.timestamp).toLocaleString()}):\n${msg.text}\n`
    ).join('\n');

    return `
Chat Conversation Summary - ${data.companyName}

Hi ${data.customerName},

Here's a summary of your recent conversation with our support team:

${messageList}

To continue the conversation, please visit: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/chat

This conversation summary was sent from the ${data.companyName} chat system.
If you need immediate assistance, please contact us directly.
    `.trim();
  }

  /**
   * Generate unread messages HTML
   */
  private generateUnreadMessagesHTML(data: {
    customerName: string;
    customerEmail: string | null;
    unreadCount: number;
    lastMessage: string;
    isGuest: boolean;
    adminName: string;
    companyName: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unread Messages - ${data.companyName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
          .alert-box { background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0; }
          .message-preview { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
          .cta-button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>⚠️ Unread Messages Alert</h2>
          <p>Customer has unread messages and went offline</p>
        </div>
        
        <div class="alert-box">
          <h3>Customer Information</h3>
          <p><strong>Name:</strong> ${data.customerName}</p>
          <p><strong>Email:</strong> ${data.customerEmail || 'Not provided'}</p>
          <p><strong>Type:</strong> ${data.isGuest ? 'Guest User' : 'Registered Customer'}</p>
          <p><strong>Unread Count:</strong> ${data.unreadCount} message(s)</p>
        </div>
        
        <div class="message-preview">
          <h3>Last Message Preview</h3>
          <p>${data.lastMessage}</p>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/messages" class="cta-button">View Messages</a>
        </div>
        
        <div class="footer">
          <p>This alert was sent from the ${data.companyName} chat system.</p>
          <p>Please check the admin panel to respond to unread messages.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate unread messages text
   */
  private generateUnreadMessagesText(data: {
    customerName: string;
    customerEmail: string | null;
    unreadCount: number;
    lastMessage: string;
    isGuest: boolean;
    adminName: string;
    companyName: string;
  }): string {
    return `
Unread Messages Alert - ${data.companyName}

Customer has unread messages and went offline:

Customer Information:
- Name: ${data.customerName}
- Email: ${data.customerEmail || 'Not provided'}
- Type: ${data.isGuest ? 'Guest User' : 'Registered Customer'}
- Unread Count: ${data.unreadCount} message(s)

Last Message Preview:
${data.lastMessage}

To view and respond to messages, please visit: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/messages

This alert was sent from the ${data.companyName} chat system.
Please check the admin panel to respond to unread messages.
    `.trim();
  }
}

// Export singleton instance (lazy-loaded)
let emailServiceInstance: EmailService | null = null;

export const getEmailService = (): EmailService => {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
};

// For backward compatibility - use getEmailService() instead
