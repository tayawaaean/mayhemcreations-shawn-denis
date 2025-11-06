import { Router } from 'express'
import {
  getMaterialCosts,
  getMaterialCostById,
  createMaterialCost,
  updateMaterialCost,
  deleteMaterialCost,
  toggleMaterialCostStatus
} from '../controllers/materialCostController'
import { sessionAuthenticate, requireRole } from '../middlewares/auth'

const router = Router()

// Public routes (for frontend pricing calculations)
router.get('/', getMaterialCosts)
router.get('/:id', getMaterialCostById)

// Admin routes (require authentication and admin role)
router.post('/', sessionAuthenticate, requireRole(['admin']), createMaterialCost)
router.put('/:id', sessionAuthenticate, requireRole(['admin']), updateMaterialCost)
router.delete('/:id', sessionAuthenticate, requireRole(['admin']), deleteMaterialCost)
router.patch('/:id/toggle-status', sessionAuthenticate, requireRole(['admin']), toggleMaterialCostStatus)

export default router
