import React from 'react'
import { useNotifications } from '../context/NotificationContext'

const NotificationTest: React.FC = () => {
  const { addNotification } = useNotifications()

  const testNotifications = [
    {
      type: 'payment' as const,
      title: 'New Payment Received',
      message: 'Payment of $150.00 from John Doe',
      priority: 'medium' as const
    },
    {
      type: 'order' as const,
      title: 'New Order Placed',
      message: 'Order #12345 from Jane Smith',
      priority: 'high' as const
    },
    {
      type: 'update' as const,
      title: 'Order Status Updated',
      message: 'Order #12345 status changed to "In Production"',
      priority: 'medium' as const
    },
    {
      type: 'message' as const,
      title: 'New Message',
      message: 'Message from customer about order inquiry',
      priority: 'high' as const
    },
    {
      type: 'system' as const,
      title: 'System Alert',
      message: 'Low inventory alert for Product XYZ',
      priority: 'high' as const
    }
  ]

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Test Notifications</h3>
      <div className="space-y-2">
        {testNotifications.map((notification, index) => (
          <button
            key={index}
            onClick={() => addNotification(notification)}
            className="block w-full text-left px-4 py-2 bg-white rounded border hover:bg-gray-50 transition-colors"
          >
            <div className="font-medium">{notification.title}</div>
            <div className="text-sm text-gray-600">{notification.message}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default NotificationTest
