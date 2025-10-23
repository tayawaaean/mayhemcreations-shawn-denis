import React, { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'

interface InfoTooltipProps {
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Calculate tooltip position when it becomes visible
  useEffect(() => {
    if (isVisible && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const tooltipWidth = 256 // w-64 = 16rem = 256px
      const tooltipHeight = 80 // Approximate height
      const spacing = 8 // Gap between button and tooltip
      
      let top = 0
      let left = 0

      // Calculate position based on preferred position
      switch (position) {
        case 'top':
          top = buttonRect.top - tooltipHeight - spacing
          left = buttonRect.left + (buttonRect.width / 2) - (tooltipWidth / 2)
          break
        case 'bottom':
          top = buttonRect.bottom + spacing
          left = buttonRect.left + (buttonRect.width / 2) - (tooltipWidth / 2)
          break
        case 'left':
          top = buttonRect.top + (buttonRect.height / 2) - (tooltipHeight / 2)
          left = buttonRect.left - tooltipWidth - spacing
          break
        case 'right':
          top = buttonRect.top + (buttonRect.height / 2) - (tooltipHeight / 2)
          left = buttonRect.right + spacing
          break
      }

      // Adjust if tooltip goes off screen horizontally
      if (left < 10) {
        left = 10
      } else if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10
      }

      // Adjust if tooltip goes off screen vertically
      if (top < 10) {
        top = 10
      } else if (top + tooltipHeight > window.innerHeight - 10) {
        top = window.innerHeight - tooltipHeight - 10
      }

      setTooltipStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 9999
      })
    }
  }, [isVisible, position])

  return (
    <div className="relative inline-block">
      {/* Info icon that triggers tooltip on hover */}
      <button
        ref={buttonRef}
        type="button"
        className="text-gray-400 hover:text-gray-600 transition-colors ml-1 flex-shrink-0"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label="More information"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Tooltip content - rendered with fixed positioning to escape modal boundaries */}
      {isVisible && (
        <div
          className="w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-xl"
          style={tooltipStyle}
          role="tooltip"
        >
          {/* Tooltip text */}
          <div className="relative z-10 leading-relaxed">
            {text}
          </div>
        </div>
      )}
    </div>
  )
}

export default InfoTooltip

