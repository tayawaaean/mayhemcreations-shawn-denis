import React, { useState, useEffect, useCallback } from 'react'
import { useAdmin } from '../context/AdminContext'
import { adminAnalyticsApiService } from '../../shared/adminAnalyticsApiService'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Download,
  Calendar,
  Filter
} from 'lucide-react'
import HelpModal from '../components/modals/HelpModal'
import { downloadJSON } from '../../shared/exportUtils'

const Analytics: React.FC = () => {
  const { state, dispatch } = useAdmin()
  const { analytics } = state
  const [selectedPeriod, setSelectedPeriod] = useState('7d')
  const [selectedMetric, setSelectedMetric] = useState('revenue')
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const periodOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ]

  const metricOptions = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'orders', label: 'Orders' },
    { value: 'customers', label: 'Customers' },
    { value: 'products', label: 'Products' }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  // Fetch analytics data based on selected period
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await adminAnalyticsApiService.getDashboardAnalytics(selectedPeriod)
      
      if (response.success && response.data) {
        // Convert the API data to match the Analytics type
        const analyticsData = {
          totalSales: response.data.totalSales || 0,
          totalOrders: response.data.totalOrders || 0,
          totalProducts: response.data.totalProducts,
          totalCustomers: response.data.totalCustomers,
          salesGrowth: 0, // Will be calculated if needed
          ordersGrowth: 0, // Will be calculated if needed
          customersGrowth: 0, // Will be calculated if needed
          revenueChart: (response.data.revenueChart || []).map((item: any) => ({
            date: item.date,
            revenue: parseFloat(item.revenue) || 0
          })),
          topProducts: [], // Removed as requested
          recentOrders: (response.data.recentOrders || []).map((order: any) => ({
            id: order.order_number || order.id.toString(),
            orderNumber: order.order_number || `ORD-${order.id}`,
            customer: {
              name: `${order.first_name || ''} ${order.last_name || ''}`.trim() || order.email,
              email: order.email
            },
            total: parseFloat(order.total) || 0,
            status: order.status || 'processing',
            date: order.updated_at
          })),
          lowStockProducts: response.data.lowStockVariants.map((variant: any) => ({
            id: variant.id.toString(),
            title: variant.product?.title || variant.name || 'Unknown Product',
            slug: variant.product?.slug || '',
            sku: variant.sku,
            price: variant.price || variant.product?.price || 0,
            status: 'active' as 'active' | 'draft' | 'archived',
            featured: false,
            stock: variant.stock,
            image: variant.image || variant.product?.image || '',
            alt: variant.product?.title || variant.name || '',
            description: '',
            shortDescription: '',
            images: [variant.image || variant.product?.image || ''].filter(Boolean),
            primaryImage: variant.image || variant.product?.image || '',
            category: variant.product?.category?.name || 'Uncategorized',
            subcategory: '',
            variants: [{
              id: variant.id.toString(),
              name: variant.name,
              color: variant.color || 'Default',
              colorHex: variant.colorHex || '#000000',
              size: variant.size || 'One Size',
              sku: variant.sku,
              stock: variant.stock,
              price: variant.price || variant.product?.price || 0,
              weight: variant.weight || 0,
              dimensions: variant.dimensions || '',
              isActive: variant.isActive
            }],
            tags: [],
            metaTitle: '',
            metaDescription: '',
            seo: {
              metaTitle: '',
              metaDescription: '',
              slug: variant.product?.slug || ''
            },
            createdAt: new Date(variant.createdAt),
            updatedAt: new Date(variant.updatedAt)
          }))
        }
        
        dispatch({ type: 'SET_ANALYTICS', payload: analyticsData })
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod, dispatch])

  // Fetch analytics when period changes
  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Export function to download analytics data as JSON
  const handleExport = () => {
    try {
      // Prepare analytics data for export
      const exportData = {
        summary: {
          totalSales: analytics.totalSales,
          totalOrders: analytics.totalOrders,
          totalProducts: analytics.totalProducts,
          totalCustomers: analytics.totalCustomers,
          salesGrowth: analytics.salesGrowth,
          ordersGrowth: analytics.ordersGrowth,
          customersGrowth: analytics.customersGrowth,
        },
        revenueChart: analytics.revenueChart,
        recentOrders: analytics.recentOrders,
        lowStockProducts: analytics.lowStockProducts,
        exportedAt: new Date().toISOString(),
        period: selectedPeriod,
        metric: selectedMetric,
      }
      
      downloadJSON([exportData], `analytics-${new Date().toISOString().split('T')[0]}`)
    } catch (error) {
      console.error('Error exporting analytics:', error)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 break-words">
            Track your store's performance and key metrics
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
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button 
            onClick={handleExport}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Period and Metric Selectors */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value)
                // Analytics will refetch automatically via useEffect
              }}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {periodOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metric</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {metricOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics.totalSales)}</dd>
                  <dd className="flex items-baseline">
                    <div className="flex items-baseline text-sm font-semibold text-green-600">
                      <TrendingUp className="h-4 w-4 flex-shrink-0 self-center mr-1" />
                      {analytics.salesGrowth}%
                    </div>
                    <div className="ml-2 text-sm text-gray-500">vs last period</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{formatNumber(analytics.totalOrders)}</dd>
                  <dd className="flex items-baseline">
                    <div className="flex items-baseline text-sm font-semibold text-green-600">
                      <TrendingUp className="h-4 w-4 flex-shrink-0 self-center mr-1" />
                      {analytics.ordersGrowth}%
                    </div>
                    <div className="ml-2 text-sm text-gray-500">vs last period</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{formatNumber(analytics.totalCustomers)}</dd>
                  <dd className="flex items-baseline">
                    <div className="flex items-baseline text-sm font-semibold text-green-600">
                      <TrendingUp className="h-4 w-4 flex-shrink-0 self-center mr-1" />
                      {analytics.customersGrowth}%
                    </div>
                    <div className="ml-2 text-sm text-gray-500">vs last period</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{formatNumber(analytics.totalProducts)}</dd>
                  <dd className="flex items-baseline">
                    <div className="ml-2 text-sm text-gray-500">Active products</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {selectedMetric === 'revenue' ? 'Revenue Trend' :
               selectedMetric === 'orders' ? 'Orders Trend' :
               selectedMetric === 'customers' ? 'Customers Trend' :
               'Products Trend'}
            </h3>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {periodOptions.find(p => p.value === selectedPeriod)?.label || 'Last 7 days'}
              </span>
            </div>
          </div>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-gray-500">Loading chart data...</div>
              </div>
            ) : analytics.revenueChart.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-gray-500">No data available for selected period</div>
              </div>
            ) : (
              <div className="h-full flex items-end space-x-2">
                {analytics.revenueChart.map((item, index) => {
                  const maxValue = Math.max(...analytics.revenueChart.map(i => i.revenue), 1)
                  const height = maxValue > 0 ? (item.revenue / maxValue) * 200 : 0
                  
                  // Format date based on period
                  const dateFormat = selectedPeriod === '1y' 
                    ? { month: 'short', year: 'numeric' }
                    : { month: 'short', day: 'numeric' }
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t transition-all"
                        style={{ height: `${height}px` }}
                        title={`${formatCurrency(item.revenue)}`}
                      ></div>
                      <span className="text-xs text-gray-500 mt-2 text-center">
                        {selectedPeriod === '1y' 
                          ? new Date(item.date + '-01').toLocaleDateString('en-US', dateFormat)
                          : new Date(item.date).toLocaleDateString('en-US', dateFormat)
                        }
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Selling Products</h3>
          <div className="space-y-4">
            {analytics.topProducts.map((item, index) => (
              <div key={item.product.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                  <img 
                    src={item.product.primaryImage} 
                    alt={item.product.title}
                    className="h-10 w-10 rounded-lg object-cover ml-3"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{item.product.title}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(item.product.price)}</p>
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

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {analytics.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">#{order.id}</p>
                  <p className="text-sm text-gray-500">{order.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(order.total)}</p>
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

        {/* Low Stock Alert */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <TrendingDown className="h-5 w-5 text-yellow-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Low Stock Alert</h3>
          </div>
          <div className="space-y-3">
            {analytics.lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <img 
                    src={product.primaryImage} 
                    alt={product.title}
                    className="h-8 w-8 rounded object-cover"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{product.title}</p>
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-red-600 font-medium">
                    {Math.min(...product.variants.map(v => v.stock))} units
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Average Order Value</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(analytics.totalSales / analytics.totalOrders)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Conversion Rate</span>
              <span className="text-sm font-medium text-gray-900">3.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Customer Lifetime Value</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(analytics.totalSales / analytics.totalCustomers)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Return Rate</span>
              <span className="text-sm font-medium text-gray-900">2.1%</span>
            </div>
          </div>
        </div>
      </div>
      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="How to use: Analytics">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Select a time period and metric to adjust charts.</li>
          <li>Review key metrics in the summary cards.</li>
          <li>Use charts for trends and top products for insights.</li>
          <li>Export data via the Export button.</li>
        </ol>
      </HelpModal>
    </div>
  )
}

export default Analytics
