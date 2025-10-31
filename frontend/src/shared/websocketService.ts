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
  
  // Refund events
  refund_rejected: (data: { refundId: number; orderId: number; orderNumber: string; refundAmount: number; rejectionReason: string; requestedReason: string; timestamp: string }) => void;
  
  // Chat events
  chat_message_received: (data: { messageId: string; text?: string | null; sender: 'user' | 'admin'; customerId: string; timestamp: string; isTyping?: boolean; type?: 'text' | 'image' | 'file'; attachment?: any }) => void;
  chat_message_sent: (data: { messageId: string; text: string; sender: 'user' | 'admin'; customerId: string; timestamp: string }) => void;
  admin_typing: (data: { customerId: string; isTyping: boolean }) => void;
  user_typing: (data: { customerId: string; isTyping: boolean }) => void;
  chat_connected: (data: { customerId: string; timestamp: string }) => void;
  chat_disconnected: (data: { customerId: string; timestamp: string }) => void;
  chat_history: (data: { customerId: string; messages: { id: number; text: string; sender: 'user' | 'admin'; timestamp: string }[] }) => void;
  admin_status_changed: (data: { isOnline: boolean; timestamp: string }) => void; // New: Admin status events
  
  // Inventory events
  inventory_updated: (data: { productId: number; variantId?: number | null; stock?: number; totalProductStock?: number; price?: number; status?: string; timestamp: string }) => void;
  stock_alert: (data: { productId: number; variantId?: number | null; stockLevel: string; message: string; timestamp: string }) => void;
  product_status_changed: (data: { productId: number; status: string; timestamp: string }) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Track desired room memberships to survive reconnects
  private desiredUserId: string | null = null;
  private wantsAdminRoom = false;
  private desiredChatRooms: Set<string> = new Set();

  constructor() {
    // Don't auto-connect - wait for explicit connection request
    // This allows for lazy loading of WebSocket connections
  }

  /**
   * Public method to initiate WebSocket connection
   * Only connects if not already connected or connecting
   */
  public ensureConnection(): void {
    if (typeof window === 'undefined') return;
    
    if (!this.socket || !this.isConnected) {
      // Prevent multiple simultaneous connection attempts
      if (this.socket && !this.isConnected) {
        // Connection already in progress
        return;
      }
      this.connect();
    }
  }

  private connect(): void {
    // Determine server URL based on environment
    let serverUrl: string;
    
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Development: use direct backend URL for WebSocket connections
        serverUrl = 'http://localhost:5001';
      } else {
        // Production: WebSocket is proxied through nginx via /socket.io/
        // Use same origin - nginx will proxy to backend
        serverUrl = `${protocol}//${hostname}${window.location.port ? `:${window.location.port}` : ''}`;
      }
    } else {
      // SSR fallback - should not happen in this app
      serverUrl = 'http://localhost:5001';
    }
    
    // Attempt connection to backend WebSocket server
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Re-join desired rooms after (re)connect
      if (this.desiredUserId) {
        // join with ack so we can debug failures
        this.socket!.emit('join_user_room', this.desiredUserId, (ack: { ok: boolean; error?: string }) => {
          if (!ack?.ok) {
            // silently fail; hook will surface via snackbar
          }
        });
      }
      if (this.wantsAdminRoom) {
        this.socket!.emit('join_admin_room', (ack: { ok: boolean; error?: string }) => {
          if (!ack?.ok) {
            // no-op; consumer hooks can notify
          }
        });
      }
      if (this.desiredChatRooms.size > 0) {
        this.desiredChatRooms.forEach((customerId) => {
          this.socket!.emit('join_chat_room', customerId, (ack: { ok: boolean; error?: string }) => {
            if (!ack?.ok) {
              // no-op
            }
          });
        });
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      this.isConnected = false;
      this.handleReconnect();
    });

    // Reconnect lifecycle for better resilience
    this.socket.on('reconnect_attempt', (attempt) => {
      // track attempts; backoff handled in handleReconnect as well
    });
    this.socket.on('reconnect_error', () => {
      // keep trying until max
    });
    this.socket.on('reconnect_failed', () => {
      // give up; consumer should surface to UI
      this.isConnected = false;
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Add jitter (±20%) to reduce thundering herd on the server
      const base = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      const jitter = base * (Math.random() * 0.4 - 0.2);
      const delay = Math.max(500, Math.min(base + jitter, 30000));
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      // Stop trying; consumer can prompt the user
    }
  }

  // Join user room for customer-specific events
  public joinUserRoom(userId: string): void {
    this.desiredUserId = userId;
    this.ensureConnection();
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      this.socket.emit('join_user_room', userId, () => {});
    }
  }

  // Join admin room for admin-specific events
  public joinAdminRoom(): void {
    this.wantsAdminRoom = true;
    this.ensureConnection();
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      this.socket.emit('join_admin_room', () => {});
    }
  }

  // Subscribe to events
  public on<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void {
    this.ensureConnection();
    if (typeof window !== 'undefined' && this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  // Unsubscribe from events
  public off<K extends keyof WebSocketEvents>(event: K, callback?: WebSocketEvents[K]): void {
    if (typeof window !== 'undefined' && this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  // Emit events (if needed)
  public emit(event: string, data: any): void {
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      // use ack to detect failures; ignore callback result here
      this.socket.emit(event, data, () => {});
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
      }, () => {});
    }
  }

  public sendChatMessageWithEmail(messageId: string, text: string, customerId: string, email: string): void {
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      this.socket.emit('chat_message', {
        messageId,
        text,
        customerId,
        email, // Include email for guest users
        timestamp: new Date().toISOString()
      }, () => {});
    }
  }

  public sendChatAttachment(messageId: string, customerId: string, payload: { type: 'image' | 'file'; attachment: any; text?: string }): void {
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      this.socket.emit('chat_message', {
        messageId,
        customerId,
        type: payload.type,
        attachment: payload.attachment,
        text: payload.text ?? null,
        timestamp: new Date().toISOString()
      }, () => {});
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
    this.desiredChatRooms.add(customerId);
    this.ensureConnection();
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      this.socket.emit('join_chat_room', customerId, () => {});
    }
  }

  public leaveChatRoom(customerId: string): void {
    this.desiredChatRooms.delete(customerId);
    if (typeof window !== 'undefined' && this.socket && this.isConnected) {
      this.socket.emit('leave_chat_room', customerId, () => {});
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
