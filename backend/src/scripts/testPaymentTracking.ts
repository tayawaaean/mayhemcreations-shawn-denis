/**
 * Test Payment Tracking Script
 * Test that payments are properly recorded in the database
 */

import { sequelize } from '../config/database';
import { Payment } from '../models/paymentModel';
import { OrderReview } from '../models/orderReviewModel';
import { User } from '../models/userModel';
import { createPaymentRecord, generateOrderNumber } from '../services/paymentRecordService';

const testPaymentTracking = async (): Promise<void> => {
  try {
    console.log('🧪 Testing payment tracking...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get a test user
    const [users] = await sequelize.query(`
      SELECT id, first_name, last_name, email 
      FROM users 
      WHERE role_id = 2 
      LIMIT 1
    `);

    if (!Array.isArray(users) || users.length === 0) {
      console.log('❌ No test users found. Please create a user first.');
      return;
    }

    const testUser = users[0] as any;
    console.log('👤 Using test user:', {
      id: testUser.id,
      name: `${testUser.first_name} ${testUser.last_name}`,
      email: testUser.email,
    });

    // Get a test order
    const [orders] = await sequelize.query(`
      SELECT id, user_id, status, total, subtotal, shipping, tax
      FROM order_reviews 
      WHERE user_id = ? AND status = 'approved-processing'
      ORDER BY created_at DESC 
      LIMIT 1
    `, {
      replacements: [testUser.id]
    });

    if (!Array.isArray(orders) || orders.length === 0) {
      console.log('❌ No test orders found. Please create an order first.');
      return;
    }

    const testOrder = orders[0] as any;
    console.log('📦 Using test order:', {
      id: testOrder.id,
      status: testOrder.status,
      total: testOrder.total,
    });

    // Test Stripe payment record creation
    console.log('\n💳 Testing Stripe payment record creation...');
    const stripePaymentResult = await createPaymentRecord({
      orderId: testOrder.id,
      orderNumber: generateOrderNumber(testOrder.id),
      customerId: testUser.id,
      customerName: `${testUser.first_name} ${testUser.last_name}`,
      customerEmail: testUser.email,
      amount: testOrder.total,
      currency: 'usd',
      provider: 'stripe',
      paymentMethod: 'card',
      status: 'completed',
      transactionId: `stripe_test_${Date.now()}`,
      providerTransactionId: `pi_test_${Date.now()}`,
      gatewayResponse: {
        id: `pi_test_${Date.now()}`,
        status: 'succeeded',
        amount: Math.round(testOrder.total * 100),
        currency: 'usd',
      },
      fees: (testOrder.total * 0.029) + 0.30,
      netAmount: testOrder.total - ((testOrder.total * 0.029) + 0.30),
      metadata: {
        test: true,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Script',
      },
      notes: 'Test Stripe payment',
    });

    if (stripePaymentResult.success) {
      console.log('✅ Stripe payment record created:', {
        paymentId: stripePaymentResult.paymentId,
        transactionId: `stripe_test_${Date.now()}`,
      });
    } else {
      console.log('❌ Failed to create Stripe payment record:', stripePaymentResult.error);
    }

    // Test PayPal payment record creation
    console.log('\n💰 Testing PayPal payment record creation...');
    const paypalPaymentResult = await createPaymentRecord({
      orderId: testOrder.id,
      orderNumber: generateOrderNumber(testOrder.id),
      customerId: testUser.id,
      customerName: `${testUser.first_name} ${testUser.last_name}`,
      customerEmail: testUser.email,
      amount: testOrder.total,
      currency: 'usd',
      provider: 'paypal',
      paymentMethod: 'digital_wallet',
      status: 'completed',
      transactionId: `paypal_test_${Date.now()}`,
      providerTransactionId: `paypal_order_${Date.now()}`,
      gatewayResponse: {
        id: `paypal_order_${Date.now()}`,
        status: 'COMPLETED',
        amount: {
          currency_code: 'USD',
          value: testOrder.total.toString(),
        },
      },
      fees: (testOrder.total * 0.029) + 0.30,
      netAmount: testOrder.total - ((testOrder.total * 0.029) + 0.30),
      metadata: {
        test: true,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Script',
      },
      notes: 'Test PayPal payment',
    });

    if (paypalPaymentResult.success) {
      console.log('✅ PayPal payment record created:', {
        paymentId: paypalPaymentResult.paymentId,
        transactionId: `paypal_test_${Date.now()}`,
      });
    } else {
      console.log('❌ Failed to create PayPal payment record:', paypalPaymentResult.error);
    }

    // Check total payments in database
    const [paymentCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM payments
    `);

    const totalPayments = (paymentCount as any[])[0]?.count || 0;
    console.log(`\n📊 Total payments in database: ${totalPayments}`);

    // Get recent payments
    const [recentPayments] = await sequelize.query(`
      SELECT 
        id,
        order_id,
        order_number,
        customer_name,
        provider,
        payment_method,
        status,
        amount,
        fees,
        net_amount,
        created_at
      FROM payments 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log('\n📋 Recent payments:');
    (recentPayments as any[]).forEach((payment, index) => {
      console.log(`${index + 1}. ${payment.order_number} - ${payment.customer_name} - ${payment.provider} - $${payment.amount} - ${payment.status}`);
    });

    console.log('\n✅ Payment tracking test completed successfully');
    
  } catch (error) {
    console.error('❌ Error testing payment tracking:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the script if called directly
if (require.main === module) {
  testPaymentTracking()
    .then(() => {
      console.log('🎉 Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export { testPaymentTracking };
