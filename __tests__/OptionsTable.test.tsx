import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import OptionsTable from '../components/OptionsTable';
import { OptionType } from '../types';

describe('OptionsTable', () => {
  const options = [
    {
      type: OptionType.call,
      strike: 100,
      lastPrice: 5.5,
      expiry: '2025-12-31',
      iv: 0.25,
      delta: 0.6,
    },
    {
      type: OptionType.put,
      strike: 90,
      lastPrice: 3.2,
      expiry: '2025-12-31',
      iv: 0.22,
      delta: -0.4,
    },
  ];

  it('renders options and filters by type', () => {
    render(<OptionsTable options={options} />);
    // Should show both options initially
    let rows = screen.getAllByRole('row');
    // Find row with $100 strike
    expect(rows.some(row => within(row).queryByText(/\$100/))).toBe(true);
    expect(rows.some(row => within(row).queryByText(/\$90/))).toBe(true);
    // Filter to Calls
    fireEvent.click(screen.getByText('Calls'));
    rows = screen.getAllByRole('row');
    expect(rows.some(row => within(row).queryByText(/\$100/))).toBe(true);
    expect(rows.some(row => within(row).queryByText(/\$90/))).toBe(false);
    // Filter to Puts
    fireEvent.click(screen.getByText('Puts'));
    rows = screen.getAllByRole('row');
    expect(rows.some(row => within(row).queryByText(/\$90/))).toBe(true);
    expect(rows.some(row => within(row).queryByText(/\$100/))).toBe(false);
  });

  it('shows message when no options', () => {
    render(<OptionsTable options={[]} />);
    expect(screen.getByText(/No option data available/i)).toBeInTheDocument();
  });
});
