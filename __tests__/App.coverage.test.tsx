import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../App';

jest.mock('../services/geminiService', () => ({
  fetchMarketSentiment: jest.fn(),
  fetchStockSnapshot: jest.fn(),
}));

import { fetchMarketSentiment } from '../services/geminiService';

describe('App additional coverage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // ensure clean aistudio
    // @ts-ignore
    window.aistudio = undefined;
  });

  it('shows an error banner when market fetch fails and can be dismissed', async () => {
    // make the initial market fetch fail with a generic error
    // @ts-ignore
    fetchMarketSentiment.mockRejectedValueOnce(new Error('Network failure'));

    render(<App />);

    // Wait for the error banner to appear
    const err = await screen.findByText(/Network failure/i);
    expect(err).toBeInTheDocument();

    // Dismiss button should remove the banner
    const dismiss = screen.getByText(/Dismiss/i);
    fireEvent.click(dismiss);
    await waitFor(() => expect(screen.queryByText(/Network failure/i)).toBeNull());
  });

  it('navigates to Signal Alerts and System Logs views and triggers refresh', async () => {
    // provide an empty successful market response
    // @ts-ignore
    fetchMarketSentiment.mockResolvedValue({
      timestamp: 't', totalDollarVolume: 0, callDominance: 0, putDominance: 0,
      bullish: [], bearish: [], balanced: [], indices: [], sectors: [], sources: [],
    });

    render(<App />);

    // Click Signal Alerts sidebar item
    const alertsBtn = screen.getByRole('button', { name: /Signal Alerts/i });
    fireEvent.click(alertsBtn);

    // Manual Refresh button should appear when no signals
    const refresh = await screen.findByRole('button', { name: /Manual Refresh/i });
    expect(refresh).toBeInTheDocument();

    // Click refresh — should call fetchMarketSentiment
    fireEvent.click(refresh);
    await waitFor(() => expect(fetchMarketSentiment).toHaveBeenCalled());

    // Click System Logs sidebar item and expect TerminalLog header
    const sysBtn = screen.getByRole('button', { name: /System Logs/i });
    fireEvent.click(sysBtn);
    const header = await screen.findByText(/Centralized Memory Stack/i);
    expect(header).toBeInTheDocument();
  });
});
