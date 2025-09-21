/**
 * File utility functions for handling file operations
 */

/**
 * Convert a File to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result)
    }
    reader.onerror = () => {
      reject(new Error('Failed to convert file to base64'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Convert base64 string back to a data URL for display
 */
export const base64ToDataUrl = (base64: string): string => {
  return base64 // base64 string is already a data URL
}

/**
 * Get file size from base64 string (approximate)
 */
export const getBase64Size = (base64: string): number => {
  // Remove data URL prefix and calculate approximate size
  const base64Data = base64.split(',')[1]
  if (!base64Data) return 0
  
  // Base64 encoding increases size by ~33%
  return Math.round((base64Data.length * 3) / 4)
}

/**
 * Capture an element as base64 image
 */
export const captureElementAsBase64 = async (element: HTMLElement, options?: {
  width?: number
  height?: number
  backgroundColor?: string
}): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Import html2canvas dynamically to avoid bundle size issues
      import('html2canvas').then((html2canvas) => {
        html2canvas.default(element, {
          width: options?.width,
          height: options?.height,
          backgroundColor: options?.backgroundColor || '#ffffff',
          scale: 1,
          useCORS: true,
          allowTaint: true,
          logging: false
        }).then((canvas) => {
          const base64 = canvas.toDataURL('image/png', 0.9)
          resolve(base64)
        }).catch((error) => {
          reject(error)
        })
      }).catch((error) => {
        reject(new Error('html2canvas not available'))
      })
    } catch (error) {
      reject(error)
    }
  })
}
