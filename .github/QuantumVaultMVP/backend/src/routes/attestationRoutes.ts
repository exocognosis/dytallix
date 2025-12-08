import { Router } from 'express';
import * as AttestationController from '../controllers/AttestationController';

const router = Router();

router.post('/jobs', AttestationController.createAttestationJob);
router.get('/jobs', AttestationController.getAttestationJobs);

export default router;
