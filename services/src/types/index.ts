// Chat message types that match the main backend
export interface ChatMessage {
  messageId: string;
  text?: string | null;
  sender: 'user' | 'admin';
  customerId: string;
  type?: 'text' | 'image' | 'file';
  attachment?: any | null;
  name?: string | null;
  email?: string | null;
  timestamp: string;
}

// Webhook payload from main backend
export interface ChatWebhookPayload {
  event: 'chat_message' | 'chat_connected' | 'chat_disconnected';
  data: ChatMessage | {
    customerId: string;
    name?: string | null;
    email?: string | null;
    timestamp: string;
  };
}

// Email notification types
export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// User profile for email context
export interface UserProfile {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  isGuest: boolean;
}

// Email template data
export interface EmailTemplateData {
  customerName: string;
  customerEmail?: string;
  message: string;
  timestamp: string;
  isGuest: boolean;
  adminName: string;
  companyName: string;
}
