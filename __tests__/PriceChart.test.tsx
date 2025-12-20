import React from 'react';
import { render, screen } from '@testing-library/react';
import PriceChart from '../components/PriceChart';
import { Candle, Indicators } from '../types';

describe('PriceChart', () => {
  const data: Candle[] = [
    { open: 100, close: 105, high: 110, low: 95, volume: 10000, time: '2025-12-20', rsi: 60 },
    { open: 105, close: 102, high: 108, low: 101, volume: 12000, time: '2025-12-21', rsi: 55 },
  ];
  const indicators: Indicators = {
    rsi_14: 58,
    macd: { line: 1.5, signal: 1.2 },
    atr_14: 2.1,
    sma: { sma_20: 104, sma_50: 102 },
  };


  it('renders chart section labels', () => {
    render(<PriceChart data={data} indicators={indicators} />);
    expect(screen.getByText(/Price Execution/i)).toBeInTheDocument();
    expect(screen.getByText(/Macd \(Right\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Volume Delta/i)).toBeInTheDocument();
  });

  it('renders without crashing with minimal data', () => {
    render(<PriceChart data={[]} indicators={{}} />);
    // Should not throw and should render chart container
    expect(screen.getByText(/Price Execution/i)).toBeInTheDocument();
    expect(screen.getByText(/Macd \(Right\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Volume Delta/i)).toBeInTheDocument();
  });
});
