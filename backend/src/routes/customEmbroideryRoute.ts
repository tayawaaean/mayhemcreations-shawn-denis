import { Router } from 'express'
import { CustomEmbroideryController } from '../controllers/customEmbroideryController'
import { hybridAuthenticate } from '../middlewares/auth'

const router = Router()

// Create a new custom embroidery order
router.post('/', hybridAuthenticate, CustomEmbroideryController.createOrder)

// Get user's custom embroidery orders
router.get('/my-orders', hybridAuthenticate, CustomEmbroideryController.getUserOrders)

// Get all orders (admin only - you can add admin middleware later)
router.get('/', hybridAuthenticate, CustomEmbroideryController.getAllOrders)

// Get a specific order by ID
router.get('/:id', hybridAuthenticate, CustomEmbroideryController.getOrderById)

// Update order status (admin only)
router.patch('/:id/status', hybridAuthenticate, CustomEmbroideryController.updateOrderStatus)

// Delete an order
router.delete('/:id', hybridAuthenticate, CustomEmbroideryController.deleteOrder)

export default router
