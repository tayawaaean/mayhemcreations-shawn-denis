import React, { useState, useEffect } from 'react'
import { WifiOff, Wifi, AlertCircle } from 'lucide-react'

/**
 * NetworkStatusIndicator Component
 * 
 * Displays a banner when the user goes offline and removes it when back online.
 * Provides visual feedback about connectivity status.
 * 
 * Usage:
 * <NetworkStatusIndicator />
 */
export default function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      console.log('✅ Network: Back online')
      setIsOnline(true)
      
      // Show "reconnected" message briefly if was offline
      if (wasOffline) {
        setShowReconnected(true)
        setTimeout(() => {
          setShowReconnected(false)
          setWasOffline(false)
        }, 3000) // Hide after 3 seconds
      }
    }

    const handleOffline = () => {
      console.warn('⚠️ Network: Offline detected')
      setIsOnline(false)
      setWasOffline(true)
      setShowReconnected(false)
    }

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Periodic connectivity check (every 30 seconds)
    const intervalId = setInterval(() => {
      const currentStatus = navigator.onLine
      if (currentStatus !== isOnline) {
        if (currentStatus) {
          handleOnline()
        } else {
          handleOffline()
        }
      }
    }, 30000)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(intervalId)
    }
  }, [isOnline, wasOffline])

  // Show reconnected message
  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-slideDown">
        <div className="bg-green-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-center space-x-3">
              <Wifi className="w-5 h-5" />
              <p className="text-sm font-medium">
                ✅ Connection restored! You're back online.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show offline message
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-slideDown">
        <div className="bg-red-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-center space-x-3">
              <WifiOff className="w-5 h-5" />
              <div className="flex-1 max-w-2xl">
                <p className="text-sm font-medium mb-1">
                  No Internet Connection
                </p>
                <p className="text-xs opacity-90">
                  You're currently offline. Some features may not work. Please check your connection.
                </p>
              </div>
              <AlertCircle className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Don't render anything when online and not showing reconnected message
  return null
}

