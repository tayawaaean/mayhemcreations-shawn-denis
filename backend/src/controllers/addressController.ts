/**
 * Address Controller
 * Handles address management for admin panel
 */

import { Request, Response } from 'express';
import { Address } from '../models/addressModel';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
}

/**
 * Get all addresses
 * @route GET /api/v1/admin/addresses
 * @access Private (Admin only)
 */
export const getAllAddresses = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { type } = req.query;
    
    let addresses;
    if (type && ['origin', 'return', 'warehouse'].includes(type as string)) {
      addresses = await Address.getByType(type as 'origin' | 'return' | 'warehouse');
    } else {
      addresses = await Address.findAll({
        order: [['type', 'ASC'], ['is_default', 'DESC'], ['name', 'ASC']]
      });
    }

    res.status(200).json({
      success: true,
      data: addresses,
      message: 'Addresses retrieved successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('Addresses retrieved', {
      userId: req.user?.id,
      count: addresses.length,
      type: type || 'all'
    });
  } catch (error: any) {
    logger.error('Error retrieving addresses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve addresses',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get address by ID
 * @route GET /api/v1/admin/addresses/:id
 * @access Private (Admin only)
 */
export const getAddressById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const address = await Address.findByPk(id);

    if (!address) {
      res.status(404).json({
        success: false,
        message: 'Address not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: address,
      message: 'Address retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error retrieving address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve address',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Create new address
 * @route POST /api/v1/admin/addresses
 * @access Private (Admin only)
 */
export const createAddress = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      type,
      is_default,
      contact_name,
      company_name,
      phone,
      email,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      residential_indicator,
      notes
    } = req.body;

    // Validate required fields
    if (!name || !type || !contact_name || !address_line1 || !city || !state || !postal_code) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // If this is being set as default, unset other defaults of the same type
    if (is_default) {
      await Address.update(
        { is_default: false },
        { where: { type, is_default: true } }
      );
    }

    const address = await Address.create({
      name,
      type,
      is_default: is_default || false,
      contact_name,
      company_name,
      phone,
      email,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country: country || 'US',
      residential_indicator: residential_indicator || 'no',
      notes
    });

    res.status(201).json({
      success: true,
      data: address,
      message: 'Address created successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('Address created', {
      userId: req.user?.id,
      addressId: address.id,
      type: address.type
    });
  } catch (error: any) {
    logger.error('Error creating address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create address',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update address
 * @route PUT /api/v1/admin/addresses/:id
 * @access Private (Admin only)
 */
export const updateAddress = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      is_default,
      contact_name,
      company_name,
      phone,
      email,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      residential_indicator,
      notes
    } = req.body;

    const address = await Address.findByPk(id);
    if (!address) {
      res.status(404).json({
        success: false,
        message: 'Address not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // If this is being set as default, unset other defaults of the same type
    if (is_default && !address.is_default) {
      await Address.update(
        { is_default: false },
        { where: { type: address.type, is_default: true } }
      );
    }

    await address.update({
      name,
      type,
      is_default: is_default || false,
      contact_name,
      company_name,
      phone,
      email,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country: country || 'US',
      residential_indicator: residential_indicator || 'no',
      notes
    });

    res.status(200).json({
      success: true,
      data: address,
      message: 'Address updated successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('Address updated', {
      userId: req.user?.id,
      addressId: address.id,
      type: address.type
    });
  } catch (error: any) {
    logger.error('Error updating address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update address',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete address
 * @route DELETE /api/v1/admin/addresses/:id
 * @access Private (Admin only)
 */
export const deleteAddress = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const address = await Address.findByPk(id);

    if (!address) {
      res.status(404).json({
        success: false,
        message: 'Address not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Don't allow deleting the default address
    if (address.is_default) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete default address. Set another address as default first.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await address.destroy();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('Address deleted', {
      userId: req.user?.id,
      addressId: address.id,
      type: address.type
    });
  } catch (error: any) {
    logger.error('Error deleting address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Set default address
 * @route PUT /api/v1/admin/addresses/:id/set-default
 * @access Private (Admin only)
 */
export const setDefaultAddress = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const address = await Address.findByPk(id);

    if (!address) {
      res.status(404).json({
        success: false,
        message: 'Address not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Unset other defaults of the same type
    await Address.update(
      { is_default: false },
      { where: { type: address.type, is_default: true } }
    );

    // Set this address as default
    await address.update({ is_default: true });

    res.status(200).json({
      success: true,
      data: address,
      message: 'Default address updated successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('Default address updated', {
      userId: req.user?.id,
      addressId: address.id,
      type: address.type
    });
  } catch (error: any) {
    logger.error('Error setting default address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default address',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get default origin address (Public)
 * @route GET /api/v1/addresses/public/origin
 * @access Public (No authentication required)
 */
export const getPublicOriginAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const address = await Address.getDefaultOrigin();

    if (!address) {
      res.status(404).json({
        success: false,
        message: 'No default origin address found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: address,
      message: 'Default origin address retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error retrieving public origin address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve default origin address',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get default origin address
 * @route GET /api/v1/admin/addresses/default/origin
 * @access Private (Admin only)
 */
export const getDefaultOriginAddress = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const address = await Address.getDefaultOrigin();

    if (!address) {
      res.status(404).json({
        success: false,
        message: 'No default origin address found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: address,
      message: 'Default origin address retrieved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error retrieving default origin address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve default origin address',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

export default {
  getAllAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultOriginAddress
};
