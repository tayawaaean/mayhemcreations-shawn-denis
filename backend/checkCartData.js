const mysql = require('mysql2/promise');

async function checkCartData() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '123password',
      database: 'mayhem_creation'
    });

    console.log('🔍 Connected to database successfully');
    
    // Check if carts table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'carts'");
    if (tables.length === 0) {
      console.log('❌ Carts table does not exist');
      return;
    }
    
    console.log('✅ Carts table exists');
    
    // Get table structure
    const [structure] = await connection.execute('DESCRIBE carts');
    console.log('📋 Carts table structure:');
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    // Check current cart items
    const [cartItems] = await connection.execute('SELECT * FROM carts ORDER BY created_at DESC LIMIT 10');
    console.log(`📦 Found ${cartItems.length} cart items (showing latest 10):`);
    
    cartItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id}, User: ${item.user_id}, Product: ${item.product_id}, Qty: ${item.quantity}, Status: ${item.review_status}`);
      console.log(`     Customization: ${item.customization ? 'Yes (length: ' + item.customization.length + ')' : 'No'}`);
      console.log(`     Created: ${item.created_at}`);
      console.log('');
    });
    
    // Check for items with customization data
    const [customizedItems] = await connection.execute("SELECT COUNT(*) as count FROM carts WHERE customization IS NOT NULL AND customization != ''");
    console.log(`🎨 Items with customization: ${customizedItems[0].count}`);
    
    // Check for recent items (last hour)
    const [recentItems] = await connection.execute("SELECT COUNT(*) as count FROM carts WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)");
    console.log(`⏰ Items added in last hour: ${recentItems[0].count}`);
    
    // Check for items added today
    const [todayItems] = await connection.execute("SELECT COUNT(*) as count FROM carts WHERE DATE(created_at) = CURDATE()");
    console.log(`📅 Items added today: ${todayItems[0].count}`);
    
    // Show detailed info for recent customized items
    const [recentCustomized] = await connection.execute(`
      SELECT id, user_id, product_id, quantity, review_status, created_at,
             CASE 
               WHEN customization IS NOT NULL AND customization != '' 
               THEN CONCAT('Yes (', LENGTH(customization), ' chars)')
               ELSE 'No'
             END as customization_info
      FROM carts 
      WHERE customization IS NOT NULL AND customization != ''
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (recentCustomized.length > 0) {
      console.log('🎨 Recent customized items:');
      recentCustomized.forEach((item, index) => {
        console.log(`  ${index + 1}. ID: ${item.id}, User: ${item.user_id}, Product: ${item.product_id}`);
        console.log(`     Customization: ${item.customization_info}`);
        console.log(`     Created: ${item.created_at}`);
        console.log('');
      });
    }
    
    await connection.end();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

checkCartData();
