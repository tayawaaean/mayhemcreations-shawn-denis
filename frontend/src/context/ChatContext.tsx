import React, { createContext, useContext, useState, useEffect } from 'react'

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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

// Mock admin responses
const adminResponses = [
  "Hello! Thanks for reaching out to Mayhem Creation. How can I help you today?",
  "That's a great question! Let me help you with that.",
  "I'd be happy to provide you with more information about our custom embroidery services.",
  "For pricing, it depends on the quantity and complexity of your design. Would you like a custom quote?",
  "Our standard turnaround time is 5-10 business days. We can also accommodate rush orders if needed.",
  "We accept vector files (AI, EPS, SVG) and high-resolution PNG/JPG files. We can also help create designs from scratch.",
  "Yes, we offer bulk discounts for orders of 25+ pieces. The more you order, the better the pricing!",
  "We ship nationwide and can handle international orders for larger quantities.",
  "Our minimum order is 12 pieces for most items, but we can work with you on smaller orders in special cases.",
  "We use premium materials and state-of-the-art equipment to ensure the highest quality embroidery.",
  "I'd be happy to connect you with our design team to discuss your specific project needs.",
  "Is there anything else I can help you with regarding your custom embroidery project?",
  "Thank you for your interest in Mayhem Creation! We look forward to working with you."
]

const quickQuestions = [
  "What's your turnaround time?",
  "Do you offer bulk discounts?",
  "What file formats do you accept?",
  "What's your minimum order?",
  "Do you ship nationwide?",
  "Can you help with design?",
  "What are your prices?",
  "How do I place an order?"
]

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isAdminTyping, setIsAdminTyping] = useState(false)
  const [isConnected, setIsConnected] = useState(true)

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

    // Simulate admin response after 1-3 seconds
    setTimeout(() => {
      const randomResponse = adminResponses[Math.floor(Math.random() * adminResponses.length)]
      const adminMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        sender: 'admin',
        timestamp: new Date()
      }
      
      setIsAdminTyping(false)
      setMessages(prev => [...prev, adminMessage])
    }, Math.random() * 2000 + 1000) // 1-3 seconds delay
  }

  return (
    <ChatContext.Provider value={{
      isOpen,
      setIsOpen,
      messages,
      sendMessage,
      isAdminTyping,
      isConnected
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

export { quickQuestions }
