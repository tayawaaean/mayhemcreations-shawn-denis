import React, { useState } from 'react'
import { useAdmin } from '../context/AdminContext'
import { 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical,
  HelpCircle,
  GripVertical,
  Eye,
  EyeOff,
  Search
} from 'lucide-react'
import { AddFAQModal, EditFAQModal, DeleteFAQModal } from '../components/modals/FAQModals'
import { FAQ } from '../types'

const FAQs: React.FC = () => {
  const { state, dispatch } = useAdmin()
  const { faqs } = state
  const [selectedFAQs, setSelectedFAQs] = useState<string[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Pagination logic
  const totalItems = filteredFAQs.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedFAQs = filteredFAQs.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const categories = Array.from(new Set(faqs.map(f => f.category)))

  const handleSelectFAQ = (faqId: string) => {
    setSelectedFAQs(prev => 
      prev.includes(faqId) 
        ? prev.filter(id => id !== faqId)
        : [...prev, faqId]
    )
  }

  const handleSelectAll = () => {
    if (selectedFAQs.length === filteredFAQs.length) {
      setSelectedFAQs([])
    } else {
      setSelectedFAQs(filteredFAQs.map(f => f.id))
    }
  }

  const handleAddFAQ = (faqData: Omit<FAQ, 'id'>) => {
    const newFAQ: FAQ = {
      ...faqData,
      id: Date.now().toString(),
      createdAt: new Date()
    }
    dispatch({ type: 'ADD_FAQ', payload: newFAQ })
  }

  const handleUpdateFAQ = (faq: FAQ) => {
    dispatch({ type: 'UPDATE_FAQ', payload: faq })
  }

  const handleDeleteFAQ = (faqId: string) => {
    dispatch({ type: 'DELETE_FAQ', payload: faqId })
  }

  const handleEditFAQ = (faq: FAQ) => {
    setSelectedFAQ(faq)
    setIsEditModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (selectedFAQ) {
      handleDeleteFAQ(selectedFAQ.id)
      setIsDeleteModalOpen(false)
      setSelectedFAQ(null)
    }
  }

  const handleToggleStatus = (faqId: string) => {
    const faq = faqs.find(f => f.id === faqId)
    if (faq) {
      const updatedFAQ = {
        ...faq,
        status: faq.status === 'active' ? 'inactive' as const : 'active' as const
      }
      dispatch({ type: 'UPDATE_FAQ', payload: updatedFAQ })
    }
  }

  const handleMoveUp = (faqId: string) => {
    const faq = faqs.find(f => f.id === faqId)
    if (faq && faq.sortOrder > 1) {
      const updatedFAQ = {
        ...faq,
        sortOrder: faq.sortOrder - 1
      }
      dispatch({ type: 'UPDATE_FAQ', payload: updatedFAQ })
    }
  }

  const handleMoveDown = (faqId: string) => {
    const faq = faqs.find(f => f.id === faqId)
    if (faq) {
      const updatedFAQ = {
        ...faq,
        sortOrder: faq.sortOrder + 1
      }
      dispatch({ type: 'UPDATE_FAQ', payload: updatedFAQ })
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">FAQs</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage frequently asked questions and their order
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gray-900 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-gray-800 flex items-center text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="hidden sm:inline">Add FAQ</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search FAQs..."
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
        </div>
      </div>

      {/* Bulk actions */}
      {selectedFAQs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedFAQs.length} FAQ{selectedFAQs.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button className="text-sm text-blue-700 hover:text-blue-800">Bulk Edit</button>
              <button className="text-sm text-blue-700 hover:text-blue-800">Change Status</button>
              <button className="text-sm text-red-700 hover:text-red-800">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* FAQs list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 hidden lg:table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedFAQs.length === filteredFAQs.length && filteredFAQs.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Order
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-96">
                  FAQ
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Category
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Created
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedFAQs
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((faq) => (
                <tr key={faq.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedFAQs.includes(faq.id)}
                      onChange={() => handleSelectFAQ(faq.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleMoveUp(faq.id)}
                        disabled={faq.sortOrder === 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <GripVertical className="h-3 w-3 rotate-90" />
                      </button>
                      <span className="text-sm text-gray-500 w-4 text-center">{faq.sortOrder}</span>
                      <button
                        onClick={() => handleMoveDown(faq.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <GripVertical className="h-3 w-3 -rotate-90" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-start">
                      <div className="h-8 w-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="ml-3 min-w-0">
                        <div className="text-sm font-medium text-gray-900 mb-1 truncate">
                          {faq.question}
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    {faq.category}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      faq.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        faq.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                      }`}></div>
                      {faq.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    {faq.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => handleToggleStatus(faq.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title={faq.status === 'active' ? 'Hide FAQ' : 'Show FAQ'}
                      >
                        {faq.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleEditFAQ(faq)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFAQ(faq)
                          setIsDeleteModalOpen(true)
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card Layout */}
          <div className="lg:hidden">
            {paginatedFAQs.map((faq) => (
              <div key={faq.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedFAQs.includes(faq.id)}
                    onChange={() => handleSelectFAQ(faq.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{faq.question}</h3>
                        <p className="text-xs text-gray-400 mt-1">Order: {faq.sortOrder}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={() => handleToggleStatus(faq.id)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            faq.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {faq.isActive ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => handleEditFAQ(faq)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFAQ(faq)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-gray-500">Answer</p>
                      <p className="text-sm text-gray-900 line-clamp-3">{faq.answer}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-xs text-gray-500">{faq.category}</span>
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

      {/* Modals */}
      <AddFAQModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddFAQ}
      />
      
      <EditFAQModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedFAQ(null)
        }}
        onUpdate={handleUpdateFAQ}
        faq={selectedFAQ}
      />
      
      <DeleteFAQModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedFAQ(null)
        }}
        onConfirm={handleConfirmDelete}
        faq={selectedFAQ}
      />
    </div>
  )
}

export default FAQs
