import axios from 'axios';

const GOLDAPI_BASE_URL = 'https://www.goldapi.io/api';
const API_KEY = process.env.GOLDAPI_API_KEY || 'goldapi-4ew9d7lsmeazuosv-io';

export interface GoldApiPrice {
  price: number;
  price_gram_24k: number;
  price_gram_22k: number;
  price_gram_21k: number;
  price_gram_20k: number;
  price_gram_18k: number;
  price_gram_16k: number;
  price_gram_14k: number;
  price_gram_10k: number;
  change: number;
  timestamp: number;
  metal: string;
  currency: string;
  exchange: string;
  symbol: string;
}

export class GoldApiService {
  private static instance: GoldApiService;
  
  private constructor() {}

  public static getInstance(): GoldApiService {
    if (!GoldApiService.instance) {
      GoldApiService.instance = new GoldApiService();
    }
    return GoldApiService.instance;
  }

  /**
   * Fetch Gold price in USD from Gold API
   * @returns Promise<GoldApiPrice> - Gold price data
   */
  async getGoldPrice(): Promise<GoldApiPrice> {
    try {
      const response = await axios.get<GoldApiPrice>(
        `${GOLDAPI_BASE_URL}/XAU/USD`,
        {
          headers: {
            'x-access-token': API_KEY,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      if (!response.data || !response.data.price) {
        throw new Error('Invalid response structure from Gold API');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Gold API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        if (error.response?.status === 429) {
          throw new Error('Gold API rate limit exceeded. Please try again later.');
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Gold API authentication failed. Invalid API key.');
        }
        throw new Error(`Gold API request failed: ${error.response?.statusText || error.message}`);
      }
      console.error('Unexpected error fetching gold price:', error);
      throw new Error('Failed to fetch gold price from Gold API');
    }
  }

  /**
   * Fetch Silver price in USD from Gold API
   * @returns Promise<GoldApiPrice> - Silver price data
   */
  async getSilverPrice(): Promise<GoldApiPrice> {
    try {
      const response = await axios.get<GoldApiPrice>(
        `${GOLDAPI_BASE_URL}/XAG/USD`,
        {
          headers: {
            'x-access-token': API_KEY,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      if (!response.data || !response.data.price) {
        throw new Error('Invalid response structure from Gold API');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Gold API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        if (error.response?.status === 429) {
          throw new Error('Gold API rate limit exceeded. Please try again later.');
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Gold API authentication failed. Invalid API key.');
        }
        throw new Error(`Gold API request failed: ${error.response?.statusText || error.message}`);
      }
      console.error('Unexpected error fetching silver price:', error);
      throw new Error('Failed to fetch silver price from Gold API');
    }
  }

  /**
   * Fetch both Gold and Silver prices
   * @returns Promise<{gold: GoldApiPrice, silver: GoldApiPrice}> - Both prices
   */
  async getBothPrices(): Promise<{gold: GoldApiPrice, silver: GoldApiPrice}> {
    try {
      const [goldPrice, silverPrice] = await Promise.all([
        this.getGoldPrice(),
        this.getSilverPrice()
      ]);

      return {
        gold: goldPrice,
        silver: silverPrice
      };
    } catch (error) {
      console.error('Error fetching both prices:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const goldApiService = GoldApiService.getInstance();