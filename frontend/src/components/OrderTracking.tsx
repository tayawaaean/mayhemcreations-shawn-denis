import React, { useState } from 'react';
import { 
  Truck, 
  Package,
  Search,
  RefreshCw,
  AlertCircle,
  Construction
} from 'lucide-react';

interface TrackingFormData {
  trackingNumber: string;
}

const OrderTracking: React.FC = () => {
  const [formData, setFormData] = useState<TrackingFormData>({
    trackingNumber: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('Order tracking is being upgraded to ShipEngine. This feature will be available soon!');
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
              />
              <button
                type="submit"
                disabled={!formData.trackingNumber.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                <Search className="h-4 w-4" />
                <span className="ml-2">Track</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <Construction className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Tracking Feature Coming Soon!</h3>
        <p className="text-gray-600 mb-4">
          We're upgrading our tracking system to provide you with even better shipment tracking.
        </p>
        <p className="text-sm text-gray-500">
          In the meantime, please use the tracking number in your shipping confirmation email to track your package on the carrier's website.
        </p>
      </div>
    </div>
  );
};

export default OrderTracking;
