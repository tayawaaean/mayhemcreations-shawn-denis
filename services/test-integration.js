const axios = require('axios');

// Test the email service integration
async function testEmailService() {
  const emailServiceUrl = 'http://localhost:5002';
  const webhookSecret = 'bc0db810836fc6dbec80551b3dab741af30d1cbafce5055b4999245165662137';

  console.log('🧪 Testing Email Service Integration...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${emailServiceUrl}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // Test 2: Customer message webhook
    console.log('2. Testing customer message webhook...');
    const customerMessagePayload = {
      event: 'chat_message',
      data: {
        messageId: 'test_msg_001',
        text: 'Hello, I need help with my order #12345. When will it be shipped?',
        sender: 'user',
        customerId: '123',
        type: 'text',
        name: 'John Doe',
        email: 'john.doe@example.com',
        timestamp: new Date().toISOString()
      }
    };

    const customerResponse = await axios.post(
      `${emailServiceUrl}/webhook/chat`,
      customerMessagePayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhookSecret
        }
      }
    );
    console.log('✅ Customer message webhook sent:', customerResponse.data);
    console.log('');

    // Test 3: Admin message webhook
    console.log('3. Testing admin message webhook...');
    const adminMessagePayload = {
      event: 'chat_message',
      data: {
        messageId: 'test_msg_002',
        text: 'Hi John! Thanks for reaching out. Your order #12345 is currently being processed and will be shipped within 2-3 business days. You\'ll receive a tracking number via email once it ships.',
        sender: 'admin',
        customerId: '123',
        type: 'text',
        name: 'John Doe',
        email: 'john.doe@example.com',
        timestamp: new Date().toISOString()
      }
    };

    const adminResponse = await axios.post(
      `${emailServiceUrl}/webhook/chat`,
      adminMessagePayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhookSecret
        }
      }
    );
    console.log('✅ Admin message webhook sent:', adminResponse.data);
    console.log('');

    // Test 4: Guest user message webhook
    console.log('4. Testing guest user message webhook...');
    const guestMessagePayload = {
      event: 'chat_message',
      data: {
        messageId: 'test_msg_003',
        text: 'Hi, I\'m interested in your custom t-shirts. Do you have any samples I can see?',
        sender: 'user',
        customerId: 'guest_456',
        type: 'text',
        name: 'Guest User',
        email: null,
        timestamp: new Date().toISOString()
      }
    };

    const guestResponse = await axios.post(
      `${emailServiceUrl}/webhook/chat`,
      guestMessagePayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhookSecret
        }
      }
    );
    console.log('✅ Guest message webhook sent:', guestResponse.data);
    console.log('');

    // Test 5: Chat connection webhook
    console.log('5. Testing chat connection webhook...');
    const connectionPayload = {
      event: 'chat_connected',
      data: {
        customerId: '123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        timestamp: new Date().toISOString()
      }
    };

    const connectionResponse = await axios.post(
      `${emailServiceUrl}/webhook/chat`,
      connectionPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhookSecret
        }
      }
    );
    console.log('✅ Chat connection webhook sent:', connectionResponse.data);
    console.log('');

    console.log('🎉 All tests passed! Email service integration is working correctly.');
    console.log('\n📧 Check your email inbox for notifications:');
    console.log('- Admin should receive notification for customer message');
    console.log('- Customer should receive notification for admin message');
    console.log('- Admin should receive notification for guest message');
    console.log('- No email should be sent for guest user (no email address)');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testEmailService();
