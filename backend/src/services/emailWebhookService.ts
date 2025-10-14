import axios from 'axios';
import { logger } from '../utils/logger';

// Interface for webhook payload
interface ChatWebhookPayload {
  event: 'chat_message' | 'chat_connected' | 'chat_disconnected';
  data: {
    messageId?: string;
    text?: string | null;
    sender?: 'user' | 'admin';
    customerId: string;
    type?: 'text' | 'image' | 'file';
    attachment?: any | null;
    name?: string | null;
    email?: string | null;
    timestamp: string;
  };
}

export class EmailWebhookService {
  private emailServiceUrl: string;
  private webhookSecret: string;

  constructor() {
    this.emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://localhost:5002';
    this.webhookSecret = process.env.EMAIL_SERVICE_WEBHOOK_SECRET || '';
  }

  /**
   * Send chat message webhook to email service
   */
  async sendChatMessageWebhook(data: {
    messageId: string;
    text?: string | null;
    sender: 'user' | 'admin';
    customerId: string;
    type?: 'text' | 'image' | 'file';
    attachment?: any | null;
    name?: string | null;
    email?: string | null;
  }): Promise<void> {
    try {
      const payload: ChatWebhookPayload = {
        event: 'chat_message',
        data: {
          ...data,
          timestamp: new Date().toISOString()
        }
      };

      await this.sendWebhook(payload);
      logger.info(`📧 Chat message webhook sent for customer ${data.customerId}`);
    } catch (error) {
      logger.error('❌ Failed to send chat message webhook:', error);
    }
  }

  /**
   * Send chat connected webhook to email service
   */
  async sendChatConnectedWebhook(data: {
    customerId: string;
    name?: string | null;
    email?: string | null;
  }): Promise<void> {
    try {
      const payload: ChatWebhookPayload = {
        event: 'chat_connected',
        data: {
          ...data,
          timestamp: new Date().toISOString()
        }
      };

      await this.sendWebhook(payload);
      logger.info(`📧 Chat connected webhook sent for customer ${data.customerId}`);
    } catch (error) {
      logger.error('❌ Failed to send chat connected webhook:', error);
    }
  }

  /**
   * Send chat disconnected webhook to email service
   */
  async sendChatDisconnectedWebhook(data: {
    customerId: string;
  }): Promise<void> {
    try {
      const payload: ChatWebhookPayload = {
        event: 'chat_disconnected',
        data: {
          ...data,
          timestamp: new Date().toISOString()
        }
      };

      await this.sendWebhook(payload);
      logger.info(`📧 Chat disconnected webhook sent for customer ${data.customerId}`);
    } catch (error) {
      logger.error('❌ Failed to send chat disconnected webhook:', error);
    }
  }

  /**
   * Send webhook to email service
   */
  private async sendWebhook(payload: ChatWebhookPayload): Promise<void> {
    try {
      await axios.post(
        `${this.emailServiceUrl}/webhook/chat`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': this.webhookSecret
          },
          timeout: 5000
        }
      );
    } catch (error) {
      // Log error but don't throw to avoid breaking chat functionality
      logger.error('❌ Webhook request failed:', error);
    }
  }

  /**
   * Test webhook connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      const testPayload: ChatWebhookPayload = {
        event: 'chat_message',
        data: {
          messageId: 'test_' + Date.now(),
          text: 'Test message',
          sender: 'user',
          customerId: 'test_customer',
          type: 'text',
          name: 'Test User',
          email: 'test@example.com',
          timestamp: new Date().toISOString()
        }
      };

      await axios.post(
        `${this.emailServiceUrl}/webhook/chat`,
        testPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': this.webhookSecret
          },
          timeout: 5000
        }
      );

      logger.info('✅ Email service webhook connectivity test passed');
      return true;
    } catch (error) {
      logger.error('❌ Email service webhook connectivity test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailWebhookService = new EmailWebhookService();
