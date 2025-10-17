import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import Message from '../models/messageModel';
import { sequelize } from '../config/database';
import { emailWebhookService } from './emailWebhookService';

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private userOnlineStatus: Map<string, boolean> = new Map(); // userId -> isOnline

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      },
      // Increase payload limit to support base64 image/file attachments (~10MB)
      maxHttpBufferSize: 10 * 1024 * 1024
    });

    this.setupEventHandlers();
    logger.info('🔌 WebSocket service initialized');
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`🔌 Client connected: ${socket.id}`);

      // Handle user authentication and room joining
      socket.on('join_user_room', (userId: string) => {
        socket.join(`user_${userId}`);
        
        // Track connected users
        if (!this.connectedUsers.has(userId)) {
          this.connectedUsers.set(userId, new Set());
        }
        this.connectedUsers.get(userId)!.add(socket.id);
        
        logger.info(`👤 User ${userId} joined their room`);
      });

      // Handle admin joining admin room
      socket.on('join_admin_room', async () => {
        socket.join('admin_room');
        logger.info(`👨‍💼 Admin joined admin room: ${socket.id}`);

        // Emit recent conversation threads to this admin
        try {
          const [rows] = await sequelize.query(`
            SELECT 
              m.customer_id AS customerId,
              m.text,
              m.sender,
              m.created_at AS timestamp,
              u.first_name AS firstName,
              u.last_name AS lastName,
              u.email AS email
            FROM messages m
            INNER JOIN (
              SELECT customer_id, MAX(created_at) AS max_created
              FROM messages
              GROUP BY customer_id
            ) lm ON lm.customer_id = m.customer_id AND lm.max_created = m.created_at
            LEFT JOIN users u ON u.id = m.customer_id
            ORDER BY timestamp DESC
            LIMIT 200
          `);

          const threads = (rows as any[]).map(r => ({
            customerId: String(r.customerId),
            lastMessage: {
              text: r.text,
              sender: r.sender,
              timestamp: new Date(r.timestamp).toISOString(),
            },
            name: `${r.firstName || ''} ${r.lastName || ''}`.trim() || null,
            email: r.email || null,
          }));

          socket.emit('chat_threads', { threads });
        } catch (e) {
          logger.warn(`Failed to load chat threads: ${(e as any).message}`);
        }
      });

      // Handle chat room joining
      socket.on('join_chat_room', async (customerId: string) => {
        socket.join(`chat_${customerId}`);
        logger.info(`💬 Socket ${socket.id} joined chat room for customer ${customerId}`);
        
        // Set user as online
        this.setUserOnlineStatus(customerId, true);
        
        // Check if this is a guest user
        const isGuest = String(customerId).startsWith('guest_');

        // Lookup user profile for enrichment (only for registered users)
        let profile: any = null;
        if (!isGuest) {
          try {
            const [rows] = await sequelize.query(
              'SELECT id, first_name as firstName, last_name as lastName, email FROM users WHERE id = ? LIMIT 1',
              { replacements: [customerId] }
            );
            profile = (rows as any)[0] || null;
          } catch (e) {
            logger.warn(`Could not fetch user profile for ${customerId}: ${(e as any).message}`);
          }
        } else {
          // For guest users, create a mock profile
          profile = {
            id: customerId,
            firstName: 'Guest',
            lastName: 'User',
            email: null
          };
        }

        // Notify admins that customer is online with identity if available
        this.io.to('admin_room').emit('chat_connected', {
          customerId,
          name: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null : null,
          email: profile?.email || null,
          timestamp: new Date().toISOString()
        });

        // Send webhook to email service for chat connection
        emailWebhookService.sendChatConnectedWebhook({
          customerId,
          name: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null : null,
          email: profile?.email || null
        });

        // Send recent chat history directly to this socket (supports both user IDs and guest IDs)
        try {
          const rows = await Message.findAll({
            where: { customerId: String(customerId) } as any, // Use string comparison for guest support
            order: [['createdAt', 'ASC']],
            limit: 100,
          });
          const messages = rows.map(r => ({
            id: r.id,
            text: r.text,
            sender: r.sender,
            timestamp: (r as any).createdAt as Date,
            type: (r as any).type,
            attachment: (r as any).attachment,
          }));
          socket.emit('chat_history', {
            customerId,
            messages,
          });
          logger.info(`📜 Loaded ${messages.length} messages for ${isGuest ? 'guest' : 'user'} ${customerId}`);
        } catch (e) {
          logger.warn(`Failed to load chat history for ${customerId}: ${(e as any).message}`);
        }
      });

      // Handle chat room leaving
      socket.on('leave_chat_room', async (customerId: string) => {
        socket.leave(`chat_${customerId}`);
        logger.info(`💬 Socket ${socket.id} left chat room for customer ${customerId}`);
        
        // Set user as offline
        this.setUserOnlineStatus(customerId, false);
        
        // Notify admins that customer is offline
        this.io.to('admin_room').emit('chat_disconnected', {
          customerId,
          timestamp: new Date().toISOString()
        });

        // Send conversation summary and check for unread messages
        await this.handleUserDisconnection(customerId);
      });

      // Admin can request chat history for a customer without joining their room
      socket.on('request_chat_history', async (data: { customerId: string; limit?: number }) => {
        const limit = data.limit && data.limit > 0 && data.limit <= 500 ? data.limit : 100;
        const isGuest = String(data.customerId).startsWith('guest_');
        try {
          const rows = await Message.findAll({
            where: { customerId: String(data.customerId) } as any, // Use string for guest support
            order: [['createdAt', 'ASC']],
            limit,
          });
          const messages = rows.map(r => ({
            id: r.id,
            text: r.text,
            sender: r.sender,
            timestamp: (r as any).createdAt as Date,
            type: (r as any).type,
            attachment: (r as any).attachment,
          }));
          socket.emit('chat_history', {
            customerId: data.customerId,
            messages,
          });
        } catch (e) {
          logger.warn(`Failed to load chat history for ${data.customerId}: ${(e as any).message}`);
        }
      });

      // Admin can request threads list on demand
      socket.on('request_chat_threads', async () => {
        try {
          const [rows] = await sequelize.query(`
            SELECT 
              m.customer_id AS customerId,
              m.text,
              m.sender,
              m.created_at AS timestamp,
              u.first_name AS firstName,
              u.last_name AS lastName,
              u.email AS email
            FROM messages m
            INNER JOIN (
              SELECT customer_id, MAX(created_at) AS max_created
              FROM messages
              GROUP BY customer_id
            ) lm ON lm.customer_id = m.customer_id AND lm.max_created = m.created_at
            LEFT JOIN users u ON u.id = m.customer_id
            ORDER BY timestamp DESC
            LIMIT 200
          `);
          const threads = (rows as any[]).map(r => ({
            customerId: String(r.customerId),
            lastMessage: {
              text: r.text,
              sender: r.sender,
              timestamp: new Date(r.timestamp).toISOString(),
            },
            name: `${r.firstName || ''} ${r.lastName || ''}`.trim() || null,
            email: r.email || null,
          }));
          socket.emit('chat_threads', { threads });
        } catch (e) {
          logger.warn(`Failed to load chat threads on demand: ${(e as any).message}`);
        }
      });

      // Handle chat messages (text or attachment)
      socket.on('chat_message', async (data: { messageId: string; text?: string; customerId: string; timestamp: string; type?: 'text' | 'image' | 'file'; attachment?: any; email?: string }) => {
        logger.info(`💬 Chat message from ${socket.id} for customer ${data.customerId}: ${data.text}`);

        // Determine sender based on room membership
        const isAdmin = socket.rooms.has('admin_room');
        const sender: 'user' | 'admin' = isAdmin ? 'admin' : 'user';

        // Check if this is a guest user
        const isGuest = String(data.customerId).startsWith('guest_');

        // Enrich with profile for admin consumers (only for registered users)
        let profile: any = null;
        if (sender === 'user' && !isGuest) {
          try {
            const [rows] = await sequelize.query(
              'SELECT id, first_name as firstName, last_name as lastName, email FROM users WHERE id = ? LIMIT 1',
              { replacements: [data.customerId] }
            );
            profile = (rows as any)[0] || null;
          } catch (e) {
            logger.warn(`Could not fetch user profile for ${data.customerId}: ${(e as any).message}`);
          }
        }

        // For guest users, create a mock profile with email if provided
        if (sender === 'user' && isGuest) {
          profile = {
            id: data.customerId,
            firstName: 'Guest',
            lastName: 'User',
            email: data.email || null
          };
        }

        // Persist message (supports both numeric user IDs and guest string IDs)
        try {
          const created = await Message.create({
            customerId: String(data.customerId), // Keep as string for guest support
            sender,
            text: data.text ?? '',
            type: data.type ?? 'text',
            attachment: data.attachment ?? null,
            isGuest, // Flag to identify guest messages
            email: isGuest ? data.email || null : null, // Store email for guest users
          } as any);
          logger.info(`💾 Saved message ${created.id} for ${isGuest ? 'guest' : 'user'} ${data.customerId} (type=${data.type ?? 'text'})${isGuest && data.email ? ` with email ${data.email}` : ''}`);
        } catch (e) {
          logger.warn(`Failed to persist chat message for ${data.customerId}: ${(e as any).message}`);
        }

        // Emit to both customer and admins with correct sender
        this.emitChatMessage(data.customerId, {
          messageId: data.messageId,
          text: data.text ?? null,
          sender,
          customerId: data.customerId,
          type: data.type ?? 'text',
          attachment: data.attachment ?? null,
          name: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null : null,
          email: profile?.email || data.email || null
        });

        // Send webhook to email service for notifications (only when user is offline)
        if (data.text && data.text.trim().length > 0) {
          const isUserCurrentlyOnline = this.isUserOnline(data.customerId);
          
          if (!isUserCurrentlyOnline) {
            logger.info(`📧 User ${data.customerId} is offline, sending email notification`);
            emailWebhookService.sendChatMessageWebhook({
              messageId: data.messageId,
              text: data.text,
              sender,
              customerId: data.customerId,
              type: data.type ?? 'text',
              attachment: data.attachment ?? null,
              name: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null : null,
              email: profile?.email || data.email || null
            });
          } else {
            logger.info(`📧 User ${data.customerId} is online, skipping email notification`);
          }
        }
      });

      // Handle typing status
      socket.on('typing_status', (data: { customerId: string; isTyping: boolean; timestamp: string }) => {
        logger.info(`⌨️ Typing status from ${socket.id} for customer ${data.customerId}: ${data.isTyping}`);
        
        // Determine sender type based on which room the socket is in
        const isAdmin = socket.rooms.has('admin_room');
        const sender = isAdmin ? 'admin' : 'user';
        
        this.emitTypingStatus(data.customerId, data.isTyping, sender);
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        logger.info(`🔌 Client disconnected: ${socket.id}`);
        
        // Find and handle disconnection for all users associated with this socket
        for (const [userId, socketIds] of this.connectedUsers.entries()) {
          if (socketIds.has(socket.id)) {
            socketIds.delete(socket.id);
            if (socketIds.size === 0) {
              this.connectedUsers.delete(userId);
              // Set user as offline and handle disconnection
              this.setUserOnlineStatus(userId, false);
              await this.handleUserDisconnection(userId);
            }
            break;
          }
        }
      });
    });
  }

  // Emit design review status update
  public emitDesignReviewUpdate(orderId: number, reviewData: any): void {
    this.io.to('admin_room').emit('design_review_updated', {
      orderId,
      reviewData,
      timestamp: new Date().toISOString()
    });
    logger.info(`📢 Emitted design review update for order ${orderId}`);
  }

  // Emit picture reply upload
  public emitPictureReplyUploaded(orderId: number, replyData: any): void {
    // Notify admins
    this.io.to('admin_room').emit('picture_reply_uploaded', {
      orderId,
      replyData,
      timestamp: new Date().toISOString()
    });

    // Notify the specific customer
    this.io.to(`user_${replyData.userId}`).emit('picture_reply_received', {
      orderId,
      replyData,
      timestamp: new Date().toISOString()
    });

    logger.info(`📢 Emitted picture reply upload for order ${orderId}`);
  }

  // Emit customer confirmation
  public emitCustomerConfirmation(orderId: number, confirmationData: any): void {
    // Notify admins
    this.io.to('admin_room').emit('customer_confirmation_received', {
      orderId,
      confirmationData,
      timestamp: new Date().toISOString()
    });

    // Notify the specific customer
    this.io.to(`user_${confirmationData.userId}`).emit('confirmation_submitted', {
      orderId,
      confirmationData,
      timestamp: new Date().toISOString()
    });

    logger.info(`📢 Emitted customer confirmation for order ${orderId}`);
  }

  // Emit order status change
  public emitOrderStatusChange(orderId: number, statusData: any): void {
    // Notify admins
    this.io.to('admin_room').emit('order_status_changed', {
      orderId,
      statusData,
      timestamp: new Date().toISOString()
    });

    // Notify the specific customer
    this.io.to(`user_${statusData.userId}`).emit('order_status_updated', {
      orderId,
      statusData,
      timestamp: new Date().toISOString()
    });

    logger.info(`📢 Emitted order status change for order ${orderId}`);
  }

  // Get connected users count
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get connected admins count
  public getConnectedAdminsCount(): number {
    return this.io.sockets.adapter.rooms.get('admin_room')?.size || 0;
  }

  // Check if user is online
  public isUserOnline(userId: string): boolean {
    return this.userOnlineStatus.get(userId) || false;
  }

  // Set user online status
  private setUserOnlineStatus(userId: string, isOnline: boolean): void {
    this.userOnlineStatus.set(userId, isOnline);
    logger.info(`👤 User ${userId} is now ${isOnline ? 'online' : 'offline'}`);
  }

  // Handle user disconnection - send conversation summary and check for unread messages
  private async handleUserDisconnection(customerId: string): Promise<void> {
    try {
      // Get recent conversation history
      const messages = await Message.findAll({
        where: { customerId: String(customerId) } as any,
        order: [['createdAt', 'DESC']],
        limit: 10, // Last 10 messages
      });

      if (messages.length === 0) {
        logger.info(`📧 No messages found for customer ${customerId}, skipping conversation summary`);
        return;
      }

      // Check if there are unread admin messages (admin messages that customer hasn't seen)
      const unreadAdminMessages = messages.filter(msg => 
        msg.sender === 'admin' && 
        new Date(msg.createdAt).getTime() > (Date.now() - 5 * 60 * 1000) // Last 5 minutes
      );

      // Get user profile for email
      const isGuest = String(customerId).startsWith('guest_');
      let profile: any = null;
      
      if (!isGuest) {
        try {
          const [rows] = await sequelize.query(
            'SELECT id, first_name as firstName, last_name as lastName, email FROM users WHERE id = ? LIMIT 1',
            { replacements: [customerId] }
          );
          profile = (rows as any)[0] || null;
        } catch (e) {
          logger.warn(`Could not fetch user profile for ${customerId}: ${(e as any).message}`);
        }
      }

      // Send conversation summary to customer if they have email
      const guestEmail = isGuest ? messages.find(msg => (msg as any).email)?.email : null;
      if (profile?.email || guestEmail) {
        const customerEmail = profile?.email || guestEmail;
        const customerName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Customer' : 'Guest User';
        
        await emailWebhookService.sendConversationSummaryWebhook({
          customerId,
          customerEmail,
          customerName,
          isGuest,
          messages: messages.slice(0, 5).map(msg => ({
            text: msg.text || '',
            sender: msg.sender,
            timestamp: msg.createdAt,
            type: (msg as any).type || 'text'
          }))
        });
      }

      // Send admin notification if there are unread messages
      if (unreadAdminMessages.length > 0) {
        await emailWebhookService.sendUnreadMessagesWebhook({
          customerId,
          customerName: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Customer' : 'Guest User',
          customerEmail: profile?.email || guestEmail || null,
          isGuest,
          unreadCount: unreadAdminMessages.length,
          lastMessage: unreadAdminMessages[0].text || 'No message content'
        });
      }

    } catch (error) {
      logger.error(`❌ Error handling user disconnection for ${customerId}:`, error);
    }
  }

  // Emit chat message to specific customer
  public emitChatMessage(customerId: string, messageData: any): void {
    const messagePayload = {
      ...messageData,
      timestamp: new Date().toISOString()
    };

    // Check if customer is actively in chat room
    const chatRoom = this.io.sockets.adapter.rooms.get(`chat_${customerId}`);
    const userRoom = this.io.sockets.adapter.rooms.get(`user_${customerId}`);
    
    const isInChatRoom = chatRoom && chatRoom.size > 0;
    const isInUserRoom = userRoom && userRoom.size > 0;

    if (isInChatRoom) {
      // Customer is actively chatting - send to chat room only
      this.io.to(`chat_${customerId}`).emit('chat_message_received', messagePayload);
      logger.info(`📢 Emitted chat message for customer ${customerId} to chat room (actively chatting)`);
    } else if (isInUserRoom) {
      // Customer is logged in but not actively chatting - send to user room for notification
      this.io.to(`user_${customerId}`).emit('chat_message_received', messagePayload);
      logger.info(`📢 Emitted chat message for customer ${customerId} to user room (notification)`);
    } else {
      // Customer is not connected - still emit to user room in case they reconnect
      this.io.to(`user_${customerId}`).emit('chat_message_received', messagePayload);
      logger.info(`📢 Emitted chat message for customer ${customerId} to user room (offline notification)`);
    }

    // Notify admins
    this.io.to('admin_room').emit('chat_message_received', {
      ...messagePayload,
      customerId
    });
  }

  // Emit typing status
  public emitTypingStatus(customerId: string, isTyping: boolean, sender: 'user' | 'admin'): void {
    const eventName = sender === 'admin' ? 'admin_typing' : 'user_typing';
    
    if (sender === 'admin') {
      // Admin typing - notify customer based on their current state
      const typingPayload = {
        customerId,
        isTyping,
        timestamp: new Date().toISOString()
      };
      
      // Check if customer is actively in chat room
      const chatRoom = this.io.sockets.adapter.rooms.get(`chat_${customerId}`);
      const isInChatRoom = chatRoom && chatRoom.size > 0;
      
      if (isInChatRoom) {
        // Customer is actively chatting - send to chat room only
        this.io.to(`chat_${customerId}`).emit(eventName, typingPayload);
      } else {
        // Customer is not actively chatting - send to user room for notification
        this.io.to(`user_${customerId}`).emit(eventName, typingPayload);
      }
    } else {
      // User typing - notify admins
      this.io.to('admin_room').emit(eventName, {
        customerId,
        isTyping,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`📢 Emitted typing status for customer ${customerId}: ${isTyping}`);
  }

  // Emit chat connection status
  public emitChatConnection(customerId: string, connected: boolean): void {
    const eventName = connected ? 'chat_connected' : 'chat_disconnected';
    
    // Notify admins
    this.io.to('admin_room').emit(eventName, {
      customerId,
      timestamp: new Date().toISOString()
    });

    logger.info(`📢 Emitted chat connection status for customer ${customerId}: ${connected}`);
  }

  // Emit inventory update to all connected clients
  public emitInventoryUpdate(productId: number, variantId: number | null, updateData: any): void {
    const inventoryPayload = {
      productId,
      variantId,
      ...updateData,
      timestamp: new Date().toISOString()
    };

    // Notify all connected clients about inventory changes
    this.io.emit('inventory_updated', inventoryPayload);
    
    // Also notify specific rooms for targeted updates
    this.io.to('admin_room').emit('inventory_updated', inventoryPayload);
    this.io.to('ecommerce_room').emit('inventory_updated', inventoryPayload);

    logger.info(`📦 Emitted inventory update for product ${productId}${variantId ? ` variant ${variantId}` : ''}`);
  }

  // Emit stock level alerts
  public emitStockAlert(productId: number, variantId: number | null, alertData: any): void {
    const alertPayload = {
      productId,
      variantId,
      ...alertData,
      timestamp: new Date().toISOString()
    };

    // Notify admins about stock alerts
    this.io.to('admin_room').emit('stock_alert', alertPayload);

    logger.info(`⚠️ Emitted stock alert for product ${productId}${variantId ? ` variant ${variantId}` : ''}`);
  }

  // Emit product status changes
  public emitProductStatusChange(productId: number, statusData: any): void {
    const statusPayload = {
      productId,
      ...statusData,
      timestamp: new Date().toISOString()
    };

    // Notify all clients about product status changes
    this.io.emit('product_status_changed', statusPayload);
    this.io.to('admin_room').emit('product_status_changed', statusPayload);
    this.io.to('ecommerce_room').emit('product_status_changed', statusPayload);

    logger.info(`📦 Emitted product status change for product ${productId}`);
  }

  /**
   * Generic method to emit events to admin room
   */
  public emitToAdminRoom(eventName: string, data: any): void {
    this.io.to('admin_room').emit(eventName, data);
    logger.info(`📡 Emitted ${eventName} to admin room`);
  }
}

// Export singleton instance
let webSocketService: WebSocketService | null = null;

export const initializeWebSocket = (server: HttpServer): WebSocketService => {
  if (!webSocketService) {
    webSocketService = new WebSocketService(server);
  }
  return webSocketService;
};

export const getWebSocketService = (): WebSocketService | null => {
  return webSocketService;
};
