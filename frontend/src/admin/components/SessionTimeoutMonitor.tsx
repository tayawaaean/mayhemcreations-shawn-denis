/**
 * Session Timeout Monitor Component
 * Monitors session activity and warns admins before session expires
 * Provides option to extend session with a single click
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, X } from 'lucide-react';
import Button from '../../components/Button';
import { useAdminAuth } from '../context/AdminAuthContext';

interface SessionTimeoutMonitorProps {
  warningTimeMinutes?: number; // Minutes before expiry to show warning (default: 5)
  sessionTimeoutMinutes?: number; // Total session timeout in minutes (default: 30)
  onTimeout?: () => void; // Callback when session times out
}

const SessionTimeoutMonitor: React.FC<SessionTimeoutMonitorProps> = ({
  warningTimeMinutes = 5,
  sessionTimeoutMinutes = 30,
  onTimeout
}) => {
  const { isLoggedIn, logout } = useAdminAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(sessionTimeoutMinutes * 60);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Reset activity timer
  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
    setTimeRemaining(sessionTimeoutMinutes * 60);
    setShowWarning(false);
    console.log('🔄 Session activity reset');
  }, [sessionTimeoutMinutes]);

  // Extend session (make a light API call to keep session alive)
  const extendSession = useCallback(async () => {
    try {
      // Make a lightweight API call to refresh session
      const response = await fetch('/api/auth/profile', {
        credentials: 'include'
      });
      
      if (response.ok) {
        resetActivity();
        console.log('✅ Session extended successfully');
      } else {
        console.error('❌ Failed to extend session');
      }
    } catch (error) {
      console.error('❌ Error extending session:', error);
    }
  }, [resetActivity]);

  // Handle session timeout
  const handleTimeout = useCallback(async () => {
    console.log('⏱️ Session timeout reached');
    setShowWarning(false);
    
    if (onTimeout) {
      onTimeout();
    } else {
      // Default: logout and show message
      await logout();
      alert('Your session has expired. Please log in again.');
    }
  }, [logout, onTimeout]);

  // Track user activity
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    // Activity events to monitor
    const activityEvents = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    // Throttled activity handler (max once per minute)
    let lastReset = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset > 60000) { // Only reset every minute
        resetActivity();
        lastReset = now;
      }
    };

    // Add activity listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isLoggedIn, resetActivity]);

  // Timer countdown
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivity) / 1000);
      const remaining = (sessionTimeoutMinutes * 60) - elapsed;
      
      setTimeRemaining(remaining);

      // Show warning when approaching timeout
      const warningThreshold = warningTimeMinutes * 60;
      if (remaining <= warningThreshold && remaining > 0) {
        setShowWarning(true);
      }

      // Handle timeout
      if (remaining <= 0) {
        handleTimeout();
      }
    }, 1000); // Check every second

    return () => clearInterval(intervalId);
  }, [isLoggedIn, lastActivity, sessionTimeoutMinutes, warningTimeMinutes, handleTimeout]);

  // Format time remaining
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't show anything if not logged in or no warning needed
  if (!isLoggedIn || !showWarning) {
    return null;
  }

  // Determine warning level
  const isUrgent = timeRemaining <= 60; // Last minute
  const isCritical = timeRemaining <= 30; // Last 30 seconds

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-md rounded-lg shadow-2xl p-4 animate-bounce ${
        isCritical
          ? 'bg-red-600 text-white'
          : isUrgent
          ? 'bg-orange-500 text-white'
          : 'bg-yellow-100 border border-yellow-400'
      }`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {isCritical || isUrgent ? (
            <AlertTriangle className="w-6 h-6" />
          ) : (
            <Clock className="w-6 h-6 text-yellow-600" />
          )}
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${!isCritical && !isUrgent ? 'text-yellow-900' : ''}`}>
            Session Expiring Soon
          </h3>
          <p className={`mt-1 text-sm ${!isCritical && !isUrgent ? 'text-yellow-800' : 'text-white'}`}>
            Your session will expire in{' '}
            <strong className={isCritical ? 'animate-pulse' : ''}>
              {formatTime(timeRemaining)}
            </strong>
          </p>
          
          <div className="mt-3 flex gap-2">
            <Button
              onClick={extendSession}
              size="sm"
              variant={isCritical || isUrgent ? 'secondary' : 'primary'}
              className="flex-1"
            >
              Extend Session
            </Button>
            <button
              onClick={() => setShowWarning(false)}
              className={`px-2 py-1 rounded hover:bg-opacity-80 ${
                isCritical || isUrgent ? 'bg-white bg-opacity-20' : 'bg-yellow-200'
              }`}
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className={`mt-3 h-1 rounded-full overflow-hidden ${
        isCritical || isUrgent ? 'bg-white bg-opacity-30' : 'bg-yellow-300'
      }`}>
        <div
          className={`h-full transition-all duration-1000 ${
            isCritical ? 'bg-white animate-pulse' : isUrgent ? 'bg-white' : 'bg-yellow-600'
          }`}
          style={{
            width: `${(timeRemaining / (warningTimeMinutes * 60)) * 100}%`
          }}
        />
      </div>
    </div>
  );
};

export default SessionTimeoutMonitor;

