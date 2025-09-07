import React, { useState } from 'react'
import { useAdmin } from '../context/AdminContext'
import {
  Plus,
  Edit,
  Trash2,
  Palette,
  DollarSign,
  Eye,
  EyeOff,
  Scissors,
  Circle,
  ArrowUp,
  Layers,
  Square
} from 'lucide-react'
import { AddEmbroideryModal, EditEmbroideryModal, DeleteEmbroideryModal } from '../components/modals/EmbroideryModals'
import { EmbroideryOption } from '../types'

const Embroidery: React.FC = () => {
  const { state, dispatch } = useAdmin()
  const { embroideryOptions } = state
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<EmbroideryOption | null>(null)
  const [selectedType, setSelectedType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredOptions = embroideryOptions.filter(option => 
    selectedType === 'all' || option.type === selectedType
  )

  // Pagination logic
  const totalItems = filteredOptions.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOptions = filteredOptions.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSelectOption = (optionId: string) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    )
  }

  const handleSelectAll = () => {
    if (selectedOptions.length === filteredOptions.length) {
      setSelectedOptions([])
    } else {
      setSelectedOptions(filteredOptions.map(o => o.id))
    }
  }

  const handleAddOption = (optionData: Omit<EmbroideryOption, 'id'>) => {
    const newOption: EmbroideryOption = {
      ...optionData,
      id: Date.now().toString()
    }
    dispatch({ type: 'ADD_EMBROIDERY_OPTION', payload: newOption })
  }

  const handleUpdateOption = (option: EmbroideryOption) => {
    dispatch({ type: 'UPDATE_EMBROIDERY_OPTION', payload: option })
  }

  const handleDeleteOption = (optionId: string) => {
    dispatch({ type: 'DELETE_EMBROIDERY_OPTION', payload: optionId })
  }

  const handleEditOption = (option: EmbroideryOption) => {
    setSelectedOption(option)
    setIsEditModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (selectedOption) {
      handleDeleteOption(selectedOption.id)
      setIsDeleteModalOpen(false)
      setSelectedOption(null)
    }
  }

  const handleToggleStatus = (optionId: string) => {
    const option = embroideryOptions.find(o => o.id === optionId)
    if (option) {
      const updatedOption = {
        ...option,
        status: option.status === 'active' ? 'inactive' as const : 'active' as const
      }
      dispatch({ type: 'UPDATE_EMBROIDERY_OPTION', payload: updatedOption })
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'coverage':
        return <Palette className="h-4 w-4" />
      case 'material':
        return <Layers className="h-4 w-4" />
      case 'thread':
        return <Circle className="h-4 w-4" />
      case 'border':
        return <Square className="h-4 w-4" />
      case 'upgrade':
        return <ArrowUp className="h-4 w-4" />
      case 'cutting':
        return <Scissors className="h-4 w-4" />
      default:
        return <Palette className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'coverage':
        return 'bg-blue-100 text-blue-800'
      case 'material':
        return 'bg-green-100 text-green-800'
      case 'thread':
        return 'bg-purple-100 text-purple-800'
      case 'border':
        return 'bg-yellow-100 text-yellow-800'
      case 'upgrade':
        return 'bg-red-100 text-red-800'
      case 'cutting':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'coverage', label: 'Coverage' },
    { value: 'material', label: 'Material' },
    { value: 'thread', label: 'Thread' },
    { value: 'border', label: 'Border' },
    { value: 'upgrade', label: 'Upgrade' },
    { value: 'cutting', label: 'Cutting' }
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Embroidery Options</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage embroidery styles, materials, and pricing options
            </p>
          </div>
           <button
             onClick={() => setIsAddModalOpen(true)}
             className="bg-gray-900 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-gray-800 flex items-center text-sm sm:text-base"
           >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="hidden sm:inline">Add Option</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedOptions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedOptions.length} option{selectedOptions.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button className="text-sm text-blue-700 hover:text-blue-800">Bulk Edit</button>
              <button className="text-sm text-blue-700 hover:text-blue-800">Change Status</button>
              <button className="text-sm text-red-700 hover:text-red-800">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Options table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 hidden lg:table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedOptions.length === filteredOptions.length && filteredOptions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Option
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Type
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Price
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
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedOptions.map((option) => (
                <tr key={option.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedOptions.includes(option.id)}
                      onChange={() => handleSelectOption(option.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                        {option.image ? (
                          <img
                            src={option.image}
                            alt={option.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getTypeIcon(option.type)
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 truncate">{option.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(option.type)}`}>
                      {option.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                    ${option.price.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    <div className="truncate max-w-xs" title={option.description || 'No description'}>
                      {option.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                    {option.sortOrder}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      option.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        option.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                      }`}></div>
                      {option.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => handleToggleStatus(option.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title={option.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {option.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                       <button
                         onClick={() => handleEditOption(option)}
                         className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                       >
                         <Edit className="h-4 w-4" />
                       </button>
                       <button
                         onClick={() => {
                           setSelectedOption(option)
                           setIsDeleteModalOpen(true)
                         }}
                         className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card Layout */}
          <div className="lg:hidden">
            {paginatedOptions.map((option) => (
              <div key={option.id} className="bg-white border-b border-gray-200 p-4 last:border-b-0">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option.id)}
                    onChange={() => handleSelectOption(option.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{option.name}</h3>
                        <div className="flex items-center mt-1">
                          <div className="h-6 w-6 bg-gray-200 rounded mr-2 flex items-center justify-center overflow-hidden">
                            {option.image ? (
                              <img
                                src={option.image}
                                alt={option.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-500 text-xs">
                                {getTypeIcon(option.type)}
                              </span>
                            )}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(option.type)}`}>
                            {option.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={() => handleToggleStatus(option.id)}
                          className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"
                        >
                          Active
                        </button>
                        <button
                          onClick={() => handleEditOption(option)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOption(option.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-sm font-medium text-gray-900">
                          {option.price === 0 ? 'Free' : `$${option.price.toFixed(2)}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Sort Order</p>
                        <p className="text-sm text-gray-900">{option.sortOrder}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-gray-500">Description</p>
                      <p className="text-sm text-gray-900 line-clamp-2">{option.description}</p>
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
      <AddEmbroideryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddOption}
      />
      
      <EditEmbroideryModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedOption(null)
        }}
        onUpdate={handleUpdateOption}
        option={selectedOption}
      />
      
      <DeleteEmbroideryModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedOption(null)
        }}
        onConfirm={handleConfirmDelete}
        option={selectedOption}
      />
    </div>
  )
}

export default Embroidery
