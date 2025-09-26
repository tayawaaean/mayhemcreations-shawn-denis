import { envConfig } from './envConfig';
import { apiAuthService, ApiResponse } from './apiAuthService';

export interface ChatMessage {
  id: number;
  customerId: number;
  sender: 'user' | 'admin';
  text: string | null;
  type?: 'text' | 'image' | 'file';
  attachment?: any;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    name: string | null;
  } | null;
}

export interface ChatThread {
  customerId: number;
  lastMessage: {
    text: string | null;
    type?: 'text' | 'image' | 'file';
    sender: 'user' | 'admin';
    timestamp: string;
  };
  unreadCount: number;
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
    name: string;
  };
}

class MessageApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${envConfig.getApiBaseUrl()}/messages`;
  }

  /**
   * Get chat messages for a specific customer
   */
  async getMessagesByCustomer(customerId: number, limit: number = 100): Promise<ApiResponse<ChatMessage[]>> {
    return apiAuthService.get<ChatMessage[]>(`/messages/customer/${customerId}?limit=${limit}`, true);
  }

  /**
   * Get all chat threads (conversations) for admin
   */
  async getChatThreads(): Promise<ApiResponse<ChatThread[]>> {
    return apiAuthService.get<ChatThread[]>('/messages/threads', true);
  }

  /**
   * Get recent messages across all customers
   */
  async getRecentMessages(limit: number = 50): Promise<ApiResponse<ChatMessage[]>> {
    return apiAuthService.get<ChatMessage[]>(`/messages/recent?limit=${limit}`, true);
  }
}

export const messageApiService = new MessageApiService();
