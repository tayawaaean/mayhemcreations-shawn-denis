/**
 * Network Status Indicator Component
 * Shows real-time network connectivity status
 * Displays warning when offline and confirmation when back online
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';

interface NetworkStatusIndicatorProps {
  className?: string;
  showOnlineStatus?: boolean; // Whether to show indicator when online
}

const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({ 
  className = '', 
  showOnlineStatus = false 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [offlineDuration, setOfflineDuration] = useState(0);
  const [offlineStartTime, setOfflineStartTime] = useState<number | null>(null);

  useEffect(() => {
    // Handle online event
    const handleOnline = () => {
      console.log('🌐 Network: Back online');
      setIsOnline(true);
      
      // Show reconnected message briefly
      setShowReconnected(true);
      setTimeout(() => {
        setShowReconnected(false);
      }, 3000);

      // Calculate offline duration
      if (offlineStartTime) {
        const duration = Date.now() - offlineStartTime;
        setOfflineDuration(duration);
        setOfflineStartTime(null);
      }
    };

    // Handle offline event
    const handleOffline = () => {
      console.log('🌐 Network: Offline detected');
      setIsOnline(false);
      setShowReconnected(false);
      setOfflineStartTime(Date.now());
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check (every 30 seconds)
    const intervalId = setInterval(() => {
      const currentStatus = navigator.onLine;
      if (currentStatus !== isOnline) {
        console.log('🌐 Network: Status changed (polled):', currentStatus ? 'online' : 'offline');
        if (currentStatus) {
          handleOnline();
        } else {
          handleOffline();
        }
      }
    }, 30000);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [isOnline, offlineStartTime]);

  // Format offline duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Don't show anything if online and showOnlineStatus is false
  if (isOnline && !showOnlineStatus && !showReconnected) {
    return null;
  }

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div className={`fixed top-0 left-0 right-0 z-50 bg-red-600 text-white py-3 px-4 shadow-lg ${className}`}>
          <div className="container mx-auto flex items-center justify-center">
            <WifiOff className="w-5 h-5 mr-2 animate-pulse" />
            <div className="flex-1 text-center">
              <p className="font-semibold">No Internet Connection</p>
              <p className="text-sm text-red-100">
                You're currently offline. Some features may not work properly.
              </p>
            </div>
            <AlertTriangle className="w-5 h-5 ml-2" />
          </div>
        </div>
      )}

      {/* Reconnected Banner */}
      {showReconnected && (
        <div className={`fixed top-0 left-0 right-0 z-50 bg-green-600 text-white py-3 px-4 shadow-lg ${className}`}>
          <div className="container mx-auto flex items-center justify-center">
            <Wifi className="w-5 h-5 mr-2" />
            <div className="flex-1 text-center">
              <p className="font-semibold">Back Online</p>
              {offlineDuration > 0 && (
                <p className="text-sm text-green-100">
                  You were offline for {formatDuration(offlineDuration)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Online Indicator (small, corner) */}
      {isOnline && showOnlineStatus && !showReconnected && (
        <div className="fixed bottom-4 right-4 z-40 bg-green-100 border border-green-300 rounded-lg px-3 py-2 shadow-md">
          <div className="flex items-center text-green-800">
            <Wifi className="w-4 h-4 mr-1" />
            <span className="text-xs font-medium">Online</span>
          </div>
        </div>
      )}
    </>
  );
};

export default NetworkStatusIndicator;

