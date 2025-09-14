import React, { useState, useEffect } from 'react'
import { X, DollarSign, Palette, Scissors, Circle, ArrowUp, Layers, Sparkles, Square } from 'lucide-react'
import { EmbroideryOption } from '../../types'
import ImageUpload from '../ImageUpload'

// Embroidery type options with icons and descriptions
const embroideryTypes = [
  {
    value: 'coverage',
    label: 'Coverage',
    icon: Palette,
    description: 'Full coverage embroidery designs'
  },
  {
    value: 'material',
    label: 'Material',
    icon: Layers,
    description: 'Special material options'
  },
  {
    value: 'thread',
    label: 'Thread',
    icon: Circle,
    description: 'Premium thread colors and types'
  },
  {
    value: 'border',
    label: 'Border',
    icon: Square,
    description: 'Border and edging designs'
  },
  {
    value: 'upgrade',
    label: 'Upgrade',
    icon: ArrowUp,
    description: 'Premium upgrade options'
  },
  {
    value: 'cutting',
    label: 'Cutting',
    icon: Scissors,
    description: 'Custom cutting and shaping'
  }
]

interface AddEmbroideryModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (option: Omit<EmbroideryOption, 'id'>) => void
}

// Custom Type Select Component
const TypeSelect: React.FC<{
  value: string
  onChange: (value: string) => void
  name?: string
}> = ({ value, onChange, name }) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectedType = embroideryTypes.find(type => type.value === value)

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Type *
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-white hover:border-gray-400 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {selectedType && (
              <>
                <selectedType.icon className="h-4 w-4 text-blue-600" />
                <span className="text-sm">{selectedType.label}</span>
              </>
            )}
          </div>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {embroideryTypes.map((type) => {
            const IconComponent = type.icon
            return (
              <div
                key={type.value}
                onClick={() => {
                  onChange(type.value)
                  setIsOpen(false)
                }}
                className={`p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                  value === type.value ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <IconComponent className={`h-5 w-5 ${
                    value === type.value ? 'text-blue-600' : 'text-gray-500'
                  }`} />
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${
                      value === type.value ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {type.label}
                    </div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                  {value === type.value && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Hidden select for form compatibility */}
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        required
      >
        {embroideryTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface EditEmbroideryModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (option: EmbroideryOption) => void
  option: EmbroideryOption | null
}

interface DeleteEmbroideryModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  option: EmbroideryOption | null
}

export const AddEmbroideryModal: React.FC<AddEmbroideryModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [formData, setFormData] = useState<{
    name: string
    category: EmbroideryOption['category']
    price: number
    description: string
    image?: string
  }>({
    name: '',
    category: 'coverage',
    price: 0,
    description: '',
    image: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd({
      ...formData,
      image: formData.image || '',
      stitches: 0,
      estimatedTime: '',
      level: 'basic',
      isPopular: false,
      isActive: true,
      isIncompatible: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    setFormData({
      name: '',
      category: 'coverage',
      price: 0,
      description: '',
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


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add New Embroidery Option</h2>
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
              placeholder="Enter option name"
            />
          </div>

          <div>
          <TypeSelect
            value={formData.category}
            onChange={(value) => setFormData(prev => ({ ...prev, category: value as EmbroideryOption['category'] }))}
            name="category"
          />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image
            </label>
            <ImageUpload
              value={formData.image || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, image: Array.isArray(value) ? value[0] : value }))}
              multiple={false}
              maxFiles={1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
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
              placeholder="Enter option description"
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
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Option
          </button>
        </div>
      </div>
    </div>
  )
}

export const EditEmbroideryModal: React.FC<EditEmbroideryModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  option
}) => {
  const [formData, setFormData] = useState<{
    name: string
    category: EmbroideryOption['category']
    price: number
    description: string
    image?: string
  }>({
    name: '',
    category: 'coverage',
    price: 0,
    description: '',
    image: ''
  })

  useEffect(() => {
    if (option) {
      setFormData({
        name: option.name,
        category: option.category,
        price: option.price,
        description: option.description || '',
        image: option.image || ''
      })
    }
  }, [option])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (option) {
      onUpdate({
        ...option,
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


  if (!isOpen || !option) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Edit Embroidery Option</h2>
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
              placeholder="Enter option name"
            />
          </div>

          <div>
          <TypeSelect
            value={formData.category}
            onChange={(value) => setFormData(prev => ({ ...prev, category: value as EmbroideryOption['category'] }))}
            name="category"
          />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image
            </label>
            <ImageUpload
              value={formData.image || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, image: Array.isArray(value) ? value[0] : value }))}
              multiple={false}
              maxFiles={1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
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
              placeholder="Enter option description"
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
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Update Option
          </button>
        </div>
      </div>
    </div>
  )
}

export const DeleteEmbroideryModal: React.FC<DeleteEmbroideryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  option
}) => {
  if (!isOpen || !option) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md mx-4">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Delete Embroidery Option</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete the embroidery option "{option.name}"? This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Option
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
