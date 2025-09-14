import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validatePagination } from '../middleware/validation';
import { FindingsService } from '../services/findingsService';
import { logger } from '../utils/logger';

const router = Router();
const findingsService = new FindingsService();

/**
 * @swagger
 * /api/v1/findings:
 *   get:
 *     summary: List fraud detection findings
 *     tags: [Findings]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Pagination offset
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by severity level
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, false_positive, under_investigation]
 *         description: Filter by finding status
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         description: Filter by blockchain address
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Return findings since this timestamp
 *       - in: query
 *         name: score_min
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Minimum anomaly score
 *       - in: query
 *         name: score_max
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Maximum anomaly score
 *     responses:
 *       200:
 *         description: List of findings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 findings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Finding'
 *                 total_count:
 *                   type: integer
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/', validatePagination, asyncHandler(async (req, res) => {
  const filters = {
    limit: parseInt(req.query.limit as string) || 50,
    offset: parseInt(req.query.offset as string) || 0,
    severity: req.query.severity as string,
    status: req.query.status as string,
    address: req.query.address as string,
    since: req.query.since as string,
    scoreMin: req.query.score_min ? parseFloat(req.query.score_min as string) : undefined,
    scoreMax: req.query.score_max ? parseFloat(req.query.score_max as string) : undefined,
  };

  const result = await findingsService.listFindings(filters);
  
  res.json({
    findings: result.findings,
    total_count: result.totalCount,
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      has_more: result.totalCount > filters.offset + filters.limit,
    },
  });
}));

/**
 * @swagger
 * /api/v1/findings/{id}:
 *   get:
 *     summary: Get finding by ID
 *     tags: [Findings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Finding ID
 *     responses:
 *       200:
 *         description: Finding details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Finding'
 *       404:
 *         description: Finding not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid finding ID' });
  }

  const finding = await findingsService.getFindingById(id);
  if (!finding) {
    return res.status(404).json({ error: 'Finding not found' });
  }

  res.json(finding);
}));

/**
 * @swagger
 * /api/v1/findings/address/{address}:
 *   get:
 *     summary: Get findings for a specific address
 *     tags: [Findings]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Blockchain address
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Findings for the address
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 findings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Finding'
 *                 total_count:
 *                   type: integer
 */
router.get('/address/:address', validatePagination, asyncHandler(async (req, res) => {
  const address = req.params.address;
  const filters = {
    limit: parseInt(req.query.limit as string) || 50,
    offset: parseInt(req.query.offset as string) || 0,
    address,
  };

  const result = await findingsService.listFindings(filters);
  
  res.json({
    findings: result.findings,
    total_count: result.totalCount,
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      has_more: result.totalCount > filters.offset + filters.limit,
    },
  });
}));

/**
 * @swagger
 * components:
 *   schemas:
 *     Finding:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         uuid:
 *           type: string
 *           format: uuid
 *         tx_hash:
 *           type: string
 *         address:
 *           type: string
 *         score:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         severity:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         status:
 *           type: string
 *           enum: [pending, confirmed, false_positive, under_investigation]
 *         reasons:
 *           type: array
 *           items:
 *             type: string
 *         signature_pq:
 *           type: string
 *           nullable: true
 *         metadata:
 *           type: object
 *           nullable: true
 *         block_height:
 *           type: integer
 *         timestamp_detected:
 *           type: integer
 *         timestamp_created:
 *           type: string
 *           format: date-time
 *     Pagination:
 *       type: object
 *       properties:
 *         limit:
 *           type: integer
 *         offset:
 *           type: integer
 *         has_more:
 *           type: boolean
 */

export default router;