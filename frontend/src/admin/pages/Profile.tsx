import React, { useState } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import { Mail, User as UserIcon, Lock } from 'lucide-react'

const Profile: React.FC = () => {
  const { user, login } = useAdminAuth()
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (user) {
      login({ ...user, firstName, lastName, email })
      if (password) {
        try { localStorage.setItem(`password:${email}`, password) } catch {}
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-2 text-gray-600">Update your account information</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-9 pr-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="pl-9 pr-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 pr-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" className="pl-9 pr-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">Save Changes</button>
        </div>
      </form>
    </div>
  )
}

export default Profile


