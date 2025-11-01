/**
 * Email Notification Service
 * Comprehensive email notifications for orders, payments, refunds, and more
 */

import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Mayhem Creation <info.mayhem.creation@gmail.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info.mayhem.creation@gmail.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Create nodemailer transporter
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

// Type definitions for email data
export interface OrderItem {
  id: string | number;
  productId: number;
  productName: string;
  variantName?: string;
  quantity: number;
  price: number;
  subtotal: number;
  customization?: any;
  imageUrl?: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PaymentInfo {
  paymentMethod: string;
  paymentProvider: string;
  transactionId?: string;
  cardLast4?: string;
  cardBrand?: string;
  paidAmount: number;
}

export interface ShippingInfo {
  carrier: string;
  service: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  shippingCost?: number;
}

export interface RefundInfo {
  refundId: string;
  refundAmount: number;
  refundReason?: string;
  refundMethod: string;
  refundDate: string;
  itemsRefunded?: OrderItem[];
}

export class EmailNotificationService {
  /**
   * Send order confirmation email
   * Triggered when customer successfully places an order
   */
  static async sendOrderConfirmation(data: {
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
    try {
      const subject = `Order Confirmation #${data.orderNumber} - Mayhem Creation`;
      const html = this.generateOrderConfirmationHTML(data);
      const text = this.generateOrderConfirmationText(data);

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: data.customerEmail,
        subject,
        html,
        text,
      });

      logger.info(`Order confirmation email sent to ${data.customerEmail} for order #${data.orderNumber}`);
      return true;
    } catch (error) {
      logger.error('Failed to send order confirmation email:', error);
      return false;
    }
  }

  /**
   * Generate order confirmation HTML
   */
  private static generateOrderConfirmationHTML(data: {
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
        <title>Order Confirmation - Mayhem Creation</title>
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
            <h1>Order Confirmed!</h1>
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
              <strong>Estimated Delivery:</strong> ${new Date(data.estimatedDeliveryDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            ` : ''}
            
            <div style="text-align: center;">
              <a href="${FRONTEND_URL}/my-orders" class="cta-button">View Order Status</a>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Need Help?</strong></p>
            <p>Contact our support team at ${ADMIN_EMAIL}</p>
            <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creation. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate order confirmation text
   */
  private static generateOrderConfirmationText(data: {
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
Order Confirmed! - Mayhem Creation

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

View your order status: ${FRONTEND_URL}/my-orders

Need help? Contact us at ${ADMIN_EMAIL}

© ${new Date().getFullYear()} Mayhem Creation. All rights reserved.
    `.trim();
  }

  /**
   * Send shipping confirmation email
   * Triggered when order is shipped with tracking information
   */
  static async sendShippingConfirmation(data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderId: string | number;
    shippingInfo: ShippingInfo;
    orderItems: OrderItem[];
    shippingAddress: Address;
  }): Promise<boolean> {
    try {
      const subject = `Your Order #${data.orderNumber} Has Shipped! - Mayhem Creation`;
      
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

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Order Has Shipped - Mayhem Creation</title>
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
              <h1>Your Order Has Shipped!</h1>
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
                <a href="${FRONTEND_URL}/my-orders" class="cta-button" style="background: #667eea;">View Order Details</a>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Questions about your order?</strong></p>
              <p>Contact us at ${ADMIN_EMAIL}</p>
              <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creation. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: data.customerEmail,
        subject,
        html,
      });

      logger.info(`Shipping confirmation email sent to ${data.customerEmail} for order #${data.orderNumber}`);
      return true;
    } catch (error) {
      logger.error('Failed to send shipping confirmation email:', error);
      return false;
    }
  }

