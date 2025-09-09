// Test data for authentication tests
export const testUser = {
  email: 'test@example.com',
  password: 'TestPass123!',
  firstName: 'Test',
  lastName: 'User',
  phone: '+1234567890',
  dateOfBirth: '1990-01-01',
};

export const testAdmin = {
  email: 'admin@example.com',
  password: 'AdminPass123!',
  firstName: 'Admin',
  lastName: 'User',
  phone: '+1234567891',
  dateOfBirth: '1985-01-01',
};

export const invalidUser = {
  email: 'invalid@example.com',
  password: 'WrongPass123!',
};

export const invalidCredentials = {
  email: 'test@example.com',
  password: 'WrongPass123!',
};

export const malformedData = {
  email: 'not-an-email',
  password: '123', // Too short
  firstName: '', // Empty
  lastName: 'A', // Too short
};
