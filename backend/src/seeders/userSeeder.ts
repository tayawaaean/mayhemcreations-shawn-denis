import { User } from '../models/userModel';
import { Role } from '../models/roleModel';
import { logger } from '../utils/logger';
import bcrypt from 'bcrypt';

/**
 * User Seeder - Creates mock users for all roles
 * This seeder creates realistic test data for development and testing
 */

export const userData = [
  // Admin Users
  {
    email: 'admin@mayhemcreations.com',
    password: 'AdminPass123!',
    firstName: 'John',
    lastName: 'Admin',
    phone: '+15550101',
    dateOfBirth: '1985-03-15',
    roleName: 'admin',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    profile: {
      bio: 'System Administrator with full access to all platform features.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      preferences: {
        theme: 'dark',
        notifications: true,
        newsletter: true
      }
    }
  },
  {
    email: 'shawn.denis@mayhemcreations.com',
    password: 'ShawnPass123!',
    firstName: 'Shawn',
    lastName: 'Denis',
    phone: '+15550102',
    dateOfBirth: '1980-07-22',
    roleName: 'admin',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    profile: {
      bio: 'Founder and CEO of Mayhem Creations. Passionate about custom embroidery and unique designs.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shawn',
      preferences: {
        theme: 'light',
        notifications: true,
        newsletter: true
      }
    }
  },

  // Manager Users
  {
    email: 'manager@mayhemcreations.com',
    password: 'ManagerPass123!',
    firstName: 'Sarah',
    lastName: 'Johnson',
    phone: '+15550201',
    dateOfBirth: '1988-11-08',
    roleName: 'manager',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    profile: {
      bio: 'Store Manager responsible for inventory, orders, and customer satisfaction.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=manager',
      preferences: {
        theme: 'light',
        notifications: true,
        newsletter: false
      }
    }
  },
  {
    email: 'operations@mayhemcreations.com',
    password: 'OpsPass123!',
    firstName: 'Michael',
    lastName: 'Chen',
    phone: '+15550202',
    dateOfBirth: '1992-04-12',
    roleName: 'manager',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    profile: {
      bio: 'Operations Manager overseeing daily operations and team coordination.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=operations',
      preferences: {
        theme: 'dark',
        notifications: true,
        newsletter: true
      }
    }
  },

  // Designer Users
  {
    email: 'designer@mayhemcreations.com',
    password: 'DesignerPass123!',
    firstName: 'Emma',
    lastName: 'Rodriguez',
    phone: '+15550301',
    dateOfBirth: '1990-09-25',
    roleName: 'designer',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    profile: {
      bio: 'Creative Designer specializing in custom embroidery patterns and unique designs.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=designer',
      preferences: {
        theme: 'light',
        notifications: true,
        newsletter: true
      }
    }
  },
  {
    email: 'creative@mayhemcreations.com',
    password: 'CreativePass123!',
    firstName: 'Alex',
    lastName: 'Thompson',
    phone: '+15550302',
    dateOfBirth: '1987-12-03',
    roleName: 'designer',
    isEmailVerified: true,
    isPhoneVerified: false,
    isActive: true,
    profile: {
      bio: 'Lead Creative Designer with expertise in digital embroidery and pattern creation.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creative',
      preferences: {
        theme: 'dark',
        notifications: false,
        newsletter: true
      }
    }
  },

  // Support Users
  {
    email: 'support@mayhemcreations.com',
    password: 'SupportPass123!',
    firstName: 'Lisa',
    lastName: 'Williams',
    phone: '+15550401',
    dateOfBirth: '1993-06-18',
    roleName: 'support',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    profile: {
      bio: 'Customer Support Specialist dedicated to helping customers with their orders and inquiries.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=support',
      preferences: {
        theme: 'light',
        notifications: true,
        newsletter: false
      }
    }
  },
  {
    email: 'help@mayhemcreations.com',
    password: 'HelpPass123!',
    firstName: 'David',
    lastName: 'Brown',
    phone: '+15550402',
    dateOfBirth: '1991-01-30',
    roleName: 'support',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    profile: {
      bio: 'Senior Support Agent with extensive knowledge of our products and services.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=help',
      preferences: {
        theme: 'dark',
        notifications: true,
        newsletter: true
      }
    }
  },

  // Moderator Users
  {
    email: 'moderator@mayhemcreations.com',
    password: 'ModeratorPass123!',
    firstName: 'Jennifer',
    lastName: 'Davis',
    phone: '+15550501',
    dateOfBirth: '1989-08-14',
    roleName: 'moderator',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    profile: {
      bio: 'Content Moderator ensuring quality and appropriateness of user-generated content.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=moderator',
      preferences: {
        theme: 'light',
        notifications: true,
        newsletter: false
      }
    }
  },

  // Customer Users
  {
    email: 'customer1@example.com',
    password: 'CustomerPass123!',
    firstName: 'Robert',
    lastName: 'Wilson',
    phone: '+15551001',
    dateOfBirth: '1985-05-20',
    roleName: 'customer',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    profile: {
      bio: 'Loyal customer who loves custom embroidery for his business.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=customer1',
      preferences: {
        theme: 'light',
        notifications: true,
        newsletter: true
      }
    }
  },
  {
    email: 'customer2@example.com',
    password: 'CustomerPass123!',
    firstName: 'Maria',
    lastName: 'Garcia',
    phone: '+15551002',
    dateOfBirth: '1992-11-12',
    roleName: 'customer',
    isEmailVerified: true,
    isPhoneVerified: false,
    isActive: true,
    profile: {
      bio: 'Fashion enthusiast who enjoys custom embroidered clothing and accessories.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=customer2',
      preferences: {
        theme: 'dark',
        notifications: false,
        newsletter: true
      }
    }
  },
  {
    email: 'customer3@example.com',
    password: 'CustomerPass123!',
    firstName: 'James',
    lastName: 'Anderson',
    phone: '+15551003',
    dateOfBirth: '1978-03-08',
    roleName: 'customer',
    isEmailVerified: false,
    isPhoneVerified: true,
    isActive: true,
    profile: {
      bio: 'Small business owner looking for custom embroidery solutions for his company.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=customer3',
      preferences: {
        theme: 'light',
        notifications: true,
        newsletter: false
      }
    }
  },
  {
    email: 'customer4@example.com',
    password: 'CustomerPass123!',
    firstName: 'Sophie',
    lastName: 'Taylor',
    phone: '+15551004',
    dateOfBirth: '1995-07-25',
    roleName: 'customer',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    profile: {
      bio: 'Event planner who frequently orders custom embroidered items for special occasions.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=customer4',
      preferences: {
        theme: 'dark',
        notifications: true,
        newsletter: true
      }
    }
  },
  {
    email: 'customer5@example.com',
    password: 'CustomerPass123!',
    firstName: 'Kevin',
    lastName: 'Martinez',
    phone: '+15551005',
    dateOfBirth: '1983-12-01',
    roleName: 'customer',
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: false, // Inactive customer for testing
    profile: {
      bio: 'Former customer who has been inactive for a while.',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=customer5',
      preferences: {
        theme: 'light',
        notifications: false,
        newsletter: false
      }
    }
  }
];

