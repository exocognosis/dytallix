const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

class FeedbackService {
  constructor() {
    this.feedbackFile = process.env.FEEDBACK_LOG_PATH || path.join(__dirname, '../../data/feedback.log');
    this.ipSalt = process.env.IP_SALT || 'default-salt-change-in-production';
    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.feedbackFile);
      await fs.mkdir(dataDir, { recursive: true });
      
      // Create feedback file if it doesn't exist
      try {
        await fs.access(this.feedbackFile);
      } catch {
        await fs.writeFile(this.feedbackFile, '');
        logger.info('Created feedback log file', { path: this.feedbackFile });
      }
    } catch (error) {
      logger.error('Failed to initialize feedback storage', { error: error.message });
    }
  }

  validateFeedback(data) {
    const errors = [];

    // Validate message
    if (!data.message || typeof data.message !== 'string') {
      errors.push('Message is required');
    } else if (data.message.length < 5) {
      errors.push('Message must be at least 5 characters long');
    } else if (data.message.length > 1000) {
      errors.push('Message must be less than 1000 characters');
    }

    // Validate optional contact
    if (data.contact) {
      if (typeof data.contact !== 'string') {
        errors.push('Contact must be a string');
      } else if (data.contact.length > 100) {
        errors.push('Contact must be less than 100 characters');
      }
      // Basic email or handle validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const handleRegex = /^[a-zA-Z0-9_-]{2,30}$/;
      if (!emailRegex.test(data.contact) && !handleRegex.test(data.contact)) {
        errors.push('Contact must be a valid email address or handle');
      }
    }

    return errors;
  }

  checkHoneypot(data) {
    // Simple honeypot check - bot_field should be empty or not present
    if (data.bot_field && data.bot_field.length > 0) {
      logger.warn('Honeypot triggered in feedback', { 
        hasContent: true,
        // Don't log the actual content for privacy
      });
      return false;
    }
    return true;
  }

  checkSpam(data) {
    const message = data.message.toLowerCase();
    
    // Simple spam detection patterns
    const spamPatterns = [
      /\b(viagra|cialis|casino|lottery|winner|congratulations)\b/g,
      /\b(click here|free money|make money|earn money)\b/g,
      /https?:\/\/[^\s]{10,}/g, // Excessive URLs
      /(.)\1{5,}/g, // Repeated characters
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(message)) {
        logger.warn('Potential spam detected in feedback', {
          pattern: pattern.toString(),
          // Don't log the actual message for privacy
        });
        return false;
      }
    }

    return true;
  }

  hashIP(ip) {
    // Hash IP with salt for privacy-preserving analytics
    if (!ip) return 'unknown';
    return crypto.createHash('sha256').update(ip + this.ipSalt).digest('hex').substring(0, 16);
  }

  async storeFeedback(data, clientIP) {
    try {
      const feedbackEntry = {
        timestamp: new Date().toISOString(),
        message: data.message,
        contact: data.contact || null,
        ipHash: this.hashIP(clientIP),
        id: crypto.randomUUID()
      };

      // Append to JSONL file (one JSON object per line)
      const jsonLine = JSON.stringify(feedbackEntry) + '\n';
      await fs.appendFile(this.feedbackFile, jsonLine, 'utf8');

      // Log success without exposing user data
      logger.info('Feedback stored successfully', {
        id: feedbackEntry.id,
        hasContact: !!data.contact,
        messageLength: data.message.length,
        ipHash: feedbackEntry.ipHash
      });

      return feedbackEntry.id;
    } catch (error) {
      logger.error('Failed to store feedback', { error: error.message });
      throw new Error('Failed to store feedback');
    }
  }

  async processFeedback(data, clientIP) {
    // Validate input
    const validationErrors = this.validateFeedback(data);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'Validation failed',
        details: validationErrors
      };
    }

    // Check honeypot
    if (!this.checkHoneypot(data)) {
      return {
        success: false,
        error: 'Request appears to be automated',
        details: ['Please try again']
      };
    }

    // Check for spam
    if (!this.checkSpam(data)) {
      return {
        success: false,
        error: 'Content not allowed',
        details: ['Please review your message and try again']
      };
    }

    try {
      const feedbackId = await this.storeFeedback(data, clientIP);
      return {
        success: true,
        id: feedbackId,
        message: 'Feedback received successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error',
        details: ['Please try again later']
      };
    }
  }

  // Method to get feedback stats for monitoring (no PII)
  async getFeedbackStats() {
    try {
      const data = await fs.readFile(this.feedbackFile, 'utf8');
      const lines = data.trim().split('\n').filter(line => line.length > 0);
      
      const today = new Date().toISOString().split('T')[0];
      const todayCount = lines.filter(line => {
        try {
          const entry = JSON.parse(line);
          return entry.timestamp.startsWith(today);
        } catch {
          return false;
        }
      }).length;

      return {
        totalCount: lines.length,
        todayCount,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get feedback stats', { error: error.message });
      return {
        totalCount: 0,
        todayCount: 0,
        lastUpdated: new Date().toISOString(),
        error: 'Unable to read feedback data'
      };
    }
  }
}

module.exports = new FeedbackService();