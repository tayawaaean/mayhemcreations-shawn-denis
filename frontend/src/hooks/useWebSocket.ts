import { useEffect, useCallback, useRef } from 'react';
import { webSocketService, WebSocketEvents } from '../shared/websocketService';
import { useAuth } from '../ecommerce/context/AuthContext';

export const useWebSocket = () => {
  const { user, isLoggedIn } = useAuth();
  const callbacksRef = useRef<Map<string, Function[]>>(new Map());

  // Join appropriate rooms when user changes
  useEffect(() => {
    if (isLoggedIn && user && typeof window !== 'undefined') {
      // Join user room for customer events
      webSocketService.joinUserRoom(user.id.toString());
    }
  }, [isLoggedIn, user]);

  // Generic event subscription function
  const subscribe = useCallback(<K extends keyof WebSocketEvents>(
    event: K,
    callback: WebSocketEvents[K]
  ) => {
    // Store callback for cleanup
    if (!callbacksRef.current.has(event)) {
      callbacksRef.current.set(event, []);
    }
    callbacksRef.current.get(event)!.push(callback);

    // Subscribe to WebSocket event (only if WebSocket is available)
    if (typeof window !== 'undefined') {
      webSocketService.on(event, callback);
    }

    // Return unsubscribe function
    return () => {
      if (typeof window !== 'undefined') {
        webSocketService.off(event, callback);
      }
      const callbacks = callbacksRef.current.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }, []);

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      callbacksRef.current.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          webSocketService.off(event as keyof WebSocketEvents, callback as any);
        });
      });
      callbacksRef.current.clear();
    };
  }, []);

  return {
    subscribe,
    isConnected: webSocketService.getConnectionStatus(),
    reconnect: webSocketService.reconnect,
    disconnect: webSocketService.disconnect
  };
};

// Hook specifically for admin WebSocket functionality
export const useAdminWebSocket = () => {
  const { subscribe, isConnected, reconnect, disconnect } = useWebSocket();

  // Join admin room when hook is used
  useEffect(() => {
    if (typeof window !== 'undefined') {
      webSocketService.joinAdminRoom();
    }
  }, []);

  return {
    subscribe,
    isConnected,
    reconnect,
    disconnect
  };
};
