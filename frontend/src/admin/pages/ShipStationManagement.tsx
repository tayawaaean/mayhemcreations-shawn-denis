import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Settings,
  BarChart3,
  Users,
  ShoppingCart
} from 'lucide-react';
import { shipStationApiService, ShipStationCarrier, ShipStationOrder, ShipStationShipment } from '../../shared/shipStationApiService';

interface ShipStationStats {
  totalOrders: number;
  shippedOrders: number;
  pendingOrders: number;
  totalShipments: number;
  carriers: number;
}

const ShipStationManagement: React.FC = () => {
  const [stats, setStats] = useState<ShipStationStats>({
    totalOrders: 0,
    shippedOrders: 0,
    pendingOrders: 0,
    totalShipments: 0,
    carriers: 0
  });
  const [carriers, setCarriers] = useState<ShipStationCarrier[]>([]);
  const [recentOrders, setRecentOrders] = useState<ShipStationOrder[]>([]);
  const [recentShipments, setRecentShipments] = useState<ShipStationShipment[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadShipStationData();
  }, []);

  const loadShipStationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test connection first
      const connectionTest = await shipStationApiService.testConnection();
      setIsConnected(connectionTest.success && connectionTest.data?.connected);

      if (!connectionTest.success || !connectionTest.data?.connected) {
        setError('ShipStation API is not configured or connection failed');
        setLoading(false);
        return;
      }

      // Load carriers
      const carriersResponse = await shipStationApiService.getCarriers();
      if (carriersResponse.success && carriersResponse.data) {
        setCarriers(carriersResponse.data);
        setStats(prev => ({ ...prev, carriers: carriersResponse.data!.length }));
      }

      // Load recent orders
      const ordersResponse = await shipStationApiService.getOrders({
        page: 1,
        pageSize: 10,
        sortBy: 'orderDate',
        sortDir: 'DESC'
      });

      if (ordersResponse.success && ordersResponse.data) {
        setRecentOrders(ordersResponse.data.orders);
        setStats(prev => ({
          ...prev,
          totalOrders: ordersResponse.data!.total,
          shippedOrders: ordersResponse.data!.orders.filter(o => o.orderStatus === 'shipped').length,
          pendingOrders: ordersResponse.data!.orders.filter(o => o.orderStatus === 'awaiting_shipment').length
        }));
      }

    } catch (err) {
      console.error('Error loading ShipStation data:', err);
      setError('Failed to load ShipStation data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadShipStationData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading ShipStation data...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-red-800">ShipStation Not Configured</h2>
              <p className="text-red-700 mt-1">
                {error || 'ShipStation API credentials are not configured. Please add your API keys to the environment variables.'}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-medium text-red-800 mb-2">Required Environment Variables:</h3>
            <div className="bg-red-100 rounded p-3 font-mono text-sm">
              <div>SHIPSTATION_API_KEY=your_api_key_here</div>
              <div>SHIPSTATION_API_SECRET=your_api_secret_here</div>
              <div>SHIPSTATION_BASE_URL=https://ssapi.shipstation.com</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Truck className="h-8 w-8 text-blue-600 mr-3" />
            ShipStation Management
          </h1>
          <p className="text-gray-600 mt-2">Manage shipping, orders, and fulfillment</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Shipped Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.shippedOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Truck className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Carriers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.carriers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Carriers */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Truck className="h-5 w-5 text-blue-600 mr-2" />
              Available Carriers
            </h2>
          </div>
          <div className="p-6">
            {carriers.length > 0 ? (
              <div className="space-y-3">
                {carriers.map((carrier) => (
                  <div key={carrier.code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{carrier.name}</p>
                      <p className="text-sm text-gray-600">Code: {carrier.code}</p>
                    </div>
                    <div className="text-right">
                      {carrier.balance !== undefined && (
                        <p className="text-sm text-gray-600">Balance: ${carrier.balance.toFixed(2)}</p>
                      )}
                      {carrier.primaryService && (
                        <p className="text-sm text-gray-600">Primary: {carrier.primaryService}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No carriers available</p>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <ShoppingCart className="h-5 w-5 text-blue-600 mr-2" />
              Recent Orders
            </h2>
          </div>
          <div className="p-6">
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.orderNumber} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                      <p className="text-sm text-gray-600">{order.customerEmail}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.orderStatus === 'shipped' ? 'bg-green-100 text-green-800' :
                        order.orderStatus === 'awaiting_shipment' ? 'bg-yellow-100 text-yellow-800' :
                        order.orderStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.orderStatus.replace('_', ' ')}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent orders</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="h-5 w-5 text-blue-600 mr-2" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <Package className="h-6 w-6 text-blue-600 mr-2" />
            <span className="font-medium text-blue-900">Create Label</span>
          </button>
          <button className="flex items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <BarChart3 className="h-6 w-6 text-green-600 mr-2" />
            <span className="font-medium text-green-900">View Reports</span>
          </button>
          <button className="flex items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <Users className="h-6 w-6 text-purple-600 mr-2" />
            <span className="font-medium text-purple-900">Manage Customers</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShipStationManagement;
