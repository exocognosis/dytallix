/**
 * Test setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SMTP_HOST = 'test-smtp.example.com';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';

// Suppress console output during tests (optional)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// };
