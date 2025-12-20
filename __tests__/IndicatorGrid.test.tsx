import React from 'react';
import { render, screen } from '@testing-library/react';
import IndicatorGrid from '../components/IndicatorGrid';
import { Indicators } from '../types';

describe('IndicatorGrid', () => {
  const indicators: Indicators = {
    rsi_14: 72.5,
    macd: { line: 1.2, signal: 1.0 },
    atr_14: 2.5,
    sma: { sma_20: 150, sma_50: 145 },
  };

  it('renders all indicator metrics', () => {
    render(<IndicatorGrid indicators={indicators} />);
    expect(screen.getByText('Rsi (14)')).toBeInTheDocument();
    expect(screen.getByText('72.5')).toBeInTheDocument();
    expect(screen.getByText('Overbought Warn')).toBeInTheDocument();
    expect(screen.getByText('Macd Line')).toBeInTheDocument();
    expect(screen.getByText('1.20')).toBeInTheDocument();
    expect(screen.getByText('Signal: 1.00')).toBeInTheDocument();
    expect(screen.getByText('Volatility Atr')).toBeInTheDocument();
    expect(screen.getByText('2.50')).toBeInTheDocument();
    expect(screen.getByText('Ribbon Sma')).toBeInTheDocument();
    expect(screen.getByText('150/145')).toBeInTheDocument();
    expect(screen.getByText('Trend Confluence')).toBeInTheDocument();
  });

  it('renders default values if indicators are missing', () => {
    render(<IndicatorGrid />);
    expect(screen.getByText('50.0')).toBeInTheDocument(); // default RSI
    // There should be two '0.00' values (MACD, ATR) and one '0/0' (SMA)
    expect(screen.getAllByText('0.00').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('0/0')).toBeInTheDocument();
  });
});
