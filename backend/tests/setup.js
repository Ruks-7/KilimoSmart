// Test setup file
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
process.env.MPESA_CONSUMER_KEY = 'test-mpesa-consumer-key';
process.env.MPESA_CONSUMER_SECRET = 'test-mpesa-consumer-secret';
process.env.MPESA_SHORTCODE = '174379';
process.env.MPESA_PASSKEY = 'test-passkey';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-api-key';
process.env.CLOUDINARY_API_SECRET = 'test-api-secret';

// Increase timeout for async operations
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
