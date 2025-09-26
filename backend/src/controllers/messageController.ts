import { Request, Response } from 'express';
import { Message, User } from '../models';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

/**
 * Get chat messages for a specific customer
 */
export const getMessagesByCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const { limit = 100 } = req.query;

    const messages = await Message.findAll({
      where: { customerId: Number(customerId) },
      order: [['createdAt', 'ASC']],
      limit: Number(limit),
    });

    logger.info(`Retrieved ${messages.length} messages for customer ${customerId}`);

    res.json({
      success: true,
      data: messages,
      message: 'Messages retrieved successfully'
    });

  } catch (error) {
    logger.error('Error fetching messages by customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Get all chat threads (conversations) for admin with customer details
 */
export const getChatThreads = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get unique customers with their latest message and customer details
    const [threads] = await Message.sequelize!.query(`
      SELECT 
        m.customer_id as customerId,
        m.text,
        m.type,
        m.sender,
        m.created_at as timestamp,
        u.first_name as firstName,
        u.last_name as lastName,
        u.email,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as name
      FROM (
        SELECT 
          customer_id,
          text,
          type,
          sender,
          created_at,
          ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) as rn
        FROM messages
      ) m
      LEFT JOIN users u ON m.customer_id = u.id
      WHERE m.rn = 1
      ORDER BY m.created_at DESC
    `);

    logger.info(`Retrieved ${threads.length} chat threads with customer details`);

    res.json({
      success: true,
      data: threads,
      message: 'Chat threads retrieved successfully'
    });

  } catch (error) {
    logger.error('Error fetching chat threads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat threads',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Get recent messages across all customers with customer details
 */
export const getRecentMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 50 } = req.query;

    const messages = await Message.findAll({
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
    });

    // Transform messages to include customer details
    const messagesWithCustomerDetails = messages.map((msg) => {
      const m: any = msg as any; // include-associated data access with safe cast
      const customer = m.customer || null;
      return {
        id: msg.id,
        customerId: msg.customerId,
        sender: msg.sender,
        text: msg.text,
        type: (msg as any).type,
        attachment: (msg as any).attachment,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        customer: customer
          ? {
              id: customer.id,
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || null,
            }
          : null,
      };
    });

    logger.info(`Retrieved ${messages.length} recent messages with customer details`);

    res.json({
      success: true,
      data: messagesWithCustomerDetails,
      message: 'Recent messages retrieved successfully'
    });

  } catch (error) {
    logger.error('Error fetching recent messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent messages',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
