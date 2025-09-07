import React, { useState, useEffect } from 'react'
import { X, HelpCircle } from 'lucide-react'
import { FAQ } from '../../types'

interface AddFAQModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (faq: Omit<FAQ, 'id'>) => void
}

interface EditFAQModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (faq: FAQ) => void
  faq: FAQ | null
}

interface DeleteFAQModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  faq: FAQ | null
}

export const AddFAQModal: React.FC<AddFAQModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'General',
    sortOrder: 1,
    status: 'active' as 'active' | 'inactive'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(formData)
    setFormData({
      question: '',
      answer: '',
      category: 'General',
      sortOrder: 1,
      status: 'active'
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add New FAQ</h2>
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
              Question *
            </label>
            <input
              type="text"
              name="question"
              value={formData.question}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="What is your question?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Answer *
            </label>
            <textarea
              name="answer"
              value={formData.answer}
              onChange={handleChange}
              rows={6}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Provide a detailed answer..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="General">General</option>
                <option value="Shipping">Shipping</option>
                <option value="Returns">Returns</option>
                <option value="Customization">Customization</option>
                <option value="Payment">Payment</option>
                <option value="Product">Product</option>
                <option value="Account">Account</option>
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
            Create FAQ
          </button>
        </div>
      </div>
    </div>
  )
}

export const EditFAQModal: React.FC<EditFAQModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  faq
}) => {
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'General',
    sortOrder: 1,
    status: 'active' as 'active' | 'inactive'
  })

  useEffect(() => {
    if (faq) {
      setFormData({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        sortOrder: faq.sortOrder,
        status: faq.status
      })
    }
  }, [faq])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (faq) {
      onUpdate({
        ...faq,
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

  if (!isOpen || !faq) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Edit FAQ</h2>
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
              Question *
            </label>
            <input
              type="text"
              name="question"
              value={formData.question}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="What is your question?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Answer *
            </label>
            <textarea
              name="answer"
              value={formData.answer}
              onChange={handleChange}
              rows={6}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Provide a detailed answer..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="General">General</option>
                <option value="Shipping">Shipping</option>
                <option value="Returns">Returns</option>
                <option value="Customization">Customization</option>
                <option value="Payment">Payment</option>
                <option value="Product">Product</option>
                <option value="Account">Account</option>
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
            Update FAQ
          </button>
        </div>
      </div>
    </div>
  )
}

export const DeleteFAQModal: React.FC<DeleteFAQModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  faq
}) => {
  if (!isOpen || !faq) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md mx-4">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Delete FAQ</h2>
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
                <HelpCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete this FAQ?
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900 mb-1">Question:</p>
                <p className="text-sm text-gray-600">{faq.question}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
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
              Delete FAQ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
