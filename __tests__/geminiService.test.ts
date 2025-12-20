// Mock @google/genai before importing the service
jest.mock('@google/genai', () => {
  // These should match the actual model names used in GEMINI_FLASH_MODEL and GEMINI_PRO_MODEL
  const FLASH_MODEL = 'gemini-3-flash-preview';
  const PRO_MODEL = 'gemini-3-pro-preview';
  return {
    GoogleGenAI: jest.fn().mockImplementation(({ apiKey }) => {
      return {
        models: {
          generateContent: jest.fn(async ({ model }) => {
            if (!apiKey) throw new Error('Missing API key');
            if (model === FLASH_MODEL) {
              return {
                text: '{"bullish":[],"bearish":[],"balanced":[],"indices":[],"sectors":[]}',
                candidates: [{ groundingMetadata: { groundingChunks: [{ web: { title: 'Test', uri: 'http://test' } }] } }]
              };
            }
            if (model === PRO_MODEL) {
              return {
                text: '{"symbol":"AAPL","candles_daily":[],"news_catalysts":[],"correlations":[],"option_chain_snapshot":[]}',
                candidates: [{ groundingMetadata: { groundingChunks: [{ web: { title: 'Research', uri: 'http://research' } }] } }]
              };
            }
            throw new Error('Unknown model');
          })
        }
      };
    }),
    Type: { OBJECT: 'object', STRING: 'string', NUMBER: 'number', ARRAY: 'array', BOOLEAN: 'boolean' },
  };
});

import { fetchMarketSentiment, fetchStockSnapshot } from '../services/geminiService';

describe('geminiService', () => {
  beforeEach(() => {
    process.env.API_KEY = 'test-key';
  });

  describe('fetchMarketSentiment', () => {
    it('should throw an error if API key is missing', async () => {
      process.env.API_KEY = '';
      await expect(fetchMarketSentiment()).rejects.toThrow();
    });

    it('should return parsed market sentiment with mapped sources', async () => {
      const result = await fetchMarketSentiment();
      expect(result).toHaveProperty('bullish');
      expect(result).toHaveProperty('bearish');
      expect(result).toHaveProperty('balanced');
      expect(result).toHaveProperty('indices');
      expect(result).toHaveProperty('sectors');
      expect(result.sources[0].title).toBe('Test');
      expect(result.sources[0].uri).toBe('http://test');
    });
  });

  describe('fetchStockSnapshot', () => {
    it('should throw an error if API key is missing', async () => {
      process.env.API_KEY = '';
      await expect(fetchStockSnapshot('AAPL')).rejects.toThrow();
    });

    it('should return parsed stock snapshot with mapped sources', async () => {
      const result = await fetchStockSnapshot('AAPL');
      expect(result).toHaveProperty('symbol', 'AAPL');
      expect(result).toHaveProperty('candles_daily');
      expect(result).toHaveProperty('news_catalysts');
      expect(result).toHaveProperty('correlations');
      expect(result).toHaveProperty('option_chain_snapshot');
      expect(result.sources[0].title).toBe('Research');
      expect(result.sources[0].uri).toBe('http://research');
    });
  });
});
