const { User, Role, Session } = require('./dist/models');
const { logger } = require('./dist/utils/logger');

async function debugAdminRole() {
  try {
    console.log('🔍 Debugging admin user role...');
    
    // Find admin user
    const adminUser = await User.findOne({
      where: { email: 'admin@mayhemcreation.com' },
      include: [{ model: Role, as: 'role' }]
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('👤 Admin User:', {
      id: adminUser.id,
      email: adminUser.email,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      roleId: adminUser.roleId,
      role: adminUser.role ? {
        id: adminUser.role.id,
        name: adminUser.role.name,
        displayName: adminUser.role.displayName,
        permissions: adminUser.role.permissions
      } : null
    });
    
    // Find admin role
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    console.log('🔑 Admin Role:', adminRole ? {
      id: adminRole.id,
      name: adminRole.name,
      displayName: adminRole.displayName,
      permissions: adminRole.permissions
    } : 'Not found');
    
    // Check sessions
    const sessions = await Session.findAll({
      where: { userId: adminUser.id },
      include: [{ model: User, as: 'user', include: [{ model: Role, as: 'role' }] }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log('📋 Recent Sessions:', sessions.map(session => ({
      sessionId: session.sessionId,
      userId: session.userId,
      userRole: session.user?.role?.name,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    })));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugAdminRole().then(() => {
  console.log('✅ Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
