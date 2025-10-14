import React, { useState, useEffect } from 'react'
import { Package, TruckIcon, DollarSign, Search, RefreshCw, CheckCircle, AlertCircle, MapPin, Clock, Tag } from 'lucide-react'
import { ShipEngineApiService } from '../../shared/shipEngineApiService'

// Admin Shipping Management Page
// Test shipping rates, view carriers, and manage shipping configuration
const ShippingManagement: React.FC = () => {
  // State for rate calculation test
  const [testAddress, setTestAddress] = useState({
    firstName: 'John',
    lastName: 'Doe',
    street: '1600 Amphitheatre Parkway',
    city: 'Mountain View',
    state: 'CA',
    zipCode: '94043',
    country: 'US',
    phone: '+15105551234'
  })
  
  const [testItems, setTestItems] = useState([
    {
      id: 'test_1',
      name: 'Custom Embroidered Cap',
      quantity: 2,
      price: 29.99,
      weight: { value: 8, unit: 'ounce' as const }
    }
  ])
  
  const [manualWeight, setManualWeight] = useState<{
    value: number;
    unit: 'ounce' | 'pound';
  }>({
    value: 16,
    unit: 'ounce'
  })
  
  const [shippingRates, setShippingRates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRate, setSelectedRate] = useState<any>(null)
  
  // Configuration state
  const [configStatus, setConfigStatus] = useState<any>(null)
  const [carriers, setCarriers] = useState<any[]>([])
  
  // Load configuration on mount
  useEffect(() => {
    loadConfiguration()
  }, [])
  
  // Test ShipEngine API connection
  const testConnection = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/v1/shipping/shipengine/test', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('✅ ShipEngine API Connection Successful!\n\n' + 
              'Status: ' + (data.data?.status || 'verified') + '\n' +
              'API Key: Valid\n\n' +
              'Your API key is working correctly!')
      } else {
        setError(data.message || 'Connection test failed')
        alert('❌ ShipEngine API Connection Failed\n\n' + data.message)
      }
    } catch (err: any) {
      setError(err.message || 'Error testing connection')
      alert('❌ Error: ' + (err.message || 'Failed to test connection'))
    } finally {
      setLoading(false)
    }
  }
  
  // Test carriers endpoint
  const testCarriers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const carriersResponse = await ShipEngineApiService.getCarriers()
      
      if (carriersResponse.success && carriersResponse.data) {
        // Filter for USA carriers (those with domestic services)
        const usaCarriers = carriersResponse.data.filter((carrier: any) => {
          return carrier.services?.some((service: any) => service.domestic === true) ||
                 ['stamps_com', 'ups', 'fedex', 'usps'].includes(carrier.carrier_code)
        })
        
        setCarriers(usaCarriers)
        
        const carrierNames = usaCarriers.map((c: any) => c.friendly_name).join(', ')
        alert(`✅ Found ${usaCarriers.length} USA Carriers!\n\n${carrierNames}\n\nCarrier IDs loaded successfully.`)
      } else {
        setError('No carriers found. Please connect carriers in ShipEngine dashboard.')
        alert('⚠️ No carriers configured.\n\nPlease add carriers in your ShipEngine dashboard.')
      }
    } catch (err: any) {
      setError(err.message || 'Error loading carriers')
      alert('❌ Error loading carriers\n\n' + (err.message || 'Failed to fetch carriers'))
    } finally {
      setLoading(false)
    }
  }
  
  // Load ShipEngine configuration
  const loadConfiguration = async () => {
    try {
      const statusResponse = await ShipEngineApiService.getStatus()
      setConfigStatus(statusResponse.data)
      
      if (statusResponse.data?.configured) {
        const carriersResponse = await ShipEngineApiService.getCarriers()
        if (carriersResponse.success && carriersResponse.data) {
          // Filter for USA carriers (those with domestic services)
          const usaCarriers = carriersResponse.data.filter((carrier: any) => {
            return carrier.services?.some((service: any) => service.domestic === true) ||
                   ['stamps_com', 'ups', 'fedex', 'usps'].includes(carrier.carrier_code)
          })
          setCarriers(usaCarriers)
        }
      }
    } catch (err: any) {
      console.error('Error loading configuration:', err)
    }
  }
  
  // Calculate test shipping rates
  const calculateTestRates = async () => {
    try {
      setLoading(true)
      setError(null)
      setShippingRates([])
      setSelectedRate(null)
      
      // Use manual weight for testing
      const itemsWithManualWeight = [{
        ...testItems[0],
        quantity: 1,
        weight: manualWeight
      }]
      
      console.log('Calculating rates with:', {
        address: testAddress,
        weight: manualWeight,
        items: itemsWithManualWeight
      })
      
      const response = await ShipEngineApiService.calculateRates(testAddress, itemsWithManualWeight)
      
      console.log('Rate response:', response)
      
      if (response.success && response.data) {
        setShippingRates(response.data.rates)
        setSelectedRate(response.data.recommendedRate)
        
        // Check if we got real rates or fallback
        if (response.data.rates.length === 2 && 
            response.data.rates.some((r: any) => r.totalCost === 9.99)) {
          setError('⚠️ Using fallback rates. Check terminal logs for API error details.')
        }
      } else {
        setError(response.message || 'Failed to calculate rates')
      }
    } catch (err: any) {
      console.error('Rate calculation error:', err)
      setError(err.message || 'Error calculating shipping rates')
    } finally {
      setLoading(false)
    }
  }
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
  
  // Get carrier color
  const getCarrierColor = (carrier: string) => {
    const colors: Record<string, string> = {
      'USPS': 'bg-blue-100 text-blue-800',
      'UPS': 'bg-yellow-100 text-yellow-800',
      'FedEx': 'bg-purple-100 text-purple-800',
      'DHL': 'bg-red-100 text-red-800'
    }
    return colors[carrier] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Test shipping rates and manage shipping configuration
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={testConnection}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Test API
          </button>
          <button
            onClick={testCarriers}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            <TruckIcon className="w-4 h-4 mr-2" />
            Test Carriers
          </button>
          <button
            onClick={loadConfiguration}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ShipEngine Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ShipEngine Status</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {configStatus?.configured ? 'Configured' : 'Not Configured'}
              </p>
            </div>
            {configStatus?.configured ? (
              <CheckCircle className="w-10 h-10 text-green-500" />
            ) : (
              <AlertCircle className="w-10 h-10 text-red-500" />
            )}
          </div>
        </div>

        {/* Origin Address */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Origin Address</p>
              <p className="text-lg font-semibold text-gray-900 mt-2">
                {configStatus?.origin?.city}, {configStatus?.origin?.state}
              </p>
              <p className="text-sm text-gray-600">
                {configStatus?.origin?.postalCode}
              </p>
            </div>
            <MapPin className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        {/* Available Carriers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Carriers</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {carriers.length}
              </p>
            </div>
            <TruckIcon className="w-10 h-10 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Rate Calculator */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Test Rate Calculator</h2>
          <p className="text-sm text-gray-600 mt-1">
            Enter shipping details to get real-time rate quotes
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shipping Address Form */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Destination Address</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={testAddress.firstName}
                    onChange={(e) => setTestAddress({ ...testAddress, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={testAddress.lastName}
                    onChange={(e) => setTestAddress({ ...testAddress, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={testAddress.street}
                  onChange={(e) => setTestAddress({ ...testAddress, street: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={testAddress.city}
                    onChange={(e) => setTestAddress({ ...testAddress, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={testAddress.state}
                    onChange={(e) => setTestAddress({ ...testAddress, state: e.target.value })}
                    maxLength={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={testAddress.zipCode}
                    onChange={(e) => setTestAddress({ ...testAddress, zipCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={testAddress.phone}
                    onChange={(e) => setTestAddress({ ...testAddress, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Package Weight (Manual Override)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="150"
                    value={manualWeight.value}
                    onChange={(e) => setManualWeight({ ...manualWeight, value: parseFloat(e.target.value) || 1 })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={manualWeight.unit}
                    onChange={(e) => setManualWeight({ ...manualWeight, unit: e.target.value as 'ounce' | 'pound' })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ounce">oz</option>
                    <option value="pound">lbs</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Default: 16 oz (1 lb). Typical range: 4-64 oz for small packages.
                </p>
              </div>

              <button
                onClick={calculateTestRates}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Calculating Rates...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Calculate Shipping Rates
                  </>
                )}
              </button>
            </div>

            {/* Shipping Rates Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Shipping Rates</h3>
                {manualWeight && (
                  <span className="text-sm text-gray-600">
                    Weight: {manualWeight.value} {manualWeight.unit}
                  </span>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Error</p>
                      <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">{error}</p>
                      <p className="text-xs text-red-600 mt-2">
                        💡 Check browser console (F12) and backend terminal for detailed error logs
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!loading && shippingRates.length === 0 && !error && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">
                    Enter an address and click "Calculate Shipping Rates"
                  </p>
                </div>
              )}

              {shippingRates.length > 0 && (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {shippingRates.map((rate, index) => {
                    const isSelected = selectedRate && 
                      selectedRate.serviceCode === rate.serviceCode && 
                      selectedRate.carrierCode === rate.carrierCode &&
                      selectedRate.totalCost === rate.totalCost;
                    
                    return (
                      <div
                        key={`${rate.carrierCode}-${rate.serviceCode}-${index}`}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() => setSelectedRate(rate)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCarrierColor(rate.carrier)}`}>
                                {rate.carrier}
                              </span>
                              {isSelected && (
                                <CheckCircle className="w-4 h-4 text-blue-600 ml-2" />
                              )}
                          </div>
                          <p className="font-medium text-gray-900 mt-2">
                            {rate.serviceName}
                          </p>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            {rate.estimatedDeliveryDays ? (
                              `${rate.estimatedDeliveryDays} business day${rate.estimatedDeliveryDays !== 1 ? 's' : ''}`
                            ) : (
                              'Delivery time varies'
                            )}
                          </div>
                          {rate.guaranteed && (
                            <span className="inline-flex items-center text-xs text-green-700 mt-1">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Guaranteed delivery
                            </span>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(rate.totalCost)}
                          </p>
                          {rate.otherCost > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              + {formatCurrency(rate.otherCost)} fees
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* USA Carriers */}
      {carriers.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">USA Carriers</h2>
            <p className="text-sm text-gray-600 mt-1">
              Carriers configured for domestic USA shipping with carrier IDs
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {carriers.map((carrier: any, index: number) => {
                const domesticServices = carrier.services?.filter((s: any) => s.domestic) || []
                const internationalServices = carrier.services?.filter((s: any) => s.international) || []
                
                return (
                  <div
                    key={carrier.carrier_id || index}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-lg">
                            {carrier.friendly_name || carrier.carrier_code}
                          </p>
                          {carrier.primary && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          Code: {carrier.carrier_code}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded p-2 mb-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Carrier ID:</p>
                      <p className="text-xs font-mono text-gray-900 break-all">{carrier.carrier_id}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-blue-50 rounded p-2">
                        <p className="text-xs text-blue-600 font-medium">Domestic</p>
                        <p className="text-lg font-bold text-blue-900">{domesticServices.length}</p>
                        <p className="text-xs text-blue-600">services</p>
                      </div>
                      <div className="bg-purple-50 rounded p-2">
                        <p className="text-xs text-purple-600 font-medium">International</p>
                        <p className="text-lg font-bold text-purple-900">{internationalServices.length}</p>
                        <p className="text-xs text-purple-600">services</p>
                      </div>
                    </div>
                    
                    {carrier.requires_funded_amount && (
                      <div className="mt-3 flex items-center text-xs text-orange-600">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Requires funded amount: ${carrier.balance?.toFixed(2) || '0.00'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShippingManagement

