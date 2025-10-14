# Chat Email Service

A separate backend service that handles email notifications for the chat system. This service receives webhook events from the main backend and sends appropriate email notifications to admins and customers.

## Features

- **Admin Notifications**: Sends email to admin when customers (including guests) send messages
- **Customer Notifications**: Sends email to customers when admin replies (only for registered users with email)
- **Guest Support**: Handles guest users appropriately (no email notifications sent to guests)
- **Webhook Integration**: Receives chat events from main backend via webhook
- **Email Templates**: Beautiful HTML and text email templates
- **Error Handling**: Robust error handling and logging
- **Health Checks**: Built-in health check endpoint

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Copy `env.example` to `.env` and configure:
   ```bash
   cp env.example .env
   ```

   Required environment variables:
   - `SMTP_HOST`: SMTP server host (e.g., smtp.gmail.com)
   - `SMTP_PORT`: SMTP server port (e.g., 587)
   - `SMTP_USER`: SMTP username/email
   - `SMTP_PASS`: SMTP password/app password
   - `ADMIN_EMAIL`: Admin email for notifications
   - `ADMIN_NAME`: Admin name for email templates
   - `MAIN_BACKEND_WEBHOOK_SECRET`: Secret key for webhook authentication

3. **Build and Start**
   ```bash
   # Development
   npm run dev

   # Production
   npm run build
   npm start
   ```

## API Endpoints

### Health Check
- **GET** `/health` - Service health status

### Webhook
- **POST** `/webhook/chat` - Receive chat events from main backend

## Webhook Integration

The main backend should send POST requests to `/webhook/chat` with the following payload:

```json
{
  "event": "chat_message",
  "data": {
    "messageId": "msg_123",
    "text": "Hello, I need help with my order",
    "sender": "user",
    "customerId": "123",
    "type": "text",
    "name": "John Doe",
    "email": "john@example.com",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Event Types

- `chat_message`: New message sent
- `chat_connected`: Customer connected to chat
- `chat_disconnected`: Customer disconnected from chat

## Email Notifications

### Admin Notifications
- Triggered when customers send messages
- Includes customer information and message content
- Works for both registered users and guests

### Customer Notifications
- Triggered when admin sends messages
- Only sent to registered users with email addresses
- Guests do not receive email notifications

## Integration with Main Backend

To integrate this service with the main backend, you need to:

1. **Add webhook calls** to the main backend's WebSocket service
2. **Configure webhook URL** in the main backend
3. **Set up webhook secret** for security

Example integration in main backend:

```typescript
// In websocketService.ts, after emitting chat message
const webhookPayload = {
  event: 'chat_message',
  data: {
    messageId: data.messageId,
    text: data.text,
    sender,
    customerId: data.customerId,
    type: data.type,
    name: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : null,
    email: profile?.email || null,
    timestamp: new Date().toISOString()
  }
};

// Send webhook to email service
await fetch(`${process.env.EMAIL_SERVICE_URL}/webhook/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Secret': process.env.EMAIL_SERVICE_WEBHOOK_SECRET
  },
  body: JSON.stringify(webhookPayload)
});
```

## Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console output in development mode

## Development

```bash
# Watch mode
npm run dev:watch

# Build
npm run build

# Test
npm test
```

## Security

- Webhook authentication via secret key
- CORS protection
- Helmet security headers
- Input validation with Joi
- Error handling without sensitive data exposure
