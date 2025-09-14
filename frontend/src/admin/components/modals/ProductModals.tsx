import React, { useState, useEffect } from 'react'
import { X, AlertTriangle, Upload, Image as ImageIcon } from 'lucide-react'
import { AdminProduct } from '../../hooks/useProducts'
import { categoryApiService, Category } from '../../../shared/categoryApiService'
import { ProductCreateData } from '../../../shared/productApiService'

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (product: ProductCreateData) => void
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
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    price: '',
    image: '',
    alt: '',
    categoryId: 0,
    subcategoryId: 0,
    status: 'draft' as 'active' | 'inactive' | 'draft',
    featured: false,
    sku: '',
    weight: '',
    dimensions: '',
    hasSizing: false
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const response = await categoryApiService.getCategories({
            includeChildren: true,
            status: 'active'
          })
          setCategories(response.data)
        } catch (error) {
          console.error('Error fetching categories:', error)
        }
      }
      fetchCategories()
    }
  }, [isOpen])

  // Convert file to base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, image: 'Please select a valid image file (PNG, JPG, etc.)' })
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, image: 'Image size must be less than 5MB' })
        return
      }

      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      // Clear any previous errors
      setErrors({ ...errors, image: '' })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required'
    if (!imageFile) newErrors.image = 'Image file is required'
    if (!formData.alt.trim()) newErrors.alt = 'Alt text is required'
    if (!formData.categoryId) newErrors.categoryId = 'Category is required'
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm() && imageFile) {
      try {
        setLoading(true)
        
        // Convert image to base64
        const base64Image = await convertToBase64(imageFile)
        
        onSave({
          ...formData,
          price: parseFloat(formData.price),
          image: base64Image, // Store as base64
          categoryId: formData.categoryId,
          subcategoryId: formData.subcategoryId || undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined
          // createdAt and updatedAt will be handled by the database
        })
        
        // Reset form
        setFormData({
          title: '',
          slug: '',
          description: '',
          price: '',
          image: '',
          alt: '',
          categoryId: 0,
          subcategoryId: 0,
          status: 'draft',
          featured: false,
          sku: '',
          weight: '',
          dimensions: '',
          hasSizing: false
        })
        setImageFile(null)
        setImagePreview('')
        setErrors({})
        onClose()
      } catch (error) {
        console.error('Error converting image:', error)
        setErrors({ ...errors, image: 'Error processing image file' })
      } finally {
        setLoading(false)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Add New Product</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.slug ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="product-slug"
                />
                {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
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
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.categoryId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value={0}>Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory
                </label>
                <select
                  value={formData.subcategoryId}
                  onChange={(e) => setFormData({ ...formData, subcategoryId: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value={0}>Select Subcategory</option>
                  {categories
                    .flatMap(cat => cat.children || [])
                    .map(subcategory => (
                      <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                    ))}
                </select>
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
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                />
                <label htmlFor="featured" className="ml-2 block text-sm text-gray-700">
                  Featured Product
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasSizing"
                  checked={formData.hasSizing}
                  onChange={(e) => setFormData({ ...formData, hasSizing: e.target.checked })}
                  className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                />
                <label htmlFor="hasSizing" className="ml-2 block text-sm text-gray-700">
                  Has Sizing (Apparel products with multiple sizes)
                </label>
              </div>

              {/* Image Upload Section */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image * (PNG, JPG, etc.)
                </label>
                <div 
                  className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.add('border-gray-400', 'bg-gray-50')
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.remove('border-gray-400', 'bg-gray-50')
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.remove('border-gray-400', 'bg-gray-50')
                    const files = e.dataTransfer.files
                    if (files.length > 0) {
                      const file = files[0]
                      if (file.type.startsWith('image/')) {
                        handleFileChange({ target: { files: [file] } } as any)
                      } else {
                        setErrors({ ...errors, image: 'Please select a valid image file (PNG, JPG, etc.)' })
                      }
                    }
                  }}
                >
                  <div className="space-y-1 text-center">
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="mx-auto h-32 w-32 object-cover rounded-lg"
                        />
                        <p className="text-sm text-gray-600">{imageFile?.name}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setImageFile(null)
                            setImagePreview('')
                          }}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <span className="font-medium text-gray-900 hover:text-gray-700">
                            Upload a file
                          </span>
                          <span className="pl-1">or drag and drop</span>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>
                <input
                  id="image-upload"
                  name="image-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Text *
                </label>
                <input
                  type="text"
                  value={formData.alt}
                  onChange={(e) => setFormData({ ...formData, alt: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.alt ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe the image"
                />
                {errors.alt && <p className="mt-1 text-sm text-red-600">{errors.alt}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter product description"
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>
            </div>
          </form>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
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
              disabled={loading}
              className="px-6 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ isOpen, onClose, onSave, product }) => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    price: '',
    image: '',
    alt: '',
    categoryId: 0,
    subcategoryId: 0,
    status: 'draft' as 'active' | 'inactive' | 'draft',
    featured: false,
    sku: '',
    weight: '',
    dimensions: '',
    hasSizing: false
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data when product changes
  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        title: product.title || '',
        slug: product.slug || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        image: product.image || '',
        alt: product.alt || '',
        categoryId: product.categoryId || 0,
        subcategoryId: product.subcategoryId || 0,
        status: product.status || 'draft',
        featured: product.featured || false,
        sku: product.sku || '',
        weight: product.weight?.toString() || '',
        dimensions: product.dimensions || '',
        hasSizing: product.hasSizing || false
      })
      
      // Set preview for existing image
      if (product.image) {
        setImagePreview(product.image)
      }
    }
  }, [product, isOpen])

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const response = await categoryApiService.getCategories({
            includeChildren: true,
            status: 'active'
          })
          setCategories(response.data)
        } catch (error) {
          console.error('Error fetching categories:', error)
        }
      }
      fetchCategories()
    }
  }, [isOpen])

  // Convert file to base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, image: 'Please select a valid image file (PNG, JPG, etc.)' })
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, image: 'Image size must be less than 5MB' })
        return
      }

      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      // Clear any previous errors
      setErrors({ ...errors, image: '' })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required'
    if (!imageFile && !formData.image.trim()) newErrors.image = 'Image is required'
    if (!formData.alt.trim()) newErrors.alt = 'Alt text is required'
    if (!formData.categoryId) newErrors.categoryId = 'Category is required'
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm() && product) {
      try {
        setLoading(true)
        
        let imageData = formData.image
        
        // If new file is selected, convert to base64
        if (imageFile) {
          imageData = await convertToBase64(imageFile)
        }
        
        onSave({
          ...product,
          ...formData,
          price: parseFloat(formData.price),
          image: imageData,
          categoryId: formData.categoryId,
          subcategoryId: formData.subcategoryId || undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined
          // updatedAt will be handled by the database automatically
        })
        
        onClose()
      } catch (error) {
        console.error('Error processing image:', error)
        setErrors({ ...errors, image: 'Error processing image file' })
      } finally {
        setLoading(false)
      }
    }
  }

  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Edit Product</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.slug ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="product-slug"
                />
                {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
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
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.categoryId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value={0}>Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory
                </label>
                <select
                  value={formData.subcategoryId}
                  onChange={(e) => setFormData({ ...formData, subcategoryId: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value={0}>Select Subcategory</option>
                  {categories
                    .flatMap(cat => cat.children || [])
                    .map(subcategory => (
                      <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                    ))}
                </select>
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
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="featured-edit"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                />
                <label htmlFor="featured-edit" className="ml-2 block text-sm text-gray-700">
                  Featured Product
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasSizing-edit"
                  checked={formData.hasSizing}
                  onChange={(e) => setFormData({ ...formData, hasSizing: e.target.checked })}
                  className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                />
                <label htmlFor="hasSizing-edit" className="ml-2 block text-sm text-gray-700">
                  Has Sizing (Apparel products with multiple sizes)
                </label>
              </div>

              {/* Image Upload Section */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image * (PNG, JPG, etc.)
                </label>
                <div 
                  className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('image-upload-edit')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.add('border-gray-400', 'bg-gray-50')
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.remove('border-gray-400', 'bg-gray-50')
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.remove('border-gray-400', 'bg-gray-50')
                    const files = e.dataTransfer.files
                    if (files.length > 0) {
                      const file = files[0]
                      if (file.type.startsWith('image/')) {
                        handleFileChange({ target: { files: [file] } } as any)
                      } else {
                        setErrors({ ...errors, image: 'Please select a valid image file (PNG, JPG, etc.)' })
                      }
                    }
                  }}
                >
                  <div className="space-y-1 text-center">
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="mx-auto h-32 w-32 object-cover rounded-lg"
                        />
                        <p className="text-sm text-gray-600">
                          {imageFile?.name || 'Current image'}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setImageFile(null)
                            setImagePreview('')
                          }}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <span className="font-medium text-gray-900 hover:text-gray-700">
                            Upload a file
                          </span>
                          <span className="pl-1">or drag and drop</span>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>
                <input
                  id="image-upload-edit"
                  name="image-upload-edit"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Text *
                </label>
                <input
                  type="text"
                  value={formData.alt}
                  onChange={(e) => setFormData({ ...formData, alt: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.alt ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe the image"
                />
                {errors.alt && <p className="mt-1 text-sm text-red-600">{errors.alt}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter product description"
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>
            </div>
          </form>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
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
              disabled={loading}
              className="px-6 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const DeleteProductModal: React.FC<DeleteProductModalProps> = ({ isOpen, onClose, onConfirm, product }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Delete Product</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <p className="text-gray-900 font-medium">Are you sure you want to delete this product?</p>
              <p className="text-gray-600 text-sm mt-1">
                This action cannot be undone. The product "{product?.title}" will be permanently removed.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Product
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}