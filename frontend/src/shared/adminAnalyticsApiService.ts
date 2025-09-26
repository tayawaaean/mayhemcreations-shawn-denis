import { apiAuthService, ApiResponse } from './apiAuthService';

export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  draft: number;
  featured: number;
  outOfStock: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  newUsersThisMonth: number;
  usersByRole: Array<{
    roleName: string;
    roleDisplayName: string;
    count: number;
  }>;
}

export interface Variant {
  id: number;
  productId: number;
  name: string;
  color?: string;
  colorHex?: string;
  size?: string;
  sku: string;
  stock: number;
  price?: number;
  image?: string;
  weight?: number;
  dimensions?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: number;
    title: string;
    slug: string;
    price: number;
    image: string;
    category?: {
      id: number;
      name: string;
      slug: string;
    };
  };
}

export interface VariantInventoryData {
  variants: Variant[];
  statistics: {
    total: number;
    outOfStock: number;
    lowStock: number;
    lowStockThreshold: number | null;
  };
}

export interface AnalyticsData {
  totalProducts: number;
  totalCustomers: number;
  lowStockVariants: Variant[];
  lowStockCount: number;
  outOfStockCount: number;
}

class AdminAnalyticsApiService {
  /**
   * Get product statistics
   */
  async getProductStats(): Promise<ApiResponse<ProductStats>> {
    console.log('🔄 Calling /products/stats...')
    const response = await apiAuthService.get<ProductStats>('/products/stats', true);
    console.log('📊 Product Stats Raw Response:', response)
    return response;
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<ApiResponse<UserStats>> {
    console.log('🔄 Calling /users/stats...')
    const response = await apiAuthService.get<UserStats>('/users/stats', true);
    console.log('👥 User Stats Raw Response:', response)
    return response;
  }

  /**
   * Get inventory status with low stock products
   */
  async getInventoryStatus(lowStockThreshold: number = 10): Promise<ApiResponse<VariantInventoryData>> {
    console.log('🔄 Calling /variants/inventory/status...')
    const response = await apiAuthService.get<VariantInventoryData>(`/variants/inventory/status?lowStockThreshold=${lowStockThreshold}`, true);
    console.log('📦 Variant Inventory Raw Response:', response)
    return response;
  }

  /**
   * Get variant inventory status
   */
  async getVariantInventoryStatus(lowStockThreshold: number = 10): Promise<ApiResponse<VariantInventoryData>> {
    return apiAuthService.get<VariantInventoryData>(`/variants/inventory/status?lowStockThreshold=${lowStockThreshold}`, true);
  }

  /**
   * Get comprehensive analytics data for dashboard
   */
  async getDashboardAnalytics(): Promise<ApiResponse<AnalyticsData>> {
    try {
      console.log('🔄 Fetching dashboard analytics...')
      
      // Fetch all required data in parallel
      const [productStatsResponse, userStatsResponse, inventoryResponse] = await Promise.all([
        this.getProductStats(),
        this.getUserStats(),
        this.getInventoryStatus(10) // Low stock threshold of 10
      ]);

      console.log('📊 Product Stats Response:', productStatsResponse)
      console.log('👥 User Stats Response:', userStatsResponse)
      console.log('📦 Variant Inventory Response:', inventoryResponse)

      // Check each response individually for better error reporting
      if (!productStatsResponse.success) {
        console.error('❌ Product Stats API failed:', productStatsResponse.message)
        throw new Error(`Product Stats API failed: ${productStatsResponse.message}`);
      }
      
      if (!inventoryResponse.success) {
        console.error('❌ Variant Inventory API failed:', inventoryResponse.message)
        throw new Error(`Variant Inventory API failed: ${inventoryResponse.message}`);
      }

      // Handle user stats failure gracefully (might be auth issue)
      let totalCustomers = 0;
      if (!userStatsResponse.success) {
        console.warn('⚠️ User Stats API failed (likely auth issue):', userStatsResponse.message)
        console.log('🔄 Falling back to alternative customer count method...')
        
        // Try to get customer count using the users endpoint with role filter
        try {
          const usersResponse = await apiAuthService.get<any>('/users?role=customer&limit=1000', true);
          if (usersResponse.success && usersResponse.data?.pagination) {
            totalCustomers = usersResponse.data.pagination.total;
            console.log('✅ Got customer count from users endpoint:', totalCustomers)
          } else {
            console.warn('⚠️ Users endpoint also failed, using fallback count of 0')
            totalCustomers = 0;
          }
        } catch (fallbackError) {
          console.warn('⚠️ Fallback method also failed:', fallbackError)
          totalCustomers = 0;
        }
      } else {
        // Get customer count from usersByRole array
        const customerRole = userStatsResponse.data?.usersByRole?.find(role => role.roleName === 'customer')
        totalCustomers = customerRole?.count || 0
        console.log('👥 Customer Role Data:', customerRole)
        console.log('👥 Total Customers (filtered):', totalCustomers)
      }

      // Get low stock variants (limit to 5 for dashboard)
      const lowStockVariants = inventoryResponse.data?.variants?.slice(0, 5) || []

      const analyticsData: AnalyticsData = {
        totalProducts: productStatsResponse.data?.total || 0,
        totalCustomers: totalCustomers,
        lowStockVariants: lowStockVariants,
        lowStockCount: inventoryResponse.data?.statistics?.lowStock || 0,
        outOfStockCount: inventoryResponse.data?.statistics?.outOfStock || 0
      };

      console.log('✅ Final Analytics Data:', analyticsData)
      console.log('⚠️ Low Stock Variants (first 5):', lowStockVariants)

      return {
        success: true,
        data: analyticsData,
        message: 'Analytics data retrieved successfully'
      };
    } catch (error) {
      console.error('❌ Error fetching dashboard analytics:', error);
      return {
        success: false,
        data: {
          totalProducts: 0,
          totalCustomers: 0,
          lowStockVariants: [],
          lowStockCount: 0,
          outOfStockCount: 0
        },
        message: 'Failed to fetch analytics data'
      };
    }
  }
}

export const adminAnalyticsApiService = new AdminAnalyticsApiService();