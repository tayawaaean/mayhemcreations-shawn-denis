import axios from 'axios';
import { logger } from '../utils/logger';
import { ChatWebhookPayload } from '../types';

export class WebhookService {
  private mainBackendUrl: string;
  private webhookSecret: string;

  constructor() {
    this.mainBackendUrl = process.env.MAIN_BACKEND_URL || 'http://localhost:5001';
    this.webhookSecret = process.env.MAIN_BACKEND_WEBHOOK_SECRET || '';
  }

  /**
   * Send webhook to main backend (for testing purposes)
   */
  async sendWebhookToMainBackend(payload: ChatWebhookPayload): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.mainBackendUrl}/webhook/chat-email`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': this.webhookSecret
          },
          timeout: 5000
        }
      );

      logger.info(`📡 Webhook sent to main backend: ${payload.event}`);
      return response.status === 200;
    } catch (error) {
      logger.error('❌ Failed to send webhook to main backend:', error);
      return false;
    }
  }

  /**
   * Test webhook connectivity
   */
  async testWebhookConnectivity(): Promise<boolean> {
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

      return await this.sendWebhookToMainBackend(testPayload);
    } catch (error) {
      logger.error('❌ Webhook connectivity test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService();
