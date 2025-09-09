import React from 'react'
import { useAdmin } from '../context/AdminContext'
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle
} from 'lucide-react'

const Dashboard: React.FC = () => {
  const { state } = useAdmin()
  const { analytics } = state

  const stats = [
    {
      name: 'Total Sales',
      value: `$${analytics.totalSales.toLocaleString()}`,
      change: analytics.salesGrowth,
      changeType: 'increase',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      name: 'Total Orders',
      value: analytics.totalOrders.toString(),
      change: analytics.ordersGrowth,
      changeType: 'increase',
      icon: ShoppingCart,
      color: 'text-blue-600'
    },
    {
      name: 'Total Products',
      value: analytics.totalProducts.toString(),
      change: 0,
      changeType: 'neutral',
      icon: Package,
      color: 'text-purple-600'
    },
    {
      name: 'Total Customers',
      value: analytics.totalCustomers.toString(),
      change: analytics.customersGrowth,
      changeType: 'increase',
      icon: Users,
      color: 'text-orange-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back! Here's what's happening with your store today.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Last updated</p>
          <p className="text-sm font-medium text-gray-900">{new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors duration-200`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
              </div>
              {stat.change !== 0 && (
                <div className={`flex items-center text-sm font-semibold ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.changeType === 'increase' ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(stat.change)}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts and tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:gap-8">
        {/* Revenue Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Last 7 days
            </div>
          </div>
          <div className="h-64 flex items-end space-x-2">
            {analytics.revenueChart.map((item, index) => {
              const maxRevenue = Math.max(...analytics.revenueChart.map(i => i.revenue));
              const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 200 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                    style={{ height: `${Math.max(height, 4)}px` }}
                  ></div>
                  <span className="text-xs text-gray-500 mt-2">
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
            <button className="text-sm text-gray-500 hover:text-gray-700 font-medium">View all</button>
          </div>
          <div className="space-y-4">
            {analytics.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">#{order.id}</p>
                  <p className="text-sm text-gray-500">{order.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">${order.total}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    order.status === 'shipped' ? 'bg-green-100 text-green-800' :
                    order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {analytics.lowStockProducts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-yellow-50 rounded-lg mr-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Low Stock Alert</h3>
          </div>
          <div className="space-y-3">
            {analytics.lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <img 
                    src={product.primaryImage} 
                    alt={product.title}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{product.title}</p>
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-red-600 font-medium">
                    {Math.min(...product.variants.map(v => v.stock))} units left
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Products */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Top Selling Products</h3>
          <button className="text-sm text-gray-500 hover:text-gray-700 font-medium">View all</button>
        </div>
        <div className="space-y-4">
          {analytics.topProducts.map((item, index) => (
            <div key={item.product.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                <img 
                  src={item.product.primaryImage} 
                  alt={item.product.title}
                  className="h-10 w-10 rounded-lg object-cover ml-3"
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{item.product.title}</p>
                  <p className="text-sm text-gray-500">${item.product.price}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{item.sales} sold</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
