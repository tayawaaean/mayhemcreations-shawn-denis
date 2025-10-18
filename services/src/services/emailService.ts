import nodemailer from 'nodemailer';
import { createEmailTransporter } from '../config/email';
import { logger } from '../utils/logger';
import { 
  EmailNotification, 
  EmailTemplateData, 
  UserProfile, 
  OrderItem, 
  Address, 
  ShippingInfo, 
  PaymentInfo, 
  RefundInfo 
} from '../types';

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
   * Send new customer notification to admin (when admin is offline)
   */
  async sendNewCustomerNotification(customerName: string, customerEmail: string | null, isGuest: boolean): Promise<boolean> {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      logger.error('❌ ADMIN_EMAIL not configured');
      return false;
    }

    const subject = `New Customer Chat - ${isGuest ? 'Guest' : 'Customer'} - ${customerName}`;
    const html = this.generateNewCustomerHTML({
      customerName,
      customerEmail,
      isGuest,
      adminName: process.env.ADMIN_NAME || 'Admin',
      companyName: 'Mayhem Creations'
    });

    return this.sendEmail({
      to: adminEmail,
      subject,
      html,
      text: this.generateNewCustomerText({
        customerName,
        customerEmail,
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

  /**
   * Generate new customer HTML
   */
  private generateNewCustomerHTML(data: {
    customerName: string;
    customerEmail: string | null;
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
        <title>New Customer Chat - ${data.companyName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .customer-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          .status-badge { display: inline-block; background: ${data.isGuest ? '#ff9800' : '#4caf50'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>New Customer Chat Alert</h1>
          <p>A ${data.isGuest ? 'guest user' : 'customer'} has started a chat and you're currently offline</p>
        </div>
        
        <div class="content">
          <div class="customer-info">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${data.customerName}</p>
            <p><strong>Email:</strong> ${data.customerEmail || 'Not provided'}</p>
            <p><strong>Type:</strong> <span class="status-badge">${data.isGuest ? 'Guest User' : 'Registered Customer'}</span></p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4>⚠️ Action Required</h4>
            <p>This customer is waiting for a response. Please log into the admin panel to start the conversation.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/messages" class="cta-button">View Chat Messages</a>
          </div>
          
          <div class="footer">
            <p>This alert was sent from the ${data.companyName} chat system.</p>
            <p>Please respond promptly to maintain good customer service.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate new customer text
   */
  private generateNewCustomerText(data: {
    customerName: string;
    customerEmail: string | null;
    isGuest: boolean;
    adminName: string;
    companyName: string;
  }): string {
    return `
New Customer Chat Alert - ${data.companyName}

A ${data.isGuest ? 'guest user' : 'customer'} has started a chat and you're currently offline.

Customer Information:
- Name: ${data.customerName}
- Email: ${data.customerEmail || 'Not provided'}
- Type: ${data.isGuest ? 'Guest User' : 'Registered Customer'}
- Time: ${new Date().toLocaleString()}

Action Required:
This customer is waiting for a response. Please log into the admin panel to start the conversation.

Admin Panel: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/messages

This alert was sent from the ${data.companyName} chat system.
Please respond promptly to maintain good customer service.
    `.trim();
  }

  /**
   * Send order confirmation email
   * Triggered when customer successfully places an order
   */
  async sendOrderConfirmation(data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderId: string | number;
    orderItems: OrderItem[];
    subtotal: number;
    tax: number;
    shippingCost: number;
    orderTotal: number;
    shippingAddress: Address;
    billingAddress?: Address;
    estimatedDeliveryDate?: string;
  }): Promise<boolean> {
    const subject = `Order Confirmation #${data.orderNumber} - Mayhem Creations`;
    const html = this.generateOrderConfirmationHTML(data);
    const text = this.generateOrderConfirmationText(data);

    return this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Generate order confirmation HTML
   */
  private generateOrderConfirmationHTML(data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderId: string | number;
    orderItems: OrderItem[];
    subtotal: number;
    tax: number;
    shippingCost: number;
    orderTotal: number;
    shippingAddress: Address;
    billingAddress?: Address;
    estimatedDeliveryDate?: string;
  }): string {
    // Generate order items list with styling
    const orderItemsHTML = data.orderItems.map(item => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #eee;">
          ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.productName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 10px;">` : ''}
          <strong>${item.productName}</strong>
          ${item.variantName ? `<br><span style="color: #666; font-size: 12px;">${item.variantName}</span>` : ''}
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: center;">×${item.quantity}</td>
        <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right;">$${item.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - Mayhem Creations</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .order-number { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; }
          .order-items { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .totals-table { width: 100%; margin: 20px 0; }
          .totals-table td { padding: 8px 0; }
          .total-row { font-size: 18px; font-weight: bold; color: #4caf50; border-top: 2px solid #333; }
          .address-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Order Confirmed!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Thank you for your order, ${data.customerName}!</p>
          </div>
          
          <div class="content">
            <div class="order-number">
              <h3 style="margin: 0 0 5px 0;">Order Number: #${data.orderNumber}</h3>
              <p style="margin: 0; color: #666; font-size: 14px;">Order ID: ${data.orderId}</p>
            </div>
            
            <p>We've received your order and will start processing it soon. You'll receive another email when your items ship.</p>
            
            <h3>Order Details</h3>
            <table class="order-items">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 12px; text-align: left;">Item</th>
                  <th style="padding: 12px; text-align: center;">Quantity</th>
                  <th style="padding: 12px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${orderItemsHTML}
              </tbody>
            </table>
            
            <table class="totals-table">
              <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">$${data.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Shipping:</td>
                <td style="text-align: right;">$${data.shippingCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Tax:</td>
                <td style="text-align: right;">$${data.tax.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td style="padding-top: 15px;">Total:</td>
                <td style="text-align: right; padding-top: 15px;">$${data.orderTotal.toFixed(2)}</td>
              </tr>
            </table>
            
            <h3>Shipping Address</h3>
            <div class="address-box">
              <strong>${data.shippingAddress.firstName} ${data.shippingAddress.lastName}</strong><br>
              ${data.shippingAddress.addressLine1}<br>
              ${data.shippingAddress.addressLine2 ? data.shippingAddress.addressLine2 + '<br>' : ''}
              ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}<br>
              ${data.shippingAddress.country}
              ${data.shippingAddress.phone ? '<br>Phone: ' + data.shippingAddress.phone : ''}
            </div>
            
            ${data.estimatedDeliveryDate ? `
            <p style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
              📦 <strong>Estimated Delivery:</strong> ${new Date(data.estimatedDeliveryDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            ` : ''}
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${data.orderId}" class="cta-button">View Order Status</a>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Need Help?</strong></p>
            <p>Contact our support team at ${process.env.ADMIN_EMAIL || 'support@mayhemcreations.com'}</p>
            <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate order confirmation text
   */
  private generateOrderConfirmationText(data: {
    customerName: string;
    orderNumber: string;
    orderId: string | number;
    orderItems: OrderItem[];
    subtotal: number;
    tax: number;
    shippingCost: number;
    orderTotal: number;
    shippingAddress: Address;
    estimatedDeliveryDate?: string;
  }): string {
    const itemsList = data.orderItems.map(item => 
      `${item.productName} ${item.variantName ? '(' + item.variantName + ')' : ''} - Qty: ${item.quantity} - $${item.subtotal.toFixed(2)}`
    ).join('\n');

    return `
Order Confirmed! - Mayhem Creations

Thank you for your order, ${data.customerName}!

Order Number: #${data.orderNumber}
Order ID: ${data.orderId}

We've received your order and will start processing it soon. You'll receive another email when your items ship.

ORDER DETAILS:
${itemsList}

Subtotal: $${data.subtotal.toFixed(2)}
Shipping: $${data.shippingCost.toFixed(2)}
Tax: $${data.tax.toFixed(2)}
Total: $${data.orderTotal.toFixed(2)}

SHIPPING ADDRESS:
${data.shippingAddress.firstName} ${data.shippingAddress.lastName}
${data.shippingAddress.addressLine1}
${data.shippingAddress.addressLine2 || ''}
${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}
${data.shippingAddress.country}
${data.shippingAddress.phone ? 'Phone: ' + data.shippingAddress.phone : ''}

${data.estimatedDeliveryDate ? 'Estimated Delivery: ' + new Date(data.estimatedDeliveryDate).toLocaleDateString() : ''}

View your order status: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${data.orderId}

Need help? Contact us at ${process.env.ADMIN_EMAIL || 'support@mayhemcreations.com'}

© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.
    `.trim();
  }

  /**
   * Send shipping confirmation email
   * Triggered when order is shipped with tracking information
   */
  async sendShippingConfirmation(data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderId: string | number;
    shippingInfo: ShippingInfo;
    orderItems: OrderItem[];
    shippingAddress: Address;
  }): Promise<boolean> {
    const subject = `Your Order #${data.orderNumber} Has Shipped! - Mayhem Creations`;
    const html = this.generateShippingConfirmationHTML(data);
    const text = this.generateShippingConfirmationText(data);

    return this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Generate shipping confirmation HTML
   */
  private generateShippingConfirmationHTML(data: {
    customerName: string;
    orderNumber: string;
    orderId: string | number;
    shippingInfo: ShippingInfo;
    orderItems: OrderItem[];
    shippingAddress: Address;
  }): string {
    const itemsList = data.orderItems.map(item => `
      <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center;">
        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.productName}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 15px;">` : ''}
        <div>
          <strong>${item.productName}</strong>
          ${item.variantName ? `<br><span style="color: #666; font-size: 12px;">${item.variantName}</span>` : ''}
          <br><span style="color: #666;">Qty: ${item.quantity}</span>
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Order Has Shipped - Mayhem Creations</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 30px; }
          .tracking-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 6px; }
          .cta-button { display: inline-block; background: #2196f3; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
          .info-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Your Order Has Shipped!</h1>
            <p style="margin: 10px 0 0 0;">Order #${data.orderNumber}</p>
          </div>
          
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Great news! Your order is on its way to you.</p>
            
            <div class="tracking-box">
              <h3 style="margin: 0 0 15px 0;">Tracking Information</h3>
              <p style="margin: 5px 0;"><strong>Carrier:</strong> ${data.shippingInfo.carrier}</p>
              <p style="margin: 5px 0;"><strong>Service:</strong> ${data.shippingInfo.service}</p>
              ${data.shippingInfo.trackingNumber ? `<p style="margin: 5px 0;"><strong>Tracking Number:</strong> ${data.shippingInfo.trackingNumber}</p>` : ''}
              ${data.shippingInfo.estimatedDeliveryDate ? `<p style="margin: 5px 0;"><strong>Estimated Delivery:</strong> ${new Date(data.shippingInfo.estimatedDeliveryDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
              
              ${data.shippingInfo.trackingUrl ? `
                <div style="text-align: center; margin-top: 15px;">
                  <a href="${data.shippingInfo.trackingUrl}" class="cta-button">Track Your Package</a>
                </div>
              ` : ''}
            </div>
            
            <h3>Shipping To:</h3>
            <div class="info-box">
              <strong>${data.shippingAddress.firstName} ${data.shippingAddress.lastName}</strong><br>
              ${data.shippingAddress.addressLine1}<br>
              ${data.shippingAddress.addressLine2 ? data.shippingAddress.addressLine2 + '<br>' : ''}
              ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}<br>
              ${data.shippingAddress.country}
            </div>
            
            <h3>Items in This Shipment:</h3>
            <div style="border: 1px solid #eee; border-radius: 6px; overflow: hidden;">
              ${itemsList}
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${data.orderId}" class="cta-button" style="background: #667eea;">View Order Details</a>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Questions about your order?</strong></p>
            <p>Contact us at ${process.env.ADMIN_EMAIL || 'support@mayhemcreations.com'}</p>
            <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate shipping confirmation text
   */
  private generateShippingConfirmationText(data: {
    customerName: string;
    orderNumber: string;
    orderId: string | number;
    shippingInfo: ShippingInfo;
    orderItems: OrderItem[];
    shippingAddress: Address;
  }): string {
    const itemsList = data.orderItems.map(item => 
      `- ${item.productName} ${item.variantName ? '(' + item.variantName + ')' : ''} - Qty: ${item.quantity}`
    ).join('\n');

    return `
Your Order Has Shipped! - Mayhem Creations

Hi ${data.customerName},

Great news! Your order #${data.orderNumber} is on its way to you.

TRACKING INFORMATION:
Carrier: ${data.shippingInfo.carrier}
Service: ${data.shippingInfo.service}
${data.shippingInfo.trackingNumber ? 'Tracking Number: ' + data.shippingInfo.trackingNumber : ''}
${data.shippingInfo.estimatedDeliveryDate ? 'Estimated Delivery: ' + new Date(data.shippingInfo.estimatedDeliveryDate).toLocaleDateString() : ''}
${data.shippingInfo.trackingUrl ? 'Track Your Package: ' + data.shippingInfo.trackingUrl : ''}

SHIPPING TO:
${data.shippingAddress.firstName} ${data.shippingAddress.lastName}
${data.shippingAddress.addressLine1}
${data.shippingAddress.addressLine2 || ''}
${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}
${data.shippingAddress.country}

ITEMS IN THIS SHIPMENT:
${itemsList}

View order details: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${data.orderId}

Questions? Contact us at ${process.env.ADMIN_EMAIL || 'support@mayhemcreations.com'}

© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.
    `.trim();
  }

  /**
   * Send delivery notification email
   * Triggered when package is marked as delivered
   */
  async sendDeliveryNotification(data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderId: string | number;
    deliveryDate: string;
    orderItems: OrderItem[];
  }): Promise<boolean> {
    const subject = `Your Order #${data.orderNumber} Has Been Delivered! - Mayhem Creations`;
    const html = this.generateDeliveryNotificationHTML(data);
    const text = this.generateDeliveryNotificationText(data);

    return this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Generate delivery notification HTML
   */
  private generateDeliveryNotificationHTML(data: {
    customerName: string;
    orderNumber: string;
    orderId: string | number;
    deliveryDate: string;
    orderItems: OrderItem[];
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Delivered - Mayhem Creations</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 30px; }
          .success-box { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 6px; text-align: center; }
          .cta-button { display: inline-block; background: #4caf50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="font-size: 48px; margin: 0;">✅</h1>
            <h1>Delivered Successfully!</h1>
            <p style="margin: 10px 0 0 0;">Order #${data.orderNumber}</p>
          </div>
          
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Your order has been successfully delivered on <strong>${new Date(data.deliveryDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>
            
            <div class="success-box">
              <h3 style="margin: 0 0 10px 0; color: #4caf50;">🎉 Enjoy Your Purchase!</h3>
              <p style="margin: 0;">We hope you love your new items from Mayhem Creations</p>
            </div>
            
            <p>We'd love to hear about your experience! Your feedback helps us improve and assists other customers in making informed decisions.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${data.orderId}/review" class="cta-button">Leave a Review</a>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${data.orderId}" class="cta-button" style="background: #667eea;">View Order</a>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0;"><strong>Issues with your order?</strong></p>
              <p style="margin: 5px 0 0 0;">If something isn't right, please contact our support team within 7 days of delivery.</p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Thank you for choosing Mayhem Creations!</strong></p>
            <p>Contact us: ${process.env.ADMIN_EMAIL || 'support@mayhemcreations.com'}</p>
            <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate delivery notification text
   */
  private generateDeliveryNotificationText(data: {
    customerName: string;
    orderNumber: string;
    orderId: string | number;
    deliveryDate: string;
    orderItems: OrderItem[];
  }): string {
    return `
Order Delivered Successfully! - Mayhem Creations

Hi ${data.customerName},

Your order #${data.orderNumber} has been successfully delivered on ${new Date(data.deliveryDate).toLocaleDateString()}.

We hope you love your new items from Mayhem Creations!

We'd love to hear about your experience. Your feedback helps us improve and assists other customers.

Leave a review: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${data.orderId}/review
View order: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${data.orderId}

Issues with your order? Contact our support team within 7 days of delivery.

Thank you for choosing Mayhem Creations!
Contact us: ${process.env.ADMIN_EMAIL || 'support@mayhemcreations.com'}

© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.
    `.trim();
  }

  /**
   * Send refund confirmation email
   * Triggered when a refund is processed
   */
  async sendRefundConfirmation(data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderId: string | number;
    refundInfo: RefundInfo;
  }): Promise<boolean> {
    const subject = `Refund Processed for Order #${data.orderNumber} - Mayhem Creations`;
    const html = this.generateRefundConfirmationHTML(data);
    const text = this.generateRefundConfirmationText(data);

    return this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Generate refund confirmation HTML
   */
  private generateRefundConfirmationHTML(data: {
    customerName: string;
    orderNumber: string;
    orderId: string | number;
    refundInfo: RefundInfo;
  }): string {
    const refundedItemsHTML = data.refundInfo.itemsRefunded && data.refundInfo.itemsRefunded.length > 0 
      ? data.refundInfo.itemsRefunded.map(item => `
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${item.productName}</strong>
          ${item.variantName ? `<br><span style="color: #666; font-size: 12px;">${item.variantName}</span>` : ''}
          <br><span style="color: #666;">Qty: ${item.quantity} - $${item.subtotal.toFixed(2)}</span>
        </div>
      `).join('')
      : '<p>Full order refund</p>';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Refund Processed - Mayhem Creations</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 30px; }
          .refund-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 6px; }
          .info-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Refund Processed</h1>
            <p style="margin: 10px 0 0 0;">Order #${data.orderNumber}</p>
          </div>
          
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Your refund has been processed successfully.</p>
            
            <div class="refund-box">
              <h3 style="margin: 0 0 15px 0;">Refund Details</h3>
              <p style="margin: 5px 0;"><strong>Refund Amount:</strong> <span style="font-size: 20px; color: #4caf50;">$${data.refundInfo.refundAmount.toFixed(2)}</span></p>
              <p style="margin: 5px 0;"><strong>Refund ID:</strong> ${data.refundInfo.refundId}</p>
              <p style="margin: 5px 0;"><strong>Refund Method:</strong> ${data.refundInfo.refundMethod}</p>
              <p style="margin: 5px 0;"><strong>Processed Date:</strong> ${new Date(data.refundInfo.refundDate).toLocaleDateString()}</p>
              ${data.refundInfo.refundReason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${data.refundInfo.refundReason}</p>` : ''}
            </div>
            
            ${data.refundInfo.itemsRefunded && data.refundInfo.itemsRefunded.length > 0 ? `
              <h3>Refunded Items:</h3>
              <div style="border: 1px solid #eee; border-radius: 6px; overflow: hidden;">
                ${refundedItemsHTML}
              </div>
            ` : ''}
            
            <div class="info-box">
              <p style="margin: 0;"><strong>⏱️ When will I receive my refund?</strong></p>
              <p style="margin: 5px 0 0 0;">The refund will appear in your ${data.refundInfo.refundMethod} within 5-10 business days, depending on your financial institution's processing time.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${data.orderId}" class="cta-button">View Order Details</a>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Questions about your refund?</strong></p>
            <p>Contact us at ${process.env.ADMIN_EMAIL || 'support@mayhemcreations.com'}</p>
            <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate refund confirmation text
   */
  private generateRefundConfirmationText(data: {
    customerName: string;
    orderNumber: string;
    orderId: string | number;
    refundInfo: RefundInfo;
  }): string {
    const refundedItemsList = data.refundInfo.itemsRefunded && data.refundInfo.itemsRefunded.length > 0
      ? data.refundInfo.itemsRefunded.map(item => 
          `- ${item.productName} ${item.variantName ? '(' + item.variantName + ')' : ''} - Qty: ${item.quantity} - $${item.subtotal.toFixed(2)}`
        ).join('\n')
      : 'Full order refund';

    return `
Refund Processed - Mayhem Creations

Hi ${data.customerName},

Your refund has been processed successfully for order #${data.orderNumber}.

REFUND DETAILS:
Refund Amount: $${data.refundInfo.refundAmount.toFixed(2)}
Refund ID: ${data.refundInfo.refundId}
Refund Method: ${data.refundInfo.refundMethod}
Processed Date: ${new Date(data.refundInfo.refundDate).toLocaleDateString()}
${data.refundInfo.refundReason ? 'Reason: ' + data.refundInfo.refundReason : ''}

REFUNDED ITEMS:
${refundedItemsList}

WHEN WILL I RECEIVE MY REFUND?
The refund will appear in your ${data.refundInfo.refundMethod} within 5-10 business days, depending on your financial institution's processing time.

View order details: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${data.orderId}

Questions? Contact us at ${process.env.ADMIN_EMAIL || 'support@mayhemcreations.com'}

© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.
    `.trim();
  }

  /**
   * Send payment receipt email
   * Triggered after successful payment
   */
  async sendPaymentReceipt(data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderId: string | number;
    paymentInfo: PaymentInfo;
    orderTotal: number;
  }): Promise<boolean> {
    const subject = `Payment Receipt for Order #${data.orderNumber} - Mayhem Creations`;
    const html = this.generatePaymentReceiptHTML(data);
    const text = this.generatePaymentReceiptText(data);

    return this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Generate payment receipt HTML
   */
  private generatePaymentReceiptHTML(data: {
    customerName: string;
    orderNumber: string;
    orderId: string | number;
    paymentInfo: PaymentInfo;
    orderTotal: number;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Receipt - Mayhem Creations</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 30px; }
          .receipt-box { background: #e8f5e8; border-left: 4px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 6px; }
          .payment-details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .amount { font-size: 32px; font-weight: bold; color: #4caf50; text-align: center; margin: 20px 0; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Payment Received</h1>
            <p style="margin: 10px 0 0 0;">Receipt for Order #${data.orderNumber}</p>
          </div>
          
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Thank you for your payment! This email confirms that we've received your payment for order #${data.orderNumber}.</p>
            
            <div class="receipt-box">
              <h3 style="margin: 0 0 15px 0; text-align: center;">Payment Confirmation</h3>
              <div class="amount">$${data.paymentInfo.paidAmount.toFixed(2)}</div>
              <p style="text-align: center; color: #666; margin: 0;">Paid via ${data.paymentInfo.paymentProvider}</p>
            </div>
            
            <div class="payment-details">
              <h3 style="margin: 0 0 15px 0;">Payment Details</h3>
              <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${data.paymentInfo.paymentMethod}</p>
              <p style="margin: 5px 0;"><strong>Provider:</strong> ${data.paymentInfo.paymentProvider}</p>
              ${data.paymentInfo.transactionId ? `<p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${data.paymentInfo.transactionId}</p>` : ''}
              ${data.paymentInfo.cardLast4 ? `<p style="margin: 5px 0;"><strong>Card:</strong> ${data.paymentInfo.cardBrand || 'Card'} ending in ${data.paymentInfo.cardLast4}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2196f3;">
              <p style="margin: 0;"><strong>📧 Keep This Receipt</strong></p>
              <p style="margin: 5px 0 0 0;">Save this email for your records. You can also view your order and payment details anytime in your account.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${data.orderId}" class="cta-button">View Order Details</a>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Questions about your payment?</strong></p>
            <p>Contact us at ${process.env.ADMIN_EMAIL || 'support@mayhemcreations.com'}</p>
            <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate payment receipt text
   */
  private generatePaymentReceiptText(data: {
    customerName: string;
    orderNumber: string;
    orderId: string | number;
    paymentInfo: PaymentInfo;
    orderTotal: number;
  }): string {
    return `
Payment Receipt - Mayhem Creations

Hi ${data.customerName},

Thank you for your payment! This email confirms that we've received your payment for order #${data.orderNumber}.

PAYMENT CONFIRMATION
Amount Paid: $${data.paymentInfo.paidAmount.toFixed(2)}

PAYMENT DETAILS:
Payment Method: ${data.paymentInfo.paymentMethod}
Provider: ${data.paymentInfo.paymentProvider}
${data.paymentInfo.transactionId ? 'Transaction ID: ' + data.paymentInfo.transactionId : ''}
${data.paymentInfo.cardLast4 ? 'Card: ' + (data.paymentInfo.cardBrand || 'Card') + ' ending in ' + data.paymentInfo.cardLast4 : ''}
Date: ${new Date().toLocaleDateString()}

Keep this receipt for your records. You can also view your order and payment details anytime in your account.

View order details: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${data.orderId}

Questions? Contact us at ${process.env.ADMIN_EMAIL || 'support@mayhemcreations.com'}

© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.
    `.trim();
  }

  /**
   * Send review request email
   * Triggered after successful delivery to request product review
   */
  async sendReviewRequest(data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderId: string | number;
    orderItems: OrderItem[];
    reviewUrl?: string;
  }): Promise<boolean> {
    const subject = `How was your experience? Share your review - Mayhem Creations`;
    const html = this.generateReviewRequestHTML(data);
    const text = this.generateReviewRequestText(data);

    return this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Generate review request HTML
   */
  private generateReviewRequestHTML(data: {
    customerName: string;
    orderNumber: string;
    orderId: string | number;
    orderItems: OrderItem[];
    reviewUrl?: string;
  }): string {
    const productsList = data.orderItems.slice(0, 3).map(item => `
      <div style="padding: 15px; border-bottom: 1px solid #eee; text-align: center;">
        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.productName}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">` : ''}
        <div>
          <strong>${item.productName}</strong>
          ${item.variantName ? `<br><span style="color: #666; font-size: 12px;">${item.variantName}</span>` : ''}
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Share Your Review - Mayhem Creations</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 30px; }
          .stars { text-align: center; font-size: 40px; margin: 20px 0; }
          .cta-button { display: inline-block; background: #f5576c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⭐ Share Your Experience</h1>
            <p style="margin: 10px 0 0 0;">Order #${data.orderNumber}</p>
          </div>
          
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>We hope you're enjoying your recent purchase! Your opinion matters to us and helps other customers make informed decisions.</p>
            
            <div class="stars">⭐⭐⭐⭐⭐</div>
            
            <div style="border: 1px solid #eee; border-radius: 6px; overflow: hidden; margin: 20px 0;">
              ${productsList}
            </div>
            
            <p style="text-align: center; font-size: 18px; font-weight: bold; margin: 30px 0 20px 0;">How would you rate your experience?</p>
            
            <div style="text-align: center;">
              <a href="${data.reviewUrl || process.env.FRONTEND_URL + '/orders/' + data.orderId + '/review'}" class="cta-button">Write a Review</a>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 30px 0; border-left: 4px solid #2196f3;">
              <p style="margin: 0;"><strong>🎁 Special Thank You!</strong></p>
              <p style="margin: 5px 0 0 0;">As a token of our appreciation, you'll receive a 10% discount code for your next purchase after leaving a review!</p>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">Your review takes just 2 minutes and helps us serve you better!</p>
          </div>
          
          <div class="footer">
            <p><strong>Thank you for being a valued customer!</strong></p>
            <p>Mayhem Creations Team</p>
            <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate review request text
   */
  private generateReviewRequestText(data: {
    customerName: string;
    orderNumber: string;
    orderId: string | number;
    orderItems: OrderItem[];
    reviewUrl?: string;
  }): string {
    const productsList = data.orderItems.slice(0, 3).map(item => 
      `- ${item.productName} ${item.variantName ? '(' + item.variantName + ')' : ''}`
    ).join('\n');

    return `
Share Your Experience - Mayhem Creations

Hi ${data.customerName},

We hope you're enjoying your recent purchase from order #${data.orderNumber}! Your opinion matters to us and helps other customers make informed decisions.

PRODUCTS IN YOUR ORDER:
${productsList}

How would you rate your experience?

Write a review: ${data.reviewUrl || process.env.FRONTEND_URL + '/orders/' + data.orderId + '/review'}

SPECIAL THANK YOU!
As a token of our appreciation, you'll receive a 10% discount code for your next purchase after leaving a review!

Your review takes just 2 minutes and helps us serve you better!

Thank you for being a valued customer!
Mayhem Creations Team

© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.
    `.trim();
  }

  /**
   * Send newsletter/marketing email
   * For promotional content, updates, and announcements
   */
  async sendNewsletter(data: {
    recipientEmail: string;
    recipientName: string;
    newsletterTitle: string;
    newsletterContent: string;
    unsubscribeUrl?: string;
  }): Promise<boolean> {
    const subject = `${data.newsletterTitle} - Mayhem Creations`;
    const html = this.generateNewsletterHTML(data);
    const text = this.generateNewsletterText(data);

    return this.sendEmail({
      to: data.recipientEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Generate newsletter HTML
   */
  private generateNewsletterHTML(data: {
    recipientName: string;
    newsletterTitle: string;
    newsletterContent: string;
    unsubscribeUrl?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.newsletterTitle} - Mayhem Creations</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 30px; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🎨 ${data.newsletterTitle}</h1>
          </div>
          
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            
            <div style="margin: 20px 0;">
              ${data.newsletterContent}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/products" class="cta-button">Shop Now</a>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Mayhem Creations</strong></p>
            <p>© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.</p>
            ${data.unsubscribeUrl ? `<p style="margin-top: 15px;"><a href="${data.unsubscribeUrl}" style="color: #666; text-decoration: underline;">Unsubscribe from newsletters</a></p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate newsletter text
   */
  private generateNewsletterText(data: {
    recipientName: string;
    newsletterTitle: string;
    newsletterContent: string;
    unsubscribeUrl?: string;
  }): string {
    // Strip HTML tags from content for text version
    const textContent = data.newsletterContent.replace(/<[^>]*>/g, '');
    
    return `
${data.newsletterTitle} - Mayhem Creations

Hi ${data.recipientName},

${textContent}

Shop now: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/products

© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.
${data.unsubscribeUrl ? '\nUnsubscribe: ' + data.unsubscribeUrl : ''}
    `.trim();
  }

  /**
   * Send account update notification
   * For security alerts, profile changes, password resets, etc.
   */
  async sendAccountUpdateNotification(data: {
    customerName: string;
    customerEmail: string;
    updateType: string;
    updateDetails: string;
    actionRequired: boolean;
    actionUrl?: string;
  }): Promise<boolean> {
    const subject = `Account ${data.updateType} - Mayhem Creations`;
    const html = this.generateAccountUpdateHTML(data);
    const text = this.generateAccountUpdateText(data);

    return this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Generate account update HTML
   */
  private generateAccountUpdateHTML(data: {
    customerName: string;
    updateType: string;
    updateDetails: string;
    actionRequired: boolean;
    actionUrl?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account ${data.updateType} - Mayhem Creations</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          .header { background: ${data.actionRequired ? 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}; color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 30px; }
          .alert-box { background: ${data.actionRequired ? '#fff3cd' : '#e3f2fd'}; border-left: 4px solid ${data.actionRequired ? '#ffc107' : '#2196f3'}; padding: 20px; margin: 20px 0; border-radius: 6px; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.actionRequired ? '⚠️' : '🔔'} Account ${data.updateType}</h1>
          </div>
          
          <div class="content">
            <p>Hi ${data.customerName},</p>
            
            <div class="alert-box">
              <h3 style="margin: 0 0 10px 0;">${data.updateType}</h3>
              <p style="margin: 0;">${data.updateDetails}</p>
            </div>
            
            ${data.actionRequired ? `
              <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0;"><strong>⚡ Action Required</strong></p>
                <p style="margin: 5px 0 0 0;">Please take action to secure your account.</p>
              </div>
            ` : ''}
            
            ${data.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.actionUrl}" class="cta-button">${data.actionRequired ? 'Take Action' : 'View Details'}</a>
              </div>
            ` : ''}
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #666;">
              <p style="margin: 0;"><strong>🔒 Security Note</strong></p>
              <p style="margin: 5px 0 0 0;">If you didn't make this change, please contact our support team immediately at ${process.env.ADMIN_EMAIL || 'support@mayhemcreations.com'}</p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Mayhem Creations Security Team</strong></p>
            <p>This is an automated security notification.</p>
            <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate account update text
   */
  private generateAccountUpdateText(data: {
    customerName: string;
    updateType: string;
    updateDetails: string;
    actionRequired: boolean;
    actionUrl?: string;
  }): string {
    return `
Account ${data.updateType} - Mayhem Creations

Hi ${data.customerName},

${data.updateType}
${data.updateDetails}

${data.actionRequired ? 'ACTION REQUIRED:\nPlease take action to secure your account.\n' : ''}
${data.actionUrl ? (data.actionRequired ? 'Take action: ' : 'View details: ') + data.actionUrl + '\n' : ''}

SECURITY NOTE:
If you didn't make this change, please contact our support team immediately at ${process.env.ADMIN_EMAIL || 'support@mayhemcreations.com'}

Mayhem Creations Security Team
This is an automated security notification.

© ${new Date().getFullYear()} Mayhem Creations. All rights reserved.
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
