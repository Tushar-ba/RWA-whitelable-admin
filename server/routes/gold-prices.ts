import { Router, Request, Response } from 'express';
import { goldApiService } from '../services/goldapi.service';

const router = Router();

// Get live gold and silver prices
router.get('/live-prices', async (req: Request, res: Response) => {
  try {
    const prices = await goldApiService.getBothPrices();
    res.json({
      success: true,
      data: prices
    });
  } catch (error) {
    console.error('Error fetching live prices:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch live prices'
    });
  }
});

// Get only gold price
router.get('/gold', async (req: Request, res: Response) => {
  try {
    const goldPrice = await goldApiService.getGoldPrice();
    res.json({
      success: true,
      data: goldPrice
    });
  } catch (error) {
    console.error('Error fetching gold price:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch gold price'
    });
  }
});

// Get only silver price
router.get('/silver', async (req: Request, res: Response) => {
  try {
    const silverPrice = await goldApiService.getSilverPrice();
    res.json({
      success: true,
      data: silverPrice
    });
  } catch (error) {
    console.error('Error fetching silver price:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch silver price'
    });
  }
});

export default router;