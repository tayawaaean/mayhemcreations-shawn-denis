# Chat-to-Email Integration Guide

This guide explains how to set up and use the new chat-to-email notification system for Mayhem Creations.

## Overview

The chat-to-email system consists of two parts:
1. **Main Backend** (existing) - Handles chat functionality and sends webhooks
2. **Email Service** (new) - Receives webhooks and sends email notifications

## Architecture

```
Frontend Chat → Main Backend (WebSocket) → Email Service (Webhook) → SMTP → Email
```

## Features

- **Admin Notifications**: Email sent to admin when customers send messages
- **Customer Notifications**: Email sent to customers when admin replies
- **Guest Support**: Handles guest users (no email sent to guests)
- **Real-time**: Webhook-based for immediate notifications
- **Beautiful Templates**: HTML and text email templates

## Setup Instructions

### 1. Email Service Setup

Navigate to the `services` folder and run setup:

```bash
cd services

# On Windows
setup.bat

# On Linux/Mac
chmod +x setup.sh
./setup.sh
```

### 2. Configure Environment Variables

Update `services/.env` with your SMTP credentials:

```env
# Server Configuration
PORT=5002
NODE_ENV=development

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Admin Email Configuration
ADMIN_EMAIL=admin@mayhemcreations.com
ADMIN_NAME=Mayhem Creations Admin

# Main Backend Configuration
MAIN_BACKEND_URL=http://localhost:5001
MAIN_BACKEND_WEBHOOK_SECRET=your-webhook-secret-key

# Logging
LOG_LEVEL=info
```

### 3. Update Main Backend Configuration

Add these variables to your main backend's `.env` file:

```env
# Email Service Configuration (Chat Notifications)
EMAIL_SERVICE_URL=http://localhost:5002
EMAIL_SERVICE_WEBHOOK_SECRET=your-webhook-secret-key
```

### 4. Start Services

Start both services:

```bash
# Terminal 1 - Main Backend
cd backend
npm run dev

# Terminal 2 - Email Service
cd services
npm run dev
```

## Testing the Integration

### 1. Test Email Service

```bash
cd services
node test-integration.js
```

This will send test webhooks to verify the email service is working.

### 2. Test with Real Chat

1. Open the frontend chat interface
2. Send a message as a customer
3. Check admin email for notification
4. Reply as admin
5. Check customer email for notification

## Email Templates

### Admin Notification Email

When a customer sends a message, the admin receives:
- Customer information (name, email, type)
- Message content
- Timestamp
- Beautiful HTML template

### Customer Notification Email

When an admin replies, the customer receives:
- Message from admin
- Link to view full conversation
- Professional HTML template

## Webhook Events

The system handles these events:

### `chat_message`
- **Trigger**: When someone sends a message
- **Data**: Message content, sender, customer info
- **Action**: Send appropriate email notification

### `chat_connected`
- **Trigger**: When customer joins chat
- **Data**: Customer info
- **Action**: Log connection (no email)

### `chat_disconnected`
- **Trigger**: When customer leaves chat
- **Data**: Customer ID
- **Action**: Log disconnection (no email)

## Security

- **Webhook Authentication**: Secret key validation
- **CORS Protection**: Only main backend can send webhooks
- **Input Validation**: Joi schema validation
- **Error Handling**: Graceful error handling

## Monitoring

### Health Check

Check service status:
```bash
curl http://localhost:5002/health
```

### Logs

View logs:
```bash
# Email service logs
tail -f services/logs/combined.log

# Main backend logs
tail -f backend/logs/combined.log
```

## Troubleshooting

### Common Issues

1. **Email not sending**
   - Check SMTP credentials
   - Verify email service is running
   - Check logs for errors

2. **Webhook not received**
   - Check EMAIL_SERVICE_URL in main backend
   - Verify webhook secret matches
   - Check network connectivity

3. **Guest users not working**
   - This is expected - guests don't receive emails
   - Admin still gets notifications for guest messages

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
```

## Production Deployment

### Environment Variables

Set these in production:

```env
# Email Service
NODE_ENV=production
SMTP_HOST=your-production-smtp
SMTP_USER=your-production-email
SMTP_PASS=your-production-password
ADMIN_EMAIL=admin@yourdomain.com

# Main Backend
EMAIL_SERVICE_URL=https://your-email-service.com
EMAIL_SERVICE_WEBHOOK_SECRET=your-production-secret
```

### Security Considerations

- Use strong webhook secrets
- Enable HTTPS in production
- Monitor logs for suspicious activity
- Rate limit webhook endpoints

## API Reference

### Email Service Endpoints

#### Health Check
```
GET /health
```

#### Webhook
```
POST /webhook/chat
Content-Type: application/json
X-Webhook-Secret: your-secret

{
  "event": "chat_message",
  "data": {
    "messageId": "msg_123",
    "text": "Hello",
    "sender": "user",
    "customerId": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Support

For issues or questions:
1. Check the logs first
2. Verify configuration
3. Test with the integration script
4. Check this guide for troubleshooting steps
