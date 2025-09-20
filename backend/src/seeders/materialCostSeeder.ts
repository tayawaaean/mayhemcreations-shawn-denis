import { MaterialCost } from '../models/materialCostModel'
import { logger } from '../utils/logger'

export const seedMaterialCosts = async (): Promise<void> => {
  try {
    logger.info('🌱 Starting material costs seeding...')

    // Clear existing material costs
    await clearMaterialCosts()

    const materialCostsData = [
      {
        name: 'Fabric',
        cost: 34.00,
        width: 30.00,
        length: 36.00,
        wasteFactor: 1.5,
        isActive: true
      },
      {
        name: 'Patch Attach',
        cost: 100.00,
        width: 9.00,
        length: 360.00,
        wasteFactor: 1.5,
        isActive: true
      },
      {
        name: 'Thread',
        cost: 4.00,
        width: 0.00,
        length: 5000.00,
        wasteFactor: 1.2,
        isActive: true
      },
      {
        name: 'Bobbin',
        cost: 50.00,
        width: 0.00,
        length: 35000.00,
        wasteFactor: 1.2,
        isActive: true
      },
      {
        name: 'Cut-Away Stabilizer',
        cost: 180.00,
        width: 18.00,
        length: 3600.00,
        wasteFactor: 1.5,
        isActive: true
      },
      {
        name: 'Wash-Away Stabilizer',
        cost: 60.00,
        width: 15.00,
        length: 900.00,
        wasteFactor: 1.5,
        isActive: true
      }
    ]

    const createdMaterialCosts = []
    for (const materialData of materialCostsData) {
      const materialCost = await MaterialCost.create(materialData)
      createdMaterialCosts.push(materialCost)
      logger.info(`✅ Created material cost: ${materialCost.name}`)
    }

    logger.info(`🎉 Material costs seeding completed! Created ${createdMaterialCosts.length} material costs.`)

    // Log summary
    logger.info('📊 Material Costs Summary:')
    createdMaterialCosts.forEach(material => {
      logger.info(`   • ${material.name}: $${material.cost} (${material.width}" × ${material.length}", Waste: ${material.wasteFactor}x)`)
    })

  } catch (error) {
    logger.error('❌ Error seeding material costs:', error)
    throw error
  }
}

export const clearMaterialCosts = async (): Promise<void> => {
  try {
    logger.info('🧹 Clearing material costs...')
    const deletedCount = await MaterialCost.destroy({ where: {} })
    logger.info(`✅ Cleared ${deletedCount} material costs`)
  } catch (error) {
    logger.error('❌ Error clearing material costs:', error)
    throw error
  }
}

