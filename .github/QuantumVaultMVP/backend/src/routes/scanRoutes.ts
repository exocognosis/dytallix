import { Router } from 'express';
import * as ScanController from '../controllers/ScanController';

const router = Router();

router.post('/', ScanController.createScan);
router.get('/', ScanController.getScans);
router.get('/:id', ScanController.getScan);

export default router;
