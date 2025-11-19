import React, { useEffect } from 'react'
import { useRealTimeChat } from '../../shared/realTimeChatContext'
import { useNavigate } from 'react-router-dom'

export default function Chat() {
  const { setIsOpen } = useRealTimeChat()
  const navigate = useNavigate()

  useEffect(() => {
    // Open the chat widget when this route is accessed
    setIsOpen(true)
    
    // Redirect to home after opening chat (chat widget will remain open)
    // Small delay to ensure chat opens smoothly
    const timer = setTimeout(() => {
      navigate('/', { replace: true })
    }, 100)

    return () => clearTimeout(timer)
  }, [setIsOpen, navigate])

  // Show a brief loading message while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
        <p className="text-gray-600">Opening chat...</p>
      </div>
    </div>
  )
}

