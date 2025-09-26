/**
 * Utility functions for handling product images
 */

/**
 * Parse images field from product data
 * Handles both array and string formats
 */
export function parseProductImages(images: any): string[] {
  if (!images) return []
  
  if (Array.isArray(images)) {
    return images
  }
  
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      console.warn('Failed to parse images string:', images)
      return []
    }
  }
  
  return []
}

/**
 * Get the primary image from a product
 * Falls back to the first image or the single image field
 */
export function getPrimaryImage(product: { image?: string; images?: any; primaryImageIndex?: number }): string {
  const images = parseProductImages(product.images)
  
  if (images.length > 0) {
    const primaryIndex = product.primaryImageIndex || 0
    return images[primaryIndex] || images[0]
  }
  
  return product.image || ''
}

/**
 * Get all images for a product with fallback handling
 */
export function getAllProductImages(product: { image?: string; images?: any }): string[] {
  const images = parseProductImages(product.images)
  
  if (images.length > 0) {
    return images
  }
  
  return product.image ? [product.image] : []
}

