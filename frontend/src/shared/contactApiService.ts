import { apiAuthService, ApiResponse } from './apiAuthService'

export interface Contact {
  id: number
  name: string
  email: string
  phone: string | null
  company: string | null
  projectType: string
  quantity: string | null
  message: string
  status: 'new' | 'read' | 'responded' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface ContactsResponse extends ApiResponse<{
  contacts: Contact[]
  total: number
  limit: number
  offset: number
}> {}

export interface ContactResponse extends ApiResponse<Contact> {}

class ContactApiService {
  /**
   * Get all contact submissions
   */
  async getContacts(params?: {
    status?: 'new' | 'read' | 'responded' | 'archived'
    limit?: number
    offset?: number
  }): Promise<ContactsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    
    const endpoint = `/contact${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiAuthService.get<{
      contacts: Contact[]
      total: number
      limit: number
      offset: number
    }>(endpoint, true)
  }

  /**
   * Get a single contact by ID
   */
  async getContactById(id: number): Promise<ContactResponse> {
    return apiAuthService.get<Contact>(`/contact/${id}`, true)
  }

  /**
   * Update contact status
   */
  async updateContactStatus(
    id: number,
    status: 'new' | 'read' | 'responded' | 'archived'
  ): Promise<ContactResponse> {
    return apiAuthService.patch<Contact>(`/contact/${id}/status`, { status }, true)
  }

  /**
   * Delete a contact submission
   */
  async deleteContact(id: number): Promise<ApiResponse> {
    return apiAuthService.delete(`/contact/${id}`, true)
  }
}

export const contactApiService = new ContactApiService()

