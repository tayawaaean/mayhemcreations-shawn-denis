import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import Message from '../models/messageModel';
import { sequelize } from '../config/database';

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

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
        
        // Lookup user profile for enrichment
        let profile: any = null;
        try {
          const [rows] = await sequelize.query(
            'SELECT id, first_name as firstName, last_name as lastName, email FROM users WHERE id = ? LIMIT 1',
            { replacements: [customerId] }
          );
          profile = (rows as any)[0] || null;
        } catch (e) {
          logger.warn(`Could not fetch user profile for ${customerId}: ${(e as any).message}`);
        }

        // Notify admins that customer is online with identity if available
        this.io.to('admin_room').emit('chat_connected', {
          customerId,
          name: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null : null,
          email: profile?.email || null,
          timestamp: new Date().toISOString()
        });

        // Send recent chat history directly to this socket
        try {
          const rows = await Message.findAll({
            where: { customerId: Number(customerId) } as any,
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
        } catch (e) {
          logger.warn(`Failed to load chat history for ${customerId}: ${(e as any).message}`);
        }
      });

      // Handle chat room leaving
      socket.on('leave_chat_room', (customerId: string) => {
        socket.leave(`chat_${customerId}`);
        logger.info(`💬 Socket ${socket.id} left chat room for customer ${customerId}`);
        
        // Notify admins that customer is offline
        this.io.to('admin_room').emit('chat_disconnected', {
          customerId,
          timestamp: new Date().toISOString()
        });
      });

      // Admin can request chat history for a customer without joining their room
      socket.on('request_chat_history', async (data: { customerId: string; limit?: number }) => {
        const limit = data.limit && data.limit > 0 && data.limit <= 500 ? data.limit : 100;
        try {
          const rows = await Message.findAll({
            where: { customerId: Number(data.customerId) } as any,
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
      socket.on('chat_message', async (data: { messageId: string; text?: string; customerId: string; timestamp: string; type?: 'text' | 'image' | 'file'; attachment?: any }) => {
        logger.info(`💬 Chat message from ${socket.id} for customer ${data.customerId}: ${data.text}`);

        // Determine sender based on room membership
        const isAdmin = socket.rooms.has('admin_room');
        const sender: 'user' | 'admin' = isAdmin ? 'admin' : 'user';

        // Enrich with profile for admin consumers
        let profile: any = null;
        if (sender === 'user') {
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

        // Persist message
        try {
          const created = await Message.create({
            customerId: Number(data.customerId),
            sender,
            // Some older schemas require non-null text; default to empty string for attachments
            text: data.text ?? '',
            type: data.type ?? 'text',
            attachment: data.attachment ?? null,
          } as any);
          logger.info(`💾 Saved message ${created.id} for customer ${data.customerId} (type=${data.type ?? 'text'})`);
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
          email: profile?.email || null
        });
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
      socket.on('disconnect', () => {
        logger.info(`🔌 Client disconnected: ${socket.id}`);
        
        // Remove from connected users
        for (const [userId, socketIds] of this.connectedUsers.entries()) {
          if (socketIds.has(socket.id)) {
            socketIds.delete(socket.id);
            if (socketIds.size === 0) {
              this.connectedUsers.delete(userId);
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

  // Emit chat message to specific customer
  public emitChatMessage(customerId: string, messageData: any): void {
    // Notify the specific customer
    this.io.to(`chat_${customerId}`).emit('chat_message_received', {
      ...messageData,
      timestamp: new Date().toISOString()
    });

    // Notify admins
    this.io.to('admin_room').emit('chat_message_received', {
      ...messageData,
      customerId,
      timestamp: new Date().toISOString()
    });

    logger.info(`📢 Emitted chat message for customer ${customerId}`);
  }

  // Emit typing status
  public emitTypingStatus(customerId: string, isTyping: boolean, sender: 'user' | 'admin'): void {
    const eventName = sender === 'admin' ? 'admin_typing' : 'user_typing';
    
    if (sender === 'admin') {
      // Admin typing - notify customer
      this.io.to(`chat_${customerId}`).emit(eventName, {
        customerId,
        isTyping,
        timestamp: new Date().toISOString()
      });
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
