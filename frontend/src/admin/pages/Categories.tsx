import React, { useState } from 'react'
import { useAdmin } from '../context/AdminContext'
import { 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical,
  Image,
  GripVertical,
  Eye,
  EyeOff
} from 'lucide-react'
import { AddCategoryModal, EditCategoryModal, DeleteCategoryModal } from '../components/modals/CategoryModals'
import HelpModal from '../components/modals/HelpModal'
import { Category } from '../types'

const Categories: React.FC = () => {
  const { state, dispatch } = useAdmin()
  const { categories } = state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Pagination logic
  const totalItems = categories.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCategories = categories.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSelectAll = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([])
    } else {
      setSelectedCategories(categories.map(c => c.id))
    }
  }

  const handleAddCategory = (categoryData: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...categoryData,
      id: Date.now().toString(),
      createdAt: new Date(),
      children: []
    }
    dispatch({ type: 'ADD_CATEGORY', payload: newCategory })
  }

  const handleUpdateCategory = (category: Category) => {
    dispatch({ type: 'UPDATE_CATEGORY', payload: category })
  }

  const handleDeleteCategory = (categoryId: string) => {
    dispatch({ type: 'DELETE_CATEGORY', payload: categoryId })
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category)
    setIsEditModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (selectedCategory) {
      handleDeleteCategory(selectedCategory.id)
      setIsDeleteModalOpen(false)
      setSelectedCategory(null)
    }
  }

  const handleToggleStatus = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    if (category) {
      const updatedCategory = {
        ...category,
        status: category.status === 'active' ? 'inactive' as const : 'active' as const
      }
      dispatch({ type: 'UPDATE_CATEGORY', payload: updatedCategory })
    }
  }

  const renderCategoryRow = (category: any, level = 0) => {
    const isSelected = selectedCategories.includes(category.id)
    const hasChildren = category.children && category.children.length > 0

    return (
      <React.Fragment key={category.id}>
        <tr className="hover:bg-gray-50">
          <td className="px-3 py-3 whitespace-nowrap">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectCategory(category.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </td>
          <td className="px-3 py-3 whitespace-nowrap">
            <div className="flex items-center" style={{ paddingLeft: `${level * 16}px` }}>
              {hasChildren && (
                <GripVertical className="h-3 w-3 text-gray-400 mr-2" />
              )}
              <div className="flex items-center">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Image className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900 truncate">{category.name}</div>
                  <div className="text-xs text-gray-500 truncate">{category.slug}</div>
                </div>
              </div>
            </div>
          </td>
          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
            <div className="truncate max-w-xs" title={category.description || 'No description'}>
              {category.description || 'No description'}
            </div>
          </td>
          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
            {category.sortOrder}
          </td>
          <td className="px-3 py-3 whitespace-nowrap">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
              category.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                category.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
              }`}></div>
              {category.status}
            </span>
          </td>
          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
            {category.createdAt.toLocaleDateString()}
          </td>
          <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
            <div className="flex items-center justify-end space-x-1">
              <button
                onClick={() => handleToggleStatus(category.id)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title={category.status === 'active' ? 'Hide category' : 'Show category'}
              >
                {category.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button
                onClick={() => handleEditCategory(category)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedCategory(category)
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
        {hasChildren && category.children.map((child: any) => renderCategoryRow(child, level + 1))}
      </React.Fragment>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="mt-1 text-sm text-gray-500">
              Organize your products with categories and subcategories
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
              onClick={() => setIsAddModalOpen(true)}
              className="bg-gray-900 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-gray-800 flex items-center text-sm sm:text-base"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="hidden sm:inline">Add Category</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedCategories.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedCategories.length} categor{selectedCategories.length > 1 ? 'ies' : 'y'} selected
            </span>
            <div className="flex space-x-2">
              <button className="text-sm text-blue-700 hover:text-blue-800">Bulk Edit</button>
              <button className="text-sm text-blue-700 hover:text-blue-800">Change Status</button>
              <button className="text-sm text-red-700 hover:text-red-800">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Categories table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 hidden lg:table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedCategories.length === categories.length && categories.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-80">
                  Category
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                  Description
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Sort Order
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
              {paginatedCategories.map(category => renderCategoryRow(category))}
            </tbody>
          </table>

          {/* Mobile Card Layout */}
          <div className="lg:hidden">
            {paginatedCategories.map(category => (
              <div key={category.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleSelectCategory(category.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{category.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{category.slug}</p>
                        <p className="text-xs text-gray-400 mt-1">Order: {category.sortOrder}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={() => handleToggleStatus(category.id)}
                          className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"
                        >
                          Active
                        </button>
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-gray-500">Description</p>
                      <p className="text-sm text-gray-900 line-clamp-2">{category.description}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {category.parentId && (
                          <span className="text-xs text-gray-500">Sub-category</span>
                        )}
                        <span className="text-xs text-gray-500">
                          {category.createdAt.toLocaleDateString()}
                        </span>
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
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="How to use: Categories">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Use Add Category to create parent or child categories.</li>
          <li>Pick a parent to nest a category; leave blank for a top-level one.</li>
          <li>Toggle visibility using the status action.</li>
          <li>Edit to change name, slug, description, or parent.</li>
          <li>Navigate with pagination at the bottom.</li>
        </ol>
      </HelpModal>

      {/* Modals */}
      <AddCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddCategory}
        existingCategories={categories}
      />
      
      <EditCategoryModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedCategory(null)
        }}
        onUpdate={handleUpdateCategory}
        category={selectedCategory}
        existingCategories={categories}
      />
      
      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedCategory(null)
        }}
        onConfirm={handleConfirmDelete}
        category={selectedCategory}
      />
    </div>
  )
}

export default Categories
