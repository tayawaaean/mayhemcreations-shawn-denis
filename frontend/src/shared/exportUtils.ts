/**
 * Export utility functions for CSV and Excel exports
 */

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[]
): string {
  // Create CSV header row
  const headerRow = headers.map(h => escapeCSVValue(h.label)).join(',')
  
  // Create CSV data rows
  const dataRows = data.map(item => {
    return headers.map(header => {
      const value = item[header.key]
      // Handle null, undefined, or complex objects
      if (value === null || value === undefined) {
        return ''
      }
      // Convert objects/arrays to JSON string
      if (typeof value === 'object' && !(value instanceof Date)) {
        return escapeCSVValue(JSON.stringify(value))
      }
      // Handle Date objects
      if (value instanceof Date) {
        return escapeCSVValue(value.toISOString())
      }
      // Handle all other types by converting to string
      return escapeCSVValue(String(value))
    }).join(',')
  })
  
  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n')
}

/**
 * Escape CSV values that contain commas, quotes, or newlines
 */
function escapeCSVValue(value: string): string {
  if (value === null || value === undefined) {
    return ''
  }
  
  const stringValue = String(value)
  
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}

/**
 * Download data as CSV file
 */
export function downloadCSV<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[],
  filename: string
): void {
  try {
    // Convert data to CSV
    const csvContent = convertToCSV(data, headers)
    
    // Add BOM for UTF-8 to help Excel open the file correctly
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent
    
    // Create blob
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
    
    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.csv`
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting CSV:', error)
    throw new Error('Failed to export CSV file')
  }
}

/**
 * Download data as JSON file
 */
export function downloadJSON<T>(data: T[], filename: string): void {
  try {
    // Convert data to JSON string with pretty formatting
    const jsonContent = JSON.stringify(data, null, 2)
    
    // Create blob
    const blob = new Blob([jsonContent], { type: 'application/json' })
    
    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.json`
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting JSON:', error)
    throw new Error('Failed to export JSON file')
  }
}

