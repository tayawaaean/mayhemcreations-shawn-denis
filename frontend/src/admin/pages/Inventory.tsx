import React, { useState } from 'react'
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
  X
} from 'lucide-react'
import HelpModal from '../components/modals/HelpModal'

const Inventory: React.FC = () => {
  const { state, dispatch } = useAdmin()
  const { products } = state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isEditVariantOpen, setIsEditVariantOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [newVariant, setNewVariant] = useState({
    productId: '',
    color: '',
    colorHex: '#000000',
    size: '',
    sku: '',
    stock: 0,
    costPrice: 0
  })
  const [editVariant, setEditVariant] = useState({
    id: '',
    productId: '',
    color: '',
    colorHex: '#000000',
    size: '',
    sku: '',
    stock: 0,
    costPrice: 0
  })

  // Flatten all variants for inventory view
  const allVariants = products.flatMap(product => 
    product.variants.map(variant => ({
      ...variant,
      productId: product.id,
      productTitle: product.title,
      productImage: product.primaryImage,
      productSku: product.sku,
      category: product.category,
      subcategory: product.subcategory
    }))
  )

  const filteredVariants = allVariants.filter(variant => {
    const matchesSearch = variant.productTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         variant.sku.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || variant.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const lowStockVariants = filteredVariants.filter(variant => variant.stock < lowStockThreshold)
  const outOfStockVariants = filteredVariants.filter(variant => variant.stock === 0)

  // Pagination logic
  const totalItems = filteredVariants.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedVariants = filteredVariants.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }


  const handleStockAdjustment = (variantId: string, adjustment: number) => {
    const product = products.find(p => p.variants.some(v => v.id === variantId))
    if (product) {
      const updatedProduct = {
        ...product,
        variants: product.variants.map(v => 
          v.id === variantId 
            ? { ...v, stock: Math.max(0, v.stock + adjustment) }
            : v
        ),
        updatedAt: new Date()
      }
      dispatch({ type: 'UPDATE_PRODUCT', payload: updatedProduct })
    }
  }


  const handleAddVariant = () => {
    if (!newVariant.productId || !newVariant.color || !newVariant.size || !newVariant.sku) return

    const product = products.find(p => p.id === newVariant.productId)
    if (product) {
      const variant = {
        id: Date.now().toString(),
        color: newVariant.color,
        colorHex: newVariant.colorHex,
        size: newVariant.size,
        sku: newVariant.sku,
        stock: newVariant.stock,
        costPrice: newVariant.costPrice,
        price: product.price
      }

      const updatedProduct = {
        ...product,
        variants: [...product.variants, variant],
        updatedAt: new Date()
      }
      dispatch({ type: 'UPDATE_PRODUCT', payload: updatedProduct })
    }

    setNewVariant({
      productId: '',
      color: '',
      colorHex: '#000000',
      size: '',
      sku: '',
      stock: 0,
      costPrice: 0
    })
    setIsAddVariantOpen(false)
  }

  const handleEditVariantClick = (variant: any) => {
    setSelectedVariant(variant)
    setEditVariant({
      id: variant.id,
      productId: variant.productId,
      color: variant.color,
      colorHex: variant.colorHex,
      size: variant.size,
      sku: variant.sku,
      stock: variant.stock,
      costPrice: variant.costPrice || 0
    })
    setIsEditVariantOpen(true)
  }

  const handleUpdateVariant = () => {
    if (!editVariant.productId || !editVariant.color || !editVariant.size || !editVariant.sku) return

    const product = products.find(p => p.id === editVariant.productId)
    if (product) {
      const updatedProduct = {
        ...product,
        variants: product.variants.map(v =>
          v.id === editVariant.id
            ? {
                ...v,
                color: editVariant.color,
                colorHex: editVariant.colorHex,
                size: editVariant.size,
                sku: editVariant.sku,
                stock: editVariant.stock,
                costPrice: editVariant.costPrice
              }
            : v
        ),
        updatedAt: new Date()
      }
      dispatch({ type: 'UPDATE_PRODUCT', payload: updatedProduct })
    }

    setIsEditVariantOpen(false)
    setSelectedVariant(null)
  }

  const categories = Array.from(new Set(products.map(p => p.category)))

  const totalValue = allVariants.reduce((sum, variant) => {
    const product = products.find(p => p.id === variant.productId)
    return sum + (variant.stock * (product?.costPrice || product?.price || 0))
  }, 0)

  const totalUnits = allVariants.reduce((sum, variant) => sum + variant.stock, 0)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage stock levels and track inventory across all products
          </p>
        </div>
        <div className="flex items-center space-x-2">
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
                  <dd className="text-2xl font-semibold text-gray-900">{lowStockVariants.length}</dd>
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
                  <dd className="text-2xl font-semibold text-gray-900">{outOfStockVariants.length}</dd>
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
              {categories.map(category => (
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
              {paginatedVariants.map((variant) => {
                const product = products.find(p => p.id === variant.productId)
                const isLowStock = variant.stock < lowStockThreshold
                const isOutOfStock = variant.stock === 0
                
                return (
                  <tr key={variant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={variant.productImage}
                          alt={variant.productTitle}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{variant.productTitle}</div>
                          <div className="text-sm text-gray-500">{variant.category} • {variant.subcategory}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="h-4 w-4 rounded-full border border-gray-300 mr-2"
                          style={{ backgroundColor: variant.colorHex }}
                        ></div>
                        <span className="text-sm text-gray-900">{variant.color} • {variant.size}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {variant.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${
                          isOutOfStock ? 'text-red-600' : 
                          isLowStock ? 'text-yellow-600' : 
                          'text-gray-900'
                        }`}>
                          {variant.stock}
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
                          onClick={() => handleStockAdjustment(variant.id, -1)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleStockAdjustment(variant.id, 1)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditVariantClick(variant)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="Edit Variant"
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
            {paginatedVariants.map((variant) => (
              <div key={variant.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0">
                <div className="flex items-start space-x-3">
                  <img
                    src={variant.productImage}
                    alt={variant.productTitle}
                    className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{variant.productTitle}</h3>
                        <p className="text-sm text-gray-500 truncate">{variant.color} • {variant.size}</p>
                        <p className="text-xs text-gray-400 mt-1">SKU: {variant.sku}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={() => handleStockAdjustment(variant.id, -1)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleStockAdjustment(variant.id, 1)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditVariantClick(variant)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Current Stock</p>
                        <p className="text-sm text-gray-900">{variant.stock} units</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          variant.stock === 0
                            ? 'bg-red-100 text-red-800'
                            : variant.stock <= lowStockThreshold
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {variant.stock === 0 ? 'Out of Stock' :
                           variant.stock <= lowStockThreshold ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cost Price</p>
                        <p className="text-sm text-gray-900">${variant.price?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Value</p>
                        <p className="text-sm font-medium text-gray-900">
                          ${(variant.stock * (variant.price || 0)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
                  Product *
                </label>
                <select
                  value={newVariant.productId}
                  onChange={(e) => setNewVariant(prev => ({ ...prev, productId: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
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
                  <input
                    type="text"
                    value={newVariant.size}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, size: e.target.value }))}
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
                    value={newVariant.sku}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., TSHIRT-RED-M"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    value={newVariant.costPrice}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
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
                  Product *
                </label>
                <select
                  value={editVariant.productId}
                  onChange={(e) => setEditVariant(prev => ({ ...prev, productId: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
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

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    value={editVariant.costPrice}
                    onChange={(e) => setEditVariant(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
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
