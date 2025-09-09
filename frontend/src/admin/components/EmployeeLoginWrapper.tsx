import React from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import EmployeeLogin from './EmployeeLogin'

export default function EmployeeLoginWrapper() {
  const { login } = useAdminAuth()

  return <EmployeeLogin onLogin={login} />
}
