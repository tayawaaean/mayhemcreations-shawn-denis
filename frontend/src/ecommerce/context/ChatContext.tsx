import React, { createContext, useContext, useState, useEffect } from 'react'
import { autoReplyService } from '../../shared/autoReplyService'

export interface ChatMessage {
  id: string
  text: string
  sender: 'user' | 'admin'
  timestamp: Date
  isTyping?: boolean
}

interface ChatContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  messages: ChatMessage[]
  sendMessage: (text: string) => void
  isAdminTyping: boolean
  isConnected: boolean
  quickQuestions: string[]
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

// Get dynamic responses from auto-reply service
const getAdminResponses = () => {
  const templates = autoReplyService.getActiveTemplates()
  return templates.map(template => template.content)
}

const getQuickQuestions = () => {
  const templates = autoReplyService.getActiveTemplates()
  return templates.slice(0, 6).map(template => template.title)
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isAdminTyping, setIsAdminTyping] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const [quickQuestions, setQuickQuestions] = useState<string[]>([])

  // Load quick questions on mount
  useEffect(() => {
    setQuickQuestions(getQuickQuestions())
  }, [])

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        text: "Hi! I'm Sarah from Mayhem Creation. How can I help you with your custom embroidery project today?",
        sender: 'admin',
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [messages.length])

  const sendMessage = (text: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsAdminTyping(true)

    // Get settings from auto-reply service
    const settings = autoReplyService.getSettings()
    const delay = settings.enabled ? settings.delay : 2000

    // Simulate admin response after configured delay
    setTimeout(() => {
      const responses = getAdminResponses()
      if (responses.length > 0) {
        const randomResponse = responses[Math.floor(Math.random() * responses.length)]
        const adminMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: randomResponse,
          sender: 'admin',
          timestamp: new Date()
        }

        setIsAdminTyping(false)
        setMessages(prev => [...prev, adminMessage])
      } else {
        // Fallback response if no templates are available
        const fallbackMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: "Hi! I'm Sarah from Mayhem Creation. How can I help you with your custom embroidery project today?",
          sender: 'admin',
          timestamp: new Date()
        }

        setIsAdminTyping(false)
        setMessages(prev => [...prev, fallbackMessage])
      }
    }, delay)
  }

  return (
    <ChatContext.Provider value={{
      isOpen,
      setIsOpen,
      messages,
      sendMessage,
      isAdminTyping,
      isConnected,
      quickQuestions
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
