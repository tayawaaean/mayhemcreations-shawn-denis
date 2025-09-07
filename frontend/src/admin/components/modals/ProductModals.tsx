import React, { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { AdminProduct } from '../../types'
import ImageUpload from '../ImageUpload'

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (product: Omit<AdminProduct, 'id'>) => void
}

interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (product: AdminProduct) => void
  product: AdminProduct | null
}

interface DeleteProductModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  product: AdminProduct | null
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sku: '',
    category: '',
    subcategory: '',
    price: '',
    salePrice: '',
    status: 'draft' as 'active' | 'draft' | 'archived',
    primaryImage: '',
    images: [] as string[],
    variants: [] as any[]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required'
    if (!formData.category.trim()) newErrors.category = 'Category is required'
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSave({
        ...formData,
        price: parseFloat(formData.price),
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      setFormData({
        title: '',
        description: '',
        sku: '',
        category: '',
        subcategory: '',
        price: '',
        salePrice: '',
        status: 'draft',
        primaryImage: '',
        images: [],
        variants: []
      })
      setErrors({})
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add New Product</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter product title"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.sku ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter SKU"
                />
                {errors.sku && <p className="mt-1 text-sm text-red-600">{errors.sku}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.category ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter category"
                />
                {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory
                </label>
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  placeholder="Enter subcategory"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.price ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sale Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Image
                </label>
                <ImageUpload
                  value={formData.primaryImage}
                  onChange={(imageUrl) => setFormData({ ...formData, primaryImage: imageUrl })}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                placeholder="Enter product description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Images
              </label>
              <ImageUpload
                value={formData.images}
                onChange={(imageUrls) => {
                  setFormData({ 
                    ...formData, 
                    images: Array.isArray(imageUrls) ? imageUrls : [imageUrls]
                  })
                }}
                multiple={true}
                maxFiles={5}
                className="w-full"
              />
            </div>

          </form>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-6 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Add Product
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ isOpen, onClose, onSave, product }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sku: '',
    category: '',
    subcategory: '',
    price: '',
    salePrice: '',
    status: 'draft' as 'active' | 'draft' | 'archived',
    primaryImage: '',
    images: [] as string[],
    variants: [] as any[]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  React.useEffect(() => {
    if (product) {
      setFormData({
        title: product.title,
        description: product.description,
        sku: product.sku,
        category: product.category,
        subcategory: product.subcategory,
        price: product.price.toString(),
        salePrice: product.salePrice?.toString() || '',
        status: product.status,
        primaryImage: product.primaryImage,
        images: product.images,
        variants: product.variants
      })
    }
  }, [product])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required'
    if (!formData.category.trim()) newErrors.category = 'Category is required'
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm() && product) {
      onSave({
        ...product,
        ...formData,
        price: parseFloat(formData.price),
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : undefined,
        updatedAt: new Date()
      })
      onClose()
    }
  }

  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Edit Product</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter product title"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.sku ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter SKU"
                />
                {errors.sku && <p className="mt-1 text-sm text-red-600">{errors.sku}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.category ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter category"
                />
                {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory
                </label>
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  placeholder="Enter subcategory"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.price ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sale Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Image
                </label>
                <ImageUpload
                  value={formData.primaryImage}
                  onChange={(imageUrl) => setFormData({ ...formData, primaryImage: imageUrl })}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                placeholder="Enter product description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Images
              </label>
              <ImageUpload
                value={formData.images}
                onChange={(imageUrls) => {
                  setFormData({ 
                    ...formData, 
                    images: Array.isArray(imageUrls) ? imageUrls : [imageUrls]
                  })
                }}
                multiple={true}
                maxFiles={5}
                className="w-full"
              />
            </div>

          </form>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-6 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const DeleteProductModal: React.FC<DeleteProductModalProps> = ({ isOpen, onClose, onConfirm, product }) => {
  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md mx-4 flex flex-col">
          <div className="p-4 sm:p-6 flex-1">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-red-50 rounded-lg mr-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Delete Product</h2>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>"{product.title}"</strong>? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
