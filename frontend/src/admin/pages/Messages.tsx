import React, { useState, useRef, useEffect } from 'react'
import { useAdmin } from '../context/AdminContext'
import { useAdminChat } from '../context/AdminChatContext'
import {
  Search,
  Send,
  Paperclip,
  Smile,
  Clock,
  Check,
  CheckCheck,
  Mail,
  ArrowLeft,
  Circle,
  MessageCircle,
  Users,
  Wifi,
  WifiOff
} from 'lucide-react'
import HelpModal from '../components/modals/HelpModal'

const Messages: React.FC = () => {
  const { state, dispatch } = useAdmin()
  const { customers } = state
  const { 
    messages, 
    sendMessage, 
    setTyping,
    sendAttachment,
    isUserTyping, 
    onlineCustomers, 
    selectedCustomer, 
    setSelectedCustomer, 
    markAsRead, 
    getUnreadCount,
    threads
  } = useAdminChat()
  const [newMessage, setNewMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  // Helper to derive a human-friendly display name
  const { customerDirectory } = useAdminChat() as any
  const getDisplayName = (customer: any | null | undefined, fallbackId: string): string => {
    const fromDir = customerDirectory?.[fallbackId]
    const dirName = fromDir?.name
    const dirEmail = fromDir?.email
    if (!customer && (dirName || dirEmail)) {
      return dirName || dirEmail || `Customer ${fallbackId}`
    }
    if (!customer) return `Customer ${fallbackId}`
    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim()
    return customer.name || fullName || customer.email || dirName || `Customer ${fallbackId}`
  }

  // Group messages by customer
  const messagesByCustomer = messages.reduce((acc, message) => {
    if (!acc[message.customerId]) {
      acc[message.customerId] = []
    }
    acc[message.customerId].push(message)
    return acc
  }, {} as Record<string, typeof messages>)

  // Get unique customers with their latest message (include unknown customers)
  // Build conversation list from threads first (persisted), then from in-memory if new
  const customerIdsFromMessages = Object.keys(messagesByCustomer)
  const baseList = threads.map(t => t.customerId)
  const mergedIds = Array.from(new Set([...baseList, ...customerIdsFromMessages]))

  const customerList = mergedIds.map(customerId => {
    const customer = customers.find(c => String(c.id) === String(customerId))
    const customerMessages = messagesByCustomer[customerId] || []
    const latestMessage = threads.find(t => t.customerId === customerId)?.lastMessage || (customerMessages.length ? {
      text: customerMessages[customerMessages.length - 1].text,
      sender: customerMessages[customerMessages.length - 1].sender,
      timestamp: customerMessages[customerMessages.length - 1].timestamp.toISOString()
    } : undefined)
    const unreadCount = getUnreadCount(customerId)
    const isOnline = onlineCustomers.includes(customerId)
    const isTyping = isUserTyping[customerId] || false
    
    return {
      customerId,
      customer,
      latestMessage,
      unreadCount,
      messageCount: customerMessages.length,
      isOnline,
      isTyping
    }
  })

  const filteredCustomers = customerList.filter(item => {
    const name = item.customer?.name || `Customer ${item.customerId}`
    const email = item.customer?.email || ''
    const q = searchQuery.toLowerCase()
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || item.customerId.toLowerCase().includes(q)
  })

  const selectedCustomerMessages = selectedCustomer ? messagesByCustomer[selectedCustomer] || [] : []
  const selectedCustomerData = selectedCustomer ? customers.find(c => String(c.id) === String(selectedCustomer)) : null

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedCustomer) return

    sendMessage(newMessage, selectedCustomer)
    setNewMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleAttachClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedCustomer || !sendAttachment) return
    try {
      await sendAttachment(file, selectedCustomer)
    } finally {
      e.target.value = ''
    }
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    const messageDate = new Date(date)
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today'
    }
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    
    return messageDate.toLocaleDateString()
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedCustomerMessages])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile back button */}
            {selectedCustomer && (
              <button
                onClick={() => setSelectedCustomer(null)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                <MessageCircle className="w-6 h-6 mr-3 text-blue-600" />
                Messages
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {selectedCustomer ? 'Active conversation' : 'Communicate with your customers'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsHelpOpen(true)}
              className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <span className="hidden sm:inline">How to use</span>
              <span className="sm:hidden">?</span>
            </button>
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
              <Circle className="w-2 h-2 bg-green-500 rounded-full" />
              <span>{customerList.length} customers</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-600 hidden sm:inline">Online</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Customer List */}
        <div className={`w-full lg:w-80 xl:w-96 bg-white border-r border-gray-200 flex flex-col shadow-sm ${
          selectedCustomer ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Search */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
              />
            </div>
          </div>

          {/* Customer List */}
          <div className="flex-1 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Users className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">No conversations yet</h3>
                <p className="text-xs text-gray-500 text-center">Start a conversation by selecting a customer</p>
              </div>
            ) : (
              filteredCustomers.map((item) => (
                <div
                  key={item.customer?.id || item.customerId}
                  onClick={() => {
                    const id = item.customer?.id || item.customerId
                    setSelectedCustomer(id)
                    markAsRead(id)
                  }}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all duration-200 ${
                    selectedCustomer === (item.customer?.id || item.customerId)
                      ? 'bg-blue-50 border-blue-200 shadow-sm'
                      : 'hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {item.customer?.avatar ? (
                        <img
                          src={item.customer!.avatar}
                          alt={item.customer!.name}
                          className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-100"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center ring-2 ring-gray-100">
                            <span className="text-white font-semibold text-sm">
                              {getDisplayName(item.customer, item.customerId).charAt(0).toUpperCase()}
                            </span>
                        </div>
                      )}
                      {/* Online status indicator */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white rounded-full ${
                        item.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {getDisplayName(item.customer, item.customerId)}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {item.latestMessage && (
                            <span className="text-xs text-gray-400">
                              {formatTime(new Date(item.latestMessage.timestamp))}
                            </span>
                          )}
                          {item.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                              {item.unreadCount > 99 ? '99+' : item.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 truncate mb-1">
                        {item.isTyping ? (
                          <span className="text-blue-500 italic">Typing...</span>
                        ) : item.latestMessage ? (
                          item.latestMessage.text && item.latestMessage.text.trim().length > 0 ? (
                            item.latestMessage.text
                          ) : (
                            (item.latestMessage as any).type === 'image' ? 'Image' : 'Attachment'
                          )
                        ) : (
                          'No messages yet'
                        )}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {item.messageCount} message{item.messageCount !== 1 ? 's' : ''}
                        </span>
                        {item.latestMessage && item.latestMessage.sender === 'admin' && (
                          <div className="flex items-center space-x-1">
                            <Check className="w-3 h-3 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-gray-50 border-r border-gray-200 ${
          !selectedCustomer ? 'hidden lg:flex' : 'flex'
        }`}>
          {selectedCustomer ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {selectedCustomerData?.avatar ? (
                        <img
                          src={selectedCustomerData.avatar}
                          alt={selectedCustomerData.name}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-100"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center ring-2 ring-gray-100">
                          <span className="text-white font-semibold text-sm">
                            {(selectedCustomerData?.name || selectedCustomer).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        {getDisplayName(selectedCustomerData, selectedCustomer!)}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 flex items-center">
                        <Circle className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                        Active now
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
                {selectedCustomerMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
                    <p className="text-sm text-gray-600 max-w-sm">
                      Send a message to {getDisplayName(selectedCustomerData, selectedCustomer!)} to begin your conversation
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedCustomerMessages.map((message, index) => {
                      const prevMessage = index > 0 ? selectedCustomerMessages[index - 1] : null
                      const currentDate = new Date(message.timestamp)
                      const prevDate = prevMessage ? new Date(prevMessage.timestamp) : null
                      const showDate = !prevDate || currentDate.toDateString() !== prevDate.toDateString()

                      return (
                        <div key={message.id}>
                          {showDate && (
                            <div className="flex items-center justify-center my-6">
                              <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
                                <span className="text-xs font-medium text-gray-600">
                                  {formatDate(message.timestamp)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className={`flex items-end space-x-3 ${
                            message.sender === 'admin' ? 'justify-end' : 'justify-start'
                          }`}>
                            {message.sender !== 'admin' && (
                              <div className="flex-shrink-0">
                                {selectedCustomerData?.avatar ? (
                                  <img
                                    src={selectedCustomerData.avatar}
                                    alt={selectedCustomerData.name}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-semibold text-xs">
                                      {(selectedCustomerData?.name || selectedCustomer).charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                              <div className={`max-w-xs sm:max-w-md lg:max-w-lg ${
                              message.sender === 'admin' ? 'order-first' : ''
                            }`}>
                              <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                                message.sender === 'admin'
                                  ? 'bg-blue-500 text-white rounded-br-md'
                                  : 'bg-white text-gray-900 rounded-bl-md border border-gray-200'
                              }`}>
                                {message.type === 'image' && (message as any).attachment ? (
                                  <img 
                                    src={typeof (message as any).attachment === 'string' ? (message as any).attachment : (message as any).attachment.data}
                                    alt={(message as any).attachment?.name || 'image'} 
                                    className="max-w-full rounded-md mb-1" 
                                  />
                                ) : null}
                                {message.type === 'file' && (message as any).attachment ? (
                                  <a 
                                    href={typeof (message as any).attachment === 'string' ? (message as any).attachment : (message as any).attachment.data} 
                                    download={(message as any).attachment?.name} 
                                    className={`text-xs underline break-all ${message.sender === 'admin' ? 'text-white' : 'text-blue-600'}`}
                                  >
                                    {(message as any).attachment.name || 'Download file'}
                                  </a>
                                ) : null}
                                {(!message.type || message.type === 'text') && (
                                  <p className="text-sm leading-relaxed">{message.text}</p>
                                )}
                              </div>

                              <div className={`flex items-center mt-1 space-x-1 text-[12px] font-medium ${
                                message.sender === 'admin'
                                  ? 'justify-end'
                                  : 'justify-start'
                              }`}>
                                <span
                                  className={
                                    message.sender === 'admin'
                                      ? 'px-2 py-0.5 rounded bg-blue-600 text-white shadow-sm'
                                      : 'px-2 py-0.5 rounded bg-gray-800 text-white shadow-sm'
                                  }
                                >
                                  {formatTime(message.timestamp)}
                                </span>
                                {message.sender === 'admin' && (
                                  <span className="ml-1">
                                    {message.isRead ? (
                                      <CheckCheck className="h-3 w-3 text-blue-600" />
                                    ) : (
                                      <Check className="h-3 w-3 text-blue-600" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            {message.sender === 'admin' && (
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-semibold text-xs">A</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4 sm:p-6">
                <div className="flex items-end space-x-3">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                  <button
                    onClick={handleAttachClick}
                    className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200 flex-shrink-0"
                    title="Attach file"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>

                  <div className="flex-1 relative">
                    <div className="flex items-end bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200">
                      <textarea
                        rows={1}
                        placeholder={`Message ${getDisplayName(selectedCustomerData, selectedCustomer!)}...`}
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value)
                          if (selectedCustomer) {
                            setTyping(selectedCustomer, e.target.value.trim().length > 0)
                          }
                          e.target.style.height = 'auto'
                          e.target.style.height = e.target.scrollHeight + 'px'
                        }}
                        onKeyPress={handleKeyPress}
                        className="flex-1 bg-transparent border-none outline-none resize-none text-sm placeholder-gray-500 max-h-32"
                        style={{ minHeight: '20px' }}
                      />
                      <button
                        className="ml-2 p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors duration-200"
                        title="Add emoji"
                      >
                        <Smile className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className={`p-3 rounded-full transition-all duration-200 flex-shrink-0 ${
                      newMessage.trim()
                        ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                    title="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>

                {/* Typing indicator placeholder */}
                <div className="mt-3 text-xs text-gray-500 opacity-0 transition-opacity duration-200" id="typing-indicator">
                  {selectedCustomerData?.name || `Customer ${selectedCustomer}`} is typing...
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md mx-auto px-6">
                <div className="relative mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <MessageCircle className="w-12 h-12 text-blue-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                    <span className="text-white text-sm font-bold">💬</span>
                  </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                  Welcome to Messages
                </h3>

                <p className="text-sm sm:text-base text-gray-600 mb-6 leading-relaxed">
                  Connect with your customers in real-time. Select a conversation from the sidebar to get started.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">Real-time Chat</h4>
                    <p className="text-xs text-gray-600">Instant communication</p>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                      <Circle className="w-4 h-4 bg-green-500 rounded-full" />
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">Online Status</h4>
                    <p className="text-xs text-gray-600">See who's available</p>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                      <CheckCheck className="w-4 h-4 text-purple-600" />
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">Message Status</h4>
                    <p className="text-xs text-gray-600">Delivery confirmation</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="How to use: Messages">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Use the search to find a customer conversation.</li>
          <li>Select a customer on the left to open the chat.</li>
          <li>Type and press Enter to send, Shift+Enter for a new line.</li>
          <li>Unread counts show on customers and in the sidebar badge.</li>
          <li>The chat auto-scrolls to the latest message.</li>
        </ol>
      </HelpModal>
    </div>
  )
}

export default Messages
