import React from 'react'
import { AdminAuthProvider } from './context/AdminAuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import NetworkStatusIndicator from './components/NetworkStatusIndicator'
import SessionTimeoutMonitor from './components/SessionTimeoutMonitor'
import EmployeeLoginWrapper from './components/EmployeeLoginWrapper'

const EmployeeApp: React.FC = () => {
  return (
    <ErrorBoundary>
      <AdminAuthProvider>
        {/* Network status indicator */}
        <NetworkStatusIndicator />
        
        {/* Session timeout monitor */}
        <SessionTimeoutMonitor 
          warningTimeMinutes={5}
          sessionTimeoutMinutes={30}
        />
        
        <EmployeeLoginWrapper />
      </AdminAuthProvider>
    </ErrorBoundary>
  )
}

export default EmployeeApp
