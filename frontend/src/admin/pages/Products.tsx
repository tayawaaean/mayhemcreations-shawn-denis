import React, { useState } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Package,
  AlertTriangle,
  X,
  RefreshCw,
  CheckCircle
} from 'lucide-react'
import { AddProductModal, EditProductModal, DeleteProductModal } from '../components/modals/ProductModals'
import HelpModal from '../components/modals/HelpModal'
import { useProducts, AdminProduct } from '../hooks/useProducts'
import { apiService, ErrorCategory } from '../services/apiService'

// Toast notification interface
interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

const Products: React.FC = () => {
  const { products, loading, error, createProduct, updateProduct, deleteProduct, fetchProducts } = useProducts()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [operationLoading, setOperationLoading] = useState(false)
  const itemsPerPage = 10

  // Toast management functions
  const showToast = (type: Toast['type'], message: string, action?: Toast['action']) => {
    const id = Date.now().toString()
    const newToast: Toast = { id, type, message, action }
    setToasts(prev => [...prev, newToast])
    
    // Auto-dismiss after 7 seconds for errors, 5 seconds for others
    const duration = type === 'error' ? 7000 : 5000
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const showSuccessToast = (message: string) => showToast('success', message)
  const showErrorToast = (message: string, action?: Toast['action']) => showToast('error', message, action)

  const filteredProducts = products.filter(product => {
    // Safely check for title and sku before calling toLowerCase
    const matchesSearch = (product.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || product.category?.slug === selectedCategory
    const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Pagination logic
  const totalItems = filteredProducts.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }


  const handleDeleteProduct = (product: AdminProduct) => {
    setSelectedProduct(product)
    setIsDeleteModalOpen(true)
  }

  const handleEditProduct = (product: AdminProduct) => {
    setSelectedProduct(product)
    setIsEditModalOpen(true)
  }


  const handleAddProduct = async (productData: any) => {
    setOperationLoading(true)
    try {
      await createProduct(productData as AdminProduct)
      setIsAddModalOpen(false)
      showSuccessToast('Product created successfully')
      console.log('✅ Product created:', productData.title)
    } catch (error: any) {
      console.error('❌ Error creating product:', error)
      
      // Extract error information using apiService
      const errorInfo = apiService.extractErrorInfo(error)
      
      // Specific error messages based on error type
      let errorMessage = `Failed to create product: ${errorInfo.message}`
      
      if (errorInfo.category === 'validation') {
        errorMessage = 'Validation error: Please check all required fields are filled correctly.'
      } else if (errorInfo.category === 'network') {
        errorMessage = 'Network error: Unable to reach the server. Please check your connection.'
      } else if (errorInfo.category === 'timeout') {
        errorMessage = 'Request timed out. The server took too long to respond.'
      }
      
      // Show error toast with retry option for retryable errors
      if (errorInfo.retryable) {
        showErrorToast(errorMessage, {
          label: 'Retry',
          onClick: () => handleAddProduct(productData)
        })
      } else {
        showErrorToast(errorMessage)
      }
    } finally {
      setOperationLoading(false)
    }
  }

  const handleUpdateProduct = async (product: AdminProduct) => {
    setOperationLoading(true)
    try {
      await updateProduct(product.id, product)
      setIsEditModalOpen(false)
      setSelectedProduct(null)
      showSuccessToast('Product updated successfully')
      console.log('✅ Product updated:', product.title)
    } catch (error: any) {
      console.error('❌ Error updating product:', error)
      
      const errorInfo = apiService.extractErrorInfo(error)
      
      let errorMessage = `Failed to update product: ${errorInfo.message}`
      
      // Handle specific error scenarios
      if (error?.response?.status === 409) {
        errorMessage = 'This product was modified by another user. Please refresh and try again.'
      } else if (error?.response?.status === 404) {
        errorMessage = 'Product not found. It may have been deleted.'
      } else if (errorInfo.category === 'validation') {
        errorMessage = 'Validation error: Please check all fields are valid.'
      } else if (errorInfo.category === 'network') {
        errorMessage = 'Network error: Unable to save changes. Please check your connection.'
      }
      
      if (errorInfo.retryable) {
        showErrorToast(errorMessage, {
          label: 'Retry',
          onClick: () => handleUpdateProduct(product)
        })
      } else {
        showErrorToast(errorMessage)
      }
      
      // Keep modal open on error so user can retry
    } finally {
      setOperationLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return
    
    setOperationLoading(true)
    const productName = selectedProduct.title
    const productId = selectedProduct.id
    
    try {
      await deleteProduct(productId)
      setIsDeleteModalOpen(false)
      setSelectedProduct(null)
      showSuccessToast(`Product "${productName}" deleted successfully`)
      console.log('✅ Product deleted:', productName)
    } catch (error: any) {
      console.error('❌ Error deleting product:', error)
      
      const errorInfo = apiService.extractErrorInfo(error)
      
      let errorMessage = `Failed to delete product: ${errorInfo.message}`
      
      // Handle specific delete errors
      if (error?.response?.status === 409) {
        errorMessage = 'Cannot delete: This product has active orders or inventory. Please archive it instead.'
      } else if (error?.response?.status === 404) {
        errorMessage = 'Product not found. It may have already been deleted.'
        // Close modal since product doesn't exist
        setIsDeleteModalOpen(false)
        setSelectedProduct(null)
      } else if (errorInfo.category === 'network') {
        errorMessage = 'Network error: Unable to delete product. Please check your connection.'
      }
      
      if (errorInfo.retryable && error?.response?.status !== 404) {
        showErrorToast(errorMessage, {
          label: 'Retry',
          onClick: handleConfirmDelete
        })
      } else {
        showErrorToast(errorMessage)
      }
    } finally {
      setOperationLoading(false)
    }
  }


  const categories = Array.from(new Set(products.map(p => p.category?.slug).filter(Boolean)))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Products</h3>
          <p className="text-sm sm:text-base text-red-600 mb-4 break-words">{error}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button 
              onClick={() => fetchProducts()} 
              className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 text-sm sm:text-base flex items-center justify-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
            >
              Reload Page
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            If this problem persists, please contact support.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 break-words">
            Manage your product catalog. Create and edit products here, then use the Inventory section to manage stock and variants.
          </p>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setIsHelpOpen(true)}
            className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">How to use</span>
            <span className="sm:hidden">?</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gray-900 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center font-medium text-sm sm:text-base flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="sm:col-span-2 md:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-end sm:col-span-2 md:col-span-1">
            <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center justify-center text-sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>


      {/* Products table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 hidden lg:table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">No products found</p>
                    <p className="text-gray-500 text-xs mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={product.image}
                          alt={product.alt}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.title}</div>
                          <div className="text-sm text-gray-500">{product.subcategory?.name || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <span className="font-medium">
                          ${typeof product.price === 'number' ? product.price.toFixed(2) : Number(product.price || 0).toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.status === 'active' ? 'bg-green-100 text-green-800' :
                        product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleEditProduct(product)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit Product"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Mobile Card Layout */}
          <div className="lg:hidden">
            {paginatedProducts.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">No products found</p>
                <p className="text-gray-500 text-xs mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              paginatedProducts.map((product) => (
                <div key={product.id} className="bg-white border-b border-gray-200 p-3 sm:p-4 last:border-b-0">
                  <div className="flex items-start space-x-3">
                    <img
                      src={product.image}
                      alt={product.alt}
                      className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="text-sm font-medium text-gray-900 break-words line-clamp-2">{product.title}</h3>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">{product.subcategory?.name || 'N/A'}</p>
                          <p className="text-xs text-gray-400 mt-1 break-all">SKU: {product.sku}</p>
                        </div>
                        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
                            title="Edit Product"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Category</p>
                          <p className="text-sm text-gray-900 truncate">{product.category?.name || 'N/A'}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Price</p>
                          <span className="text-sm font-medium text-gray-900">
                            ${typeof product.price === 'number' ? product.price.toFixed(2) : Number(product.price || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Status</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            product.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : product.status === 'inactive'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {product.status}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="How to use: Products">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Use the search and filters to find products by name, category, or status.</li>
          <li>Click "Add Product" to create a new product with basic information and images.</li>
          <li>Use the Edit button to update product details, pricing, or images.</li>
          <li>Use the Delete button to remove a product from the catalog.</li>
          <li>Go to the Inventory section to manage stock levels and create product variants.</li>
          <li>Products are paginated with 10 items per page for easy navigation.</li>
        </ol>
      </HelpModal>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 px-3 py-3 sm:px-4 sm:py-3 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
                <span className="font-medium">{totalItems}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-3 sm:px-4 py-2 border text-xs sm:text-sm font-medium ${
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
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddProduct}
      />

      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedProduct(null)
        }}
        onSave={handleUpdateProduct}
        product={selectedProduct}
      />

      <DeleteProductModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedProduct(null)
        }}
        onConfirm={handleConfirmDelete}
        product={selectedProduct}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start p-4 rounded-lg shadow-lg border animate-slide-in ${
              toast.type === 'success' 
                ? 'bg-green-50 border-green-200' 
                : toast.type === 'error'
                ? 'bg-red-50 border-red-200'
                : toast.type === 'warning'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            {toast.type === 'success' && (
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
            )}
            {toast.type === 'error' && (
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                toast.type === 'success' ? 'text-green-800' :
                toast.type === 'error' ? 'text-red-800' :
                toast.type === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }`}>
                {toast.message}
              </p>
              
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick()
                    removeToast(toast.id)
                  }}
                  className={`mt-2 text-sm font-medium underline ${
                    toast.type === 'success' ? 'text-green-700 hover:text-green-800' :
                    toast.type === 'error' ? 'text-red-700 hover:text-red-800' :
                    toast.type === 'warning' ? 'text-yellow-700 hover:text-yellow-800' :
                    'text-blue-700 hover:text-blue-800'
                  }`}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            
            <button
              onClick={() => removeToast(toast.id)}
              className={`ml-3 flex-shrink-0 ${
                toast.type === 'success' ? 'text-green-400 hover:text-green-600' :
                toast.type === 'error' ? 'text-red-400 hover:text-red-600' :
                toast.type === 'warning' ? 'text-yellow-400 hover:text-yellow-600' :
                'text-blue-400 hover:text-blue-600'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Products
