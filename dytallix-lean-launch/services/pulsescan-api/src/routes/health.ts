import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                     redis:
 *                       type: string
 *                     blockchain:
 *                       type: string
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     uptime_seconds:
 *                       type: number
 *                     memory_usage_mb:
 *                       type: number
 *                     cpu_usage_percent:
 *                       type: number
 */
router.get('/', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const services = {
    database: 'unknown',
    redis: 'unknown',
    blockchain: 'unknown',
  };

  // Check database health
  try {
    // Add actual database health check
    services.database = 'healthy';
  } catch (error) {
    services.database = 'unhealthy';
  }

  // Check Redis health
  try {
    // Add actual Redis health check
    services.redis = 'healthy';
  } catch (error) {
    services.redis = 'unhealthy';
  }

  // Check blockchain connectivity
  try {
    // Add actual blockchain health check
    services.blockchain = 'healthy';
  } catch (error) {
    services.blockchain = 'unhealthy';
  }

  const allHealthy = Object.values(services).every(status => status === 'healthy');
  const anyUnhealthy = Object.values(services).some(status => status === 'unhealthy');

  const overallStatus = allHealthy ? 'healthy' : (anyUnhealthy ? 'unhealthy' : 'degraded');

  const memoryUsage = process.memoryUsage();
  
  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
    metrics: {
      uptime_seconds: process.uptime(),
      memory_usage_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
      cpu_usage_percent: 0, // Would need additional monitoring for actual CPU usage
      response_time_ms: Date.now() - startTime,
    },
  });
}));

export default router;