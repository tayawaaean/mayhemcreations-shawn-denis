import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { User, Role } from '../models';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';

/**
 * @swagger
 * components:
 *   schemas:
 *     UserListResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - type: object
 *                         properties:
 *                           role:
 *                             $ref: '#/components/schemas/Role'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     totalPages:
 *                       type: integer
 *                       example: 10
 * 
 *     UserDetailResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 user:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         role:
 *                           $ref: '#/components/schemas/Role'
 * 
 *     UserUpdateRequest:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: John
 *         lastName:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: Doe
 *         phone:
 *           type: string
 *           pattern: '^[\+]?[1-9][\d]{0,15}$'
 *           example: '+15551234567'
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           example: '1990-01-01'
 *         isEmailVerified:
 *           type: boolean
 *           example: true
 *         isPhoneVerified:
 *           type: boolean
 *           example: false
 *         isActive:
 *           type: boolean
 *           example: true
 *         roleId:
 *           type: integer
 *           example: 1
 * 
 *     UserStatsResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                   example: 150
 *                 activeUsers:
 *                   type: integer
 *                   example: 120
 *                 verifiedUsers:
 *                   type: integer
 *                   example: 100
 *                 newUsersThisMonth:
 *                   type: integer
 *                   example: 25
 *                 usersByRole:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       roleName:
 *                         type: string
 *                         example: customer
 *                       count:
 *                         type: integer
 *                         example: 100
 */

