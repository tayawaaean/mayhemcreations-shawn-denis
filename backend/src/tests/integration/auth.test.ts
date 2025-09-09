import request from 'supertest';
import app from '../../app';
import { sequelize, User, Role, ROLES } from '../../models';
import { testUser, invalidCredentials, malformedData } from '../fixtures/authTestData';

describe('Authentication Integration Tests', () => {
  beforeAll(async () => {
    // Sync database before tests
    await sequelize.sync({ force: true });
    
    // Create default roles
    await Role.create({
      name: ROLES.CUSTOMER,
      description: 'Customer role',
      permissions: ['products:read', 'orders:read'],
      isActive: true,
    });
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up users before each test
    await User.destroy({ where: {} });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered successfully');
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.firstName).toBe(testUser.firstName);
      expect(response.body.data.lastName).toBe(testUser.lastName);
      expect(response.body.data.isEmailVerified).toBe(false);
    });

    it('should fail with invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(malformedData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should fail if user already exists', async () => {
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Login successful');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.sessionId).toBeDefined();
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidCredentials)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePass123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let sessionCookie: string;

    beforeEach(async () => {
      // Register and login to get session
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      sessionCookie = loginResponse.headers['set-cookie'][0];
    });

    it('should get user profile when authenticated', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.firstName).toBe(testUser.firstName);
      expect(response.body.data.user.lastName).toBe(testUser.lastName);
    });

    it('should fail when not authenticated', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authenticated');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let sessionCookie: string;

    beforeEach(async () => {
      // Register and login to get session
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      sessionCookie = loginResponse.headers['set-cookie'][0];
    });

    it('should logout successfully when authenticated', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logout successful');
    });

    it('should fail when not authenticated', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authenticated');
    });
  });

  describe('GET /api/v1/auth/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/v1/auth/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Auth service is running');
    });
  });
});
