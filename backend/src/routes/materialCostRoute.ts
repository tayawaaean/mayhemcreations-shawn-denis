import { Router } from 'express'
import {
  getMaterialCosts,
  getMaterialCostById,
  createMaterialCost,
  updateMaterialCost,
  deleteMaterialCost,
  toggleMaterialCostStatus
} from '../controllers/materialCostController'
import { authenticate } from '../middlewares/auth'
import { authorize } from '../middlewares/auth'

const router = Router()

// Public routes (for frontend pricing calculations)
router.get('/', getMaterialCosts)
router.get('/:id', getMaterialCostById)

// Admin routes (require authentication and admin role)
router.post('/', authenticate, authorize('admin'), createMaterialCost)
router.put('/:id', authenticate, authorize('admin'), updateMaterialCost)
router.delete('/:id', authenticate, authorize('admin'), deleteMaterialCost)
router.patch('/:id/toggle-status', authenticate, authorize('admin'), toggleMaterialCostStatus)

export default router
