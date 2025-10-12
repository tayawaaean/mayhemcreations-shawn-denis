import React, { useEffect } from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import Button from './Button'

// Define the different types of modals available
type ModalType = 'success' | 'error' | 'warning' | 'info' | 'confirm'

// Props interface for the Modal component
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  type?: ModalType
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  showCancel?: boolean
}

// Get the appropriate icon and color scheme based on modal type
const getModalStyles = (type: ModalType) => {
  switch (type) {
    case 'success':
      return {
        icon: CheckCircle,
        iconColor: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        buttonVariant: 'primary' as const
      }
    case 'error':
      return {
        icon: AlertCircle,
        iconColor: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        buttonVariant: 'primary' as const
      }
    case 'warning':
      return {
        icon: AlertTriangle,
        iconColor: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        buttonVariant: 'primary' as const
      }
    case 'info':
      return {
        icon: Info,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        buttonVariant: 'primary' as const
      }
    case 'confirm':
      return {
        icon: AlertCircle,
        iconColor: 'text-purple-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        buttonVariant: 'primary' as const
      }
    default:
      return {
        icon: Info,
        iconColor: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        buttonVariant: 'primary' as const
      }
  }
}

// Main Modal component for displaying alerts and confirmations
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  showCancel = false
}) => {
  // Close modal on escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Don't render if modal is not open
  if (!isOpen) return null

  const styles = getModalStyles(type)
  const Icon = styles.icon

  // Handle confirm button click
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  return (
    // Modal overlay with backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn">
      {/* Modal container */}
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-md w-full animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header with close button */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`flex-shrink-0 ${styles.bgColor} ${styles.borderColor} border rounded-full p-2`}>
              <Icon className={`w-6 h-6 ${styles.iconColor}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : type === 'confirm' ? 'Confirm' : 'Information')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body with message */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Modal footer with action buttons */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          {showCancel && (
            <Button
              variant="outline"
              onClick={onClose}
            >
              {cancelText}
            </Button>
          )}
          <Button
            variant={styles.buttonVariant}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Modal

