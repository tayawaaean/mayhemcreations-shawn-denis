import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../ecommerce/context/AuthContext';
import { webSocketService } from './websocketService';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: Date;
  isTyping?: boolean;
  customerId?: string;
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
}

const RealTimeChatContext = createContext<RealTimeChatContextType | undefined>(undefined);

export const RealTimeChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn } = useAuth();
  const { subscribe, isConnected } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [isCustomerOnline, setIsCustomerOnline] = useState(false);
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

  // Join chat room when user is authenticated
  useEffect(() => {
    if (isLoggedIn && user && isConnected) {
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
  }, [isLoggedIn, user, isConnected, customerId]);

  // WebSocket event listeners
  useEffect(() => {
    if (!isConnected) return;

    // Listen for chat messages
    const unsubscribeMessage = subscribe('chat_message_received', (data) => {
      console.log('💬 Received chat message:', data);
      
      const newMessage: ChatMessage = {
        id: data.messageId,
        text: data.text,
        sender: data.sender,
        timestamp: new Date(data.timestamp),
        customerId: data.customerId
      };

      // Prevent duplicates when echoing messages we already appended locally
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === newMessage.id);
        return exists ? prev : [...prev, newMessage];
      });
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
        text: m.text,
        sender: m.sender,
        timestamp: new Date(m.timestamp),
        customerId,
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
  }, [isConnected, customerId, subscribe]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

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

  // Set typing status immediately (for input changes)
  const setTyping = (isTyping: boolean) => {
    webSocketService.sendTypingStatus(customerId, isTyping);
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    // Auto turn off after 2s idle
    typingTimeout.current = setTimeout(() => {
      webSocketService.sendTypingStatus(customerId, false);
    }, 2000);
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
    typingTimeout
  };

  return (
    <RealTimeChatContext.Provider value={value}>
      {children}
    </RealTimeChatContext.Provider>
  );
};

export const useRealTimeChat = (): RealTimeChatContextType => {
  const context = useContext(RealTimeChatContext);
  if (context === undefined) {
    throw new Error('useRealTimeChat must be used within a RealTimeChatProvider');
  }
  return context;
};
