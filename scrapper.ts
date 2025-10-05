import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const PYTHON_SCRAPER_BASE = process.env.SCRAPER_API_URL || 'http://127.0.0.1:5000';

router.get('/scrape-url', async (req: Request, res: Response) => {
  const fullUrl = req.query.url as string;
  if (!fullUrl) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  try {
    const apiUrl = `${PYTHON_SCRAPER_BASE}/scrape-url?url=${encodeURIComponent(fullUrl)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Error fetching scraper data: ${response.statusText}` });
    }

    const data = await response.json();
    res.json(data);  // Send back the exact JSON from Python API
  } catch (err) {
    console.error('Error calling Python scraper:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
