import React, { useMemo, useState } from 'react'
import { useAdmin } from '../context/AdminContext'
import { Search, Filter, Eye, Edit, Users, Shield } from 'lucide-react'
import HelpModal from '../components/modals/HelpModal'
import { UserDetailModal, EditUserModal, AddUserModal } from '../components/modals/UserModals'
import { AdminUser, Customer } from '../types'

const UsersPage: React.FC = () => {
  const { state, dispatch } = useAdmin()
  const [roleFilter, setRoleFilter] = useState<'admins' | 'sellers' | 'customers'>('admins')
  const [searchQuery, setSearchQuery] = useState('')
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false)
  const [isUserEditOpen, setIsUserEditOpen] = useState(false)
  const [isUserAddOpen, setIsUserAddOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const adminUsers = state.users
  const admins = useMemo(() => adminUsers.filter(u => u.role === 'admin' || u.role === 'manager'), [adminUsers])
  const sellers = useMemo(() => adminUsers.filter(u => u.role === 'staff'), [adminUsers])
  const customers = state.customers

  const list = useMemo(() => {
    if (roleFilter === 'admins') return admins
    if (roleFilter === 'sellers') return sellers
    return customers
  }, [roleFilter, admins, sellers, customers])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    if (roleFilter === 'customers') {
      return (list as Customer[]).filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    }
    return (list as AdminUser[]).filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [list, searchQuery, roleFilter])

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSelectAll = () => {
    if (roleFilter === 'customers') return
    const items = filtered as AdminUser[]
    if (selectedIds.length === items.length) setSelectedIds([])
    else setSelectedIds(items.map(u => u.id))
  }

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user)
    setIsUserEditOpen(true)
  }

  const handleViewUser = (user: AdminUser) => {
    setSelectedUser(user)
    setIsUserDetailOpen(true)
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="admins">Admins & Managers</option>
              <option value="customers">Customers</option>
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
                {roleFilter !== 'customers' && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === (filtered as AdminUser[]).length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roleFilter !== 'customers' && (filtered as AdminUser[]).map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user.id)}
                      onChange={() => handleToggleSelect(user.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="h-12 w-12 bg-gray-300 rounded-lg flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-sm">{user.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">Last login: {user.lastLogin.toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">
                      <Shield className="w-3 h-3 mr-1" /> {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {user.status}
                    </span>
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
              ))}
              {roleFilter === 'customers' && (filtered as Customer[]).map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.name} className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="h-12 w-12 bg-gray-300 rounded-lg flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-sm">{c.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.address.city}, {c.address.state}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="text-gray-400" disabled>
                        <Users className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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


