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
      
      // For admin, don't pass status filter - backend will return all products for admin
      // Only pass status if explicitly requested
      const adminFilters = { ...filters }
      // Remove status filter if not explicitly set, so backend returns all products
      if (!filters.status) {
        delete adminFilters.status
      }
      
      const response = await productApiService.getProducts({
        ...adminFilters,
        limit: filters.limit || 50 // Default to 50 for admin
      }, true) // Require auth for admin requests so backend can detect admin role
      
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
      
      console.log('🔍 DEBUG useProducts.createProduct: Sending request:', {
        title: productData.title,
        categoryId: productData.categoryId,
        categoryIdType: typeof productData.categoryId,
        subcategoryId: productData.subcategoryId,
        hasImages: !!productData.images,
        imagesCount: productData.images?.length
      })
      
      const response = await productApiService.createProduct(productData)
      
      console.log('🔍 DEBUG useProducts.createProduct: Response received:', {
        success: response.success,
        hasData: !!response.data,
        dataId: response.data?.id,
        dataTitle: response.data?.title,
        message: response.message,
        errors: response.errors,
        fullResponse: response
      })
      
      // Check if the response indicates failure
      if (!response.success) {
        console.error('❌ DEBUG useProducts.createProduct: Response indicates failure:', response)
        const error = new Error(response.message || 'Failed to create product')
        ;(error as any).response = { data: response, status: 400 }
        throw error
      }
      
      // Add the new product to the local state
      // Ensure all required fields are present, using productData as fallback
      const newProduct = {
        id: response.data?.id || 0,
        title: response.data?.title || productData.title,
        slug: response.data?.slug || productData.slug,
        description: response.data?.description || productData.description,
        price: response.data?.price || productData.price,
        sku: response.data?.sku || productData.sku || '',
        alt: response.data?.alt || productData.alt,
        categoryId: response.data?.categoryId || productData.categoryId,
        subcategoryId: response.data?.subcategoryId || productData.subcategoryId,
        status: response.data?.status || productData.status || 'draft',
        featured: response.data?.featured ?? productData.featured ?? false,
        costPrice: productData.costPrice || 0,
        salePrice: productData.salePrice || (response.data?.price || productData.price),
        variants: productData.variants || [],
        images: productData.images || [response.data?.image || productData.image],
        image: productData.image || response.data?.image,
        category: response.data?.category,
        subcategory: response.data?.subcategory,
        createdAt: response.data?.createdAt || new Date().toISOString(),
        updatedAt: response.data?.updatedAt || new Date().toISOString()
      }
      
      console.log('🔍 DEBUG useProducts.createProduct: Adding to local state:', {
        newProductId: newProduct.id,
        newProductTitle: newProduct.title,
        newProductCategoryId: newProduct.categoryId
      })
      
      setProducts(prev => [newProduct, ...prev])
      return response
    } catch (err: any) {
      console.error('❌ DEBUG useProducts.createProduct: Error caught:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        error: err
      })
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
