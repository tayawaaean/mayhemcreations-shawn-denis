import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Mayhem Creations <noreply@mayhemcreation.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // For development only
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    logger.error('Email service configuration error:', error);
  } else {
    logger.info('✅ Email service is ready to send messages');
  }
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  /**
   * Send email verification email
   * @param email - Recipient email address
   * @param firstName - User's first name for personalization
   * @param verificationToken - Unique token for email verification
   * @returns Promise<boolean> - True if email sent successfully, false otherwise
   * @throws {Error} When email sending fails
   */
  static async sendVerificationEmail(
    email: string,
    firstName: string,
    verificationToken: string
  ): Promise<boolean> {
    try {
      const verificationUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification - Mayhem Creations</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #e74c3c;
              margin-bottom: 10px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #e74c3c;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #c0392b;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .warning {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎨 Mayhem Creations</div>
              <h1>Welcome to Mayhem Creations!</h1>
            </div>
            
            <p>Hi ${firstName},</p>
            
            <p>Thank you for registering with Mayhem Creations! We're excited to have you join our community of creative individuals.</p>
            
            <p>To complete your registration and start customizing amazing products, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> This verification link will expire in 24 hours for security reasons.
            </div>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">
              ${verificationUrl}
            </p>
            
            <p>Once verified, you'll be able to:</p>
            <ul>
              <li>Browse our full product catalog</li>
              <li>Create custom designs with our design tool</li>
              <li>Place orders and track your purchases</li>
              <li>Access exclusive member benefits</li>
            </ul>
            
            <p>If you didn't create an account with Mayhem Creations, please ignore this email.</p>
            
            <div class="footer">
              <p>Best regards,<br>The Mayhem Creations Team</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
        Welcome to Mayhem Creations!
        
        Hi ${firstName},
        
        Thank you for registering with Mayhem Creations! We're excited to have you join our community.
        
        To complete your registration, please verify your email address by visiting this link:
        ${verificationUrl}
        
        This verification link will expire in 24 hours.
        
        Once verified, you'll be able to browse our products, create custom designs, and place orders.
        
        If you didn't create an account with Mayhem Creations, please ignore this email.
        
        Best regards,
        The Mayhem Creations Team
      `;

      const mailOptions: EmailOptions = {
        to: email,
        subject: '🎨 Verify Your Email - Mayhem Creations',
        html,
        text,
      };

      const result = await transporter.sendMail(mailOptions);
      logger.info(`✅ Verification email sent to ${email}:`, result.messageId);
      return true;
    } catch (error) {
      logger.error('❌ Failed to send verification email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<boolean> {
    try {
      const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - Mayhem Creations</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #e74c3c;
              margin-bottom: 10px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #e74c3c;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #c0392b;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .warning {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎨 Mayhem Creations</div>
              <h1>Password Reset Request</h1>
            </div>
            
            <p>Hi ${firstName},</p>
            
            <p>We received a request to reset your password for your Mayhem Creations account.</p>
            
            <p>To reset your password, please click the button below:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> This reset link will expire in 1 hour for security reasons.
            </div>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">
              ${resetUrl}
            </p>
            
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <div class="footer">
              <p>Best regards,<br>The Mayhem Creations Team</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
        Password Reset Request - Mayhem Creations
        
        Hi ${firstName},
        
        We received a request to reset your password for your Mayhem Creations account.
        
        To reset your password, please visit this link:
        ${resetUrl}
        
        This reset link will expire in 1 hour.
        
        If you didn't request a password reset, please ignore this email.
        
        Best regards,
        The Mayhem Creations Team
      `;

      const mailOptions: EmailOptions = {
        to: email,
        subject: '🔐 Password Reset - Mayhem Creations',
        html,
        text,
      };

      const result = await transporter.sendMail(mailOptions);
      logger.info(`✅ Password reset email sent to ${email}:`, result.messageId);
      return true;
    } catch (error) {
      logger.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Send welcome email after successful verification
   * @param email - Recipient email address
   * @param firstName - User's first name for personalization
   * @returns Promise<boolean> - True if email sent successfully, false otherwise
   * @throws {Error} When email sending fails
   */
  static async sendWelcomeEmail(
    email: string,
    firstName: string
  ): Promise<boolean> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Mayhem Creations!</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #e74c3c;
              margin-bottom: 10px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #e74c3c;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #c0392b;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .feature {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎨 Mayhem Creations</div>
              <h1>Welcome to Mayhem Creations!</h1>
            </div>
            
            <p>Hi ${firstName},</p>
            
            <p>🎉 Congratulations! Your email has been successfully verified and your account is now active.</p>
            
            <p>You're all set to start exploring our amazing platform and creating custom designs!</p>
            
            <div style="text-align: center;">
              <a href="${FRONTEND_URL}/products" class="button">Start Shopping</a>
            </div>
            
            <h3>What you can do now:</h3>
            
            <div class="feature">
              <strong>🛍️ Browse Products</strong><br>
              Explore our wide range of customizable products including apparel, accessories, and more.
            </div>
            
            <div class="feature">
              <strong>🎨 Create Custom Designs</strong><br>
              Use our intuitive design tool to create unique designs and see them on your products in real-time.
            </div>
            
            <div class="feature">
              <strong>🛒 Place Orders</strong><br>
              Add items to your cart and checkout securely with our integrated payment system.
            </div>
            
            <div class="feature">
              <strong>📱 Track Orders</strong><br>
              Monitor your order status and receive updates throughout the fulfillment process.
            </div>
            
            <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
            
            <div class="footer">
              <p>Happy creating!<br>The Mayhem Creations Team</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
        Welcome to Mayhem Creations!
        
        Hi ${firstName},
        
        Congratulations! Your email has been successfully verified and your account is now active.
        
        You're all set to start exploring our amazing platform and creating custom designs!
        
        Visit our products page to get started: ${FRONTEND_URL}/products
        
        What you can do now:
        - Browse our wide range of customizable products
        - Create custom designs with our design tool
        - Place orders and track your purchases
        - Access exclusive member benefits
        
        If you have any questions, don't hesitate to reach out to our support team.
        
        Happy creating!
        The Mayhem Creations Team
      `;

      const mailOptions: EmailOptions = {
        to: email,
        subject: '🎉 Welcome to Mayhem Creations!',
        html,
        text,
      };

      const result = await transporter.sendMail(mailOptions);
      logger.info(`✅ Welcome email sent to ${email}:`, result.messageId);
      return true;
    } catch (error) {
      logger.error('❌ Failed to send welcome email:', error);
      return false;
    }
  }

  /**
   * Test email configuration
   */
  static async testEmailConfiguration(): Promise<boolean> {
    try {
      const testEmail = {
        to: EMAIL_USER,
        subject: 'Test Email - Mayhem Creations',
        html: '<h1>Test Email</h1><p>This is a test email to verify the configuration.</p>',
        text: 'Test Email - This is a test email to verify the configuration.',
      };

      const result = await transporter.sendMail(testEmail);
      logger.info('✅ Test email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      logger.error('❌ Test email failed:', error);
      return false;
    }
  }
}
