import React from 'react'
import { useAdmin } from '../context/AdminContext'
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { formatDateShort } from '../../utils/dateFormatter'

const Dashboard: React.FC = () => {
  const { state } = useAdmin()
  const { analytics } = state
  
  // Pagination state for low stock alert
  const [lowStockPage, setLowStockPage] = React.useState(1)
  const lowStockItemsPerPage = 5
  
  // Calculate pagination for low stock products
  const totalLowStockPages = Math.ceil(analytics.lowStockProducts.length / lowStockItemsPerPage)
  const startIndex = (lowStockPage - 1) * lowStockItemsPerPage
  const endIndex = startIndex + lowStockItemsPerPage
  const paginatedLowStockProducts = analytics.lowStockProducts.slice(startIndex, endIndex)
  
  const handleLowStockPageChange = (page: number) => {
    setLowStockPage(page)
  }

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
            {analytics.revenueChart && analytics.revenueChart.length > 0 ? (
              analytics.revenueChart.map((item, index) => {
                const maxRevenue = Math.max(...analytics.revenueChart.map(i => i.revenue));
                const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 200 : 4;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600 cursor-pointer"
                        style={{ height: `${Math.max(height, 4)}px` }}
                        title={`$${item.revenue.toFixed(2)}`}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2">
                      {formatDateShort(item.date).replace(/,.*/, '')}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center w-full h-full text-gray-500">
                <p>No revenue data available for the last 7 days</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Paid Orders</h3>
            <button className="text-sm text-gray-500 hover:text-gray-700 font-medium">View all</button>
          </div>
          <div className="space-y-4">
            {analytics.recentOrders && analytics.recentOrders.length > 0 ? (
              analytics.recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">{order.customer.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">${order.total.toFixed(2)}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      order.status.includes('delivered') ? 'bg-green-100 text-green-800' :
                      order.status.includes('shipped') ? 'bg-indigo-100 text-indigo-800' :
                      order.status.includes('production') ? 'bg-purple-100 text-purple-800' :
                      order.status.includes('processing') ? 'bg-emerald-100 text-emerald-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {order.status.replace(/-/g, ' ')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No paid orders yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-50 rounded-lg mr-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Low Stock Alert</h3>
            <span className="ml-2 text-sm text-gray-500">({analytics.lowStockProducts.length} variants)</span>
          </div>
        </div>
        {analytics.lowStockProducts.length > 0 ? (
          <>
            <div className="space-y-3">
              {paginatedLowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center">
                    <img 
                      src={product.primaryImage} 
                      alt={product.title}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{product.title}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>SKU: {product.sku}</span>
                        {product.variants && product.variants.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{product.variants[0].color}</span>
                            <span>•</span>
                            <span>{product.variants[0].size}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600 font-medium">
                      {product.variants && product.variants.length > 0 
                        ? `${product.variants[0].stock} units left`
                        : 'No stock data'
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalLowStockPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1}-{Math.min(endIndex, analytics.lowStockProducts.length)} of {analytics.lowStockProducts.length} variants
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleLowStockPageChange(lowStockPage - 1)}
                    disabled={lowStockPage === 1}
                    className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalLowStockPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handleLowStockPageChange(page)}
                        className={`px-3 py-1 text-sm rounded-lg ${
                          page === lowStockPage
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => handleLowStockPageChange(lowStockPage + 1)}
                    disabled={lowStockPage === totalLowStockPages}
                    className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No low stock variants found</p>
            <p className="text-sm text-gray-400 mt-1">All variants have sufficient stock (threshold: ≤10 units)</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
