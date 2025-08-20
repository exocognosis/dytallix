const feedbackService = require('./feedbackService');
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

class FeedbackController {
  async submitFeedback(req, res) {
    try {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Log feedback submission attempt (without user data)
      logger.info('Feedback submission attempt', {
        ip: feedbackService.hashIP(clientIP),
        hasMessage: !!req.body.message,
        hasContact: !!req.body.contact,
        userAgent: req.get('User-Agent')
      });

      const result = await feedbackService.processFeedback(req.body, clientIP);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          id: result.id,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          details: result.details
        });
      }
    } catch (error) {
      logger.error('Error processing feedback submission', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Unable to process feedback at this time'
      });
    }
  }

  async getFeedbackStats(req, res) {
    try {
      const stats = await feedbackService.getFeedbackStats();
      
      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting feedback stats', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get feedback statistics'
      });
    }
  }
}

module.exports = new FeedbackController();