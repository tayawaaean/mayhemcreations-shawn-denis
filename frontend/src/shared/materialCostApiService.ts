import { apiAuthService, ApiResponse } from './apiAuthService'
import { envConfig } from './envConfig'

export interface MaterialCost {
  id: number
  name: string
  cost: string | number  // Can be string from DB or number from form
  width: string | number
  length: string | number
  wasteFactor: string | number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MaterialCostFilters {
  isActive?: boolean
  search?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export const materialCostApiService = {
  /**
   * Get all material costs
   */
  async getMaterialCosts(filters: MaterialCostFilters = {}): Promise<ApiResponse<MaterialCost[]>> {
    const params = new URLSearchParams()
    
    if (filters.isActive !== undefined) {
      params.append('isActive', filters.isActive.toString())
    }
    if (filters.search) {
      params.append('search', filters.search)
    }
    if (filters.sortBy) {
      params.append('sortBy', filters.sortBy)
    }
    if (filters.sortOrder) {
      params.append('sortOrder', filters.sortOrder)
    }

    const queryString = params.toString()
    const url = `/material-costs${queryString ? `?${queryString}` : ''}`
    

    return apiAuthService.get<MaterialCost[]>(url)
  },

  /**
   * Get active material costs only
   */
  async getActiveMaterialCosts(): Promise<ApiResponse<MaterialCost[]>> {
    return this.getMaterialCosts({ isActive: true, sortBy: 'name', sortOrder: 'ASC' })
  },

  /**
   * Get material cost by ID
   */
  async getMaterialCostById(id: number): Promise<ApiResponse<MaterialCost>> {
    return apiAuthService.get<MaterialCost>(`/material-costs/${id}`)
  },

  /**
   * Create new material cost
   */
  async createMaterialCost(data: {
    name: string
    cost: number
    width: number
    length: number
    wasteFactor?: number
    isActive?: boolean
  }): Promise<ApiResponse<MaterialCost>> {
    return apiAuthService.post<MaterialCost>('/material-costs', data)
  },

  /**
   * Update material cost
   */
  async updateMaterialCost(id: number, data: {
    name?: string
    cost?: number
    width?: number
    length?: number
    wasteFactor?: number
    isActive?: boolean
  }): Promise<ApiResponse<MaterialCost>> {
    return apiAuthService.put<MaterialCost>(`/material-costs/${id}`, data)
  },

  /**
   * Delete material cost
   */
  async deleteMaterialCost(id: number): Promise<ApiResponse<void>> {
    return apiAuthService.delete<void>(`/material-costs/${id}`)
  },

  /**
   * Toggle material cost status
   */
  async toggleMaterialCostStatus(id: number): Promise<ApiResponse<MaterialCost>> {
    return apiAuthService.patch<MaterialCost>(`/material-costs/${id}/toggle-status`)
  }
}
