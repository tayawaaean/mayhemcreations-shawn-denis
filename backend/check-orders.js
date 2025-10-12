// Simple script to check orders table and data
const mysql = require('mysql2/promise');

async function checkOrders() {
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '123password',
      database: 'mayhem_creation'
    });

    console.log('✅ Connected to database\n');

    // Check if orders table exists
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'mayhem_creation' 
      AND TABLE_NAME = 'orders'
    `);

    if (tables.length === 0) {
      console.log('❌ Orders table does NOT exist');
      console.log('\n📝 Creating orders table...\n');
      
      // Read and execute the SQL file
      const fs = require('fs');
      const sql = fs.readFileSync('./src/scripts/createOrdersTable.sql', 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = sql.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await connection.query(statement);
          } catch (err) {
            // Ignore SELECT statements that might fail
            if (!statement.includes('SELECT')) {
              throw err;
            }
          }
        }
      }
      
      console.log('✅ Orders table created successfully\n');
    } else {
      console.log('✅ Orders table EXISTS\n');
    }

    // Check for orders
    const [orders] = await connection.query('SELECT * FROM orders ORDER BY createdAt DESC LIMIT 5');
    console.log(`📊 Total orders in database: ${orders.length}\n`);

    if (orders.length > 0) {
      console.log('Recent orders:');
      orders.forEach((order, index) => {
        console.log(`\n${index + 1}. Order #${order.orderNumber || order.id}`);
        console.log(`   - User ID: ${order.userId}`);
        console.log(`   - Status: ${order.status}`);
        console.log(`   - Payment Status: ${order.paymentStatus}`);
        console.log(`   - Total: $${order.total}`);
        console.log(`   - Created: ${order.createdAt}`);
      });
    } else {
      console.log('ℹ️  No orders found in database');
      console.log('\n🔍 This means:');
      console.log('   1. The webhook might not be triggered after payment');
      console.log('   2. The Stripe webhook listener might not be running');
      console.log('   3. The order creation logic in webhook handler might have failed');
      console.log('\n💡 Next steps:');
      console.log('   1. Check backend console logs for webhook events');
      console.log('   2. Ensure Stripe webhook listener is running: stripe listen --forward-to localhost:5001/api/v1/payments/webhook');
      console.log('   3. Complete a test payment and check logs');
    }

    // Check order_reviews for comparison
    const [reviews] = await connection.query(`
      SELECT id, user_id, status, total, created_at 
      FROM order_reviews 
      WHERE status = 'approved-processing' 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log(`\n\n📋 Order Reviews with 'approved-processing' status: ${reviews.length}`);
    if (reviews.length > 0) {
      console.log('\nThese should have corresponding orders:');
      reviews.forEach((review, index) => {
        console.log(`\n${index + 1}. Review ID: ${review.id}`);
        console.log(`   - User ID: ${review.user_id}`);
        console.log(`   - Status: ${review.status}`);
        console.log(`   - Total: $${review.total}`);
        console.log(`   - Created: ${review.created_at}`);
      });
      
      // Check if these have corresponding orders
      if (reviews.length > 0) {
        const reviewIds = reviews.map(r => r.id).join(',');
        const [linkedOrders] = await connection.query(`
          SELECT orderReviewId FROM orders WHERE orderReviewId IN (${reviewIds})
        `);
        
        console.log(`\n🔗 Orders linked to these reviews: ${linkedOrders.length}/${reviews.length}`);
        if (linkedOrders.length < reviews.length) {
          console.log('⚠️  Some approved orders did not create order records!');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n\n✅ Database connection closed');
    }
  }
}

checkOrders();


