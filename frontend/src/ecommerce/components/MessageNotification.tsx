import React from 'react'
import { MessageCircle, X } from 'lucide-react'
import { useRealTimeChat } from '../../shared/realTimeChatContext'

interface MessageNotificationProps {
  onDismiss?: () => void
}

export default function MessageNotification({ onDismiss }: MessageNotificationProps) {
  const { unreadCount, setIsOpen } = useRealTimeChat()

  if (unreadCount === 0) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 mx-4 sm:mx-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">
              You have {unreadCount} new message{unreadCount !== 1 ? 's' : ''} from our support team
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Click to view your messages and get help with your order.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            View Messages
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-blue-400 hover:text-blue-600 p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
