import React from 'react'
import { AdminAuthProvider } from './context/AdminAuthContext'
import EmployeeLoginWrapper from './components/EmployeeLoginWrapper'

const EmployeeApp: React.FC = () => {
  return (
    <AdminAuthProvider>
      <EmployeeLoginWrapper />
    </AdminAuthProvider>
  )
}

export default EmployeeApp
