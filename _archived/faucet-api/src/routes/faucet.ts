import { Router } from 'express';
import { FaucetController } from '../controllers/FaucetController.js';
import { validateFaucetRequest } from '../middleware/validateFaucetRequest.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { MockTokenDispenser } from '../services/faucet/tokenDispenser.js';
import { FaucetError } from '../errors/faucetErrors.js';

const router = Router();
const controller = new FaucetController(new MockTokenDispenser());

router.post('/dispense', rateLimit, validateFaucetRequest, controller.dispense);

// Global error mapping (if not already present elsewhere). Adjust integration point if app already has one.
router.use((err: any, _req: any, res: any, _next: any) => {
  if (err instanceof FaucetError) {
    return res.status(err.httpStatus).json({ success: false, dispensed: [], cooldowns: {}, error: { code: err.code, httpStatus: err.httpStatus, message: err.message, details: err.details } });
  }
  console.error('Unhandled faucet error', err);
  return res.status(500).json({ success: false, dispensed: [], cooldowns: {}, error: { code: 'FAUCET_INTERNAL', httpStatus: 500, message: 'Internal faucet error.' } });
});

export default router;