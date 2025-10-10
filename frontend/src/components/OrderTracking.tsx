import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Package,
  Search,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { shipStationApiService, ShipStationTracking, ShipStationTrackingEvent } from '../shared/shipStationApiService';

interface TrackingFormData {
  trackingNumber: string;
}

const OrderTracking: React.FC = () => {
  const [formData, setFormData] = useState<TrackingFormData>({
    trackingNumber: ''
  });
  const [tracking, setTracking] = useState<ShipStationTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.trackingNumber.trim()) {
      setError('Please enter a tracking number');
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await shipStationApiService.getTracking(formData.trackingNumber.trim());
      
      if (response.success && response.data) {
        setTracking(response.data);
      } else {
        setError(response.message || 'Tracking information not found');
        setTracking(null);
      }
    } catch (err) {
      console.error('Tracking error:', err);
      setError('Failed to fetch tracking information. Please try again.');
      setTracking(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (statusCode?: string) => {
    switch (statusCode?.toLowerCase()) {
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_transit':
      case 'in transit':
        return <Truck className="h-5 w-5 text-blue-600" />;
      case 'exception':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (statusCode?: string) => {
    switch (statusCode?.toLowerCase()) {
      case 'delivered':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in_transit':
      case 'in transit':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'exception':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center">
          <Truck className="h-8 w-8 text-blue-600 mr-3" />
          Track Your Order
        </h1>
        <p className="text-gray-600 mt-2">
          Enter your tracking number to see the current status of your shipment
        </p>
      </div>

      {/* Tracking Form */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Tracking Number
            </label>
            <div className="flex">
              <input
                type="text"
                id="trackingNumber"
                name="trackingNumber"
                value={formData.trackingNumber}
                onChange={handleInputChange}
                placeholder="Enter your tracking number"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !formData.trackingNumber.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">{loading ? 'Searching...' : 'Track'}</span>
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tracking Results */}
      {searched && tracking && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Tracking Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Tracking #{tracking.trackingNumber}
                </h2>
                {tracking.carrierDescription && (
                  <p className="text-gray-600">Carrier: {tracking.carrierDescription}</p>
                )}
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(tracking.statusCode)}`}>
                  {getStatusIcon(tracking.statusCode)}
                  <span className="ml-2">
                    {tracking.statusDescription || tracking.statusCode || 'Unknown Status'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tracking Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {tracking.shipDate && (
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ship Date</p>
                    <p className="text-gray-900">{formatDate(tracking.shipDate)}</p>
                  </div>
                </div>
              )}
              
              {tracking.estimatedDeliveryDate && (
                <div className="flex items-center">
                  <Package className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Estimated Delivery</p>
                    <p className="text-gray-900">{formatDate(tracking.estimatedDeliveryDate)}</p>
                  </div>
                </div>
              )}

              {tracking.actualDeliveryDate && (
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Delivered</p>
                    <p className="text-gray-900">{formatDate(tracking.actualDeliveryDate)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Exception Message */}
            {tracking.exceptionDescription && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-800 font-medium">Exception</p>
                </div>
                <p className="text-red-700 mt-1">{tracking.exceptionDescription}</p>
              </div>
            )}

            {/* Tracking Events */}
            {tracking.events && tracking.events.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tracking History</h3>
                <div className="space-y-4">
                  {tracking.events.map((event, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 mr-4">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-blue-600' : 'bg-gray-300'
                        }`} />
                        {index < tracking.events!.length - 1 && (
                          <div className="w-px h-8 bg-gray-300 ml-1.5 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {event.eventDescription}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(event.eventDate)}
                          </p>
                        </div>
                        {(event.eventCity || event.eventStateOrProvince) && (
                          <p className="text-sm text-gray-600 mt-1">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {[event.eventCity, event.eventStateOrProvince].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Results */}
      {searched && !tracking && !loading && (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Tracking Information Found</h3>
          <p className="text-gray-600">
            We couldn't find any tracking information for this number. Please verify the tracking number and try again.
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
