import React from 'react';
import { render, screen } from '@testing-library/react';
import SentimentCard from '../components/SentimentCard';
import { SentimentSymbol, Recommendation, OptionType } from '../types';

describe('SentimentCard', () => {
  const mockData: SentimentSymbol = {
    symbol: 'AAPL',
    currentPrice: 150,
    priceChangePercent: 1.2,
    totalVolume: 1000000,
    callVolume: 600000,
    putVolume: 400000,
    dominancePercent: 60,
    possibleReason: 'Strong earnings',
    recommendation: Recommendation.Buy,
    topContract: {
      type: OptionType.Call,
      strike: 155,
      expiry: '2025-12-31',
      dollarVolume: 500000,
      contracts: 1000,
      midPrice: 2.5,
    },
  };

  it('renders symbol and recommendation', () => {
    render(<SentimentCard data={mockData} />);
    // There are multiple "AAPL" elements, so check that at least two are present
    const aaplElements = screen.getAllByText('AAPL');
    expect(aaplElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Buy Signal/i)).toBeInTheDocument();
  });
});
