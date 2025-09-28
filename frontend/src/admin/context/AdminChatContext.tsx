import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAdminWebSocket } from '../../hooks/useWebSocket';
import { webSocketService } from '../../shared/websocketService';
import { messageApiService } from '../../shared/messageApiService';
import { adminApiService, Customer } from '../../shared/adminApiService';

export interface AdminChatMessage {
  id: string;
  text?: string;
  sender: 'user' | 'admin';
  timestamp: Date;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  isRead?: boolean;
  type?: 'text' | 'image' | 'file';
  attachment?: any;
}

interface AdminChatContextType {
  messages: AdminChatMessage[];
  sendMessage: (text: string, customerId: string) => void;
  sendAttachment?: (file: File, customerId: string) => Promise<void>;
  setTyping: (customerId: string, isTyping: boolean) => void;
  isUserTyping: { [customerId: string]: boolean };
  onlineCustomers: string[];
  selectedCustomer: string | null;
  setSelectedCustomer: (customerId: string | null) => void;
  markAsRead: (customerId: string) => void;
  getUnreadCount: (customerId: string) => number;
  typingTimeout: React.MutableRefObject<{ [customerId: string]: ReturnType<typeof setTimeout> | null }>;
  customerDirectory: Record<string, { name?: string | null; email?: string | null }>;
  threads: Array<{ customerId: string; lastMessage?: { text: string; sender: 'user' | 'admin'; timestamp: string } }>;
  allCustomers: Array<{ id: string; name?: string; email?: string; avatar?: string }>;
  requestNotificationPermission: () => Promise<boolean>;
}

const AdminChatContext = createContext<AdminChatContextType | undefined>(undefined);

