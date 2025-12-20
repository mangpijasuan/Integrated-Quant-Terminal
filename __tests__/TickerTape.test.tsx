import React from 'react';
import { render, screen } from '@testing-library/react';
import TickerTape from '../components/TickerTape';
import { MarketIndex } from '../types';

describe('TickerTape', () => {
  const indices: MarketIndex[] = [
    { name: 'SPX', value: '4700', change: '+10', up: true },
    { name: 'VIX', value: '15', change: '-1', up: false },
  ];

  it('renders provided indices', () => {
    render(<TickerTape indices={indices} />);
    expect(screen.getAllByText('SPX Index').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4700').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+10/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('VIX Index').length).toBeGreaterThan(0);
    expect(screen.getAllByText('15').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/-1/).length).toBeGreaterThan(0);
  });

  it('renders default indices if none provided', () => {
    render(<TickerTape />);
    expect(screen.getAllByText('SPX Index').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CCMP Index').length).toBeGreaterThan(0);
    expect(screen.getAllByText('INDU Index').length).toBeGreaterThan(0);
    expect(screen.getAllByText('VIX Index').length).toBeGreaterThan(0);
    expect(screen.getAllByText('XBT Index').length).toBeGreaterThan(0);
  });
});
