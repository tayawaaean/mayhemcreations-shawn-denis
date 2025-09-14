import React, { useState, useEffect } from 'react'
import { useAdmin } from '../context/AdminContext'
import { 
  Search, 
  Filter, 
  Plus, 
  Minus, 
  Edit, 
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  X,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react'
import HelpModal from '../components/modals/HelpModal'
import { variantApiService, Variant, VariantInventoryStatus } from '../../shared/variantApiService'
import { useProducts } from '../hooks/useProducts'

const Inventory: React.FC = () => {
  const { state, dispatch } = useAdmin()
  const { products: mockProducts } = state
  const { products, loading: productsLoading, error: productsError, fetchProducts } = useProducts()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isEditVariantOpen, setIsEditVariantOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // New state for inventory management
  const [variantData, setVariantData] = useState<VariantInventoryStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newVariant, setNewVariant] = useState({
    productId: '',
    categoryId: '',
    subcategoryId: '',
    color: '',
    colorHex: '#000000',
    size: '',
    sku: '',
    stock: 0
  })
  const [editVariant, setEditVariant] = useState({
    id: '',
    productId: '',
    categoryId: '',
    subcategoryId: '',
    color: '',
    colorHex: '#000000',
    size: '',
    sku: '',
    stock: 0
  })
  const [categories, setCategories] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  
  // Size options for apparel
  const apparelSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
  const accessorySizes = ['One Size', 'Small', 'Medium', 'Large']

  // Load products and inventory data on component mount
  useEffect(() => {
    fetchProducts()
    loadInventoryData()
    loadCategories()
  }, [])

  // Debug effect to log when variantData changes
  useEffect(() => {
    console.log('Variant data changed:', variantData)
  }, [variantData])

  const loadCategories = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/v1/categories')
      const data = await response.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleCategoryChange = (categoryId: string) => {
    const selectedCategory = categories.find(cat => cat.id.toString() === categoryId)
    const categorySubcategories = selectedCategory?.children || []
    
    setNewVariant(prev => ({
      ...prev,
      categoryId,
      subcategoryId: '',
      productId: ''
    }))
    
    setSubcategories(categorySubcategories)
    setFilteredProducts([])
  }

  const handleSubcategoryChange = (subcategoryId: string) => {
    setNewVariant(prev => ({
      ...prev,
      subcategoryId,
      productId: ''
    }))
    
    // Filter products based on category and subcategory
    const filtered = products.filter(product => {
      const matchesCategory = product.categoryId?.toString() === newVariant.categoryId
      const matchesSubcategory = subcategoryId === '' || product.subcategoryId?.toString() === subcategoryId
      return matchesCategory && matchesSubcategory
    })
    
    setFilteredProducts(filtered)
  }

  const handleProductChange = (productId: string) => {
    setNewVariant(prev => ({ ...prev, productId, size: '' }))
  }

  // Get size options based on selected product
  const getSizeOptions = () => {
    if (!newVariant.productId) return []
    
    const selectedProduct = products.find(p => p.id.toString() === newVariant.productId)
    if (!selectedProduct) return []
    
    // Check if product has sizing (apparel)
    if (selectedProduct.hasSizing) {
      return apparelSizes
    } else {
      return accessorySizes
    }
  }

  // Refresh data when low stock threshold changes (for filtering display)
  useEffect(() => {
    // Data is already loaded, just trigger a re-render for filtering
    // The filtering happens in the frontend, so no need to reload data
  }, [lowStockThreshold])

  const loadInventoryData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Load only variant inventory data
      const variantData = await variantApiService.getVariantInventoryStatus()
      setVariantData(variantData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory data')
      console.error('Error loading inventory data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Only show variants in inventory
  const allItems = (variantData?.variants?.map(variant => ({
    id: variant.id.toString(),
    productId: variant.productId,
    productTitle: variant.product?.title || 'Unknown Product',
    productImage: variant.image || variant.product?.image || '/placeholder-image.jpg',
    productSku: variant.sku,
    category: variant.product?.category?.name || 'Uncategorized',
    subcategory: '',
    price: variant.price || variant.product?.price || 0,
    stock: variant.stock || 0,
    color: variant.color || 'Default',
    colorHex: variant.colorHex || '#000000',
    size: variant.size || 'One Size',
    type: 'variant' as const
  })) || [])

  // Debug logging (uncomment for debugging)
  // console.log('Variant data:', variantData)
  // console.log('All items:', allItems)
  // console.log('First item type:', allItems[0]?.type)

  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.productTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.productSku.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const lowStockItems = filteredItems.filter(item => item.stock < lowStockThreshold)
  const outOfStockItems = filteredItems.filter(item => item.stock === 0)

  // Pagination logic
  const totalItems = filteredItems.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }


  const handleStockAdjustment = async (itemId: string, adjustment: number) => {
    try {
      const item = filteredItems.find(i => i.id === itemId)
      if (!item) return

      // Adjust variant stock
      await variantApiService.adjustVariantStock(Number(itemId), adjustment, `Manual adjustment via inventory management`)
      
      // Reload inventory data to get updated stock levels
      await loadInventoryData()
    } catch (error) {
      console.error('Error adjusting stock:', error)
      setError(error instanceof Error ? error.message : 'Failed to adjust stock')
    }
  }

  // Bulk inventory management functions


  const handleAddVariant = async () => {
    console.log('handleAddVariant called with:', newVariant)
    
    if (!newVariant.productId || !newVariant.color || !newVariant.size || !newVariant.sku) {
      console.log('Validation failed:', {
        productId: newVariant.productId,
        color: newVariant.color,
        size: newVariant.size,
        sku: newVariant.sku
      })
      setError('Please fill in all required fields')
      return
    }

    try {
      console.log('Creating variant with data:', {
        productId: Number(newVariant.productId),
        name: `${newVariant.color} - ${newVariant.size}`,
        color: newVariant.color,
        colorHex: newVariant.colorHex,
        size: newVariant.size,
        sku: newVariant.sku,
        stock: newVariant.stock,
        isActive: true
      })

      // Create variant via API
      const result = await variantApiService.createVariant({
        productId: Number(newVariant.productId),
        name: `${newVariant.color} - ${newVariant.size}`,
        color: newVariant.color,
        colorHex: newVariant.colorHex,
        size: newVariant.size,
        sku: newVariant.sku,
        stock: newVariant.stock,
        isActive: true
      })

      console.log('Variant created successfully:', result)

      // Reload data to get updated variants
      await loadInventoryData()

      // Reset form and close modal
      setNewVariant({
        productId: '',
        categoryId: '',
        subcategoryId: '',
        color: '',
        colorHex: '#000000',
        size: '',
        sku: '',
        stock: 0
      })
      setSubcategories([])
      setFilteredProducts([])
      setIsAddVariantOpen(false)
      setError(null) // Clear any previous errors
    } catch (error) {
      console.error('Error creating variant:', error)
      setError(`Failed to create variant: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleEditVariantClick = (variant: any) => {
    setSelectedVariant(variant)
    setEditVariant({
      id: variant.id,
      productId: variant.productId,
      categoryId: variant.product?.categoryId?.toString() || '',
      subcategoryId: variant.product?.subcategoryId?.toString() || '',
      color: variant.color,
      colorHex: variant.colorHex,
      size: variant.size,
      sku: variant.sku,
      stock: variant.stock
    })
    setIsEditVariantOpen(true)
  }

  const handleUpdateVariant = async () => {
    if (!editVariant.productId || !editVariant.color || !editVariant.size || !editVariant.sku) return

    const product = products.find(p => p.id.toString() === editVariant.productId)
    if (product) {
      // Reload data to get updated variants
      await loadInventoryData()
    }

    setIsEditVariantOpen(false)
    setSelectedVariant(null)
  }

  const productCategories = Array.from(new Set(products.map(p => p.category?.name || 'Uncategorized')))

  const totalValue = variantData?.variants?.reduce((sum, variant) => {
    return sum + (variant.stock * (variant.price || variant.product?.price || 0))
  }, 0) || 0

  const totalUnits = variantData?.variants?.reduce((sum, variant) => sum + variant.stock, 0) || 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage stock levels and track inventory for product variants
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadInventoryData}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            title="Refresh inventory data"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsHelpOpen(true)}
            className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <span className="hidden sm:inline">How to use</span>
            <span className="sm:hidden">?</span>
          </button>
          <button
            onClick={() => setIsAddVariantOpen(true)}
            className="bg-gray-900 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-gray-800 flex items-center transition-colors text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="hidden sm:inline">Add Variant</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}


      {/* Inventory Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Units</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{totalUnits.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                  <dd className="text-2xl font-semibold text-gray-900">${totalValue.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Low Stock</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {variantData?.statistics?.lowStock || lowStockItems.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Out of Stock</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {variantData?.statistics?.outOfStock || outOfStockItems.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {productCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
            <input
              type="number"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center justify-center">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>


      {/* Inventory table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {paginatedItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory items</h3>
            <p className="mt-1 text-sm text-gray-500">
              {loading ? 'Loading inventory data...' : 'No variants found. Add some variants to get started.'}
            </p>
            {!loading && (
              <div className="mt-6">
                <button
                  onClick={() => setIsAddVariantOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 hidden lg:table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedItems.map((item) => {
                const isLowStock = item.stock < lowStockThreshold
                const isOutOfStock = item.stock === 0
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={item.productImage}
                          alt={item.productTitle}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.productTitle}</div>
                          <div className="text-sm text-gray-500">{item.category} • {item.subcategory}</div>
                          {(item.type === 'variant' || !item.type) && (
                            <div className="text-xs text-blue-600 mt-1">
                              Variant: {item.color} • {item.size}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">
                          {item.color} • {item.size}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.productSku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${
                          isOutOfStock ? 'text-red-600' : 
                          isLowStock ? 'text-yellow-600' : 
                          'text-gray-900'
                        }`}>
                          {item.stock}
                        </span>
                        {isLowStock && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 ml-2" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        isOutOfStock ? 'bg-red-100 text-red-800' :
                        isLowStock ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {isOutOfStock ? 'Out of Stock' : 
                         isLowStock ? 'Low Stock' : 
                         'In Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleStockAdjustment(item.id, -1)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleStockAdjustment(item.id, 1)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditVariantClick(item)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="Edit Item"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Mobile Card Layout */}
          <div className="lg:hidden">
            {paginatedItems.map((item) => {
              const isLowStock = item.stock < lowStockThreshold
              const isOutOfStock = item.stock === 0
              
              return (
                <div key={item.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0">
                  <div className="flex items-start space-x-3">
                    <img
                      src={item.productImage}
                      alt={item.productTitle}
                      className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{item.productTitle}</h3>
                          <p className="text-sm text-gray-500 truncate">{item.color} • {item.size}</p>
                          <p className="text-xs text-blue-600 mt-1">Variant</p>
                          <p className="text-xs text-gray-400 mt-1">SKU: {item.productSku}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={() => handleStockAdjustment(item.id, -1)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleStockAdjustment(item.id, 1)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditVariantClick(item)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Current Stock</p>
                        <p className="text-sm text-gray-900">{item.stock} units</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.stock === 0
                            ? 'bg-red-100 text-red-800'
                            : item.stock <= lowStockThreshold
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {item.stock === 0 ? 'Out of Stock' :
                           item.stock <= lowStockThreshold ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-sm text-gray-900">${typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price || '0').toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Value</p>
                        <p className="text-sm font-medium text-gray-900">
                          ${(item.stock * (typeof item.price === 'number' ? item.price : parseFloat(item.price || '0'))).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
                <span className="font-medium">{totalItems}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === currentPage
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="How to use: Inventory">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Search by product name or SKU using the search box.</li>
          <li>Filter by category using the Category dropdown.</li>
          <li>Use −/+ buttons to quickly adjust stock for a variant.</li>
          <li>Click the edit icon to modify variant details like size, SKU, and stock.</li>
          <li>Use Add Variant to create a new variant for a product.</li>
          <li>Navigate pages using the pagination controls at the bottom.</li>
        </ol>
      </HelpModal>


      {/* Add Variant Modal */}
      {isAddVariantOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Variant</h2>
              <button
                onClick={() => setIsAddVariantOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={newVariant.categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              {subcategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subcategory
                  </label>
                  <select
                    value={newVariant.subcategoryId}
                    onChange={(e) => handleSubcategoryChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All subcategories</option>
                    {subcategories.map(subcategory => (
                      <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product *
                </label>
                <select
                  value={newVariant.productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  required
                  disabled={!newVariant.categoryId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!newVariant.categoryId ? 'Select a category first' : 'Select a product'}
                  </option>
                  {(filteredProducts.length > 0 ? filteredProducts : products).map(product => (
                    <option key={product.id} value={product.id}>{product.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color *
                  </label>
                  <input
                    type="text"
                    value={newVariant.color}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, color: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Red, Blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color Hex
                  </label>
                  <input
                    type="color"
                    value={newVariant.colorHex}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, colorHex: e.target.value }))}
                    className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Size *
                  </label>
                  <select
                    value={newVariant.size}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, size: e.target.value }))}
                    required
                    disabled={!newVariant.productId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!newVariant.productId ? 'Select a product first' : 'Select a size'}
                    </option>
                    {getSizeOptions().map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={newVariant.sku}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., TSHIRT-RED-M"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Stock
                </label>
                <input
                  type="number"
                  value={newVariant.stock}
                  onChange={(e) => setNewVariant(prev => ({ ...prev, stock: Number(e.target.value) }))}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setIsAddVariantOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddVariant}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Variant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Variant Modal */}
      {isEditVariantOpen && selectedVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Variant</h2>
              <button
                onClick={() => {
                  setIsEditVariantOpen(false)
                  setSelectedVariant(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={editVariant.categoryId}
                  onChange={(e) => {
                    const selectedCategory = categories.find(cat => cat.id.toString() === e.target.value)
                    const categorySubcategories = selectedCategory?.children || []
                    
                    setEditVariant(prev => ({
                      ...prev,
                      categoryId: e.target.value,
                      subcategoryId: '',
                      productId: ''
                    }))
                    
                    setSubcategories(categorySubcategories)
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              {subcategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subcategory
                  </label>
                  <select
                    value={editVariant.subcategoryId}
                    onChange={(e) => {
                      setEditVariant(prev => ({
                        ...prev,
                        subcategoryId: e.target.value,
                        productId: ''
                      }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All subcategories</option>
                    {subcategories.map(subcategory => (
                      <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product *
                </label>
                <select
                  value={editVariant.productId}
                  onChange={(e) => setEditVariant(prev => ({ ...prev, productId: e.target.value }))}
                  required
                  disabled={!editVariant.categoryId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!editVariant.categoryId ? 'Select a category first' : 'Select a product'}
                  </option>
                  {products.filter(product => {
                    const matchesCategory = product.categoryId?.toString() === editVariant.categoryId
                    const matchesSubcategory = editVariant.subcategoryId === '' || product.subcategoryId?.toString() === editVariant.subcategoryId
                    return matchesCategory && matchesSubcategory
                  }).map(product => (
                    <option key={product.id} value={product.id}>{product.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color *
                  </label>
                  <input
                    type="text"
                    value={editVariant.color}
                    onChange={(e) => setEditVariant(prev => ({ ...prev, color: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Red, Blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color Hex
                  </label>
                  <input
                    type="color"
                    value={editVariant.colorHex}
                    onChange={(e) => setEditVariant(prev => ({ ...prev, colorHex: e.target.value }))}
                    className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Size *
                  </label>
                  <input
                    type="text"
                    value={editVariant.size}
                    onChange={(e) => setEditVariant(prev => ({ ...prev, size: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., S, M, L, XL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={editVariant.sku}
                    onChange={(e) => setEditVariant(prev => ({ ...prev, sku: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., TSHIRT-RED-M"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock
                </label>
                <input
                  type="number"
                  value={editVariant.stock}
                  onChange={(e) => setEditVariant(prev => ({ ...prev, stock: Number(e.target.value) }))}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setIsEditVariantOpen(false)
                    setSelectedVariant(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateVariant}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Variant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Inventory
