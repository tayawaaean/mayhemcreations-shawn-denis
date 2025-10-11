/**
 * Stock Service
 * Handles stock deduction for successful orders
 */

import { logger } from '../utils/logger';
import { sequelize } from '../config/database';

/**
 * Deduct stock from product variants after successful payment
 * @param orderId - The order review ID
 * @returns Promise<boolean> - Success status
 */
export const deductStockForOrder = async (orderId: number): Promise<boolean> => {
  try {
    logger.info(`📦 Deducting stock for order ${orderId}...`);

    // Fetch the order details including order_data
    const [orderResult] = await sequelize.query(`
      SELECT id, user_id, order_data, status
      FROM order_reviews 
      WHERE id = ?
    `, {
      replacements: [orderId]
    });

    if (!Array.isArray(orderResult) || orderResult.length === 0) {
      logger.warn(`Order ${orderId} not found for stock deduction`);
      return false;
    }

    const order = orderResult[0] as any;
    
    // Parse order_data JSON
    let items: any[] = [];
    try {
      items = typeof order.order_data === 'string' ? JSON.parse(order.order_data) : order.order_data;
    } catch (error) {
      logger.error(`Failed to parse order_data for order ${orderId}:`, error);
      return false;
    }

    if (!Array.isArray(items) || items.length === 0) {
      logger.warn(`No items found in order ${orderId}`);
      return true; // Return true since there's nothing to deduct
    }

    // Process each item and deduct stock
    for (const item of items) {
      const productId = item.productId;
      const quantity = item.quantity || 1;
      // Check both item.customization.selectedVariant and direct item.selectedVariant
      const variantId = item.customization?.selectedVariant?.id || item.selectedVariant?.id || null;

      // Skip custom embroidery items (they don't have physical stock)
      if (productId === 'custom-embroidery' || !productId) {
        logger.info(`Skipping stock deduction for custom embroidery item`);
        continue;
      }

      try {
        if (variantId) {
          // Deduct stock from specific variant
          const [updateResult] = await sequelize.query(`
            UPDATE variants 
            SET stock = GREATEST(stock - ?, 0),
                updated_at = NOW()
            WHERE id = ? AND stock >= ?
          `, {
            replacements: [quantity, variantId, quantity]
          });

          const rowsAffected = (updateResult as any).affectedRows || 0;
          
          if (rowsAffected > 0) {
            logger.info(`✅ Deducted ${quantity} from variant ${variantId} for order ${orderId}`);
          } else {
            logger.warn(`⚠️ Could not deduct stock from variant ${variantId} - insufficient stock or variant not found`);
          }
        } else {
          // Deduct stock from product's first available variant (fallback)
          const [variantResult] = await sequelize.query(`
            SELECT id, stock
            FROM variants
            WHERE product_id = ?
            ORDER BY stock DESC
            LIMIT 1
          `, {
            replacements: [productId]
          });

          if (Array.isArray(variantResult) && variantResult.length > 0) {
            const variant = variantResult[0] as any;
            
            if (variant.stock >= quantity) {
              await sequelize.query(`
                UPDATE variants 
                SET stock = stock - ?,
                    updated_at = NOW()
                WHERE id = ?
              `, {
                replacements: [quantity, variant.id]
              });

              logger.info(`✅ Deducted ${quantity} from product ${productId} variant ${variant.id} for order ${orderId}`);
            } else {
              logger.warn(`⚠️ Insufficient stock for product ${productId} - needed ${quantity}, available ${variant.stock}`);
            }
          } else {
            logger.warn(`⚠️ No variants found for product ${productId}`);
          }
        }
      } catch (itemError) {
        logger.error(`Error deducting stock for item in order ${orderId}:`, {
          productId,
          variantId,
          quantity,
          error: itemError
        });
        // Continue processing other items even if one fails
      }
    }

    logger.info(`✅ Stock deduction completed for order ${orderId}`);
    return true;

  } catch (error) {
    logger.error(`Error deducting stock for order ${orderId}:`, error);
    return false;
  }
};

/**
 * Restore stock for canceled or refunded orders
 * @param orderId - The order review ID
 * @returns Promise<boolean> - Success status
 */
export const restoreStockForOrder = async (orderId: number): Promise<boolean> => {
  try {
    logger.info(`📦 Restoring stock for order ${orderId}...`);

    // Fetch the order details including order_data
    const [orderResult] = await sequelize.query(`
      SELECT id, user_id, order_data, status
      FROM order_reviews 
      WHERE id = ?
    `, {
      replacements: [orderId]
    });

    if (!Array.isArray(orderResult) || orderResult.length === 0) {
      logger.warn(`Order ${orderId} not found for stock restoration`);
      return false;
    }

    const order = orderResult[0] as any;
    
    // Parse order_data JSON
    let items: any[] = [];
    try {
      items = typeof order.order_data === 'string' ? JSON.parse(order.order_data) : order.order_data;
    } catch (error) {
      logger.error(`Failed to parse order_data for order ${orderId}:`, error);
      return false;
    }

    if (!Array.isArray(items) || items.length === 0) {
      logger.warn(`No items found in order ${orderId}`);
      return true;
    }

    // Process each item and restore stock
    for (const item of items) {
      const productId = item.productId;
      const quantity = item.quantity || 1;
      // Check both item.customization.selectedVariant and direct item.selectedVariant
      const variantId = item.customization?.selectedVariant?.id || item.selectedVariant?.id || null;

      // Skip custom embroidery items
      if (productId === 'custom-embroidery' || !productId) {
        continue;
      }

      try {
        if (variantId) {
          // Restore stock to specific variant
          await sequelize.query(`
            UPDATE variants 
            SET stock = stock + ?,
                updated_at = NOW()
            WHERE id = ?
          `, {
            replacements: [quantity, variantId]
          });

          logger.info(`✅ Restored ${quantity} to variant ${variantId} for order ${orderId}`);
        } else {
          // Restore stock to product's first variant (fallback)
          const [variantResult] = await sequelize.query(`
            SELECT id
            FROM variants
            WHERE product_id = ?
            LIMIT 1
          `, {
            replacements: [productId]
          });

          if (Array.isArray(variantResult) && variantResult.length > 0) {
            const variant = variantResult[0] as any;
            
            await sequelize.query(`
              UPDATE variants 
              SET stock = stock + ?,
                  updated_at = NOW()
              WHERE id = ?
            `, {
              replacements: [quantity, variant.id]
            });

            logger.info(`✅ Restored ${quantity} to product ${productId} variant ${variant.id} for order ${orderId}`);
          }
        }
      } catch (itemError) {
        logger.error(`Error restoring stock for item in order ${orderId}:`, itemError);
      }
    }

    logger.info(`✅ Stock restoration completed for order ${orderId}`);
    return true;

  } catch (error) {
    logger.error(`Error restoring stock for order ${orderId}:`, error);
    return false;
  }
};

