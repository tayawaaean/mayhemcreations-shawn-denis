import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../ecommerce/context/AuthContext';
import { webSocketService } from './websocketService';

export interface ChatMessage {
  id: string;
  text?: string;
  sender: 'user' | 'admin';
  timestamp: Date;
  isTyping?: boolean;
  customerId?: string;
  type?: 'text' | 'image' | 'file';
  attachment?: any;
}

interface RealTimeChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  setTyping: (isTyping: boolean) => void;
  isAdminTyping: boolean;
  isConnected: boolean;
  isCustomerOnline: boolean;
  quickQuestions: string[];
  typingTimeout: React.MutableRefObject<NodeJS.Timeout | null>;
  unreadCount: number;
  requestNotificationPermission: () => Promise<boolean>;
}

const RealTimeChatContext = createContext<RealTimeChatContextType | undefined>(undefined);

export const RealTimeChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn } = useAuth();
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
  const { subscribe, isConnected } = useWebSocket();
  const [isOpen, _setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [isCustomerOnline, setIsCustomerOnline] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const setIsOpen = (open: boolean) => {
    _setIsOpen(open);
    if (open) {
      setUnreadCount(0);
    }
  };
  const [quickQuestions] = useState([
    "What are your business hours?",
    "How long does shipping take?",
    "Do you offer custom designs?",
    "What payment methods do you accept?",
    "Can I track my order?",
    "Do you have a return policy?"
  ]);
  
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const customerId = user?.id?.toString() || 'anonymous';

  // Join chat room when chat is opened and user is authenticated
  useEffect(() => {
    if (isOpen && isLoggedIn && user && isConnected) {
      webSocketService.joinChatRoom(customerId);
      console.log('💬 Joined chat room for customer:', customerId);
      
      // Add welcome message
      if (messages.length === 0) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          text: 'Hello! How can we help you today?',
          sender: 'admin',
          timestamp: new Date(),
          customerId
        };
        setMessages([welcomeMessage]);
      }
    }

    return () => {
      if (isLoggedIn && user) {
        webSocketService.leaveChatRoom(customerId);
        console.log('💬 Left chat room for customer:', customerId);
      }
    };
  }, [isOpen, isLoggedIn, user, isConnected, customerId]);

  // WebSocket event listeners - only when chat is open
  useEffect(() => {
    if (!isOpen || !isConnected) return;

    // Listen for chat messages
    const unsubscribeMessage = subscribe('chat_message_received', (data) => {
      console.log('💬 Received chat message:', data);
      
      const newMessage: ChatMessage = {
        id: data.messageId,
        text: data.text ?? undefined,
        sender: data.sender,
        timestamp: new Date(data.timestamp),
        customerId: data.customerId
        , type: (data as any).type,
        attachment: normalizeAttachment((data as any).attachment)
      };

      // Prevent duplicates when echoing messages we already appended locally
      setMessages(prev => {
        const exists = prev.some(msg => 
          msg.id === newMessage.id || 
          (msg.text === newMessage.text && 
           msg.sender === newMessage.sender && 
           Math.abs(new Date(msg.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 1000)
        );
        return exists ? prev : [...prev, newMessage];
      });

      // Update unread counter for admin messages when widget closed
      if (data.sender === 'admin' && !isOpen) {
        setUnreadCount(c => c + 1);
        
        // Show browser notification for admin messages
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Message from Support', {
            body: data.text || 'You have received a new message from our support team',
            icon: '/favicon.svg',
            tag: 'chat-message',
            requireInteraction: false
          });
        }
      }
    });

    // Listen for admin typing status
    const unsubscribeTyping = subscribe('admin_typing', (data) => {
      console.log('⌨️ Admin typing status:', data);
      if (data.customerId === customerId) {
        setIsAdminTyping(data.isTyping);
      }
    });

    // Load history when provided by server
    const unsubscribeHistory = subscribe('chat_history', (data) => {
      if (String(data.customerId) !== String(customerId)) return;
      const history = data.messages.map(m => ({
        id: String(m.id),
        text: m.text ?? undefined,
        sender: m.sender,
        timestamp: new Date(m.timestamp),
        customerId,
        type: (m as any).type,
        attachment: normalizeAttachment((m as any).attachment),
      }));
      setMessages(history);
    });

    // Listen for customer online status
    const unsubscribeConnection = subscribe('chat_connected', (data) => {
      console.log('🟢 Customer connected:', data);
      if (data.customerId === customerId) {
        setIsCustomerOnline(true);
      }
    });

    const unsubscribeDisconnection = subscribe('chat_disconnected', (data) => {
      console.log('🔴 Customer disconnected:', data);
      if (data.customerId === customerId) {
        setIsCustomerOnline(false);
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeTyping();
      unsubscribeConnection();
      unsubscribeDisconnection();
      unsubscribeHistory();
    };
  }, [isOpen, isConnected, customerId, subscribe]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    // Ensure WebSocket connection before sending
    webSocketService.ensureConnection();

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: ChatMessage = {
      id: messageId,
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
      customerId
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, newMessage]);

    // Send via WebSocket
    webSocketService.sendChatMessage(messageId, text.trim(), customerId);

    // Send typing status
    webSocketService.sendTypingStatus(customerId, true);
    
    // Clear typing status after 3 seconds
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    
    typingTimeout.current = setTimeout(() => {
      webSocketService.sendTypingStatus(customerId, false);
    }, 3000);
  };

  // Bridge file input in ChatWidget to this provider
  useEffect(() => {
    const onAttach = async (e: any) => {
      const { file, dataUrl } = e.detail || {};
      if (!file || !dataUrl) return;
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const isImage = file.type.startsWith('image/');
      const localMessage: ChatMessage = {
        id: messageId,
        sender: 'user',
        timestamp: new Date(),
        customerId,
        type: isImage ? 'image' : 'file',
        attachment: {
          name: file.name,
          size: file.size,
          mimeType: file.type,
          data: dataUrl,
        }
      };
      setMessages(prev => [...prev, localMessage]);
      webSocketService.sendChatAttachment(messageId, customerId, { type: localMessage.type!, attachment: localMessage.attachment });
    };
    window.addEventListener('ecom_send_attachment', onAttach as any);
    return () => window.removeEventListener('ecom_send_attachment', onAttach as any);
  }, [customerId]);

  const sendAttachment = async (file: File) => {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isImage = file.type.startsWith('image/');
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const localMessage: ChatMessage = {
      id: messageId,
      sender: 'user',
      timestamp: new Date(),
      customerId,
      type: isImage ? 'image' : 'file',
      attachment: {
        name: file.name,
        size: file.size,
        mimeType: file.type,
        data: base64,
      }
    };
    setMessages(prev => [...prev, localMessage]);
    webSocketService.sendChatAttachment(messageId, customerId, { type: localMessage.type!, attachment: localMessage.attachment });
  };

  // Set typing status immediately (for input changes)
  const setTyping = (isTyping: boolean) => {
    // Ensure WebSocket connection before sending typing status
    webSocketService.ensureConnection();
    webSocketService.sendTypingStatus(customerId, isTyping);
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    // Auto turn off after 2s idle
    typingTimeout.current = setTimeout(() => {
      webSocketService.sendTypingStatus(customerId, false);
    }, 2000);
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

  const value: RealTimeChatContextType = {
    isOpen,
    setIsOpen,
    messages,
    sendMessage,
    setTyping,
    isAdminTyping,
    isConnected,
    isCustomerOnline,
    quickQuestions,
    typingTimeout,
    unreadCount,
    requestNotificationPermission
  };

  return (
    <RealTimeChatContext.Provider value={value}>
      {children}
    </RealTimeChatContext.Provider>
  );
};

const useRealTimeChat = (): RealTimeChatContextType => {
  const context = useContext(RealTimeChatContext);
  if (context === undefined) {
    throw new Error('useRealTimeChat must be used within a RealTimeChatProvider');
  }
  return context;
};

export { useRealTimeChat };
