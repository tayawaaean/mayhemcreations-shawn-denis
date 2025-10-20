import { Request, Response } from 'express';
import Contact from '../models/contactModel';
import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';

// Admin email address from environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'support@mayhemcreations.com';

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Mayhem Creations <noreply@mayhemcreation.com>';

// Create nodemailer transporter for contact form emails
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: false,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Contact controller for handling contact form submissions
export class ContactController {
  /**
   * Submit a contact form inquiry
   * POST /api/v1/contact
   * Public endpoint - no authentication required
   */
  static async submitContact(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, phone, company, projectType, quantity, message } = req.body;

      // Validate required fields
      if (!name || !email || !projectType || !message) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: name, email, projectType, and message are required',
        });
        return;
      }

      // Create contact record in database
      const contact = await Contact.create({
        name,
        email,
        phone: phone || null,
        company: company || null,
        projectType,
        quantity: quantity || null,
        message,
        status: 'new',
      });

      // Send email notification to admin
      const emailSent = await ContactController.sendAdminNotification(contact);

      if (!emailSent) {
        logger.warn(`Contact form submitted but email notification failed for ${email}`);
      }

      // Send confirmation email to customer
      await ContactController.sendCustomerConfirmation(contact);

      logger.info(`Contact form submitted successfully by ${email} (ID: ${contact.id})`);

      res.status(201).json({
        success: true,
        message: 'Contact form submitted successfully. We will get back to you within 24 hours.',
        data: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          createdAt: contact.createdAt,
        },
      });
    } catch (error: any) {
      logger.error('Error submitting contact form:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit contact form. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Get all contact submissions (Admin only)
   * GET /api/v1/contact
   */
  static async getAllContacts(req: Request, res: Response): Promise<void> {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      // Build query filters
      const where: any = {};
      if (status) {
        where.status = status;
      }

      // Fetch contacts with pagination
      const { count, rows: contacts } = await Contact.findAndCountAll({
        where,
        limit: Number(limit),
        offset: Number(offset),
        order: [['createdAt', 'DESC']],
      });

      res.status(200).json({
        success: true,
        data: {
          contacts,
          total: count,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error: any) {
      logger.error('Error fetching contacts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch contacts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Get a single contact by ID (Admin only)
   * GET /api/v1/contact/:id
   */
  static async getContactById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const contact = await Contact.findByPk(id);

      if (!contact) {
        res.status(404).json({
          success: false,
          message: 'Contact not found',
        });
        return;
      }

      // Mark as read if it was new
      if (contact.status === 'new') {
        contact.status = 'read';
        await contact.save();
      }

      res.status(200).json({
        success: true,
        data: contact,
      });
    } catch (error: any) {
      logger.error('Error fetching contact:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch contact',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Update contact status (Admin only)
   * PATCH /api/v1/contact/:id/status
   */
  static async updateContactStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['new', 'read', 'responded', 'archived'];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }

      const contact = await Contact.findByPk(id);

      if (!contact) {
        res.status(404).json({
          success: false,
          message: 'Contact not found',
        });
        return;
      }

      // Update status
      contact.status = status;
      await contact.save();

      logger.info(`Contact ${id} status updated to ${status}`);

      res.status(200).json({
        success: true,
        message: 'Contact status updated successfully',
        data: contact,
      });
    } catch (error: any) {
      logger.error('Error updating contact status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update contact status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Delete a contact (Admin only)
   * DELETE /api/v1/contact/:id
   */
  static async deleteContact(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const contact = await Contact.findByPk(id);

      if (!contact) {
        res.status(404).json({
          success: false,
          message: 'Contact not found',
        });
        return;
      }

      await contact.destroy();

      logger.info(`Contact ${id} deleted successfully`);

      res.status(200).json({
        success: true,
        message: 'Contact deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting contact:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete contact',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Send admin notification email about new contact submission
   * Private helper method
   */
  private static async sendAdminNotification(contact: Contact): Promise<boolean> {
    try {
      const subject = `New Contact Form Submission - ${contact.name}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Submission</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
            .info-row { margin: 15px 0; padding: 10px; background-color: #f8f9fa; border-radius: 5px; }
            .label { font-weight: bold; color: #667eea; }
            .message-box { background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0; border-radius: 5px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">New Contact Form Submission</h1>
              <p style="margin: 10px 0 0 0;">Mayhem Creations</p>
            </div>
            
            <p>You have received a new contact form submission. Details below:</p>
            
            <div class="info-row">
              <span class="label">Name:</span> ${contact.name}
            </div>
            
            <div class="info-row">
              <span class="label">Email:</span> <a href="mailto:${contact.email}">${contact.email}</a>
            </div>
            
            ${contact.phone ? `
            <div class="info-row">
              <span class="label">Phone:</span> <a href="tel:${contact.phone}">${contact.phone}</a>
            </div>
            ` : ''}
            
            ${contact.company ? `
            <div class="info-row">
              <span class="label">Company:</span> ${contact.company}
            </div>
            ` : ''}
            
            <div class="info-row">
              <span class="label">Project Type:</span> ${contact.projectType}
            </div>
            
            ${contact.quantity ? `
            <div class="info-row">
              <span class="label">Estimated Quantity:</span> ${contact.quantity}
            </div>
            ` : ''}
            
            <div class="message-box">
              <h3 style="margin: 0 0 10px 0;">Message:</h3>
              <p style="margin: 0; white-space: pre-wrap;">${contact.message}</p>
            </div>
            
            <div class="info-row">
              <span class="label">Submitted:</span> ${new Date(contact.createdAt).toLocaleString()}
            </div>
            
            <div class="footer">
              <p>This is an automated notification from the Mayhem Creations contact form.</p>
              <p>Submission ID: ${contact.id}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
New Contact Form Submission - Mayhem Creations

Name: ${contact.name}
Email: ${contact.email}
${contact.phone ? `Phone: ${contact.phone}` : ''}
${contact.company ? `Company: ${contact.company}` : ''}
Project Type: ${contact.projectType}
${contact.quantity ? `Estimated Quantity: ${contact.quantity}` : ''}

Message:
${contact.message}

Submitted: ${new Date(contact.createdAt).toLocaleString()}
Submission ID: ${contact.id}

---
This is an automated notification from the Mayhem Creations contact form.
      `.trim();

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: ADMIN_EMAIL,
        subject,
        html,
        text,
      });

      logger.info(`Contact form admin notification email sent to ${ADMIN_EMAIL}`);
      return true;
    } catch (error) {
      logger.error('Failed to send admin notification email:', error);
      return false;
    }
  }

  /**
   * Send confirmation email to customer
   * Private helper method
   */
  private static async sendCustomerConfirmation(contact: Contact): Promise<boolean> {
    try {
      const subject = 'Thank You for Contacting Mayhem Creations';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contact Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #e74c3c; margin-bottom: 10px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #e74c3c; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
            .info-box { background-color: #e8f5e8; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎨 Mayhem Creations</div>
              <h1>Thank You for Reaching Out!</h1>
            </div>
            
            <p>Hi ${contact.name},</p>
            
            <p>Thank you for contacting Mayhem Creations! We've received your inquiry about <strong>${contact.projectType}</strong> and will get back to you within 24 hours.</p>
            
            <div class="info-box">
              <h3 style="margin: 0 0 10px 0;">What happens next?</h3>
              <ul style="margin: 5px 0; padding-left: 20px;">
                <li>Our team will review your inquiry</li>
                <li>We'll prepare a personalized quote based on your requirements</li>
                <li>You'll receive a detailed response within 24 hours</li>
              </ul>
            </div>
            
            <p>In the meantime, feel free to explore our product catalog or learn more about our custom embroidery services.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/products" class="button">Browse Products</a>
            </div>
            
            <div class="footer">
              <p>Best regards,<br>The Mayhem Creations Team</p>
              <p>📞 Phone: 614-715-4742</p>
              <p>📧 Email: ${ADMIN_EMAIL}</p>
              <p style="margin-top: 15px;">This is an automated confirmation email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
Thank You for Reaching Out! - Mayhem Creations

Hi ${contact.name},

Thank you for contacting Mayhem Creations! We've received your inquiry about ${contact.projectType} and will get back to you within 24 hours.

What happens next?
- Our team will review your inquiry
- We'll prepare a personalized quote based on your requirements
- You'll receive a detailed response within 24 hours

In the meantime, feel free to explore our product catalog or learn more about our custom embroidery services.

Visit: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/products

Best regards,
The Mayhem Creations Team

Phone: 614-715-4742
Email: ${ADMIN_EMAIL}

---
This is an automated confirmation email.
      `.trim();

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: contact.email,
        subject,
        html,
        text,
      });

      logger.info(`Contact form confirmation email sent to ${contact.email}`);
      return true;
    } catch (error) {
      logger.error('Failed to send customer confirmation email:', error);
      return false;
    }
  }
}

