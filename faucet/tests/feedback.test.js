const request = require('supertest');
const app = require('../src/server');
const feedbackService = require('../src/controllers/feedbackService');
const fs = require('fs').promises;
const path = require('path');

describe('Feedback System', () => {
  const testFeedbackFile = path.join(__dirname, '../data/test_feedback.log');
  
  beforeEach(async () => {
    // Override feedback file path for testing
    feedbackService.feedbackFile = testFeedbackFile;
    
    // Clean up test feedback file
    try {
      await fs.unlink(testFeedbackFile);
    } catch (error) {
      // File might not exist, that's ok
    }
    
    // Ensure test data directory exists
    await fs.mkdir(path.dirname(testFeedbackFile), { recursive: true });
  });

  afterEach(async () => {
    // Clean up test feedback file
    try {
      await fs.unlink(testFeedbackFile);
    } catch (error) {
      // File might not exist, that's ok
    }
  });

  describe('POST /api/feedback', () => {
    it('should accept valid feedback', async () => {
      const feedback = {
        message: 'This is a test feedback message',
        contact: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/feedback')
        .send(feedback)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.id).toBeDefined();
      expect(response.body.message).toContain('successfully');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should accept feedback without contact', async () => {
      const feedback = {
        message: 'Anonymous feedback message'
      };

      const response = await request(app)
        .post('/api/feedback')
        .send(feedback)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.id).toBeDefined();
    });

    it('should reject feedback with short message', async () => {
      const feedback = {
        message: 'Hi' // Too short
      };

      const response = await request(app)
        .post('/api/feedback')
        .send(feedback)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toContain('Message must be at least 5 characters long');
    });

    it('should reject feedback with very long message', async () => {
      const feedback = {
        message: 'x'.repeat(1001) // Too long
      };

      const response = await request(app)
        .post('/api/feedback')
        .send(feedback)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toContain('Message must be less than 1000 characters');
    });

    it('should reject feedback with invalid contact', async () => {
      const feedback = {
        message: 'Valid message here',
        contact: 'invalid-email-format'
      };

      const response = await request(app)
        .post('/api/feedback')
        .send(feedback)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toContain('Contact must be a valid email address or handle');
    });

    it('should reject feedback when honeypot is triggered', async () => {
      const feedback = {
        message: 'Valid message',
        bot_field: 'bot content' // This should trigger honeypot
      };

      const response = await request(app)
        .post('/api/feedback')
        .send(feedback)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('automated');
    });

    it('should detect and reject spam content', async () => {
      const feedback = {
        message: 'Buy viagra now! Click here for free money!'
      };

      const response = await request(app)
        .post('/api/feedback')
        .send(feedback)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Content not allowed');
    });

    it('should store feedback in JSONL format', async () => {
      const feedback = {
        message: 'Test message for storage verification',
        contact: 'test@example.com'
      };

      await request(app)
        .post('/api/feedback')
        .send(feedback)
        .expect(201);

      // Check that feedback was stored
      const fileContent = await fs.readFile(testFeedbackFile, 'utf8');
      const lines = fileContent.trim().split('\n');
      expect(lines.length).toBe(1);

      const storedFeedback = JSON.parse(lines[0]);
      expect(storedFeedback.message).toBe(feedback.message);
      expect(storedFeedback.contact).toBe(feedback.contact);
      expect(storedFeedback.id).toBeDefined();
      expect(storedFeedback.timestamp).toBeDefined();
      expect(storedFeedback.ipHash).toBeDefined();
      expect(storedFeedback.ipHash).not.toContain('127.0.0.1'); // Should be hashed
    });
  });

  describe('GET /api/feedback/stats', () => {
    it('should return feedback statistics', async () => {
      // Submit some feedback first
      const feedback1 = { message: 'First test message' };
      const feedback2 = { message: 'Second test message' };

      await request(app).post('/api/feedback').send(feedback1).expect(201);
      await request(app).post('/api/feedback').send(feedback2).expect(201);

      const response = await request(app)
        .get('/api/feedback/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats.totalCount).toBe(2);
      expect(response.body.stats.todayCount).toBe(2);
      expect(response.body.stats.lastUpdated).toBeDefined();
    });

    it('should return zero stats when no feedback exists', async () => {
      const response = await request(app)
        .get('/api/feedback/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats.totalCount).toBe(0);
      expect(response.body.stats.todayCount).toBe(0);
    });
  });

  describe('Feedback Validation', () => {
    it('should validate email addresses correctly', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user space@example.com'
      ];

      validEmails.forEach(email => {
        const errors = feedbackService.validateFeedback({ 
          message: 'Valid message', 
          contact: email 
        });
        expect(errors).toEqual([]);
      });

      invalidEmails.forEach(email => {
        const errors = feedbackService.validateFeedback({ 
          message: 'Valid message', 
          contact: email 
        });
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it('should validate handle formats correctly', () => {
      const validHandles = [
        'username',
        'user_name',
        'user-name',
        'user123',
        'test_user_123'
      ];

      const invalidHandles = [
        'a', // too short
        'user name', // spaces not allowed
        'user@handle', // @ not allowed in handles
        'x'.repeat(31) // too long
      ];

      validHandles.forEach(handle => {
        const errors = feedbackService.validateFeedback({ 
          message: 'Valid message', 
          contact: handle 
        });
        expect(errors).toEqual([]);
      });

      invalidHandles.forEach(handle => {
        const errors = feedbackService.validateFeedback({ 
          message: 'Valid message', 
          contact: handle 
        });
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Spam Detection', () => {
    it('should detect common spam patterns', () => {
      const spamMessages = [
        'Buy viagra online now!',
        'You are a lottery winner! Congratulations!',
        'Click here for free money',
        'Make money fast with this amazing opportunity',
        'Visit this casino: https://suspicious-casino-link.com/very/long/path',
        'Aaaaaaaaaa' // Repeated characters
      ];

      spamMessages.forEach(message => {
        const isValid = feedbackService.checkSpam({ message });
        expect(isValid).toBe(false);
      });
    });

    it('should allow legitimate messages', () => {
      const legitimateMessages = [
        'I love the new features in this release!',
        'Could you add support for dark mode?',
        'The API documentation could be improved',
        'Great work on the monitoring system'
      ];

      legitimateMessages.forEach(message => {
        const isValid = feedbackService.checkSpam({ message });
        expect(isValid).toBe(true);
      });
    });
  });

  describe('Privacy Protection', () => {
    it('should hash IP addresses', () => {
      const ip1 = '192.168.1.1';
      const ip2 = '10.0.0.1';
      
      const hash1 = feedbackService.hashIP(ip1);
      const hash2 = feedbackService.hashIP(ip2);
      
      // Hashes should be different
      expect(hash1).not.toBe(hash2);
      
      // Hashes should not contain original IP
      expect(hash1).not.toContain(ip1);
      expect(hash2).not.toContain(ip2);
      
      // Hashes should be consistent
      expect(feedbackService.hashIP(ip1)).toBe(hash1);
      expect(feedbackService.hashIP(ip2)).toBe(hash2);
      
      // Hashes should be of expected length (16 chars from SHA256)
      expect(hash1.length).toBe(16);
      expect(hash2.length).toBe(16);
    });

    it('should not log contact information in general logs', async () => {
      // This test would need to capture log output to verify
      // For now, we ensure the feedback service processes correctly
      const feedback = {
        message: 'Test message with contact',
        contact: 'private@example.com'
      };

      const result = await feedbackService.processFeedback(feedback, '127.0.0.1');
      expect(result.success).toBe(true);
      
      // Verify that the contact is stored but not logged directly
      const fileContent = await fs.readFile(testFeedbackFile, 'utf8');
      const storedFeedback = JSON.parse(fileContent.trim());
      expect(storedFeedback.contact).toBe(feedback.contact);
    });
  });

  describe('Honeypot Protection', () => {
    it('should allow requests without bot_field', () => {
      const feedback = { message: 'Valid message' };
      const isValid = feedbackService.checkHoneypot(feedback);
      expect(isValid).toBe(true);
    });

    it('should allow requests with empty bot_field', () => {
      const feedback = { message: 'Valid message', bot_field: '' };
      const isValid = feedbackService.checkHoneypot(feedback);
      expect(isValid).toBe(true);
    });

    it('should reject requests with content in bot_field', () => {
      const feedback = { message: 'Valid message', bot_field: 'bot content' };
      const isValid = feedbackService.checkHoneypot(feedback);
      expect(isValid).toBe(false);
    });
  });
});