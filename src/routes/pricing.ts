import { Router } from 'express';
import { fetchPrice } from '../controllers/pricing.js';

const router = Router();

router.get('/fetchprice', fetchPrice);

export default router;
