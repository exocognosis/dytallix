import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { StatsService } from '../services/statsService';

const router = Router();
const statsService = new StatsService();

/**
 * @swagger
 * /api/v1/stats:
 *   get:
 *     summary: Get system statistics
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: System statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemStats'
 */
router.get('/', asyncHandler(async (req, res) => {
  const stats = await statsService.getSystemStats();
  res.json(stats);
}));

/**
 * @swagger
 * /api/v1/stats/address/{address}:
 *   get:
 *     summary: Get risk profile for an address
 *     tags: [Statistics]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Blockchain address
 *     responses:
 *       200:
 *         description: Address risk profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddressProfile'
 */
router.get('/address/:address', asyncHandler(async (req, res) => {
  const address = req.params.address;
  const profile = await statsService.getAddressProfile(address);
  res.json(profile);
}));

/**
 * @swagger
 * components:
 *   schemas:
 *     SystemStats:
 *       type: object
 *       properties:
 *         summary:
 *           type: object
 *           properties:
 *             total_findings:
 *               type: integer
 *             findings_last_24h:
 *               type: integer
 *             findings_last_7d:
 *               type: integer
 *             average_score:
 *               type: number
 *             unique_addresses:
 *               type: integer
 *         by_severity:
 *           type: object
 *           properties:
 *             critical:
 *               type: integer
 *             high:
 *               type: integer
 *             medium:
 *               type: integer
 *             low:
 *               type: integer
 *         trends:
 *           type: object
 *           properties:
 *             daily_findings:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   count:
 *                     type: integer
 *             top_reasons:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   reason:
 *                     type: string
 *                   count:
 *                     type: integer
 *         model_performance:
 *           type: object
 *           properties:
 *             version:
 *               type: string
 *             accuracy:
 *               type: number
 *             precision:
 *               type: number
 *             recall:
 *               type: number
 *             f1_score:
 *               type: number
 *     AddressProfile:
 *       type: object
 *       properties:
 *         address:
 *           type: string
 *         risk_profile:
 *           type: object
 *           properties:
 *             risk_level:
 *               type: string
 *               enum: [low, medium, high, critical]
 *             risk_score:
 *               type: number
 *             total_findings:
 *               type: integer
 *             high_risk_findings:
 *               type: integer
 *             average_score:
 *               type: number
 *         activity:
 *           type: object
 *           properties:
 *             first_seen:
 *               type: string
 *               format: date-time
 *             last_seen:
 *               type: string
 *               format: date-time
 *             total_transactions:
 *               type: integer
 *             total_volume:
 *               type: string
 *         recent_findings:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               score:
 *                 type: number
 *               severity:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 */

export default router;