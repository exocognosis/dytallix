import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ContractService } from '../services/contractService';

const router = Router();
const contractService = new ContractService();

/**
 * @swagger
 * /api/v1/contract/config:
 *   get:
 *     summary: Get contract configuration
 *     tags: [Contract]
 *     responses:
 *       200:
 *         description: Contract configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContractConfig'
 */
router.get('/config', asyncHandler(async (req, res) => {
  const config = await contractService.getConfig();
  res.json(config);
}));

/**
 * @swagger
 * /api/v1/contract/findings:
 *   get:
 *     summary: Get findings from contract
 *     tags: [Contract]
 *     parameters:
 *       - in: query
 *         name: start_after
 *         schema:
 *           type: integer
 *         description: Finding ID to start after
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of results
 *     responses:
 *       200:
 *         description: Contract findings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContractFindings'
 */
router.get('/findings', asyncHandler(async (req, res) => {
  const startAfter = req.query.start_after ? parseInt(req.query.start_after as string) : undefined;
  const limit = parseInt(req.query.limit as string) || 50;

  const findings = await contractService.getFindings({ startAfter, limit });
  res.json(findings);
}));

/**
 * @swagger
 * components:
 *   schemas:
 *     ContractConfig:
 *       type: object
 *       properties:
 *         contract_address:
 *           type: string
 *         admin:
 *           type: string
 *         min_score:
 *           type: string
 *         signer_pubkey_pq:
 *           type: string
 *         total_findings:
 *           type: integer
 *         network_id:
 *           type: string
 *     ContractFindings:
 *       type: object
 *       properties:
 *         findings:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               tx_hash:
 *                 type: string
 *               addr:
 *                 type: string
 *               score:
 *                 type: string
 *               reasons:
 *                 type: array
 *                 items:
 *                   type: string
 *               signature_pq:
 *                 type: string
 *               timestamp:
 *                 type: integer
 *               metadata:
 *                 type: string
 *                 nullable: true
 *               block_height:
 *                 type: integer
 *         total_count:
 *           type: integer
 */

export default router;