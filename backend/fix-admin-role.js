const { User, Role, Session } = require('./dist/models');

async function fixAdminRole() {
  try {
    console.log('🔧 Fixing admin user role...');
    
    // Find admin role
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    if (!adminRole) {
      console.log('❌ Admin role not found');
      return;
    }
    
    console.log('✅ Admin role found:', {
      id: adminRole.id,
      name: adminRole.name,
      displayName: adminRole.displayName
    });
    
    // Find admin user
    const adminUser = await User.findOne({
      where: { email: 'admin@mayhemcreation.com' }
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('👤 Admin user found:', {
      id: adminUser.id,
      email: adminUser.email,
      currentRoleId: adminUser.roleId
    });
    
    // Update admin user's role
    await adminUser.update({ roleId: adminRole.id });
    console.log('✅ Admin user role updated');
    
    // Check if there are any sessions for this user
    const sessions = await Session.findAll({
      where: { userId: adminUser.id }
    });
    
    console.log(`📋 Found ${sessions.length} sessions for admin user`);
    
    // Delete old sessions to force re-authentication
    if (sessions.length > 0) {
      await Session.destroy({ where: { userId: adminUser.id } });
      console.log('🗑️ Deleted old sessions - user will need to re-login');
    }
    
    console.log('✅ Admin role fix complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAdminRole().then(() => {
  console.log('✅ Fix complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});