export const AdminChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const normalizeAttachment = (att: any): any => {
    if (!att) return att;
    if (typeof att === 'string') {
      const str = att.trim();
      if (str.startsWith('{') || str.startsWith('[')) {
        try { return JSON.parse(str); } catch {}
      }
      return str; // data URL
    }
    return att;
  };
  const { subscribe, isConnected } = useAdminWebSocket();
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [isUserTyping, setIsUserTyping] = useState<{ [customerId: string]: boolean }>({});
  const [onlineCustomers, setOnlineCustomers] = useState<string[]>([]);
  const [customerDirectory, setCustomerDirectory] = useState<Record<string, { name?: string | null; email?: string | null }>>({});
  const [threads, setThreads] = useState<Array<{ customerId: string; lastMessage?: { text: string; sender: 'user' | 'admin'; timestamp: string } }>>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  
  const typingTimeout = useRef<{ [customerId: string]: ReturnType<typeof setTimeout> | null }>({});

  // Load customers from API
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        console.log('🔄 Loading customers from database...');
        setCustomersLoading(true);
        
        const response = await adminApiService.getAllCustomers();
        if (response.success && response.data) {
          setAllCustomers(response.data);
          console.log(`✅ Loaded ${response.data.length} customers from database`);
          
          // Update customer directory with loaded data
          const customerDirectoryUpdate: Record<string, { name?: string | null; email?: string | null }> = {};
          response.data.forEach(customer => {
            customerDirectoryUpdate[customer.id.toString()] = {
              name: customer.firstName && customer.lastName 
                ? `${customer.firstName} ${customer.lastName}`.trim()
                : customer.firstName || customer.lastName || null,
              email: customer.email
            };
          });
          setCustomerDirectory(prev => ({ ...prev, ...customerDirectoryUpdate }));
        } else {
          console.error('❌ Failed to load customers:', response.message);
        }
      } catch (error) {
        console.error('❌ Error loading customers:', error);
      } finally {
        setCustomersLoading(false);
      }
    };

    loadCustomers();
  }, []);

  // Load existing messages and threads on initialization
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        console.log('🔄 Loading existing chat data...');
        
        // Load recent messages
        const recentMessagesResponse = await messageApiService.getRecentMessages(100);
        if (recentMessagesResponse.success && recentMessagesResponse.data) {
          const existingMessages: AdminChatMessage[] = recentMessagesResponse.data.map(msg => ({
            id: msg.id.toString(),
            text: msg.text ?? undefined,
            sender: msg.sender,
            timestamp: new Date(msg.createdAt),
            customerId: msg.customerId.toString(),
            customerName: msg.customer?.name || msg.customer?.email || `Customer ${msg.customerId}`,
            customerEmail: msg.customer?.email,
            isRead: msg.sender === 'admin',
            type: (msg as any).type,
            attachment: normalizeAttachment((msg as any).attachment)
          }));
          
          setMessages(existingMessages);
          console.log(`✅ Loaded ${existingMessages.length} existing messages`);
          
          // Update customer directory with loaded data
          const customerDirectoryUpdate: Record<string, { name?: string | null; email?: string | null }> = {};
          recentMessagesResponse.data.forEach(msg => {
            if (msg.customer) {
              customerDirectoryUpdate[msg.customerId.toString()] = {
                name: msg.customer.name,
                email: msg.customer.email
              };
            }
          });
          setCustomerDirectory(prev => ({ ...prev, ...customerDirectoryUpdate }));
        }

        // Load chat threads
        const threadsResponse = await messageApiService.getChatThreads();
        if (threadsResponse.success && threadsResponse.data) {
          const existingThreads = threadsResponse.data.map(thread => ({
            customerId: thread.customerId.toString(),
            lastMessage: thread.lastMessage ? {
              text: thread.lastMessage.text || '',
              type: (thread.lastMessage as any).type,
              sender: thread.lastMessage.sender,
              timestamp: thread.lastMessage.timestamp
            } : undefined
          }));
          
          setThreads(existingThreads);
          console.log(`✅ Loaded ${existingThreads.length} existing threads`);
          
          // Update customer directory with thread data
          const threadCustomerDirectoryUpdate: Record<string, { name?: string | null; email?: string | null }> = {};
          threadsResponse.data.forEach(thread => {
            const c = (thread as any).customer;
            if (c?.firstName || c?.lastName || c?.email || c?.name) {
              threadCustomerDirectoryUpdate[thread.customerId.toString()] = {
                name: c?.name || `${c?.firstName || ''} ${c?.lastName || ''}`.trim() || null,
                email: c?.email || null
              };
            }
          });
          setCustomerDirectory(prev => ({ ...prev, ...threadCustomerDirectoryUpdate }));
        }
      } catch (error) {
        console.error('❌ Error loading existing chat data:', error);
      }
    };

    loadExistingData();
    
    // Request notification permission for admin browser notifications
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('✅ Admin notification permission granted');
        } else {
          console.log('❌ Admin notification permission denied');
        }
      });
    }
  }, []);

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
        text: (data as any).text ?? undefined,
        sender: data.sender,
        timestamp: new Date(data.timestamp),
        customerId: data.customerId,
        customerName: (data as any).name || undefined,
        customerEmail: (data as any).email || undefined,
        isRead: data.sender === 'admin',
        type: (data as any).type,
        attachment: normalizeAttachment((data as any).attachment)
      };

      setMessages(prev => {
        // Prevent duplicates from echo with enhanced logic
        const exists = prev.some(msg => 
          msg.id === newMessage.id || 
          (msg.text === newMessage.text && 
           msg.sender === newMessage.sender && 
           msg.customerId === newMessage.customerId &&
           Math.abs(new Date(msg.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 1000)
        );
        return exists ? prev : [...prev, newMessage];
      });

      // Update threads with latest activity
      setThreads(prev => {
        const others = prev.filter(t => t.customerId !== data.customerId);
        return [{ customerId: data.customerId, lastMessage: { text: (data as any).text ?? '', sender: data.sender, timestamp: (data as any).timestamp } }, ...others];
      });

      // Show browser notification for customer messages when admin is not focused on that customer
      if (data.sender === 'user' && selectedCustomer !== data.customerId) {
        const customerName = customerDirectory[data.customerId]?.name || `Customer ${data.customerId}`;
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`New Message from ${customerName}`, {
            body: data.text || 'You have received a new message from a customer',
            icon: '/favicon.svg',
            tag: `admin-chat-${data.customerId}`,
            requireInteraction: false
          });
        }
      }
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
        text: m.text ?? undefined,
        sender: m.sender,
        timestamp: new Date(m.timestamp),
        customerId: selectedCustomer!,
        type: (m as any).type,
        attachment: normalizeAttachment((m as any).attachment)
      }));
      setMessages(prev => {
        // Merge without duplicates
        const map = new Map(prev.map(m => [m.id, m]));
        for (const m of history) map.set(m.id, m);
        return Array.from(map.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });
      // Mark all user messages for this customer as read when opening
      setMessages(prev => prev.map(msg => (
        msg.customerId === selectedCustomer && msg.sender === 'user' ? { ...msg, isRead: true } : msg
      )));
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

  const sendAttachment = async (file: File, customerId: string) => {
    const messageId = `admin_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isImage = !!file.type && file.type.startsWith('image/');
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const newMessage: AdminChatMessage = {
      id: messageId,
      sender: 'admin',
      timestamp: new Date(),
      customerId,
      isRead: true,
      type: (isImage ? 'image' : 'file') as 'image' | 'file',
      attachment: {
        name: file.name,
        size: file.size,
        mimeType: file.type,
        data: base64,
      }
    };
    setMessages(prev => [...prev, newMessage]);
    webSocketService.sendChatAttachment(messageId, customerId, { type: newMessage.type === 'image' ? 'image' : 'file', attachment: newMessage.attachment });
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

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission === 'denied') {
      return false;
    }
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const value: AdminChatContextType = {
    messages,
    sendMessage,
    sendAttachment,
    setTyping,
    isUserTyping,
    onlineCustomers,
    selectedCustomer,
    setSelectedCustomer,
    markAsRead,
    getUnreadCount,
    typingTimeout,
    customerDirectory,
    threads,
    allCustomers: allCustomers.map(customer => ({
      id: customer.id.toString(),
      name: customer.firstName && customer.lastName 
        ? `${customer.firstName} ${customer.lastName}`.trim()
        : customer.firstName || customer.lastName || customer.email,
      email: customer.email,
      avatar: undefined // Customers don't have avatars in the current schema
    })),
    requestNotificationPermission
  };

  return (
    <AdminChatContext.Provider value={value}>
      {children}
    </AdminChatContext.Provider>
  );
};

const useAdminChat = (): AdminChatContextType => {
  const context = useContext(AdminChatContext);
  if (context === undefined) {
    throw new Error('useAdminChat must be used within an AdminChatProvider');
  }
  return context;
};

export { useAdminChat };
