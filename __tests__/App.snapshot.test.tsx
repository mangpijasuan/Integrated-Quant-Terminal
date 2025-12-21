import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../App';

jest.mock('../services/geminiService', () => ({
  fetchMarketSentiment: jest.fn(),
  fetchStockSnapshot: jest.fn(),
}));

import { fetchMarketSentiment, fetchStockSnapshot } from '../services/geminiService';

describe('App overview rendering with full snapshot', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // @ts-ignore
    window.aistudio = undefined;
  });

  it('renders overview fully when a rich snapshot is returned', async () => {
    // @ts-ignore
    fetchMarketSentiment.mockResolvedValue({ timestamp: 't', totalDollarVolume: 0, callDominance: 0, putDominance: 0, bullish: [], bearish: [], balanced: [], indices: [], sectors: [], sources: [] });

    const snapshot = {
      symbol: 'TSLA',
      companyName: 'Tesla Motors',
      currentPrice: 720.12,
      priceChange: -12.3,
      priceChangePercent: -1.68,
      as_of_utc: '',
      candles_daily: [{ time: '2025-12-01', open: 700, high: 730, low: 690, close: 720, volume: 1000000 }],
      indicators: { rsi_14: 42, macd: { line: 1, signal: 0.5 }, atr_14: 2, sma: { sma_20: 710, sma_50: 695 }, bbands: { upper: 0, middle: 0 } },
      analysis: 'Insightful analysis',
      recommendation: { action: 'SELL', confidence: 78, entryRange: '700-740', targetPrice: 650, stopLoss: 760, horizon: '30 days', expectedReturn: '-8%' },
      news_catalysts: [{ headline: 'Elon tweets', source: 'X', time: 'now', sentiment: 'mixed', impact: 'High' }],
      risk_metrics: { beta: 1.2, volatility_30d: 0.25, var_95: '-5%', sharpe_ratio: 1.1 },
      correlations: [{ symbol: 'GM', correlation: 0.12, sector: 'Auto' }],
      fundamentals: { pe_ratio: 67, market_cap: '800B' },
      sources: [{ title: 'Node', uri: '#' }],
      option_chain_snapshot: [],
    };

    // @ts-ignore
    fetchStockSnapshot.mockResolvedValue(snapshot);

    render(<App />);

    // Perform a search to load the snapshot
    const input = screen.getByPlaceholderText(/Scan Instrument/i) as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: 'TSLA' } });
    const form = input.closest('form')!;
    fireEvent.submit(form);

    // wait for overview header values to appear after snapshot loads
    await waitFor(() => expect(screen.getByText('Tesla Motors')).toBeInTheDocument());
    expect(screen.getByText('TSLA')).toBeInTheDocument();
    // Confidence badge
    expect(screen.getByText(/Confidence Score/i)).toBeInTheDocument();
    // Fundamentals render (key displayed with underscore replaced by space)
    expect(screen.getByText('pe ratio')).toBeInTheDocument();
    // News catalyst headline present
    expect(screen.getByText(/Elon tweets/i)).toBeInTheDocument();
  });
});
