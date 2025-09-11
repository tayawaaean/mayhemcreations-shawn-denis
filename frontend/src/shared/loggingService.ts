// System logging service for future backend integration
export interface LogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'debug'
  category: 'auth' | 'user_action' | 'system' | 'api' | 'security'
  event: string
  userId?: string
  userRole?: 'admin' | 'seller' | 'customer'
  userEmail?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  sessionId?: string
}

export interface LoggingConfig {
  enableConsoleLogging: boolean
  enableLocalStorage: boolean
  enableBackendLogging: boolean
  maxLocalLogs: number
  backendEndpoint?: string
}

class LoggingService {
  private config: LoggingConfig = {
    enableConsoleLogging: true,
    enableLocalStorage: true,
    enableBackendLogging: false, // Will be enabled when backend is ready
    maxLocalLogs: 1000,
    backendEndpoint: '/api/logs'
  }

  private sessionId: string = this.generateSessionId()

  constructor() {
    // Initialize session ID
    this.sessionId = this.generateSessionId()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getClientInfo() {
    return {
      ipAddress: '127.0.0.1', // Will be replaced by backend
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      url: window.location.href
    }
  }

  private async sendToBackend(logEntry: LogEntry): Promise<void> {
    if (!this.config.enableBackendLogging || !this.config.backendEndpoint) {
      return
    }

    try {
      const response = await fetch(this.config.backendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
      })

      if (!response.ok) {
        console.warn('Failed to send log to backend:', response.status)
      }
    } catch (error) {
      console.warn('Error sending log to backend:', error)
    }
  }

  private saveToLocalStorage(logEntry: LogEntry): void {
    if (!this.config.enableLocalStorage) return

    try {
      const existingLogs = this.getLocalLogs()
      const updatedLogs = [logEntry, ...existingLogs].slice(0, this.config.maxLocalLogs)
      
      localStorage.setItem('system_logs', JSON.stringify(updatedLogs))
    } catch (error) {
      console.warn('Failed to save log to localStorage:', error)
    }
  }

  public getLocalLogs(): LogEntry[] {
    try {
      const logs = localStorage.getItem('system_logs')
      return logs ? JSON.parse(logs) : []
    } catch (error) {
      console.warn('Failed to retrieve logs from localStorage:', error)
      return []
    }
  }

  private log(level: LogEntry['level'], category: LogEntry['category'], event: string, details?: Record<string, any>, userInfo?: { userId?: string; userRole?: 'admin' | 'seller' | 'customer'; userEmail?: string }): void {
    const clientInfo = this.getClientInfo()
    
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      category,
      event,
      userId: userInfo?.userId,
      userRole: userInfo?.userRole,
      userEmail: userInfo?.userEmail,
      details,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      sessionId: clientInfo.sessionId
    }

    // Console logging
    if (this.config.enableConsoleLogging) {
      const logMethod = level === 'error' ? console.error : 
                       level === 'warn' ? console.warn : 
                       level === 'debug' ? console.debug : console.log
      
      logMethod(`[${level.toUpperCase()}] ${category.toUpperCase()}: ${event}`, {
        ...logEntry,
        timestamp: logEntry.timestamp.toISOString()
      })
    }

    // Local storage
    this.saveToLocalStorage(logEntry)

    // Backend logging (async)
    this.sendToBackend(logEntry)
  }

  // Public logging methods
  public info(category: LogEntry['category'], event: string, details?: Record<string, any>, userInfo?: { userId?: string; userRole?: 'admin' | 'seller' | 'customer'; userEmail?: string }): void {
    this.log('info', category, event, details, userInfo)
  }

  public warn(category: LogEntry['category'], event: string, details?: Record<string, any>, userInfo?: { userId?: string; userRole?: 'admin' | 'seller' | 'customer'; userEmail?: string }): void {
    this.log('warn', category, event, details, userInfo)
  }

  public error(category: LogEntry['category'], event: string, details?: Record<string, any>, userInfo?: { userId?: string; userRole?: 'admin' | 'seller' | 'customer'; userEmail?: string }): void {
    this.log('error', category, event, details, userInfo)
  }

  public debug(category: LogEntry['category'], event: string, details?: Record<string, any>, userInfo?: { userId?: string; userRole?: 'admin' | 'seller' | 'customer'; userEmail?: string }): void {
    this.log('debug', category, event, details, userInfo)
  }

  // Authentication specific logging methods
  public logLoginAttempt(email: string, success: boolean, userRole?: 'admin' | 'seller' | 'customer', error?: string): void {
    this.info('auth', 'login_attempt', {
      email,
      success,
      error,
      loginMethod: 'email_password'
    }, { userEmail: email, userRole })
  }

  public logLoginSuccess(userId: string, email: string, userRole: 'admin' | 'seller' | 'customer'): void {
    this.info('auth', 'login_success', {
      email,
      loginMethod: 'email_password'
    }, { userId, userEmail: email, userRole })
  }

  public logLogout(userId: string, email: string, userRole: 'admin' | 'seller' | 'customer'): void {
    this.info('auth', 'logout', {
      email
    }, { userId, userEmail: email, userRole })
  }

  public logFailedLoginAttempt(email: string, reason: string): void {
    this.warn('security', 'failed_login_attempt', {
      email,
      reason,
      loginMethod: 'email_password'
    }, { userEmail: email })
  }

  public logSessionExpired(userId: string, email: string, userRole: 'admin' | 'seller' | 'customer'): void {
    this.warn('auth', 'session_expired', {
      email
    }, { userId, userEmail: email, userRole })
  }

  // User action logging
  public logUserAction(action: string, details?: Record<string, any>, userInfo?: { userId?: string; userRole?: 'admin' | 'seller' | 'customer'; userEmail?: string }): void {
    this.info('user_action', action, details, userInfo)
  }

  // System logging
  public logSystemEvent(event: string, details?: Record<string, any>): void {
    this.info('system', event, details)
  }

  // Configuration methods
  public updateConfig(newConfig: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  public getConfig(): LoggingConfig {
    return { ...this.config }
  }

  // Utility methods
  public clearLocalLogs(): void {
    localStorage.removeItem('system_logs')
  }

  public exportLogs(): string {
    const logs = this.getLocalLogs()
    return JSON.stringify(logs, null, 2)
  }

  public getLogsByCategory(category: LogEntry['category']): LogEntry[] {
    return this.getLocalLogs().filter(log => log.category === category)
  }

  public getLogsByUser(userId: string): LogEntry[] {
    return this.getLocalLogs().filter(log => log.userId === userId)
  }
}

// Export singleton instance
export const loggingService = new LoggingService()
