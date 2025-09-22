import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAdminWebSocket } from '../../hooks/useWebSocket';
import { webSocketService } from '../../shared/websocketService';

export interface AdminChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: Date;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  isRead?: boolean;
}

interface AdminChatContextType {
  messages: AdminChatMessage[];
  sendMessage: (text: string, customerId: string) => void;
  setTyping: (customerId: string, isTyping: boolean) => void;
  isUserTyping: { [customerId: string]: boolean };
  onlineCustomers: string[];
  selectedCustomer: string | null;
  setSelectedCustomer: (customerId: string | null) => void;
  markAsRead: (customerId: string) => void;
  getUnreadCount: (customerId: string) => number;
  typingTimeout: React.MutableRefObject<{ [customerId: string]: NodeJS.Timeout | null }>;
  customerDirectory: Record<string, { name?: string | null; email?: string | null }>;
  threads: Array<{ customerId: string; lastMessage?: { text: string; sender: 'user' | 'admin'; timestamp: string } }>;
}

const AdminChatContext = createContext<AdminChatContextType | undefined>(undefined);

export const AdminChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { subscribe, isConnected } = useAdminWebSocket();
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [isUserTyping, setIsUserTyping] = useState<{ [customerId: string]: boolean }>({});
  const [onlineCustomers, setOnlineCustomers] = useState<string[]>([]);
  const [customerDirectory, setCustomerDirectory] = useState<Record<string, { name?: string | null; email?: string | null }>>({});
  const [threads, setThreads] = useState<Array<{ customerId: string; lastMessage?: { text: string; sender: 'user' | 'admin'; timestamp: string } }>>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  
  const typingTimeout = useRef<{ [customerId: string]: NodeJS.Timeout | null }>({});

  // WebSocket event listeners
  useEffect(() => {
    if (!isConnected) return;

    // Listen for chat messages
    const unsubscribeMessage = subscribe('chat_message_received', (data) => {
      console.log('💬 Admin received chat message:', data);
      
      // cache identity if provided
      if (data.customerId) {
        setCustomerDirectory(prev => ({
          ...prev,
          [data.customerId]: {
            name: (data as any).name || prev[data.customerId]?.name || null,
            email: (data as any).email || prev[data.customerId]?.email || null
          }
        }));
      }

      const newMessage: AdminChatMessage = {
        id: data.messageId,
        text: data.text,
        sender: data.sender,
        timestamp: new Date(data.timestamp),
        customerId: data.customerId,
        customerName: (data as any).name || undefined,
        customerEmail: (data as any).email || undefined,
        isRead: data.sender === 'admin' // Admin messages are read by default
      };

      setMessages(prev => {
        // Prevent duplicates from echo
        const exists = prev.some(msg => msg.id === newMessage.id);
        return exists ? prev : [...prev, newMessage];
      });

      // Update threads with latest activity
      setThreads(prev => {
        const others = prev.filter(t => t.customerId !== data.customerId);
        return [{ customerId: data.customerId, lastMessage: { text: data.text, sender: data.sender, timestamp: data.timestamp } }, ...others];
      });
    });

    // Listen for user typing status
    const unsubscribeTyping = subscribe('user_typing', (data) => {
      console.log('⌨️ User typing status:', data);
      setIsUserTyping(prev => ({
        ...prev,
        [data.customerId]: data.isTyping
      }));

      // Clear typing status after 3 seconds
      if (typingTimeout.current[data.customerId]) {
        clearTimeout(typingTimeout.current[data.customerId]!);
      }
      
      if (data.isTyping) {
        typingTimeout.current[data.customerId] = setTimeout(() => {
          setIsUserTyping(prev => ({
            ...prev,
            [data.customerId]: false
          }));
        }, 3000);
      }
    });

    // Listen for customer connections
    const unsubscribeConnection = subscribe('chat_connected', (data) => {
      console.log('🟢 Customer connected:', data);
      if (data.customerId) {
        setCustomerDirectory(prev => ({
          ...prev,
          [data.customerId]: {
            name: (data as any).name || prev[data.customerId]?.name || null,
            email: (data as any).email || prev[data.customerId]?.email || null
          }
        }));
      }
      setOnlineCustomers(prev => {
        if (!prev.includes(data.customerId)) {
          return [...prev, data.customerId];
        }
        return prev;
      });
    });

    // Receive threads list
    const unsubscribeThreads = subscribe('chat_threads' as any, (payload: any) => {
      if (payload?.threads) setThreads(payload.threads);
      // cache identities
      if (Array.isArray(payload?.threads)) {
        setCustomerDirectory(prev => {
          const next = { ...prev };
          payload.threads.forEach((t: any) => {
            next[t.customerId] = {
              name: t.name || next[t.customerId]?.name || null,
              email: t.email || next[t.customerId]?.email || null,
            };
          });
          return next;
        });
      }
    });

    const unsubscribeDisconnection = subscribe('chat_disconnected', (data) => {
      console.log('🔴 Customer disconnected:', data);
      setOnlineCustomers(prev => prev.filter(id => id !== data.customerId));
    });

    return () => {
      unsubscribeMessage();
      unsubscribeTyping();
      unsubscribeConnection();
      unsubscribeDisconnection();
      unsubscribeThreads();
    };
  }, [isConnected, subscribe]);

  // Load history when selecting a customer
  useEffect(() => {
    if (!selectedCustomer || !isConnected) return;
    // Request history for selected customer
    try {
      (webSocketService as any).emit('request_chat_history', { customerId: selectedCustomer, limit: 200 });
    } catch {}

    const onHistory = (data: any) => {
      if (String(data.customerId) !== String(selectedCustomer)) return;
      const history: AdminChatMessage[] = data.messages.map((m: any) => ({
        id: String(m.id),
        text: m.text,
        sender: m.sender,
        timestamp: new Date(m.timestamp),
        customerId: selectedCustomer!
      }));
      setMessages(prev => {
        // Merge without duplicates
        const map = new Map(prev.map(m => [m.id, m]));
        for (const m of history) map.set(m.id, m);
        return Array.from(map.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });
    };

    webSocketService.on('chat_history' as any, onHistory as any);
    return () => {
      webSocketService.off('chat_history' as any, onHistory as any);
    };
  }, [selectedCustomer, isConnected]);

  const sendMessage = (text: string, customerId: string) => {
    if (!text.trim()) return;

    const messageId = `admin_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: AdminChatMessage = {
      id: messageId,
      text: text.trim(),
      sender: 'admin',
      timestamp: new Date(),
      customerId,
      isRead: true
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, newMessage]);

    // Send via WebSocket
    webSocketService.sendChatMessage(messageId, text.trim(), customerId);

    // Send typing status
    webSocketService.sendTypingStatus(customerId, true);
    
    // Clear typing status after 1 second
    if (typingTimeout.current[customerId]) {
      clearTimeout(typingTimeout.current[customerId]!);
    }
    
    typingTimeout.current[customerId] = setTimeout(() => {
      webSocketService.sendTypingStatus(customerId, false);
    }, 1000);
  };

  const setTyping = (customerId: string, isTyping: boolean) => {
    webSocketService.sendTypingStatus(customerId, isTyping);
    if (typingTimeout.current[customerId]) {
      clearTimeout(typingTimeout.current[customerId]!);
    }
    typingTimeout.current[customerId] = setTimeout(() => {
      webSocketService.sendTypingStatus(customerId, false);
    }, 1500);
  };

  const markAsRead = (customerId: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.customerId === customerId && msg.sender === 'user' 
          ? { ...msg, isRead: true }
          : msg
      )
    );
  };

  const getUnreadCount = (customerId: string) => {
    return messages.filter(msg => 
      msg.customerId === customerId && 
      msg.sender === 'user' && 
      !msg.isRead
    ).length;
  };

  const value: AdminChatContextType = {
    messages,
    sendMessage,
    setTyping,
    isUserTyping,
    onlineCustomers,
    selectedCustomer,
    setSelectedCustomer,
    markAsRead,
    getUnreadCount,
    typingTimeout,
    customerDirectory,
    threads
  };

  return (
    <AdminChatContext.Provider value={value}>
      {children}
    </AdminChatContext.Provider>
  );
};

export const useAdminChat = (): AdminChatContextType => {
  const context = useContext(AdminChatContext);
  if (context === undefined) {
    throw new Error('useAdminChat must be used within an AdminChatProvider');
  }
  return context;
};
