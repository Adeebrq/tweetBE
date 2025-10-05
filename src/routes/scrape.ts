// src/routes/scrapeRoutes.ts
import { Router } from 'express';
import { scrapeUrl } from '../controllers/scrape.js';

const router = Router();

router.get('/scrape-url', scrapeUrl);

export default router;
