import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, DollarSign, Package, AlertCircle, Calculator, Ruler, Loader2 } from 'lucide-react'
import Button from '../../components/Button'
import { materialCostApiService, MaterialCost } from '../../shared/materialCostApiService'
import { MaterialPricingService, InputParameters, CostBreakdown } from '../../shared/materialPricingService'

export default function MaterialCosts() {
  const [materialCosts, setMaterialCosts] = useState<MaterialCost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<MaterialCost | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    width: '',
    length: '',
    wasteFactor: '1.0',
    isActive: true
  })
  
  // Pricing calculator state
  const [patchWidth, setPatchWidth] = useState<number>(0)
  const [patchHeight, setPatchHeight] = useState<number>(0)
  const [calculatedCosts, setCalculatedCosts] = useState<CostBreakdown | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)

  useEffect(() => {
    loadMaterialCosts()
  }, [])


  const loadMaterialCosts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await materialCostApiService.getMaterialCosts()
      if (response.success) {
        setMaterialCosts(response.data)
        // Update the pricing service with fresh data
        MaterialPricingService.setMaterials(response.data)
        console.log('Admin: Materials loaded and set in pricing service:', response.data)
      } else {
        setError('Failed to load material costs')
      }
    } catch (err) {
      setError('Failed to load material costs')
      console.error('Error loading material costs:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate pricing when dimensions change
  useEffect(() => {
    if (patchWidth > 0 && patchHeight > 0) {
      calculatePricing()
    }
  }, [patchWidth, patchHeight, materialCosts])

  const calculatePricing = () => {
    try {
      setPricingLoading(true)
      const input: InputParameters = {
        patchWidth,
        patchHeight
      }
      
      console.log('Admin: Calculating pricing for:', input)
      const costs = MaterialPricingService.calculateMaterialCosts(input)
      console.log('Admin: Calculated costs:', costs)
      setCalculatedCosts(costs)
    } catch (err) {
      console.error('Error calculating pricing:', err)
    } finally {
      setPricingLoading(false)
    }
  }

  const handleWidthChange = (value: string) => {
    const numValue = parseFloat(value) || 0
    setPatchWidth(numValue)
  }

  const handleHeightChange = (value: string) => {
    const numValue = parseFloat(value) || 0
    setPatchHeight(numValue)
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        name: formData.name,
        cost: parseFloat(formData.cost),
        width: parseFloat(formData.width),
        length: parseFloat(formData.length),
        wasteFactor: parseFloat(formData.wasteFactor),
        isActive: formData.isActive
      }

      if (editingMaterial) {
        const response = await materialCostApiService.updateMaterialCost(editingMaterial.id, data)
        if (response.success) {
          await loadMaterialCosts()
          resetForm()
        } else {
          setError('Failed to update material cost')
        }
      } else {
        const response = await materialCostApiService.createMaterialCost(data)
        if (response.success) {
          await loadMaterialCosts()
          resetForm()
        } else {
          setError('Failed to create material cost')
        }
      }
    } catch (err) {
      setError('Failed to save material cost')
      console.error('Error saving material cost:', err)
    }
  }

  const handleEdit = (material: MaterialCost) => {
    setEditingMaterial(material)
    setFormData({
      name: material.name,
      cost: material.cost.toString(),
      width: material.width.toString(),
      length: material.length.toString(),
      wasteFactor: material.wasteFactor.toString(),
      isActive: material.isActive
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this material cost?')) return

    try {
      const response = await materialCostApiService.deleteMaterialCost(id)
      if (response.success) {
        await loadMaterialCosts()
      } else {
        setError('Failed to delete material cost')
      }
    } catch (err) {
      setError('Failed to delete material cost')
      console.error('Error deleting material cost:', err)
    }
  }

  const handleToggleStatus = async (id: number) => {
    try {
      const response = await materialCostApiService.toggleMaterialCostStatus(id)
      if (response.success) {
        await loadMaterialCosts()
      } else {
        setError('Failed to toggle material cost status')
      }
    } catch (err) {
      setError('Failed to toggle material cost status')
      console.error('Error toggling material cost status:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      cost: '',
      width: '',
      length: '',
      wasteFactor: '1.0',
      isActive: true
    })
    setEditingMaterial(null)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="container">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading material costs...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Material Costs
              </h1>
              <p className="text-lg text-gray-600">
                Manage material costs for embroidery pricing calculations
              </p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="group"
            >
              <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
              Add Material Cost
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Real-time Pricing Calculator */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Calculator className="w-6 h-6 text-accent mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Real-time Pricing Calculator</h3>
                <p className="text-sm text-gray-600">Test material cost calculations with different dimensions</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Ruler className="w-4 h-4 inline mr-2" />
                  Width (inches)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={patchWidth || ''}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Ruler className="w-4 h-4 inline mr-2" />
                  Height (inches)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={patchHeight || ''}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Area Display */}
            {patchWidth > 0 && patchHeight > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Area:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {(patchWidth * patchHeight).toFixed(2)} sq in
                  </span>
                </div>
              </div>
            )}

            {/* Loading State */}
            {pricingLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent mr-2" />
                <span className="text-gray-600">Calculating pricing...</span>
              </div>
            )}

            {/* Material Cost Breakdown */}
            {calculatedCosts && patchWidth > 0 && patchHeight > 0 && (
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Material Cost Breakdown</h4>
                
                {/* Cost Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-sm text-gray-700">Fabric</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatPrice(calculatedCosts.fabricCost)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-sm text-gray-700">Patch Attach</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatPrice(calculatedCosts.patchAttachCost)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-purple-600 mr-2" />
                      <span className="text-sm text-gray-700">Thread</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatPrice(calculatedCosts.threadCost)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-orange-600 mr-2" />
                      <span className="text-sm text-gray-700">Bobbin</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatPrice(calculatedCosts.bobbinCost)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-red-600 mr-2" />
                      <span className="text-sm text-gray-700">Cut-Away Stabilizer</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatPrice(calculatedCosts.cutAwayStabilizerCost)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-indigo-600 mr-2" />
                      <span className="text-sm text-gray-700">Wash-Away Stabilizer</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatPrice(calculatedCosts.washAwayStabilizerCost)}
                    </span>
                  </div>
                </div>

                {/* Total Cost */}
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DollarSign className="w-5 h-5 text-accent mr-2" />
                      <span className="text-lg font-semibold text-gray-900">Total Material Cost</span>
                    </div>
                    <span className="text-2xl font-bold text-accent">
                      {formatPrice(calculatedCosts.totalCost)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!patchWidth || !patchHeight) && !pricingLoading && (
              <div className="text-center py-8">
                <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Enter width and height to see pricing</p>
              </div>
            )}
          </div>
        </div>

        {/* Material Costs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cost</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Dimensions</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Waste Factor</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {materialCosts.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="font-medium text-gray-900">{material.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                        <span className="font-semibold text-gray-900">{parseFloat(material.cost).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {parseFloat(material.width) > 0 ? `${parseFloat(material.width)}" × ${parseFloat(material.length)}"` : `${parseFloat(material.length)} units`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {parseFloat(material.wasteFactor)}x
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(material.id)}
                        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          material.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {material.isActive ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                        <span>{material.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(material)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {editingMaterial ? 'Edit Material Cost' : 'Add Material Cost'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                      placeholder="e.g., Fabric, Thread, Bobbin"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost per Unit ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Width (inches) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.width}
                        onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Length (inches) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.length}
                        onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Waste Factor
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="10.0"
                      value={formData.wasteFactor}
                      onChange={(e) => setFormData({ ...formData, wasteFactor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
                      placeholder="1.0"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-accent focus:ring-accent border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                      Active
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingMaterial ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
