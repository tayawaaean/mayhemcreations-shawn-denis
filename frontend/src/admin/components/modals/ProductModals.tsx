import React, { useState, useEffect } from 'react'
import { X, AlertTriangle, Upload, Image as ImageIcon, Star } from 'lucide-react'
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
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    price: '',
    image: '',
    images: [] as string[],
    primaryImageIndex: 0,
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

  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
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
          setCategories(response.data || [])
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

  // Handle file selection for multiple images
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('AddProductModal handleFileChange called', e.target.files)
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate file types
    const validFiles = files.filter(file => file.type.startsWith('image/'))
    if (validFiles.length !== files.length) {
      setErrors({ ...errors, images: 'Please select valid image files (PNG, JPG, etc.)' })
      return
    }
    
    // Validate file sizes (max 5MB each)
    const oversizedFiles = validFiles.filter(file => file.size > 5 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      setErrors({ ...errors, images: 'Image size must be less than 5MB each' })
      return
    }

    // Limit to 10 images max
    const currentCount = imageFiles.length
    const newCount = currentCount + validFiles.length
    if (newCount > 10) {
      setErrors({ ...errors, images: 'Maximum 10 images allowed. You can add ' + (10 - currentCount) + ' more.' })
      return
    }

    setImageFiles(prev => [...prev, ...validFiles])
    
    // Create previews
    const newPreviews: string[] = []
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string)
        if (newPreviews.length === validFiles.length) {
          setImagePreviews(prev => [...prev, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
    
    // Clear any previous errors
    setErrors({ ...errors, images: '' })
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    
    // Adjust primary image index if needed
    if (formData.primaryImageIndex >= index && formData.primaryImageIndex > 0) {
      setFormData(prev => ({ ...prev, primaryImageIndex: prev.primaryImageIndex - 1 }))
    } else if (formData.primaryImageIndex >= imageFiles.length - 1) {
      setFormData(prev => ({ ...prev, primaryImageIndex: Math.max(0, imageFiles.length - 2) }))
    }
  }

  const setPrimaryImage = (index: number) => {
    setFormData(prev => ({ ...prev, primaryImageIndex: index }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required'
    if (imageFiles.length === 0) newErrors.images = 'At least one image is required'
    if (!formData.alt.trim()) newErrors.alt = 'Alt text is required'
    if (!formData.categoryId) newErrors.categoryId = 'Category is required'
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm() && imageFiles.length > 0) {
      try {
        setLoading(true)
        
        // Convert all images to base64
        const base64Images = await Promise.all(
          imageFiles.map(file => convertToBase64(file))
        )
        
        onSave({
          ...formData,
          price: parseFloat(formData.price),
          images: base64Images,
          image: base64Images[formData.primaryImageIndex], // Primary image for backward compatibility
          primaryImageIndex: formData.primaryImageIndex,
          categoryId: formData.categoryId,
          subcategoryId: formData.subcategoryId || undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined
        })
        
        // Reset form
        setFormData({
          title: '',
          slug: '',
          description: '',
          price: '',
          image: '',
          images: [],
          primaryImageIndex: 0,
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
        setImageFiles([])
        setImagePreviews([])
        setErrors({})
        onClose()
      } catch (error) {
        console.error('Error converting images:', error)
        setErrors({ ...errors, images: 'Error processing image files' })
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

              {/* Multiple Image Upload Section */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images * (PNG, JPG, etc.) - Up to 10 images
                </label>
                
                {/* Upload Area */}
                <div 
                  className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors cursor-pointer relative z-10"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Upload area clicked')
                    
                    // Use ref instead of getElementById
                    if (fileInputRef.current) {
                      console.log('Input ref found, triggering click')
                      fileInputRef.current.value = ''
                      fileInputRef.current.click()
                    } else {
                      console.error('File input ref not found')
                    }
                  }}
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
                    const files = Array.from(e.dataTransfer.files)
                    if (files.length > 0) {
                      const validFiles = files.filter(file => file.type.startsWith('image/'))
                      if (validFiles.length > 0) {
                        handleFileChange({ target: { files: validFiles } } as any)
                      } else {
                        setErrors({ ...errors, images: 'Please select valid image files (PNG, JPG, etc.)' })
                      }
                    }
                  }}
                >
                  <div className="space-y-1 text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <span className="font-medium text-gray-900 hover:text-gray-700">
                        Upload files
                      </span>
                      <span className="pl-1">or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB each (Max 10 images)</p>
                  </div>
                </div>
                
                <input
                  ref={fileInputRef}
                  id="image-upload"
                  name="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={handleFileChange}
                />
                
                {/* Debug: Test button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Test button clicked')
                    
                    if (fileInputRef.current) {
                      console.log('Test: Input ref found, triggering click')
                      fileInputRef.current.value = ''
                      fileInputRef.current.click()
                    } else {
                      console.error('Test: File input ref not found')
                    }
                  }}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Test File Upload
                </button>
                
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div className={`aspect-square rounded-lg overflow-hidden border-2 ${
                            formData.primaryImageIndex === index 
                              ? 'border-blue-500 ring-2 ring-blue-200' 
                              : 'border-gray-200'
                          }`}>
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Primary Image Badge */}
                          {formData.primaryImageIndex === index && (
                            <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                              Primary
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => setPrimaryImage(index)}
                                className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
                                title="Set as primary"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                                title="Remove image"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Primary Image Info */}
                    {imagePreviews.length > 1 && (
                      <p className="mt-2 text-sm text-gray-600">
                        Click the star icon to set the primary image (shown first in product listings)
                      </p>
                    )}
                  </div>
                )}
                
                {errors.images && <p className="mt-1 text-sm text-red-600">{errors.images}</p>}
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
    images: [] as string[],
    primaryImageIndex: 0,
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

  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data when product changes
  useEffect(() => {
    if (product && isOpen) {
      // Handle multi-image products
      const existingImages = product.images && Array.isArray(product.images) && product.images.length > 0 
        ? product.images 
        : product.image ? [product.image] : []
      
      setFormData({
        title: product.title || '',
        slug: product.slug || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        image: product.image || '',
        images: existingImages,
        primaryImageIndex: product.primaryImageIndex || 0,
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
      
      // Set previews for existing images
      setImagePreviews(existingImages)
      setImageFiles([]) // Clear any new files
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
          setCategories(response.data || [])
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

  // Handle multiple file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate files
    const validFiles: File[] = []
    const newErrors: Record<string, string> = { ...errors }

    files.forEach((file, index) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        newErrors[`image_${index}`] = 'Please select valid image files (PNG, JPG, etc.)'
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        newErrors[`image_${index}`] = 'Image size must be less than 5MB'
        return
      }

      validFiles.push(file)
    })

    if (validFiles.length === 0) {
      setErrors(newErrors)
      return
    }

    // Add new files to existing ones
    const updatedFiles = [...imageFiles, ...validFiles]
    setImageFiles(updatedFiles)

    // Create previews for new files
    const newPreviews: string[] = []
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string)
        if (newPreviews.length === validFiles.length) {
          setImagePreviews([...imagePreviews, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })

    // Clear any previous errors
    setErrors({})
  }

  // Remove an image
  const removeImage = (index: number) => {
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index)
    const updatedFiles = imageFiles.filter((_, i) => i !== index)
    
    setImagePreviews(updatedPreviews)
    setImageFiles(updatedFiles)
    
    // Update primary image index if needed
    if (formData.primaryImageIndex >= updatedPreviews.length) {
      setFormData({ ...formData, primaryImageIndex: Math.max(0, updatedPreviews.length - 1) })
    }
  }

  // Set primary image
  const setPrimaryImage = (index: number) => {
    setFormData({ ...formData, primaryImageIndex: index })
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required'
    if (imagePreviews.length === 0) newErrors.images = 'At least one image is required'
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
        
        // Convert new files to base64
        const newImageData: string[] = []
        for (const file of imageFiles) {
          const base64 = await convertToBase64(file)
          newImageData.push(base64)
        }
        
        // Combine existing images with new ones
        const allImages = [...imagePreviews.filter((_, index) => index < imagePreviews.length - imageFiles.length), ...newImageData]
        
        onSave({
          ...product,
          ...formData,
          price: parseFloat(formData.price),
          image: allImages[formData.primaryImageIndex] || allImages[0] || '', // Set primary image as main image
          images: allImages,
          primaryImageIndex: formData.primaryImageIndex,
          categoryId: formData.categoryId,
          subcategoryId: formData.subcategoryId || undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined
          // updatedAt will be handled by the database automatically
        })
        
        setImageFiles([])
        setImagePreviews([])
        setErrors({})
        onClose()
      } catch (error) {
        console.error('Error converting images:', error)
        setErrors({ ...errors, images: 'Error processing image files' })
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

              {/* Multiple Image Upload Section */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images * (PNG, JPG, etc.) - Up to 10 images
                </label>
                
                {/* Upload Area */}
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
                    const files = Array.from(e.dataTransfer.files)
                    if (files.length > 0) {
                      handleFileChange({ target: { files } } as any)
                    }
                  }}
                >
                  <div className="space-y-1 text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <span className="font-medium text-gray-900 hover:text-gray-700">
                        Upload files
                      </span>
                      <span className="pl-1">or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB each</p>
                  </div>
                </div>
                <input
                  id="image-upload-edit"
                  name="image-upload-edit"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleFileChange}
                />
                {errors.images && <p className="mt-1 text-sm text-red-600">{errors.images}</p>}
                
                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square overflow-hidden rounded-lg border-2 border-gray-200">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Primary Image Badge */}
                            {formData.primaryImageIndex === index && (
                              <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                Primary
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setPrimaryImage(index)}
                                  className="bg-white text-gray-800 px-3 py-1 rounded-full text-xs font-medium hover:bg-gray-100 transition-colors"
                                >
                                  Set Primary
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium hover:bg-red-600 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Instructions */}
                    <p className="mt-2 text-xs text-gray-500">
                      Click "Set Primary" to choose the main image, or drag images to reorder
                    </p>
                  </div>
                )}
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