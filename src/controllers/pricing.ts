import { Request, Response } from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

interface ScraperResponse {
    data: {
      view_count?: string;
      [key: string]: any;
    };
  }
  

const PYTHON_SCRAPER_BASE = process.env.SCRAPER_API_URL || 'http://127.0.0.1:5000';

// Impressions-only pricing function
function calculatePriceByImpressions(viewCountStr: string | undefined): number {
    const views = viewCountStr ? parseInt(viewCountStr) : 0;
  
    // Avoid log(0) by adding 1
    const price = 0.2 * Math.log10(views + 1);
  
    // Clamp price to sensible min and max
    if (price < 0.001) return 0.001;  // minimum price
    if (price > 20) return 20;          // maximum price (adjustable)
  
    return price;
  }
  

export const fetchPrice = async (req: Request, res: Response): Promise<Response> => {
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

    const data = (await response.json()) as ScraperResponse;

    // Extract view_count
    const viewCount = data.data.view_count;

    // Calculate price based on impressions
    const price = calculatePriceByImpressions(viewCount);

    return res.json({
      metrics: data.data,
      price,
    });
  } catch (err) {
    console.error('Error calling Python scraper:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



