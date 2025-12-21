import React from 'react';
// Mock recharts so chart primitives render simple DOM nodes we can assert on
jest.mock('recharts', () => {
  const React = require('react');
  const wrap = (tag: string, pick: string[] = []) => (props: any) => {
    const out: any = {};
    pick.forEach(k => { if (props[k] !== undefined) out[k] = props[k]; });
    return React.createElement(tag, { 'data-props': JSON.stringify(out) });
  };
  return {
    ComposedChart: ({ children }: any) => React.createElement('svg', null, children),
    Line: wrap('line', ['name', 'stroke']),
    Area: wrap('path', ['name', 'fill']),
    XAxis: wrap('g', ['dataKey']),
    YAxis: wrap('g', ['yAxisId', 'label']),
    CartesianGrid: wrap('g', []),
    Tooltip: wrap('div', []),
    ResponsiveContainer: ({ children }: any) => React.createElement('div', { style: { width: 800, height: 600 } }, children),
    Bar: ({ children }: any) => React.createElement('g', null, children),
    ReferenceLine: wrap('line', ['y', 'label']),
    Cell: (props: any) => React.createElement('rect', { 'data-fill': props.fill }),
  };
});

import { render } from '@testing-library/react';
import PriceChart from '../components/PriceChart';
import { Candle, Indicators } from '../types';
import { COLOR_BUY, COLOR_SELL } from '../constants';

describe('PriceChart focused rendering', () => {
  it('renders Cells with expected fill colors for volume and macd histogram', () => {
    const data: Candle[] = [
      { time: '2025-12-20', open: 100, high: 110, low: 99, close: 110, volume: 1_500_000, macd_line: 1, macd_signal: 0.5, macd_hist: 0.5, rsi: 60 },
      { time: '2025-12-21', open: 110, high: 115, low: 108, close: 105, volume: 800, macd_line: -1, macd_signal: -0.5, macd_hist: -0.5, rsi: 40 },
    ];

    const indicators: Indicators = {
      rsi_14: 50,
      macd: { line: 0, signal: 0, histogram: 0 },
      atr_14: 0,
      sma: { sma_20: 105, sma_50: 100 },
      bbands: { upper: 0, middle: 0 },
    };

    const { container } = render(<PriceChart data={data} indicators={indicators} />);

    // expected fills produced by PriceChart mapping
    const buyVolFill = `${COLOR_BUY}66`;
    const sellVolFill = `${COLOR_SELL}66`;
    const buyMacdFill = `${COLOR_BUY}88`;
    const sellMacdFill = `${COLOR_SELL}88`;

    // Query for elements with those fill attributes (SVG cells)
    // The rendering backend may not expose rects with exact attributes in tests,
    // so assert that the generated markup contains the expected color strings.
    const html = container.innerHTML;
    expect(html).toContain(buyVolFill);
    expect(html).toContain(sellVolFill);
    expect(html).toContain(buyMacdFill);
    expect(html).toContain(sellMacdFill);
  });
});
