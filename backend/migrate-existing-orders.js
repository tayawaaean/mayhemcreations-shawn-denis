// Migration script to create orders for existing approved order_reviews
const mysql = require('mysql2/promise');

async function migrateExistingOrders() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '123password',
      database: 'mayhem_creation'
    });

    console.log('✅ Connected to database\n');

    // Find all approved order_reviews without corresponding orders
    const [reviews] = await connection.query(`
      SELECT or_table.*, u.email, u.first_name, u.last_name, u.phone
      FROM order_reviews or_table
      LEFT JOIN users u ON or_table.user_id = u.id
      WHERE or_table.status = 'approved-processing'
      AND or_table.id NOT IN (SELECT orderReviewId FROM orders WHERE orderReviewId IS NOT NULL)
      ORDER BY or_table.created_at ASC
    `);

    console.log(`📋 Found ${reviews.length} approved order_reviews without orders\n`);

    if (reviews.length === 0) {
      console.log('✅ All approved order_reviews already have corresponding orders');
      return;
    }

    for (const review of reviews) {
      console.log(`\n📦 Creating order for Review ID: ${review.id}`);
      
      // Parse order data
      const orderData = typeof review.order_data === 'string' 
        ? JSON.parse(review.order_data) 
        : review.order_data;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${review.id}`;

      // Create default shipping address from user data
      const shippingAddress = {
        firstName: review.first_name || 'Customer',
        lastName: review.last_name || '',
        email: review.email || '',
        phone: review.phone || '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
      };

      // Insert order
      await connection.query(`
        INSERT INTO orders (
          orderNumber,
          userId,
          orderReviewId,
          items,
          subtotal,
          shipping,
          tax,
          total,
          shippingAddress,
          billingAddress,
          paymentMethod,
          paymentStatus,
          paymentProvider,
          paymentIntentId,
          transactionId,
          status,
          createdAt,
          updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderNumber,
        review.user_id,
        review.id,
        JSON.stringify(orderData),
        review.subtotal,
        review.shipping,
        review.tax,
        review.total,
        JSON.stringify(shippingAddress),
        JSON.stringify(shippingAddress),
        'card',
        'completed',
        'stripe',
        null,
        `migrated_${review.id}`,
        'preparing',
        review.created_at,
        new Date()
      ]);

      console.log(`   ✅ Created order: ${orderNumber}`);
      console.log(`      - User: ${review.first_name} ${review.last_name} (${review.email})`);
      console.log(`      - Total: $${review.total}`);
      console.log(`      - Status: preparing`);
    }

    console.log(`\n\n✅ Migration complete! Created ${reviews.length} order(s)`);

    // Verify
    const [newOrders] = await connection.query('SELECT COUNT(*) as count FROM orders');
    console.log(`\n📊 Total orders in database: ${newOrders[0].count}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

migrateExistingOrders();