  /**
   * Send delivery notification email
   * Triggered when package is marked as delivered
   */
  static async sendDeliveryNotification(data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderId: string | number;
    deliveryDate: string;
    orderItems: OrderItem[];
  }): Promise<boolean> {
    try {
      const subject = `Your Order #${data.orderNumber} Has Been Delivered! - Mayhem Creation`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Delivered - Mayhem Creation</title>
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
              <h1 style="font-size: 48px; margin: 0;">✓</h1>
              <h1>Delivered Successfully!</h1>
              <p style="margin: 10px 0 0 0;">Order #${data.orderNumber}</p>
            </div>
            
            <div class="content">
              <p>Hi ${data.customerName},</p>
              <p>Your order has been successfully delivered on <strong>${new Date(data.deliveryDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>
              
              <div class="success-box">
                <h3 style="margin: 0 0 10px 0; color: #4caf50;">Enjoy Your Purchase!</h3>
                <p style="margin: 0;">We hope you love your new items from Mayhem Creation</p>
              </div>
              
              <p>We'd love to hear about your experience! Your feedback helps us improve and assists other customers in making informed decisions.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${FRONTEND_URL}/my-reviews" class="cta-button">Leave a Review</a>
                <a href="${FRONTEND_URL}/my-orders" class="cta-button" style="background: #667eea;">View Order</a>
              </div>
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p style="margin: 0;"><strong>Issues with your order?</strong></p>
                <p style="margin: 5px 0 0 0;">If something isn't right, please contact our support team within 7 days of delivery.</p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Thank you for choosing Mayhem Creation!</strong></p>
              <p>Contact us: ${ADMIN_EMAIL}</p>
              <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creation. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: data.customerEmail,
        subject,
        html,
      });

      logger.info(`Delivery notification email sent to ${data.customerEmail} for order #${data.orderNumber}`);
      return true;
    } catch (error) {
      logger.error('Failed to send delivery notification email:', error);
      return false;
    }
  }

  /**
   * Send payment receipt email
   * Triggered after successful payment
   */
  static async sendPaymentReceipt(data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderId: string | number;
    paymentInfo: PaymentInfo;
    orderTotal: number;
  }): Promise<boolean> {
    try {
      const subject = `Payment Receipt for Order #${data.orderNumber} - Mayhem Creation`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Receipt - Mayhem Creation</title>
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
              <h1>Payment Received</h1>
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
                <p style="margin: 0;"><strong>Keep This Receipt</strong></p>
                <p style="margin: 5px 0 0 0;">Save this email for your records. You can also view your order and payment details anytime in your account.</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${FRONTEND_URL}/my-orders" class="cta-button">View Order Details</a>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Questions about your payment?</strong></p>
              <p>Contact us at ${ADMIN_EMAIL}</p>
              <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creation. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: data.customerEmail,
        subject,
        html,
      });

      logger.info(`Payment receipt email sent to ${data.customerEmail} for order #${data.orderNumber}`);
      return true;
    } catch (error) {
      logger.error('Failed to send payment receipt email:', error);
      return false;
    }
  }

  /**
   * Send refund confirmation email
   * Triggered when a refund is processed
   */
  static async sendRefundConfirmation(data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderId: string | number;
    refundInfo: RefundInfo;
  }): Promise<boolean> {
    try {
      const subject = `Refund Processed for Order #${data.orderNumber} - Mayhem Creation`;
      
      const refundedItemsHTML = data.refundInfo.itemsRefunded && data.refundInfo.itemsRefunded.length > 0 
        ? data.refundInfo.itemsRefunded.map(item => `
          <div style="padding: 10px; border-bottom: 1px solid #eee;">
            <strong>${item.productName}</strong>
            ${item.variantName ? `<br><span style="color: #666; font-size: 12px;">${item.variantName}</span>` : ''}
            <br><span style="color: #666;">Qty: ${item.quantity} - $${item.subtotal.toFixed(2)}</span>
          </div>
        `).join('')
        : '<p>Full order refund</p>';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Refund Processed - Mayhem Creation</title>
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
              <h1>Refund Processed</h1>
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
                <p style="margin: 0;"><strong>When will I receive my refund?</strong></p>
                <p style="margin: 5px 0 0 0;">The refund will appear in your ${data.refundInfo.refundMethod} within 5-10 business days, depending on your financial institution's processing time.</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${FRONTEND_URL}/my-orders" class="cta-button">View Order Details</a>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Questions about your refund?</strong></p>
              <p>Contact us at ${ADMIN_EMAIL}</p>
              <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creation. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: data.customerEmail,
        subject,
        html,
      });

      logger.info(`Refund confirmation email sent to ${data.customerEmail} for order #${data.orderNumber}`);
      return true;
    } catch (error) {
      logger.error('Failed to send refund confirmation email:', error);
      return false;
    }
  }

  /**
   * Send refund rejection email
   * Triggered when a refund request is rejected by admin
   */
  static async sendRefundRejection(data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderId: string | number;
    rejectionReason: string;
    refundAmount: number;
    requestedReason: string;
  }): Promise<boolean> {
    try {
      const subject = `Refund Request Update for Order #${data.orderNumber} - Mayhem Creation`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Refund Request Update - Mayhem Creation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 30px; }
            .rejection-box { background: #ffebee; border-left: 4px solid #f44336; padding: 20px; margin: 20px 0; border-radius: 6px; }
            .info-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 6px; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Refund Request Update</h1>
              <p style="margin: 10px 0 0 0;">Order #${data.orderNumber}</p>
            </div>
            
            <div class="content">
              <p>Hi ${data.customerName},</p>
              <p>Thank you for contacting us regarding your refund request for Order #${data.orderNumber}.</p>
              
              <div class="rejection-box">
                <h3 style="margin: 0 0 15px 0; color: #d32f2f;">Refund Request Not Approved</h3>
                <p style="margin: 5px 0;"><strong>Requested Amount:</strong> $${data.refundAmount.toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>Your Reason:</strong> ${data.requestedReason}</p>
                <hr style="border: none; border-top: 1px solid #ffcdd2; margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>Admin Response:</strong></p>
                <p style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">${data.rejectionReason}</p>
              </div>
              
              <div class="warning-box">
                <p style="margin: 0;"><strong>What can I do next?</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Review the admin response above to understand why your request was not approved</li>
                  <li>If you have additional information or evidence, you can submit a new refund request</li>
                  <li>Contact our support team if you have questions or need clarification</li>
                </ul>
              </div>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>Need Help?</strong></p>
                <p style="margin: 5px 0 0 0;">Our customer support team is here to assist you. Reply to this email or contact us directly.</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${FRONTEND_URL}/my-orders" class="cta-button">View My Orders</a>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Questions or concerns?</strong></p>
              <p>Contact us at ${ADMIN_EMAIL}</p>
              <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creation. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: data.customerEmail,
        subject,
        html,
      });

      logger.info(`Refund rejection email sent to ${data.customerEmail} for order #${data.orderNumber}`);
      return true;
    } catch (error) {
      logger.error('Failed to send refund rejection email:', error);
      return false;
    }
  }

  /**
   * Send review request email
   * Triggered after successful delivery to request product review
   */
  static async sendReviewRequest(data: {
    customerName: string;
    customerEmail: string;
    orderNumber: string;
    orderId: string | number;
    orderItems: OrderItem[];
  }): Promise<boolean> {
    try {
      const subject = `How was your experience? Share your review - Mayhem Creation`;
      
      const productsList = data.orderItems.slice(0, 3).map(item => `
        <div style="padding: 15px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.productName}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">` : ''}
          <div>
            <strong>${item.productName}</strong>
            ${item.variantName ? `<br><span style="color: #666; font-size: 12px;">${item.variantName}</span>` : ''}
          </div>
        </div>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Share Your Review - Mayhem Creation</title>
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
              <h1>Share Your Experience</h1>
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
                <a href="${FRONTEND_URL}/my-reviews" class="cta-button">Write a Review</a>
              </div>
              
              <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">Your review takes just 2 minutes and helps us serve you better!</p>
            </div>
            
            <div class="footer">
              <p><strong>Thank you for being a valued customer!</strong></p>
              <p>Mayhem Creation Team</p>
              <p style="margin-top: 15px;">© ${new Date().getFullYear()} Mayhem Creation. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: EMAIL_FROM,
        to: data.customerEmail,
        subject,
        html,
      });

      logger.info(`Review request email sent to ${data.customerEmail} for order #${data.orderNumber}`);
      return true;
    } catch (error) {
      logger.error('Failed to send review request email:', error);
      return false;
    }
  }
}

