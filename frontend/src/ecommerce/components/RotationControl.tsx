import React, { useState, useRef, useEffect } from 'react'
import { RotateCw, RotateCcw, RefreshCw } from 'lucide-react'

interface RotationControlProps {
  value: number
  onChange: (angle: number) => void
  label?: string
}

export default function RotationControl({ value, onChange, label = 'Rotation' }: RotationControlProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [editingRotation, setEditingRotation] = useState<string | null>(null)
  const dialRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<{ x: number; y: number } | null>(null)

  // Calculate angle from center point
  const getAngleFromPoint = (clientX: number, clientY: number): number => {
    if (!centerRef.current || !dialRef.current) return value
    
    const rect = dialRef.current.getBoundingClientRect()
    const centerX = centerRef.current.x
    const centerY = centerRef.current.y
    
    const deltaX = clientX - centerX
    const deltaY = clientY - centerY
    
    // Calculate angle in degrees (0-360)
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)
    angle = (angle + 90 + 360) % 360 // Adjust so 0° is at top
    
    return Math.round(angle)
  }

  // Handle mouse/touch start
  const handleStart = (clientX: number, clientY: number) => {
    if (!dialRef.current) return
    
    const rect = dialRef.current.getBoundingClientRect()
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
    
    setIsDragging(true)
    const newAngle = getAngleFromPoint(clientX, clientY)
    onChange(newAngle)
  }

  // Handle mouse/touch move
  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return
    const newAngle = getAngleFromPoint(clientX, clientY)
    onChange(newAngle)
  }

  // Handle mouse/touch end
  const handleEnd = () => {
    setIsDragging(false)
    centerRef.current = null
  }

  // Mouse events
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    }

    const handleMouseUp = () => {
      handleEnd()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)
  }

  const handleTouchEnd = () => {
    handleEnd()
  }

  // Quick rotation buttons
  const rotateBy = (degrees: number) => {
    const newAngle = (value + degrees + 360) % 360
    onChange(newAngle)
  }

  // Preset rotation buttons
  const setPreset = (angle: number) => {
    onChange(angle)
  }

  // Normalize value to 0-360
  const normalizedValue = ((value % 360) + 360) % 360

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {label}: <span className="text-accent font-semibold">{normalizedValue}°</span>
      </label>

      {/* Visual Rotation Dial */}
      <div className="flex flex-col items-center space-y-4">
        <div
          ref={dialRef}
          className="relative w-32 h-32 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Outer circle */}
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 bg-white shadow-inner"></div>
          
          {/* Rotation indicator line */}
          <div
            className="absolute top-0 left-1/2 w-1 h-8 bg-accent rounded-full transform -translate-x-1/2 origin-bottom transition-transform duration-100"
            style={{
              transform: `translateX(-50%) rotate(${normalizedValue}deg)`,
              transformOrigin: 'bottom center'
            }}
          >
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-accent rounded-full border-2 border-white"></div>
          </div>

          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full"></div>

          {/* Degree markers */}
          {[0, 90, 180, 270].map((angle) => (
            <div
              key={angle}
              className="absolute top-0 left-1/2 w-0.5 h-3 bg-gray-400 transform -translate-x-1/2 origin-bottom"
              style={{
                transform: `translateX(-50%) rotate(${angle}deg)`,
                transformOrigin: 'bottom center'
              }}
            ></div>
          ))}

          {/* Value display in center */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-semibold text-gray-700 pointer-events-none">
            {normalizedValue}°
          </div>
        </div>

        {/* Quick rotation buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => rotateBy(-15)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Rotate counterclockwise 15 degrees"
          >
            <RotateCcw className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={() => rotateBy(-90)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            aria-label="Rotate counterclockwise 90 degrees"
          >
            -90°
          </button>
          <button
            onClick={() => setPreset(0)}
            className="px-3 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-colors"
            aria-label="Reset to 0 degrees"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => rotateBy(90)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            aria-label="Rotate clockwise 90 degrees"
          >
            +90°
          </button>
          <button
            onClick={() => rotateBy(15)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Rotate clockwise 15 degrees"
          >
            <RotateCw className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Preset rotation buttons */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 mr-2">Presets:</span>
          {[0, 90, 180, 270].map((angle) => (
            <button
              key={angle}
              onClick={() => setPreset(angle)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                normalizedValue === angle
                  ? 'bg-accent text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {angle}°
            </button>
          ))}
        </div>

        {/* Manual Input */}
        <div className="w-full max-w-xs">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Enter rotation (degrees)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={editingRotation ?? Math.round(normalizedValue).toString()}
            onFocus={() => {
              setEditingRotation(Math.round(normalizedValue).toString())
            }}
            onChange={(e) => {
              const value = e.target.value
              // Allow empty string and valid integers/decimals during typing
              if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                setEditingRotation(value)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
            onBlur={(e) => {
              const value = e.target.value
              // Normalize rotation to 0-360 range and round to nearest integer
              let numValue = parseFloat(value)
              if (isNaN(numValue) || value === '') {
                numValue = normalizedValue
              } else {
                // Normalize to 0-360 range
                numValue = ((numValue % 360) + 360) % 360
              }
              const rounded = Math.round(numValue)
              onChange(rounded)
              setEditingRotation(null)
            }}
            placeholder="0"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Range: 0° to 360°
          </p>
        </div>
      </div>

      {/* Range slider (alternative input method) */}
      <div className="pt-2">
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={normalizedValue}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-accent"
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(normalizedValue / 360) * 100}%, #e5e7eb ${(normalizedValue / 360) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0°</span>
          <span>180°</span>
          <span>360°</span>
        </div>
      </div>
    </div>
  )
}

