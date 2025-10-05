import express, { RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import promBundle from 'express-prom-bundle';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { validateApiKey } from './middleware/auth';

import findingsRouter from './routes/findings';
import statsRouter from './routes/stats';
import healthRouter from './routes/health';
import contractRouter from './routes/contract';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: config.cors.allowedOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  maxAge: 86400, // 24 hours
}));

app.use(compression());

// Metrics middleware
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { service: 'pulsescan-api' },
  promClient: {
    collectDefaultMetrics: {},
  },
});
app.use(metricsMiddleware as unknown as RequestHandler);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter as unknown as RequestHandler);

// API key validation for protected routes
app.use('/api/v1/admin', validateApiKey);

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PulseScan API',
      version: '1.0.0',
      description: 'Fraud & Anomaly Monitoring API for Dytallix',
      contact: {
        name: 'Dytallix Team',
        email: 'dev@dytallix.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/health', healthRouter);
app.use('/api/v1/findings', findingsRouter);
app.use('/api/v1/stats', statsRouter);
app.use('/api/v1/contract', contractRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'PulseScan API',
    version: '1.0.0',
    status: 'operational',
    documentation: '/api/docs',
    endpoints: {
      health: '/health',
      findings: '/api/v1/findings',
      stats: '/api/v1/stats',
      contract: '/api/v1/contract',
    },
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Start server
const server = app.listen(config.port, config.host, () => {
  logger.info(`PulseScan API server running on ${config.host}:${config.port}`);
  logger.info(`Documentation available at http://${config.host}:${config.port}/api/docs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app;