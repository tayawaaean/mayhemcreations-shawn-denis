import React, { useState } from 'react'
import { User, Lock, Save, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAlertModal } from '../context/AlertModalContext'
import Button from '../../components/Button'
import { apiClient } from '../../shared/axiosConfig'

export default function Profile() {
  // Get the current authenticated user from context
  const { user, login } = useAuth()
  
  // Alert modal for showing success/error messages
  const { showSuccess, showError } = useAlertModal()
  
  // State for profile update form - initialize with current user data
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || ''
  })
  
  // State for password change form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  // Toggle visibility for password fields
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Loading states for form submissions
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  
  // Validation errors
  const [profileErrors, setProfileErrors] = useState<string[]>([])
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  // Handle profile update form submission
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileErrors([])
    
    // Validate form fields
    const errors: string[] = []
    if (!profileData.firstName.trim()) errors.push('First name is required')
    if (!profileData.lastName.trim()) errors.push('Last name is required')
    
    if (errors.length > 0) {
      setProfileErrors(errors)
      return
    }
    
    setIsUpdatingProfile(true)
    
    try {
      // Send API request to update user profile
      const response = await apiClient.put(`/users/${user?.id}`, {
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim()
      })
      
      if (response.data.success) {
        showSuccess('Profile updated successfully!')
        
        // Update the auth context with new user data
        const updatedUser = response.data.data.user
        if (updatedUser && user) {
          // Update user in auth context without requiring re-login
          login({ 
            ...user, 
            firstName: updatedUser.firstName, 
            lastName: updatedUser.lastName 
          })
        }
      }
    } catch (error: any) {
      console.error('Profile update error:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update profile'
      showError(errorMessage)
      setProfileErrors([errorMessage])
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  // Handle password change form submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordErrors([])
    
    // Validate password fields
    const errors: string[] = []
    if (!passwordData.currentPassword) errors.push('Current password is required')
    if (!passwordData.newPassword) errors.push('New password is required')
    if (!passwordData.confirmPassword) errors.push('Please confirm your new password')
    
    // Validate new password strength
    if (passwordData.newPassword) {
      if (passwordData.newPassword.length < 8) {
        errors.push('New password must be at least 8 characters long')
      }
      if (!/[A-Z]/.test(passwordData.newPassword)) {
        errors.push('Password must contain at least one uppercase letter')
      }
      if (!/[a-z]/.test(passwordData.newPassword)) {
        errors.push('Password must contain at least one lowercase letter')
      }
      if (!/\d/.test(passwordData.newPassword)) {
        errors.push('Password must contain at least one number')
      }
      if (!/[@$!%*?&]/.test(passwordData.newPassword)) {
        errors.push('Password must contain at least one special character (@$!%*?&)')
      }
    }
    
    // Check if passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.push('New password and confirmation do not match')
    }
    
    // Check if new password is different from current
    if (passwordData.currentPassword === passwordData.newPassword) {
      errors.push('New password must be different from current password')
    }
    
    if (errors.length > 0) {
      setPasswordErrors(errors)
      return
    }
    
    setIsUpdatingPassword(true)
    
    try {
      // First verify the current password by attempting to login
      try {
        await apiClient.post('/auth/login', {
          email: user?.email,
          password: passwordData.currentPassword
        })
      } catch (loginError: any) {
        // If login fails, current password is incorrect
        throw new Error('Current password is incorrect')
      }
      
      // If login successful, update the password
      const response = await apiClient.put(`/users/${user?.id}`, {
        password: passwordData.newPassword
      })
      
      if (response.data.success) {
        showSuccess('Password changed successfully! Please login with your new password.')
        // Clear password form after successful change
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      }
    } catch (error: any) {
      console.error('Password change error:', error)
      let errorMessage = error.message || 'Failed to change password'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      showError(errorMessage)
      setPasswordErrors([errorMessage])
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account information and security settings</p>
        </div>

        {/* Profile Information Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-6">
            <div className="bg-accent/10 rounded-full p-3 mr-4">
              <User className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
              <p className="text-sm text-gray-600">Update your personal details</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Display validation errors */}
            {profileErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-800 mb-1">Please fix the following errors:</h3>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {profileErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* First Name Field */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="Enter your first name"
              />
            </div>

            {/* Last Name Field */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="Enter your last name"
              />
            </div>

            {/* Email Field - Read Only */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                placeholder="Email cannot be changed"
              />
              {user && !user.isEmailVerified && (
                <p className="text-sm text-amber-600 mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Your email is not verified
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Email address cannot be changed for security reasons
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={isUpdatingProfile}
                disabled={isUpdatingProfile}
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>

        {/* Change Password Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <div className="bg-blue-50 rounded-full p-3 mr-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-600">Update your password to keep your account secure</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Display validation errors */}
            {passwordErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-800 mb-1">Please fix the following errors:</h3>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {passwordErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Current Password Field */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Password Requirements:
              </h3>
              <ul className="text-xs text-blue-800 space-y-1">
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                  At least 8 characters long
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                  Contains at least one uppercase letter (A-Z)
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                  Contains at least one lowercase letter (a-z)
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                  Contains at least one number (0-9)
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                  Contains at least one special character (@$!%*?&)
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={isUpdatingPassword}
                disabled={isUpdatingPassword}
                className="w-full sm:w-auto"
              >
                <Lock className="w-4 h-4 mr-2" />
                {isUpdatingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

