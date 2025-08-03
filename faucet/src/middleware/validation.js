const Joi = require('joi');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Validation schemas
const faucetRequestSchema = Joi.object({
  address: Joi.string()
    .pattern(/^dyt[a-zA-Z0-9]{20,62}$/)
    .required()
    .messages({
      'string.pattern.base': 'Address must be a valid Dytallix address starting with "dyt"',
      'any.required': 'Address is required'
    }),
  tokenType: Joi.string()
    .valid('DGT', 'DRT', 'both')
    .default('both')
    .messages({
      'any.only': 'Token type must be one of: DGT (governance), DRT (rewards), or both'
    }),
  captcha: Joi.string().optional() // For future captcha implementation
});

const validateRequest = (req, res, next) => {
  const { error, value } = faucetRequestSchema.validate(req.body);
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    
    logger.warn('Validation failed', {
      ip: req.ip,
      body: req.body,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      error: 'Validation failed',
      message: errorMessage,
      details: error.details
    });
  }

  // Add validated data to request
  req.validatedBody = value;
  next();
};

// Additional security validation
const securityValidation = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  // Block requests without User-Agent (likely bots)
  if (!userAgent) {
    logger.warn('Request blocked: No User-Agent', {
      ip: clientIp,
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      error: 'Invalid request',
      message: 'User-Agent header is required'
    });
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious) {
    logger.warn('Suspicious User-Agent detected', {
      ip: clientIp,
      userAgent,
      timestamp: new Date().toISOString()
    });

    return res.status(403).json({
      error: 'Access denied',
      message: 'Automated requests are not allowed'
    });
  }

  next();
};

module.exports = {
  validateRequest: [securityValidation, validateRequest],
  faucetRequestSchema
};