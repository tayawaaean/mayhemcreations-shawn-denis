import { useState, useEffect, useCallback } from 'react'
import { productApiService, Product, ProductCreateData } from '../../shared/productApiService'

export interface AdminProduct extends Product {
  // Additional admin-specific fields can be added here
  costPrice?: number
  salePrice?: number
  variants?: any[]
  images?: string[]
}

export interface ProductFilters {
  categoryId?: number
  subcategoryId?: number
  status?: 'active' | 'inactive' | 'draft'
  featured?: boolean
  search?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  page?: number
  limit?: number
}

export const useProducts = () => {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  // Fetch products with optional filters
  const fetchProducts = useCallback(async (filters: ProductFilters = {}) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await productApiService.getProducts({
        ...filters,
        limit: filters.limit || 50 // Default to 50 for admin
      })
      
      // Transform database products to admin format
      const transformedProducts = (response.data || []).map(product => ({
        ...product,
        // Add any admin-specific transformations here
        costPrice: 0, // Default value, can be added to database later
        salePrice: product.price, // Default to regular price
        variants: [], // Default empty array, can be added to database later
        images: product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []) // Handle both single and multiple images
      }))
      
      setProducts(transformedProducts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch product statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await productApiService.getProductStats()
      setStats(response.data)
    } catch (err) {
      console.error('Error fetching product stats:', err)
    }
  }, [])

  // Create a new product
  const createProduct = useCallback(async (productData: ProductCreateData) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await productApiService.createProduct(productData)
      
      // Add the new product to the local state
      const newProduct = {
        ...response.data,
        costPrice: productData.costPrice || 0,
        salePrice: productData.salePrice || (response.data?.price || productData.price),
        variants: productData.variants || [],
        images: productData.images || [response.data?.image || productData.image]
      }
      
      setProducts(prev => [newProduct, ...prev])
      return response
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Update an existing product
  const updateProduct = useCallback(async (id: number, productData: Partial<AdminProduct>) => {
    try {
      setLoading(true)
      setError(null)
      
      // Transform admin product data to database format
      const dbProductData = {
        title: productData.title,
        slug: productData.slug,
        description: productData.description,
        price: productData.price,
        image: productData.image,
        images: productData.images,
        primaryImageIndex: productData.primaryImageIndex,
        alt: productData.alt,
        categoryId: productData.categoryId,
        subcategoryId: productData.subcategoryId,
        status: productData.status,
        featured: productData.featured,
        badges: productData.badges,
        availableColors: productData.availableColors,
        availableSizes: productData.availableSizes,
        averageRating: productData.averageRating,
        totalReviews: productData.totalReviews,
        stock: productData.stock,
        sku: productData.sku,
        weight: productData.weight,
        dimensions: productData.dimensions,
        materials: productData.materials,
        careInstructions: productData.careInstructions,
        hasSizing: productData.hasSizing
      }
      
      const response = await productApiService.updateProduct(id, dbProductData)
      
      // Update the product in local state
      const updatedProduct = {
        ...response.data,
        costPrice: productData.costPrice,
        salePrice: productData.salePrice,
        variants: productData.variants,
        images: productData.images || response.data?.images
      }
      
      setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p))
      return response
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Delete a product
  const deleteProduct = useCallback(async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      
      await productApiService.deleteProduct(id)
      
      // Remove the product from local state
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchProducts(),
        fetchStats()
      ])
    }
    
    fetchData()
  }, [fetchProducts, fetchStats])

  return {
    products,
    loading,
    error,
    stats,
    fetchProducts,
    fetchStats,
    createProduct,
    updateProduct,
    deleteProduct,
    setError
  }
}
