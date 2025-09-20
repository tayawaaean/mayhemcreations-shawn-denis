import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export interface DropdownItem {
  id: string
  label: string
  value: string
  children?: DropdownItem[]
}

interface CollapsibleDropdownProps {
  items: DropdownItem[]
  selectedValue?: string
  onSelect: (value: string) => void
  placeholder?: string
  className?: string
  maxHeight?: string
  showSearch?: boolean
  searchPlaceholder?: string
}

export default function CollapsibleDropdown({
  items,
  selectedValue,
  onSelect,
  placeholder = "Select an option",
  className = "",
  maxHeight = "300px",
  showSearch = false,
  searchPlaceholder = "Search..."
}: CollapsibleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Filter items based on search term
  const filteredItems = items.filter(item => {
    if (!searchTerm) return true
    const matchesSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase())
    const hasMatchingChildren = item.children?.some(child => 
      child.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
    return matchesSearch || hasMatchingChildren
  })

  // Get selected item label
  const getSelectedLabel = () => {
    const findItem = (items: DropdownItem[], value: string): DropdownItem | null => {
      for (const item of items) {
        if (item.value === value) return item
        if (item.children) {
          const found = findItem(item.children, value)
          if (found) return found
        }
      }
      return null
    }
    
    const selectedItem = findItem(items, selectedValue || "")
    return selectedItem?.label || placeholder
  }

  // Toggle expanded state for an item
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // Handle item selection
  const handleItemSelect = (value: string) => {
    onSelect(value)
    setIsOpen(false)
    setSearchTerm("")
  }

  // Render dropdown items recursively
  const renderItems = (items: DropdownItem[], level = 0) => {
    return items.map(item => (
      <div key={item.id}>
        <div
          className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
            level > 0 ? 'ml-4' : ''
          } ${item.value === selectedValue ? 'bg-accent/10 text-accent' : 'text-gray-700'}`}
          onClick={() => {
            if (item.children && item.children.length > 0) {
              toggleExpanded(item.id)
            } else {
              handleItemSelect(item.value)
            }
          }}
        >
          <span className="flex-1">{item.label}</span>
          {item.children && item.children.length > 0 && (
            <div className="ml-2">
              {expandedItems.has(item.id) ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </div>
          )}
        </div>
        
        {/* Render children if expanded */}
        {item.children && item.children.length > 0 && expandedItems.has(item.id) && (
          <div className="border-l border-gray-200 ml-4">
            {renderItems(item.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-left truncate">{getSelectedLabel()}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
          style={{ maxHeight }}
        >
          {/* Search Input */}
          {showSearch && (
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Items List */}
          <div className="overflow-y-auto" style={{ maxHeight: showSearch ? '250px' : maxHeight }}>
            {filteredItems.length > 0 ? (
              renderItems(filteredItems)
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

