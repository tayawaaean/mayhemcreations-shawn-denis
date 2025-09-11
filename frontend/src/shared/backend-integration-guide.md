# Backend Integration Guide for System Logging

## Overview
This guide explains how to integrate the frontend logging system with your future backend API.

## Backend API Endpoints

### 1. Log Storage Endpoint
```
POST /api/logs
Content-Type: application/json

{
  "id": "log_1234567890_abc123",
  "timestamp": "2024-01-20T10:30:15.000Z",
  "level": "info",
  "category": "auth",
  "event": "login_success",
  "userId": "user_123",
  "userRole": "admin",
  "userEmail": "admin@mayhemcreation.com",
  "details": {
    "loginMethod": "email_password",
    "ipAddress": "192.168.1.100"
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "sessionId": "session_1234567890_xyz789"
}
```

### 2. Log Retrieval Endpoints
```
GET /api/logs?category=auth&level=error&limit=100&offset=0
GET /api/logs/user/{userId}
GET /api/logs/export?format=json&startDate=2024-01-01&endDate=2024-01-31
```

### 3. Log Management Endpoints
```
DELETE /api/logs/clear
DELETE /api/logs/{logId}
GET /api/logs/stats
```

## Database Schema

### Logs Table
```sql
CREATE TABLE system_logs (
  id VARCHAR(255) PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  level ENUM('info', 'warn', 'error', 'debug') NOT NULL,
  category ENUM('auth', 'user_action', 'system', 'api', 'security') NOT NULL,
  event VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NULL,
  user_role ENUM('admin', 'seller', 'customer') NULL,
  user_email VARCHAR(255) NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  session_id VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp),
  INDEX idx_category (category),
  INDEX idx_level (level),
  INDEX idx_user_id (user_id),
  INDEX idx_user_role (user_role)
);
```

## Backend Implementation

### 1. Enable Backend Logging
```typescript
// In your frontend app initialization
import { loggingService } from './shared/loggingService'

// Enable backend logging when backend is ready
loggingService.updateConfig({
  enableBackendLogging: true,
  backendEndpoint: 'https://your-api.com/api/logs'
})
```

### 2. Authentication Headers
```typescript
// Add authentication headers for secure logging
const sendToBackend = async (logEntry: LogEntry) => {
  const token = localStorage.getItem('authToken')
  
  const response = await fetch(this.config.backendEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(logEntry)
  })
}
```

### 3. Error Handling
```typescript
// Handle backend errors gracefully
const sendToBackend = async (logEntry: LogEntry) => {
  try {
    const response = await fetch(this.config.backendEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry)
    })

    if (!response.ok) {
      // Fallback to local storage if backend fails
      this.saveToLocalStorage(logEntry)
      console.warn('Backend logging failed, saved locally')
    }
  } catch (error) {
    // Always fallback to local storage
    this.saveToLocalStorage(logEntry)
    console.warn('Backend logging error:', error)
  }
}
```

## Security Considerations

### 1. Sensitive Data Filtering
```typescript
// Filter sensitive information before logging
const sanitizeLogEntry = (logEntry: LogEntry): LogEntry => {
  const sanitized = { ...logEntry }
  
  // Remove sensitive fields
  if (sanitized.details?.password) {
    delete sanitized.details.password
  }
  if (sanitized.details?.token) {
    delete sanitized.details.token
  }
  
  return sanitized
}
```

### 2. Rate Limiting
```typescript
// Implement rate limiting for log submissions
class LoggingService {
  private logQueue: LogEntry[] = []
  private isProcessing = false
  
  private async processLogQueue() {
    if (this.isProcessing || this.logQueue.length === 0) return
    
    this.isProcessing = true
    
    // Process logs in batches
    const batch = this.logQueue.splice(0, 10)
    await this.sendBatchToBackend(batch)
    
    this.isProcessing = false
    
    // Process remaining logs
    if (this.logQueue.length > 0) {
      setTimeout(() => this.processLogQueue(), 1000)
    }
  }
}
```

## Monitoring and Alerts

### 1. Real-time Monitoring
```typescript
// Set up real-time log monitoring
const setupLogMonitoring = () => {
  // Monitor for critical errors
  loggingService.on('error', (logEntry) => {
    if (logEntry.category === 'security') {
      // Send immediate alert
      sendSecurityAlert(logEntry)
    }
  })
  
  // Monitor for failed login attempts
  loggingService.on('warn', (logEntry) => {
    if (logEntry.event === 'failed_login_attempt') {
      // Check for brute force attacks
      checkBruteForceAttempts(logEntry.userEmail)
    }
  })
}
```

### 2. Log Analytics
```typescript
// Generate analytics from logs
const generateLogAnalytics = async () => {
  const logs = await fetchLogs({ category: 'auth' })
  
  const analytics = {
    totalLogins: logs.filter(log => log.event === 'login_success').length,
    failedLogins: logs.filter(log => log.event === 'failed_login_attempt').length,
    uniqueUsers: new Set(logs.map(log => log.userId)).size,
    loginMethods: groupBy(logs, 'details.loginMethod')
  }
  
  return analytics
}
```

## Performance Optimization

### 1. Log Compression
```typescript
// Compress logs before sending to backend
const compressLogs = (logs: LogEntry[]): string => {
  return JSON.stringify(logs.map(log => ({
    ...log,
    details: log.details ? JSON.stringify(log.details) : null
  })))
}
```

### 2. Batch Processing
```typescript
// Send logs in batches to reduce API calls
const sendBatchToBackend = async (logs: LogEntry[]) => {
  const response = await fetch('/api/logs/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs })
  })
  
  return response.json()
}
```

## Testing

### 1. Unit Tests
```typescript
// Test logging functionality
describe('LoggingService', () => {
  it('should log login attempts', () => {
    const mockFetch = jest.fn()
    global.fetch = mockFetch
    
    loggingService.logLoginAttempt('test@example.com', true, 'admin')
    
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/logs',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('login_attempt')
      })
    )
  })
})
```

### 2. Integration Tests
```typescript
// Test backend integration
describe('Backend Integration', () => {
  it('should handle backend errors gracefully', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'))
    global.fetch = mockFetch
    
    loggingService.logUserAction('test_action')
    
    // Should not throw error
    expect(mockFetch).toHaveBeenCalled()
  })
})
```

## Deployment Checklist

- [ ] Backend API endpoints implemented
- [ ] Database schema created
- [ ] Authentication middleware configured
- [ ] Rate limiting implemented
- [ ] Error handling tested
- [ ] Security filtering applied
- [ ] Monitoring alerts configured
- [ ] Performance optimization applied
- [ ] Log retention policy defined
- [ ] Backup strategy implemented

## Maintenance

### 1. Log Rotation
```sql
-- Implement log rotation (keep last 90 days)
DELETE FROM system_logs 
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

### 2. Performance Monitoring
```sql
-- Monitor log table performance
SELECT 
  COUNT(*) as total_logs,
  AVG(LENGTH(details)) as avg_details_size,
  MAX(timestamp) as latest_log
FROM system_logs 
WHERE timestamp > DATE_SUB(NOW(), INTERVAL 1 DAY);
```

This logging system provides comprehensive monitoring and will be ready for seamless backend integration when your API is available.
