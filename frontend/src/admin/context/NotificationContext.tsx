import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useAdminAuth } from './AdminAuthContext'

export interface Notification {
  id: string
  type: 'payment' | 'order' | 'update' | 'message' | 'system'
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  priority: 'low' | 'medium' | 'high'
  data?: any // Additional data related to the notification
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  removeNotification: (notificationId: string) => void
  clearAllNotifications: () => void
  getNotificationsByType: (type: Notification['type']) => Notification[]
  getUnreadCountByType: (type: Notification['type']) => number
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { subscribe } = useWebSocket()
  const { user } = useAdminAuth()

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length

  // Add notification
  const addNotification = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    const notification: Notification = {
      ...notificationData,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      isRead: false
    }

    setNotifications(prev => [notification, ...prev])

    // Show browser notification if permission is granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      })
    }

    // Auto-remove low priority notifications after 24 hours
    if (notification.priority === 'low') {
      setTimeout(() => {
        removeNotification(notification.id)
      }, 24 * 60 * 60 * 1000)
    }
  }

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    )
  }

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    )
  }

  // Remove notification
  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
  }

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([])
  }

  // Clear notifications when user logs out
  useEffect(() => {
    if (!user) {
      setNotifications([])
      console.log('🧹 Cleared notifications - user logged out')
    }
  }, [user])

  // Get notifications by type
  const getNotificationsByType = (type: Notification['type']) => {
    return notifications.filter(notif => notif.type === type)
  }

  // Get unread count by type
  const getUnreadCountByType = (type: Notification['type']) => {
    return notifications.filter(notif => notif.type === type && !notif.isRead).length
  }

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Set up WebSocket listeners for real-time notifications
  useEffect(() => {
    if (!user) return

    // Listen for new payments
    const unsubscribePayment = subscribe('payment_created', (data: any) => {
      addNotification({
        type: 'payment',
        title: 'New Payment Received',
        message: `Payment of $${data.amount} from ${data.customerName || 'Customer'}`,
        priority: 'medium',
        data
      })
    })

    // Listen for new orders
    const unsubscribeOrder = subscribe('order_created', (data: any) => {
      addNotification({
        type: 'order',
        title: 'New Order Placed',
        message: `Order #${data.orderNumber} from ${data.customerName || 'Customer'}`,
        priority: 'high',
        data
      })
    })

    // Listen for order updates
    const unsubscribeOrderUpdate = subscribe('order_updated', (data: any) => {
      addNotification({
        type: 'update',
        title: 'Order Updated',
        message: `Order #${data.orderNumber} status changed to ${data.status}`,
        priority: 'medium',
        data
      })
    })

    // Listen for new messages
    const unsubscribeMessage = subscribe('chat_message_received', (data: any) => {
      if (data.sender === 'user') {
        addNotification({
          type: 'message',
          title: 'New Message',
          message: `Message from ${data.customerName || 'Customer'}`,
          priority: 'high',
          data
        })
      }
    })

    // Listen for new orders submitted for review
    const unsubscribeNewOrder = subscribe('new_order_notification', (data: any) => {
      console.log('🔔 New order notification received:', data)
      addNotification({
        type: 'order',
        title: 'New Order for Review',
        message: `New order with ${data.itemCount} item(s) submitted. Total: $${Number(data.total).toFixed(2)}`,
        priority: 'high',
        data: {
          orderReviewId: data.orderReviewId,
          userId: data.userId,
          itemCount: data.itemCount,
          total: data.total
        }
      })
    })

    // Listen for paid orders
    const unsubscribePaidOrder = subscribe('order_paid_notification', (data: any) => {
      console.log('🔔 Order paid notification received:', data)
      addNotification({
        type: 'payment',
        title: 'Order Payment Received',
        message: `Order #${data.orderNumber || data.orderReviewId} has been paid. Total: $${Number(data.total).toFixed(2)}`,
        priority: 'high',
        data: {
          orderReviewId: data.orderReviewId,
          orderNumber: data.orderNumber,
          userId: data.userId,
          total: data.total
        }
      })
    })

    // Listen for delivered orders
    const unsubscribeDeliveredOrder = subscribe('order_delivered_notification', (data: any) => {
      console.log('🔔 Order delivered notification received:', data)
      addNotification({
        type: 'update',
        title: 'Order Delivered',
        message: `Order #${data.orderNumber || data.orderReviewId} has been marked as delivered`,
        priority: 'medium',
        data: {
          orderReviewId: data.orderReviewId,
          orderNumber: data.orderNumber,
          userId: data.userId
        }
      })
    })

    // Listen for system notifications
    const unsubscribeSystem = subscribe('system_notification', (data: any) => {
      addNotification({
        type: 'system',
        title: data.title || 'System Notification',
        message: data.message,
        priority: data.priority || 'medium',
        data
      })
    })

    return () => {
      unsubscribePayment()
      unsubscribeOrder()
      unsubscribeOrderUpdate()
      unsubscribeMessage()
      unsubscribeNewOrder()
      unsubscribePaidOrder()
      unsubscribeDeliveredOrder()
      unsubscribeSystem()
    }
  }, [user, subscribe])

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (!user?.id) return; // Don't load if no user
    
    const storageKey = `admin_notifications_${user.id}`;
    const savedNotifications = localStorage.getItem(storageKey);
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        
        // Filter out old notifications (older than 7 days) and clean up data
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const cleanedNotifications = parsed
          .map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp)
          }))
          .filter((n: any) => {
            // Keep high priority notifications longer, remove old low priority ones
            if (n.priority === 'low' && n.timestamp < sevenDaysAgo) {
              return false;
            }
            // Keep medium and high priority notifications for 30 days
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return n.timestamp > thirtyDaysAgo;
          });
        
        setNotifications(cleanedNotifications);
        console.log(`📦 Loaded ${cleanedNotifications.length} notifications for user ${user.id} (filtered from ${parsed.length})`);
        
        // Update localStorage with cleaned data if we filtered anything
        if (cleanedNotifications.length !== parsed.length) {
          localStorage.setItem(storageKey, JSON.stringify(cleanedNotifications));
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
        // Clear corrupted data
        localStorage.removeItem(storageKey);
      }
    }
  }, [user?.id])

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (!user?.id) return; // Don't save if no user
    
    const storageKey = `admin_notifications_${user.id}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(notifications));
      console.log(`💾 Saved ${notifications.length} notifications for user ${user.id}`);
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
      // If localStorage is full, try to clean up old notifications
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.log('🧹 localStorage quota exceeded, cleaning up old notifications...');
        const cleanedNotifications = notifications.filter(n => {
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return n.timestamp > sevenDaysAgo;
        });
        try {
          localStorage.setItem(storageKey, JSON.stringify(cleanedNotifications));
          console.log(`🧹 Cleaned up notifications, saved ${cleanedNotifications.length} notifications`);
        } catch (cleanupError) {
          console.error('Failed to save even after cleanup:', cleanupError);
        }
      }
    }
  }, [notifications, user?.id])

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    getNotificationsByType,
    getUnreadCountByType
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
