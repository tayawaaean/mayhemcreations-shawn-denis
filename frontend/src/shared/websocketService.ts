import { io, Socket } from 'socket.io-client';

export interface WebSocketEvents {
  // Design review events
  design_review_updated: (data: { orderId: number; reviewData: any; timestamp: string }) => void;
  picture_reply_uploaded: (data: { orderId: number; replyData: any; timestamp: string }) => void;
  customer_confirmation_received: (data: { orderId: number; confirmationData: any; timestamp: string }) => void;
  order_status_changed: (data: { orderId: number; statusData: any; timestamp: string }) => void;
  
  // Customer events
  picture_reply_received: (data: { orderId: number; replyData: any; timestamp: string }) => void;
  confirmation_submitted: (data: { orderId: number; confirmationData: any; timestamp: string }) => void;
  order_status_updated: (data: { orderId: number; statusData: any; timestamp: string }) => void;
  
  // Chat events
  chat_message_received: (data: { messageId: string; text: string; sender: 'user' | 'admin'; customerId: string; timestamp: string; isTyping?: boolean }) => void;
  chat_message_sent: (data: { messageId: string; text: string; sender: 'user' | 'admin'; customerId: string; timestamp: string }) => void;
  admin_typing: (data: { customerId: string; isTyping: boolean }) => void;
  user_typing: (data: { customerId: string; isTyping: boolean }) => void;
  chat_connected: (data: { customerId: string; timestamp: string }) => void;
  chat_disconnected: (data: { customerId: string; timestamp: string }) => void;
  chat_history: (data: { customerId: string; messages: { id: number; text: string; sender: 'user' | 'admin'; timestamp: string }[] }) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  private connect(): void {
    // Determine server URL based on environment
    let serverUrl = 'http://localhost:5001';
    
    if (typeof window !== 'undefined') {
      // Browser environment
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        serverUrl = 'http://localhost:5001';
      } else {
        // Production environment - use same host but different port
        serverUrl = `${protocol}//${hostname}:5001`;
      }
    }
    
    console.log('🔌 Connecting to WebSocket server:', serverUrl);
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.isConnected = false;
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      this.isConnected = false;
      this.handleReconnect();
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔌 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('🔌 Max reconnection attempts reached. WebSocket will not reconnect automatically.');
    }
  }

  // Join user room for customer-specific events
  public joinUserRoom(userId: string): void {
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      this.socket.emit('join_user_room', userId);
      console.log(`👤 Joined user room for user ${userId}`);
    }
  }

  // Join admin room for admin-specific events
  public joinAdminRoom(): void {
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      this.socket.emit('join_admin_room');
      console.log('👨‍💼 Joined admin room');
    }
  }

  // Subscribe to events
  public on<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void {
    if (typeof window !== 'undefined' && this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Unsubscribe from events
  public off<K extends keyof WebSocketEvents>(event: K, callback?: WebSocketEvents[K]): void {
    if (typeof window !== 'undefined' && this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Emit events (if needed)
  public emit(event: string, data: any): void {
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  // Get connection status
  public getConnectionStatus(): boolean {
    return typeof window !== 'undefined' && this.isConnected;
  }

  // Disconnect
  public disconnect(): void {
    if (typeof window !== 'undefined' && this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 WebSocket disconnected manually');
    }
  }

  // Reconnect manually
  public reconnect(): void {
    if (typeof window !== 'undefined') {
      this.disconnect();
      this.reconnectAttempts = 0;
      this.connect();
    }
  }

  // Chat-specific methods
  public sendChatMessage(messageId: string, text: string, customerId: string): void {
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      this.socket.emit('chat_message', {
        messageId,
        text,
        customerId,
        timestamp: new Date().toISOString()
      });
    }
  }

  public sendTypingStatus(customerId: string, isTyping: boolean): void {
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      this.socket.emit('typing_status', {
        customerId,
        isTyping,
        timestamp: new Date().toISOString()
      });
    }
  }

  public joinChatRoom(customerId: string): void {
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      this.socket.emit('join_chat_room', customerId);
    }
  }

  public leaveChatRoom(customerId: string): void {
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      this.socket.emit('leave_chat_room', customerId);
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
