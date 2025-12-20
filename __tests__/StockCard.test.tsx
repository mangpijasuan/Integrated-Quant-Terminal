import React from 'react';
import { render, screen } from '@testing-library/react';
import StockCard from '../components/StockCard';
import { Recommendation } from '../types';

describe('StockCard', () => {
  const mockData = {
    symbol: 'TSLA',
    currentPrice: 700,
    priceChangePercent: 2.5,
    totalVolume: 2000000,
    callVolume: 1200000,
    putVolume: 800000,
    dominancePercent: 75,
    possibleReason: 'Strong momentum',
    recommendation: Recommendation.Buy,
    topContract: undefined,
  };

  it('renders symbol, confidence, and recommendation', () => {
    render(<StockCard data={mockData} />);
    // There are multiple "TSLA" elements, so check that at least two are present
    const tslaElements = screen.getAllByText('TSLA');
    expect(tslaElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText(Recommendation.Buy)).toBeInTheDocument();
  });

  it('calls onClick with symbol when clicked', () => {
    const handleClick = jest.fn();
    render(<StockCard data={mockData} onClick={handleClick} />);
    // Click the main symbol heading (the first TSLA occurrence)
    const tslaHeadings = screen.getAllByText('TSLA');
    tslaHeadings[0].click();
    expect(handleClick).toHaveBeenCalledWith('TSLA');
  });
});
