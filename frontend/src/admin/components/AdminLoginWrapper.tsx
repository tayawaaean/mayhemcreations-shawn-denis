import React from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import AdminLogin from './AdminLogin'

export default function AdminLoginWrapper() {
  const { login } = useAdminAuth()

  return <AdminLogin onLogin={login} />
}
