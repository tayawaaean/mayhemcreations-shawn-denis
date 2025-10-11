import React, { useMemo, useState } from 'react'
import { useUsers } from '../hooks/useUsers'
import { Search, Filter, Eye, Edit, Users, Shield, Plus } from 'lucide-react'
import HelpModal from '../components/modals/HelpModal'
import { UserDetailModal, EditUserModal, AddUserModal } from '../components/modals/UserModals'
import { User as ApiUser } from '../services/apiService'
import { formatDateOnly } from '../../utils/dateFormatter'

const UsersPage: React.FC = () => {
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'designer' | 'support' | 'moderator'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'inactive' | 'all'>('all')
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null)
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false)
  const [isUserEditOpen, setIsUserEditOpen] = useState(false)
  const [isUserAddOpen, setIsUserAddOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Memoize the params object to prevent infinite re-renders
  // Exclude customers by filtering for non-customer roles
  const userParams = useMemo(() => ({
    page: currentPage,
    limit: 10,
    search: searchQuery || undefined,
    status: selectedStatus,
    role: roleFilter === 'all' ? undefined : roleFilter, // Filter by specific role or show all non-customers
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const
  }), [currentPage, searchQuery, selectedStatus, roleFilter])

  // Use the API hook
  const {
    users,
    pagination,
    stats,
    loading,
    error,
    refetch,
    updateUser,
    updateUserStatus
  } = useUsers(userParams)

  // Users are already filtered by backend to exclude customers
  const filteredUsers = users

  const handleEditUser = (user: ApiUser) => {
    setSelectedUser(user)
    setIsUserEditOpen(true)
  }

  const handleViewUser = (user: ApiUser) => {
    setSelectedUser(user)
    setIsUserDetailOpen(true)
  }

  const handleUpdateUser = async (updatedUser: Partial<ApiUser>) => {
    if (!selectedUser) return
    
    const success = await updateUser(selectedUser.id, updatedUser)
    if (success) {
      setIsUserEditOpen(false)
      setSelectedUser(null)
    }
  }

  const handleSaveUser = (updated: AdminUser) => {
    dispatch({ type: 'UPDATE_USER', payload: updated })
  }

  const handleAddUser = (data: Omit<AdminUser, 'id' | 'lastLogin'>) => {
    const newUser: AdminUser = {
      id: `user-${Date.now()}`,
      lastLogin: new Date(),
      ...data
    }
    dispatch({ type: 'ADD_USER', payload: newUser })
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-gray-600">View and manage admins, sellers, and customers</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsHelpOpen(true)} className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <span className="hidden sm:inline">How to use</span>
            <span className="sm:hidden">?</span>
          </button>
          {roleFilter !== 'customers' && (
            <button
              onClick={() => setIsUserAddOpen(true)}
              className="bg-gray-900 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-gray-800 transition-colors duration-200 font-medium text-sm sm:text-base"
            >
              Add User
            </button>
          )}
        </div>
      </div>

      {/* Role/Search Filters */}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${roleFilter}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'manager' | 'designer' | 'support' | 'moderator')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Staff</option>
              <option value="admin">Administrators</option>
              <option value="manager">Managers</option>
              <option value="designer">Designers</option>
              <option value="support">Support</option>
              <option value="moderator">Moderators</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'active' | 'inactive' | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center justify-center">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 hidden lg:table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-red-500">
                    Error loading users: {error}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-gray-300 rounded-lg flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-sm">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.lastLoginAt ? `Last login: ${formatDateOnly(user.lastLoginAt)}` : 'Never logged in'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">
                      <Shield className="w-3 h-3 mr-1" /> {user.role.displayName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isEmailVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.isEmailVerified ? '✓ Email' : '✗ Email'}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isPhoneVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.isPhoneVerified ? '✓ Phone' : '✗ Phone'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="text-blue-600 hover:text-blue-900" onClick={() => handleViewUser(user)}>
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900" onClick={() => handleEditUser(user)}>
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === pagination.totalPages || 
                    Math.abs(page - currentPage) <= 2
                  )
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-3 py-1 text-sm text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm border rounded-md ${
                          currentPage === page
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="How to use: User Management">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Use the Role dropdown to filter Admins, Sellers, or Customers.</li>
          <li>Search by name or email.</li>
          <li>Click View to see details and Edit to update user info (admins/sellers).</li>
        </ol>
      </HelpModal>

      <UserDetailModal isOpen={isUserDetailOpen} onClose={() => { setIsUserDetailOpen(false); setSelectedUser(null) }} user={selectedUser} />
      <EditUserModal isOpen={isUserEditOpen} onClose={() => { setIsUserEditOpen(false); setSelectedUser(null) }} onSave={handleSaveUser} user={selectedUser} />
      <AddUserModal isOpen={isUserAddOpen} onClose={() => setIsUserAddOpen(false)} onSave={handleAddUser} />
    </div>
  )
}

export default UsersPage


