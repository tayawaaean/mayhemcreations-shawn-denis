import { Router } from 'express'
import { CustomEmbroideryController } from '../controllers/customEmbroideryController'
import { sessionAuthenticate } from '../middlewares/auth'

const router = Router()

// Create a new custom embroidery order
router.post('/', sessionAuthenticate, CustomEmbroideryController.createOrder)

// Get user's custom embroidery orders
router.get('/my-orders', sessionAuthenticate, CustomEmbroideryController.getUserOrders)

// Get all orders (admin only - you can add admin middleware later)
router.get('/', sessionAuthenticate, CustomEmbroideryController.getAllOrders)

// Get a specific order by ID
router.get('/:id', sessionAuthenticate, CustomEmbroideryController.getOrderById)

// Update order status (admin only)
router.patch('/:id/status', sessionAuthenticate, CustomEmbroideryController.updateOrderStatus)

// Delete an order
router.delete('/:id', sessionAuthenticate, CustomEmbroideryController.deleteOrder)

export default router