export async function seedUsers(): Promise<void> {
  try {
    logger.info('🌱 Starting user seeding...');

    // Get all roles for mapping
    const roles = await Role.findAll();
    const roleMap = new Map(roles.map(role => [role.name, role.id]));

    // Clear existing users (except system users)
    await User.destroy({
      where: {
        email: {
          [require('sequelize').Op.notLike]: '%@mayhemcreations.com'
        }
      }
    });

    // Create users
    for (const userDataItem of userData) {
      const roleId = roleMap.get(userDataItem.roleName);
      if (!roleId) {
        logger.warn(`⚠️ Role '${userDataItem.roleName}' not found, skipping user: ${userDataItem.email}`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userDataItem.password, 12);

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { email: userDataItem.email }
      });

      if (existingUser) {
        // Update existing user
        await existingUser.update({
          password: hashedPassword,
          firstName: userDataItem.firstName,
          lastName: userDataItem.lastName,
          phone: userDataItem.phone,
          dateOfBirth: new Date(userDataItem.dateOfBirth),
          roleId: roleId,
          isEmailVerified: userDataItem.isEmailVerified,
          isPhoneVerified: userDataItem.isPhoneVerified,
          isActive: userDataItem.isActive
        });
        logger.info(`✅ Updated user: ${userDataItem.email}`);
      } else {
        // Create new user
        await User.create({
          email: userDataItem.email,
          password: hashedPassword,
          firstName: userDataItem.firstName,
          lastName: userDataItem.lastName,
          phone: userDataItem.phone,
          dateOfBirth: new Date(userDataItem.dateOfBirth),
          roleId: roleId,
          isEmailVerified: userDataItem.isEmailVerified,
          isPhoneVerified: userDataItem.isPhoneVerified,
          isActive: userDataItem.isActive
        });
        logger.info(`✅ Created user: ${userDataItem.email}`);
      }
    }

    logger.info('🎉 User seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Error seeding users:', error);
    throw error;
  }
}

export async function clearUsers(): Promise<void> {
  try {
    logger.info('🧹 Clearing all users...');
    await User.destroy({
      where: {},
      force: true
    });
    logger.info('✅ All users cleared successfully!');
  } catch (error) {
    logger.error('❌ Error clearing users:', error);
    throw error;
  }
}

export async function clearNonSystemUsers(): Promise<void> {
  try {
    logger.info('🧹 Clearing non-system users...');
    await User.destroy({
      where: {
        email: {
          [require('sequelize').Op.notLike]: '%@mayhemcreations.com'
        }
      }
    });
    logger.info('✅ Non-system users cleared successfully!');
  } catch (error) {
    logger.error('❌ Error clearing non-system users:', error);
    throw error;
  }
}
