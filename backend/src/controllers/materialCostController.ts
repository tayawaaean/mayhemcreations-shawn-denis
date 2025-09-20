import { Request, Response } from 'express'
import { MaterialCost } from '../models/materialCostModel'
import { logger } from '../utils/logger'

export const getMaterialCosts = async (req: Request, res: Response) => {
  try {
    const { isActive, search, sortBy = 'name', sortOrder = 'ASC' } = req.query

    const whereClause: any = {}
    
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true'
    }

    if (search) {
      whereClause.name = {
        [require('sequelize').Op.iLike]: `%${search}%`
      }
    }

    const orderClause = [[sortBy as string, sortOrder as string]] as any

    const materialCosts = await MaterialCost.findAll({
      where: whereClause,
      order: orderClause
    })

    logger.info(`Retrieved ${materialCosts.length} material costs`)

    return res.json({
      success: true,
      data: materialCosts,
      count: materialCosts.length
    })
  } catch (error) {
    logger.error('Error fetching material costs:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch material costs',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const getMaterialCostById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const materialCost = await MaterialCost.findByPk(id)

    if (!materialCost) {
      return res.status(404).json({
        success: false,
        message: 'Material cost not found'
      })
    }

    logger.info(`Retrieved material cost: ${materialCost.name}`)

    return res.json({
      success: true,
      data: materialCost
    })
  } catch (error) {
    logger.error('Error fetching material cost:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch material cost',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const createMaterialCost = async (req: Request, res: Response) => {
  try {
    const { name, cost, width, length, wasteFactor = 1.0, isActive = true } = req.body

    // Validate required fields
    if (!name || cost === undefined || width === undefined || length === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, cost, width, and length are required'
      })
    }

    // Check if material cost with same name already exists
    const existingMaterialCost = await MaterialCost.findOne({ where: { name } })
    if (existingMaterialCost) {
      return res.status(409).json({
        success: false,
        message: 'Material cost with this name already exists'
      })
    }

    const materialCost = await MaterialCost.create({
      name,
      cost: parseFloat(cost),
      width: parseFloat(width),
      length: parseFloat(length),
      wasteFactor: parseFloat(wasteFactor),
      isActive
    })

    logger.info(`Created material cost: ${materialCost.name}`)

    return res.status(201).json({
      success: true,
      data: materialCost,
      message: 'Material cost created successfully'
    })
  } catch (error) {
    logger.error('Error creating material cost:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to create material cost',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const updateMaterialCost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, cost, width, length, wasteFactor, isActive } = req.body

    const materialCost = await MaterialCost.findByPk(id)

    if (!materialCost) {
      return res.status(404).json({
        success: false,
        message: 'Material cost not found'
      })
    }

    // Check if name is being changed and if it conflicts with existing material cost
    if (name && name !== materialCost.name) {
      const existingMaterialCost = await MaterialCost.findOne({ 
        where: { name, id: { [require('sequelize').Op.ne]: id } }
      })
      if (existingMaterialCost) {
        return res.status(409).json({
          success: false,
          message: 'Material cost with this name already exists'
        })
      }
    }

    // Update fields
    if (name !== undefined) materialCost.name = name
    if (cost !== undefined) materialCost.cost = parseFloat(cost)
    if (width !== undefined) materialCost.width = parseFloat(width)
    if (length !== undefined) materialCost.length = parseFloat(length)
    if (wasteFactor !== undefined) materialCost.wasteFactor = parseFloat(wasteFactor)
    if (isActive !== undefined) materialCost.isActive = isActive

    await materialCost.save()

    logger.info(`Updated material cost: ${materialCost.name}`)

    return res.json({
      success: true,
      data: materialCost,
      message: 'Material cost updated successfully'
    })
  } catch (error) {
    logger.error('Error updating material cost:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update material cost',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const deleteMaterialCost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const materialCost = await MaterialCost.findByPk(id)

    if (!materialCost) {
      return res.status(404).json({
        success: false,
        message: 'Material cost not found'
      })
    }

    await materialCost.destroy()

    logger.info(`Deleted material cost: ${materialCost.name}`)

    return res.json({
      success: true,
      message: 'Material cost deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting material cost:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to delete material cost',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const toggleMaterialCostStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const materialCost = await MaterialCost.findByPk(id)

    if (!materialCost) {
      return res.status(404).json({
        success: false,
        message: 'Material cost not found'
      })
    }

    materialCost.isActive = !materialCost.isActive
    await materialCost.save()

    logger.info(`Toggled material cost status: ${materialCost.name} - ${materialCost.isActive ? 'Active' : 'Inactive'}`)

    return res.json({
      success: true,
      data: materialCost,
      message: `Material cost ${materialCost.isActive ? 'activated' : 'deactivated'} successfully`
    })
  } catch (error) {
    logger.error('Error toggling material cost status:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle material cost status',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
