import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Minimize2, Maximize2, Paperclip, UserPlus } from 'lucide-react'
import { useRealTimeChat } from '../../shared/realTimeChatContext'
import { useAuth } from '../context/AuthContext'
import Button from '../../components/Button'

export default function ChatWidget() {
  const { 
    isOpen, 
    setIsOpen, 
    messages, 
    sendMessage, 
    setTyping, 
    isAdminTyping, 
    isConnected, 
    isCustomerOnline, 
    isAdminOnline, // New: Admin online status
    quickQuestions, 
    unreadCount,
    guestEmail,
    setGuestEmail,
    hasProvidedEmail,
    setHasProvidedEmail
  } = useRealTimeChat()

  const { isLoggedIn } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [inputText, setInputText] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState('')
  const [fileUploadError, setFileUploadError] = useState<string | null>(null)
  const [messageSendError, setMessageSendError] = useState<string | null>(null)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isAdminTyping])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle ESC key to close image modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImage) {
        setSelectedImage(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [selectedImage])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    
    if (!emailInput.trim()) {
      setEmailError('Please enter your email address')
      return
    }
    
    if (!validateEmail(emailInput.trim())) {
      setEmailError('Please enter a valid email address')
      return
    }
    
    setGuestEmail(emailInput.trim())
    setHasProvidedEmail(true)
    setEmailInput('')
    
    // Focus on message input after email is provided
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    
    const messageToSend = inputText.trim()
    setInputText('') // Clear input immediately for better UX
    setMessageSendError(null)
    setIsSendingMessage(true)
    
    try {
      await sendMessage(messageToSend)
      setLastFailedMessage(null) // Clear any previous failed message
    } catch (error: any) {
      console.error('Failed to send message:', error)
      
      // Categorize send errors
      let errorMessage = 'Failed to send message. '
      
      if (error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
        errorMessage = 'Message send timeout. Please check your internet connection and try again.'
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your connection and try again.'
      } else if (error?.response?.status === 429) {
        errorMessage = 'Too many messages. Please wait a moment before sending again.'
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Server error. Your message could not be sent. Please try again.'
      } else if (error?.response?.status === 401) {
        errorMessage = 'Session expired. Please refresh the page and try again.'
      } else {
        errorMessage += 'Please try again or contact support if this continues.'
      }
      
      setMessageSendError(errorMessage)
      setLastFailedMessage(messageToSend) // Save for retry
      setInputText(messageToSend) // Restore message to input for easy retry
    } finally {
      setIsSendingMessage(false)
    }
  }
  
  const handleRetryMessage = async () => {
    if (!lastFailedMessage) return
    
    setMessageSendError(null)
    setIsSendingMessage(true)
    
    try {
      await sendMessage(lastFailedMessage)
      setLastFailedMessage(null)
      setInputText('') // Clear input on successful retry
      console.log('✅ Message sent successfully on retry')
    } catch (error: any) {
      console.error('❌ Message retry failed:', error)
      
      let errorMessage = 'Retry failed. '
      
      if (error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout. Please check your internet and try again.'
      } else if (!navigator.onLine) {
        errorMessage = 'Still no internet connection. Please connect and try again.'
      } else {
        errorMessage += 'Please try again or contact support.'
      }
      
      setMessageSendError(errorMessage)
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleAttachClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setFileUploadError(null)
    
    // Validate file before processing
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setFileUploadError(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 5MB. Please choose a smaller file.`)
      e.target.value = ''
      return
    }
    
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileUploadError(`File type "${file.type || 'unknown'}" is not supported. Allowed types: Images (JPEG, PNG, GIF, WebP), PDF, and Text files.`)
      e.target.value = ''
      return
    }
    
    try {
      const reader = new FileReader()
      
      // Add error handler for FileReader
      reader.onerror = (error) => {
        console.error('FileReader error:', error)
        
        let errorMessage = 'Failed to read file. '
        
        // Categorize FileReader errors
        if (reader.error) {
          switch (reader.error.name) {
            case 'NotFoundError':
              errorMessage = 'File not found. It may have been moved or deleted.'
              break
            case 'SecurityError':
              errorMessage = 'Security error reading file. Please try a different file.'
              break
            case 'NotReadableError':
              errorMessage = 'File is not readable. It may be corrupted or in use by another program.'
              break
            case 'EncodingError':
              errorMessage = 'File encoding error. The file may be corrupted.'
              break
            default:
              errorMessage += 'Please try again or choose a different file.'
          }
        } else {
          errorMessage += 'Please try again or choose a different file.'
        }
        
        setFileUploadError(errorMessage)
      }
      
      // Add abort handler
      reader.onabort = () => {
        console.warn('File read was aborted')
        setFileUploadError('File upload was cancelled. Please try again.')
      }
      
      reader.onload = () => {
        try {
          // Validate result before dispatching
          if (!reader.result) {
            setFileUploadError('Failed to process file. Please try again.')
            return
          }
          
          const dataUrl = String(reader.result)
          
          // Additional validation for data URL
          if (!dataUrl.startsWith('data:')) {
            setFileUploadError('File processing error. Please try again.')
            return
          }
          
          // Dispatch the event with file data
          const event = new CustomEvent('ecom_send_attachment', { 
            detail: { 
              file, 
              dataUrl 
            } 
          })
          window.dispatchEvent(event)
          
          console.log('✅ File uploaded successfully:', file.name)
          setFileUploadError(null)
        } catch (error) {
          console.error('Error processing file:', error)
          setFileUploadError('Error processing file. Please try again.')
        }
      }
      
      // Start reading the file
      reader.readAsDataURL(file)
    } catch (error: any) {
      console.error('Unexpected error during file upload:', error)
      setFileUploadError('Unexpected error uploading file. Please try again or choose a different file.')
    } finally {
      // Always clear the input value so the same file can be selected again
      e.target.value = ''
    }
  }

  const handleQuickQuestion = (question: string) => {
    sendMessage(question)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
    setTyping(e.target.value.trim().length > 0)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 sm:w-14 sm:h-14 bg-accent rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group hover:scale-105"
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">{unreadCount}</span>
            </div>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 transition-all duration-300 ${
      isMinimized 
        ? 'w-[calc(100vw-2rem)] sm:w-80 h-16' 
        : 'w-[calc(100vw-2rem)] sm:w-96 h-[calc(100vh-8rem)] sm:h-[500px] max-w-md'
    }`}>
      <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="bg-accent text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold">Mayhem Creation</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected && isAdminOnline 
                    ? 'bg-green-400' 
                    : isConnected 
                      ? 'bg-blue-400' 
                      : 'bg-red-400'
                }`}></div>
                <span className="text-xs opacity-90">
                  {isConnected && isAdminOnline 
                    ? 'Chat Connected - Admin Online' 
                    : isConnected 
                      ? 'Chat Connected - Messages via Email' 
                      : 'Connecting...'
                  }
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Guest User Banner */}
            {!isLoggedIn && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-200 p-3">
                {!hasProvidedEmail ? (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <UserPlus className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-800 font-medium">Guest Mode</span>
                    </div>
                    <p className="text-xs text-blue-700 mb-3">
                      Please provide your email to receive notifications when we reply
                    </p>
                    <form onSubmit={handleEmailSubmit} className="space-y-2">
                      <div>
                        <input
                          ref={emailInputRef}
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="Enter your email address"
                          className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          required
                        />
                        {emailError && (
                          <p className="text-xs text-red-600 mt-1">{emailError}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="submit"
                          size="sm"
                          className="px-3 py-1 text-xs"
                        >
                          Continue
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            window.dispatchEvent(new CustomEvent('openAuthModal', { detail: { mode: 'login' } }));
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                        >
                          Sign In Instead
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <UserPlus className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-800 font-medium">Guest Mode</span>
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          {guestEmail}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setHasProvidedEmail(false);
                          setGuestEmail(null);
                          setEmailInput('');
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium underline text-xs"
                      >
                        Change Email
                      </button>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      You'll receive email notifications when we reply
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.sender === 'user'
                        ? 'bg-accent text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    {message.type === 'image' && message.attachment ? (
                      <img 
                        src={typeof message.attachment === 'string' ? message.attachment : message.attachment.data} 
                        alt={message.attachment?.name || 'image'} 
                        className="max-w-full rounded-md mb-1 cursor-pointer hover:opacity-90 transition-opacity" 
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const imageSrc = typeof message.attachment === 'string' ? message.attachment : message.attachment.data
                          setSelectedImage(imageSrc)
                        }}
                      />
                    ) : null}
                    {message.type === 'file' && message.attachment ? (
                      <a 
                        href={typeof message.attachment === 'string' ? message.attachment : message.attachment.data} 
                        download={message.attachment?.name} 
                        className="text-xs underline break-all"
                      >
                        {message.attachment.name || 'Download file'}
                      </a>
                    ) : null}
                    {(!message.type || message.type === 'text') && (
                      <p className="text-sm">{message.text}</p>
                    )}
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              
              {isAdminTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md px-4 py-2">
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-500 ml-2">Sarah is typing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {messages.length <= 1 && (
              <div className="px-4 py-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.slice(0, 4).map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(question)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              {/* File Upload Error */}
              {fileUploadError && (
                <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-red-800 mb-1">File Upload Failed</p>
                      <p className="text-xs text-red-700">{fileUploadError}</p>
                    </div>
                    <button
                      onClick={() => setFileUploadError(null)}
                      className="ml-2 text-red-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Message Send Error */}
              {messageSendError && (
                <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-red-800 mb-1">Message Send Failed</p>
                      <p className="text-xs text-red-700 mb-2">{messageSendError}</p>
                      {lastFailedMessage && (
                        <button
                          onClick={handleRetryMessage}
                          disabled={isSendingMessage}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSendingMessage ? 'Retrying...' : 'Retry Send'}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setMessageSendError(null)
                        setLastFailedMessage(null)
                      }}
                      className="ml-2 text-red-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Status message */}
              {!fileUploadError && !messageSendError && isConnected && !isAdminOnline && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    💬 Chat is connected! Your messages will be sent via email and we'll respond as soon as possible.
                  </p>
                </div>
              )}
              {!fileUploadError && !messageSendError && isConnected && isAdminOnline && (
                <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-700">
                    ✅ Admin is online! You can chat in real-time.
                  </p>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex space-x-2 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder={
                    !isLoggedIn && !hasProvidedEmail 
                      ? "Please provide your email first..." 
                      : "Type your message..."
                  }
                  disabled={!isLoggedIn && !hasProvidedEmail}
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none ${
                    !isLoggedIn && !hasProvidedEmail
                      ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'border-gray-300'
                  }`}
                />
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                <button 
                  type="button" 
                  onClick={handleAttachClick} 
                  disabled={!isLoggedIn && !hasProvidedEmail}
                  className={`p-2 rounded-lg border hover:bg-gray-100 ${
                    !isLoggedIn && !hasProvidedEmail
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300'
                  }`}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <Button
                  type="submit"
                  size="sm"
                  className="px-3 py-2"
                  disabled={!inputText.trim() || (!isLoggedIn && !hasProvidedEmail) || isSendingMessage}
                >
                  {isSendingMessage ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>

          </>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedImage(null)
              }}
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              aria-label="Close image"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
