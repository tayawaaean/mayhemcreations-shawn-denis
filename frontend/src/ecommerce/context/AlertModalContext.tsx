import React, { createContext, useContext, useState, useCallback } from 'react'
import Modal from '../../components/Modal'

// Type for modal configuration
type ModalType = 'success' | 'error' | 'warning' | 'info' | 'confirm'

// Interface for modal options
interface AlertModalOptions {
  title?: string
  message: string
  type?: ModalType
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  showCancel?: boolean
}

// Context type definition
interface AlertModalContextType {
  showAlert: (options: AlertModalOptions) => void
  showSuccess: (message: string, title?: string) => void
  showError: (message: string, title?: string) => void
  showWarning: (message: string, title?: string) => void
  showInfo: (message: string, title?: string) => void
  showConfirm: (message: string, onConfirm: () => void, title?: string) => void
}

// Create the context with undefined default value
const AlertModalContext = createContext<AlertModalContextType | undefined>(undefined)

// Provider component props
interface AlertModalProviderProps {
  children: React.ReactNode
}

// Provider component that wraps the app to provide modal functionality
export const AlertModalProvider: React.FC<AlertModalProviderProps> = ({ children }) => {
  // State to manage modal visibility and configuration
  const [isOpen, setIsOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState<AlertModalOptions>({
    message: '',
    type: 'info'
  })

  // Generic function to show any type of alert
  const showAlert = useCallback((options: AlertModalOptions) => {
    setModalConfig(options)
    setIsOpen(true)
  }, [])

  // Convenience function to show success alert
  const showSuccess = useCallback((message: string, title?: string) => {
    showAlert({
      message,
      title,
      type: 'success',
      confirmText: 'OK'
    })
  }, [showAlert])

  // Convenience function to show error alert
  const showError = useCallback((message: string, title?: string) => {
    showAlert({
      message,
      title,
      type: 'error',
      confirmText: 'OK'
    })
  }, [showAlert])

  // Convenience function to show warning alert
  const showWarning = useCallback((message: string, title?: string) => {
    showAlert({
      message,
      title,
      type: 'warning',
      confirmText: 'OK'
    })
  }, [showAlert])

  // Convenience function to show info alert
  const showInfo = useCallback((message: string, title?: string) => {
    showAlert({
      message,
      title,
      type: 'info',
      confirmText: 'OK'
    })
  }, [showAlert])

  // Convenience function to show confirmation dialog
  const showConfirm = useCallback((message: string, onConfirm: () => void, title?: string) => {
    showAlert({
      message,
      title,
      type: 'confirm',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      onConfirm,
      showCancel: true
    })
  }, [showAlert])

  // Function to close the modal
  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Context value with all modal functions
  const value: AlertModalContextType = {
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm
  }

  return (
    <AlertModalContext.Provider value={value}>
      {children}
      {/* Render the modal component */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        onConfirm={modalConfig.onConfirm}
        showCancel={modalConfig.showCancel}
      />
    </AlertModalContext.Provider>
  )
}

// Custom hook to use the alert modal context
export const useAlertModal = (): AlertModalContextType => {
  const context = useContext(AlertModalContext)
  if (context === undefined) {
    throw new Error('useAlertModal must be used within an AlertModalProvider')
  }
  return context
}

