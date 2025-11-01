import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
  durationMs?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext)
  if (ctx) return ctx
  // Fallback: allow usage outside provider by delegating to global bridge if available
  const fallbackShow: ToastContextValue['showToast'] = (toast) => {
    const global = (window as any)
    if (global && typeof global.__toast === 'function') {
      global.__toast(toast)
    }
  }
  const noop = () => {}
  return {
    toasts: [],
    showToast: fallbackShow,
    removeToast: noop,
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Cooldown map to de-duplicate repetitive toasts
  const cooldownRef = React.useRef<Map<string, number>>(new Map())
  const COOLDOWN_MS = 8000
  const MAX_TOASTS = 3

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const key = `${toast.type}:${toast.title ?? ''}:${toast.message}`
    const now = Date.now()
    const last = cooldownRef.current.get(key) ?? 0
    if (now - last < COOLDOWN_MS) return
    cooldownRef.current.set(key, now)

    const id = `toast_${now}_${Math.random().toString(36).slice(2, 9)}`
    const durationMs = toast.durationMs ?? 4000
    const next: Toast = { id, ...toast, durationMs }
    setToasts(prev => {
      const trimmed = prev.slice(0, MAX_TOASTS - 1)
      return [next, ...trimmed]
    })
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
            <div className="mt-2 flex gap-2">
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick()
                    removeToast(t.id)
                  }}
                  className="text-xs font-medium px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => removeToast(t.id)}
                className="text-xs underline opacity-70 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
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