export class UserController {
  /**
   * @swagger
   * /api/v1/users:
   *   get:
   *     tags: [Users]
   *     summary: Get all users with pagination and filtering
   *     description: Retrieve a paginated list of users with optional filtering by status, role, and search query. Requires admin authentication.
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Number of users per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search by name, email, or phone
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, inactive, all]
   *           default: all
   *         description: Filter by user status
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *         description: Filter by role name
   *       - in: query
   *         name: verified
   *         schema:
   *           type: string
   *           enum: [email, phone, both, none, all]
   *           default: all
   *         description: Filter by verification status
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [createdAt, updatedAt, firstName, lastName, email, lastLoginAt]
   *           default: createdAt
   *         description: Sort field
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserListResponse'
   *             examples:
   *               success:
   *                 summary: Users list
   *                 value:
   *                   success: true
   *                   data:
   *                     users:
   *                       - id: 1
   *                         email: user@example.com
   *                         firstName: John
   *                         lastName: Doe
   *                         phone: '+15551234567'
   *                         isEmailVerified: true
   *                         isPhoneVerified: false
   *                         isActive: true
   *                         lastLoginAt: '2025-09-10T17:30:00.000Z'
   *                         createdAt: '2025-09-10T17:30:00.000Z'
   *                         updatedAt: '2025-09-10T17:30:00.000Z'
   *                         role:
   *                           id: 1
   *                           name: customer
   *                           displayName: Customer
   *                           permissions: ['products:read', 'orders:read']
   *                     pagination:
   *                       page: 1
   *                       limit: 10
   *                       total: 100
   *                       totalPages: 10
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       401:
   *         description: Not authenticated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = '1',
        limit = '10',
        search = '',
        status = 'all',
        role = '',
        verified = 'all',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 100);
      const offset = (pageNum - 1) * limitNum;

      // Build where conditions
      const whereConditions: any = {};
      
      // Status filter
      if (status !== 'all') {
        whereConditions.isActive = status === 'active';
      }

      // Search filter
      if (search) {
        whereConditions[Op.or] = [
          { firstName: { [Op.like]: `%${search}%` } },
          { lastName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } }
        ];
      }

      // Verification filter
      if (verified !== 'all') {
        switch (verified) {
          case 'email':
            whereConditions.isEmailVerified = true;
            break;
          case 'phone':
            whereConditions.isPhoneVerified = true;
            break;
          case 'both':
            whereConditions.isEmailVerified = true;
            whereConditions.isPhoneVerified = true;
            break;
          case 'none':
            whereConditions.isEmailVerified = false;
            whereConditions.isPhoneVerified = false;
            break;
        }
      }

      // Role filter
      let roleWhere = {};
      if (role) {
        roleWhere = { name: role };
      } else {
        // If no specific role is requested, exclude customers by default
        roleWhere = { name: { [Op.ne]: 'customer' } };
      }

      // Get total count
      const total = await User.count({
        where: whereConditions,
        include: [{ model: Role, as: 'role', where: roleWhere }]
      });

      // Get users with pagination
      const users = await User.findAll({
        where: whereConditions,
        include: [
          {
            model: Role,
            as: 'role',
            where: roleWhere,
            required: true
          }
        ],
        order: [[sortBy as string, sortOrder as string]],
        limit: limitNum,
        offset,
        attributes: { exclude: ['password'] } // Exclude password from response
      });

      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Get users error:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/users/{id}:
   *   get:
   *     tags: [Users]
   *     summary: Get user by ID
   *     description: Retrieve detailed information about a specific user. Requires admin authentication.
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: User ID
   *     responses:
   *       200:
   *         description: User retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserDetailResponse'
   *       401:
   *         description: Not authenticated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
        return;
      }

      const user = await User.findByPk(userId, {
        include: [{ model: Role, as: 'role' }],
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { user },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Get user by ID error:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/users/{id}:
   *   put:
   *     tags: [Users]
   *     summary: Update user information
   *     description: Update user information including personal details and status. Requires admin authentication.
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: User ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserUpdateRequest'
   *     responses:
   *       200:
   *         description: User updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserDetailResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Not authenticated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error('Validation failed for user update:', {
          errors: errors.array(),
          body: req.body,
          params: req.params
        });
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const userId = parseInt(id, 10);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
        return;
      }

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const {
        firstName,
        lastName,
        phone,
        dateOfBirth,
        isEmailVerified,
        isPhoneVerified,
        isActive,
        roleId
      } = req.body;

      // Update user
      await user.update({
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        phone: phone !== undefined ? phone : user.phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : user.dateOfBirth,
        isEmailVerified: isEmailVerified !== undefined ? isEmailVerified : user.isEmailVerified,
        isPhoneVerified: isPhoneVerified !== undefined ? isPhoneVerified : user.isPhoneVerified,
        isActive: isActive !== undefined ? isActive : user.isActive,
        roleId: roleId || user.roleId
      });

      // Fetch updated user with role
      const updatedUser = await User.findByPk(userId, {
        include: [{ model: Role, as: 'role' }],
        attributes: { exclude: ['password'] }
      });

      logger.info(`User updated: ${user.email}`, {
        userId: user.id,
        updatedBy: (req as any).user?.id
      });

      res.json({
        success: true,
        message: 'User updated successfully',
        data: { user: updatedUser },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Update user error:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/users/{id}/status:
   *   patch:
   *     tags: [Users]
   *     summary: Update user status
   *     description: Activate or deactivate a user account. Requires admin authentication.
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: User ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - isActive
   *             properties:
   *               isActive:
   *                 type: boolean
   *                 example: true
   *     responses:
   *       200:
   *         description: User status updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserDetailResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Not authenticated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const userId = parseInt(id, 10);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
        return;
      }

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'isActive must be a boolean value'
        });
        return;
      }

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      await user.update({ isActive });

      const updatedUser = await User.findByPk(userId, {
        include: [{ model: Role, as: 'role' }],
        attributes: { exclude: ['password'] }
      });

      logger.info(`User status updated: ${user.email} - ${isActive ? 'activated' : 'deactivated'}`, {
        userId: user.id,
        updatedBy: (req as any).user?.id
      });

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: { user: updatedUser },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Update user status error:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/users/stats:
   *   get:
   *     tags: [Users]
   *     summary: Get user statistics
   *     description: Retrieve user statistics and analytics. Requires admin authentication.
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: User statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserStatsResponse'
   *             examples:
   *               success:
   *                 summary: User statistics
   *                 value:
   *                   success: true
   *                   data:
   *                     totalUsers: 150
   *                     activeUsers: 120
   *                     verifiedUsers: 100
   *                     newUsersThisMonth: 25
   *                     usersByRole:
   *                       - roleName: customer
   *                         count: 100
   *                       - roleName: admin
   *                         count: 5
   *                       - roleName: support
   *                         count: 10
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       401:
   *         description: Not authenticated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static async getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get total users
      const totalUsers = await User.count();

      // Get active users
      const activeUsers = await User.count({ where: { isActive: true } });

      // Get verified users (both email and phone)
      const verifiedUsers = await User.count({
        where: {
          isEmailVerified: true,
          isPhoneVerified: true
        }
      });

      // Get new users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const newUsersThisMonth = await User.count({
        where: {
          createdAt: {
            [Op.gte]: startOfMonth
          }
        }
      });

      // Get users by role
      const usersByRole = await User.findAll({
        attributes: [
          'roleId',
          [sequelize.fn('COUNT', sequelize.col('User.id')), 'count']
        ],
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['name', 'displayName']
          }
        ],
        group: ['roleId', 'Role.id'],
        raw: false
      });

      const formattedUsersByRole = usersByRole.map((item: any) => ({
        roleName: item.role.name,
        roleDisplayName: item.role.displayName,
        count: parseInt(item.dataValues.count)
      }));

      res.json({
        success: true,
        data: {
          totalUsers,
          activeUsers,
          verifiedUsers,
          newUsersThisMonth,
          usersByRole: formattedUsersByRole
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Get user stats error:', error);
      next(error);
    }
  }
}
