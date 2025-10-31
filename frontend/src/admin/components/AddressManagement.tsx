/**
 * Address Management Component
 * Admin interface for managing warehouse and business addresses
 */

import React, { useState, useEffect } from 'react';
import { Address } from '../../types/address';
import { apiService, ErrorCategory } from '../services/apiService';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

// Field error mapping
interface FieldErrors {
  [key: string]: string;
}

interface AddressManagementProps {
  onAddressChange?: (address: Address | null) => void;
}

const AddressManagement: React.FC<AddressManagementProps> = ({ onAddressChange }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'origin' | 'return' | 'warehouse'>('all');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'origin' as 'origin' | 'return' | 'warehouse',
    is_default: false,
    contact_name: '',
    company_name: '',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    residential_indicator: 'no' as 'yes' | 'no' | 'unknown',
    notes: ''
  });

  // Fetch addresses
  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const { apiClient } = await import('../../shared/axiosConfig')
      const { data } = await apiClient.get('/admin/addresses')
      setAddresses(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch addresses');
    } finally {
      setLoading(false);
    }
  };

  // Create or update address
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { apiClient } = await import('../../shared/axiosConfig')
      const url = editingAddress 
        ? `/admin/addresses/${editingAddress.id}`
        : '/admin/addresses';
      
      const method = editingAddress ? 'PUT' : 'POST';
      await apiClient.request({ url, method, data: formData })

      await fetchAddresses();
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address');
    }
  };

  // Delete address
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      const { apiClient } = await import('../../shared/axiosConfig')
      await apiClient.delete(`/admin/addresses/${id}`)

      await fetchAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete address');
    }
  };

  // Set default address
  const handleSetDefault = async (id: number) => {
    try {
      const { apiClient } = await import('../../shared/axiosConfig')
      await apiClient.put(`/admin/addresses/${id}/set-default`)

      await fetchAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default address');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'origin',
      is_default: false,
      contact_name: '',
      company_name: '',
      phone: '',
      email: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
      residential_indicator: 'no',
      notes: ''
    });
    setEditingAddress(null);
  };

  // Edit address
  const handleEdit = (address: Address) => {
    setFormData({
      name: address.name,
      type: address.type,
      is_default: address.is_default,
      contact_name: address.contact_name,
      company_name: address.company_name || '',
      phone: address.phone || '',
      email: address.email || '',
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      residential_indicator: address.residential_indicator,
      notes: address.notes || ''
    });
    setEditingAddress(address);
    setShowForm(true);
  };

  // Filter addresses
  const filteredAddresses = filterType === 'all' 
    ? addresses 
    : addresses.filter(addr => addr.type === filterType);

  useEffect(() => {
    fetchAddresses();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Address Management</h2>
          <p className="text-gray-600">Manage warehouse and business addresses</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Address
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="flex space-x-4">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-lg ${
            filterType === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType('origin')}
          className={`px-4 py-2 rounded-lg ${
            filterType === 'origin' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Origin
        </button>
        <button
          onClick={() => setFilterType('return')}
          className={`px-4 py-2 rounded-lg ${
            filterType === 'return' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Return
        </button>
        <button
          onClick={() => setFilterType('warehouse')}
          className={`px-4 py-2 rounded-lg ${
            filterType === 'warehouse' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Warehouse
        </button>
      </div>

      {/* Address List */}
      <div className="grid gap-4">
        {filteredAddresses.map((address) => (
          <div key={address.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900">{address.name}</h3>
                  {address.is_default && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Default
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    address.type === 'origin' ? 'bg-blue-100 text-blue-800' :
                    address.type === 'return' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {address.type}
                  </span>
                </div>
                
                <div className="mt-2 text-gray-600">
                  <p className="font-medium">{address.contact_name}</p>
                  {address.company_name && <p>{address.company_name}</p>}
                  <p>{address.address_line1}</p>
                  {address.address_line2 && <p>{address.address_line2}</p>}
                  <p>{address.city}, {address.state} {address.postal_code}</p>
                  <p>{address.country}</p>
                  {address.phone && <p>Phone: {address.phone}</p>}
                  {address.email && <p>Email: {address.email}</p>}
                </div>
              </div>

              <div className="flex space-x-2">
                {!address.is_default && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="text-green-600 hover:text-green-700 text-sm"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleEdit(address)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Edit
                </button>
                {!address.is_default && (
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Address Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="origin">Origin</option>
                      <option value="return">Return</option>
                      <option value="warehouse">Warehouse</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={formData.address_line1}
                      onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={formData.address_line2}
                      onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="MX">Mexico</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Residential Indicator
                    </label>
                    <select
                      value={formData.residential_indicator}
                      onChange={(e) => setFormData({ ...formData, residential_indicator: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="no">No (Commercial)</option>
                      <option value="yes">Yes (Residential)</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_default}
                        onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Set as default {formData.type} address
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingAddress ? 'Update Address' : 'Create Address'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressManagement;
