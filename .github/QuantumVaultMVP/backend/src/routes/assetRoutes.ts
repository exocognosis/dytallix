import { Router } from 'express';
import * as AssetController from '../controllers/AssetController';

const router = Router();

router.get('/', AssetController.getAssets);
router.get('/:id', AssetController.getAsset);
// router.post('/:id/wrap', AssetController.wrapAsset); // To be implemented

export default router;
