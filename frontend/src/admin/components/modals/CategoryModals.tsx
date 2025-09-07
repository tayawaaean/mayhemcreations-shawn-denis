import React, { useState, useEffect } from 'react'
import { X, Image } from 'lucide-react'
import { Category } from '../../types'

interface AddCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (category: Omit<Category, 'id'>) => void
  existingCategories: Category[]
}

interface EditCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (category: Category) => void
  category: Category | null
  existingCategories: Category[]
}

interface DeleteCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  category: Category | null
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingCategories
}) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: '',
    sortOrder: 1,
    status: 'active' as 'active' | 'inactive',
    image: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd({
      ...formData,
      createdAt: new Date()
    })
    setFormData({
      name: '',
      slug: '',
      description: '',
      parentId: '',
      sortOrder: 1,
      status: 'active',
      image: ''
    })
    onClose()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }))
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      status: e.target.checked ? 'active' : 'inactive'
    }))
  }

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name && !formData.slug) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setFormData(prev => ({ ...prev, slug }))
    }
  }, [formData.name])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add New Category</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Category name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug *
            </label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="category-slug"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Category description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Category
            </label>
            <select
              name="parentId"
              value={formData.parentId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No parent (top-level category)</option>
              {existingCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort Order
            </label>
            <input
              type="number"
              name="sortOrder"
              value={formData.sortOrder}
              onChange={handleChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="url"
              name="image"
              value={formData.image}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="status"
              checked={formData.status === 'active'}
              onChange={handleStatusChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="status" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
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
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Category
          </button>
        </div>
      </div>
    </div>
  )
}

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  category,
  existingCategories
}) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: '',
    sortOrder: 1,
    status: 'active' as 'active' | 'inactive',
    image: ''
  })

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        parentId: category.parentId || '',
        sortOrder: category.sortOrder,
        status: category.status,
        image: category.image || ''
      })
    }
  }, [category])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (category) {
      onUpdate({
        ...category,
        ...formData
      })
    }
    onClose()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }))
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      status: e.target.checked ? 'active' : 'inactive'
    }))
  }

  if (!isOpen || !category) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Edit Category</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Category name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug *
            </label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="category-slug"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Category description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Category
            </label>
            <select
              name="parentId"
              value={formData.parentId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No parent (top-level category)</option>
              {existingCategories.filter(cat => cat.id !== category.id).map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort Order
            </label>
            <input
              type="number"
              name="sortOrder"
              value={formData.sortOrder}
              onChange={handleChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="url"
              name="image"
              value={formData.image}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="status"
              checked={formData.status === 'active'}
              onChange={handleStatusChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="status" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
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
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Update Category
          </button>
        </div>
      </div>
    </div>
  )
}

export const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  category
}) => {
  if (!isOpen || !category) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Delete Category</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Image className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete this category?
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900 mb-1">Category:</p>
                <p className="text-sm text-gray-600">{category.name}</p>
                {category.description && (
                  <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                )}
              </div>
              <p className="text-xs text-red-600 mt-2">
                This action cannot be undone and may affect products in this category.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Category
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
