import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
  durationMs?: number
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const durationMs = toast.durationMs ?? 5000
    const next: Toast = { id, ...toast, durationMs }
    setToasts(prev => [next, ...prev])
    if (durationMs > 0) {
      setTimeout(() => removeToast(id), durationMs)
    }
  }, [removeToast])

  const value = useMemo(() => ({ toasts, showToast, removeToast }), [toasts, showToast, removeToast])

  return (
    <ToastContext.Provider value={value}>
      {/* Expose a minimal global bridge for non-React modules (e.g., axios) */}
      <Bridge showToast={showToast} />
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[1000] space-y-2 w-[90vw] max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={
              `rounded-md border p-3 shadow-md text-sm ` +
              (t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
               t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
               t.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
               'bg-blue-50 border-blue-200 text-blue-800')
            }
          >
            {t.title && <div className="font-medium mb-0.5">{t.title}</div>}
            <div>{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="mt-2 text-xs underline opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}


// Bridge component to bind showToast to window for non-React code paths
const Bridge: React.FC<{ showToast: (toast: Omit<Toast, 'id'>) => void }> = ({ showToast }) => {
  React.useEffect(() => {
    (window as any).__toast = showToast;
    return () => { if ((window as any).__toast === showToast) (window as any).__toast = undefined }
  }, [showToast])
  return null
}


