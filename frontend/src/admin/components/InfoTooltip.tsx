import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'

interface InfoTooltipProps {
  // Text content to display in the tooltip
  text: string
  // Optional custom className for positioning
  className?: string
}

/**
 * InfoTooltip component displays an info icon with a tooltip on hover
 * Used to provide additional context and explanations for form fields
 * Tooltips are rendered via portal to escape modal overflow constraints
 */
export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, className = '' }) => {
  // State to track if the tooltip should be visible (for accessibility)
  const [isVisible, setIsVisible] = useState(false)
  // Ref to the button element for positioning calculations
  const buttonRef = useRef<HTMLButtonElement>(null)
  // State to store tooltip position
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })

  // Function to calculate and update tooltip position - memoized with useCallback
  const updateTooltipPosition = useCallback(() => {
    if (buttonRef.current) {
      // Get the button's bounding rectangle relative to viewport
      const rect = buttonRef.current.getBoundingClientRect()
      // Calculate tooltip position - centered above the button
      // Tooltip width is 256px (w-64), so we center it
      const tooltipWidth = 256
      const tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2
      // Position above the button with some margin
      const tooltipTop = rect.top - 8 // 8px margin above
      
      setTooltipPosition({
        top: tooltipTop,
        left: tooltipLeft
      })
    }
  }, [])

  // Calculate tooltip position relative to viewport when visible
  useEffect(() => {
    if (isVisible) {
      // Initial position calculation
      updateTooltipPosition()
      
      // Update position on scroll or resize to keep tooltip aligned
      window.addEventListener('scroll', updateTooltipPosition, true)
      window.addEventListener('resize', updateTooltipPosition)
      
      return () => {
        // Cleanup event listeners
        window.removeEventListener('scroll', updateTooltipPosition, true)
        window.removeEventListener('resize', updateTooltipPosition)
      }
    }
  }, [isVisible, updateTooltipPosition])

  return (
    <>
      <div className={`relative inline-flex items-center ${className}`}>
        {/* Info icon button - accessible and keyboard navigable */}
        <button
          ref={buttonRef}
          type="button"
          className="inline-flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 rounded-full transition-colors"
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          onFocus={() => setIsVisible(true)}
          onBlur={() => setIsVisible(false)}
          aria-label={`Information: ${text}`}
          aria-describedby="tooltip-text"
        >
          {/* Help circle icon from lucide-react */}
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Tooltip content - rendered via portal to escape overflow constraints */}
      {isVisible && typeof window !== 'undefined' && createPortal(
        <div
          id="tooltip-text"
          className="fixed z-[9999] w-64 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translateY(-100%)',
            marginTop: '-4px'
          }}
          role="tooltip"
        >
          {/* Tooltip text content */}
          <p className="whitespace-normal leading-relaxed">{text}</p>
          {/* Tooltip arrow pointing to the icon */}
          <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>,
        document.body
      )}
    </>
  )
}

