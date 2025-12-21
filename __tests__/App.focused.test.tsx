import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../App';

jest.mock('../services/geminiService', () => ({
  fetchMarketSentiment: jest.fn(),
  fetchStockSnapshot: jest.fn(),
}));

import { fetchMarketSentiment, fetchStockSnapshot } from '../services/geminiService';

describe('App focused behaviors', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // ensure no global aistudio by default
    // tests will set if they need it
    // @ts-ignore
    window.aistudio = undefined;
  });

  it('retries fetchMarketSentiment after API-key flow when service returns entity not found', async () => {
    // first call throws entity not found, second resolves with sectors
    // @ts-ignore
    fetchMarketSentiment.mockRejectedValueOnce(new Error('entity was not found'))
      .mockResolvedValueOnce({
        timestamp: 't',
        totalDollarVolume: 0,
        callDominance: 0,
        putDominance: 0,
        bullish: [],
        bearish: [],
        balanced: [],
        indices: [],
        sectors: [{ name: 'Tech', change: 1, sentiment: 'bullish' }],
        sources: [],
      });

    // provide aistudio that reports NO key initially so checkApiKey will open selector
    // @ts-ignore
    window.aistudio = {
      hasSelectedApiKey: jest.fn().mockResolvedValue(false),
      openSelectKey: jest.fn().mockResolvedValue(undefined),
    };

    render(<App />);

    // After retry completes, sector 'Tech' should be rendered in overview
    const sector = await screen.findByText('Tech');
    expect(sector).toBeInTheDocument();
    // verify aistudio methods were called
    // @ts-ignore
    expect(window.aistudio.hasSelectedApiKey).toHaveBeenCalled();
    // @ts-ignore
    expect(window.aistudio.openSelectKey).toHaveBeenCalled();
  });

  it('submits search form and displays snapshot header when fetchStockSnapshot resolves', async () => {
    // prepare a minimal snapshot response
    // @ts-ignore
    fetchMarketSentiment.mockResolvedValue({
      timestamp: 't',
      totalDollarVolume: 0,
      callDominance: 0,
      putDominance: 0,
      bullish: [],
      bearish: [],
      balanced: [],
      indices: [],
      sectors: [],
      sources: [],
    });

    const mockSnapshot = {
      symbol: 'AAPL',
      companyName: 'Apple Inc',
      currentPrice: 145.23,
      priceChange: 1.2,
      priceChangePercent: 0.83,
      as_of_utc: '',
      candles_daily: [],
      indicators: { rsi_14: 50, macd: { line: 0, signal: 0, histogram: 0 }, atr_14: 0, sma: { sma_20: 0, sma_50: 0 }, bbands: { upper: 0, middle: 0 } },
      analysis: '',
      recommendation: { action: 'HOLD', confidence: 0, entryRange: '', targetPrice: 0, stopLoss: 0, horizon: '', expectedReturn: '' },
      news_catalysts: [],
      risk_metrics: { beta: 1, volatility_30d: 0, var_95: '', sharpe_ratio: 0 },
      correlations: [],
      fundamentals: {},
    };

    // @ts-ignore
    fetchStockSnapshot.mockResolvedValue(mockSnapshot);

    render(<App />);

    // find the search input by placeholder and type/submit
    const input = screen.getByPlaceholderText(/Scan Instrument/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'AAPL' } });
    const form = input.closest('form')!;
    fireEvent.submit(form);

    // wait for snapshot to be displayed in the header
    await waitFor(() => expect(screen.getByText('Apple Inc')).toBeInTheDocument());
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });
});
