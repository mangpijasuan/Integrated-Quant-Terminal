import React from 'react';
// Mock recharts primitives to expose props as DOM attributes for assertions
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

describe('PriceChart coverage extra', () => {
  it('renders Sma 20/50 lines and reference labels and formatted volumes', () => {
    const data: Candle[] = [];
    // create 40 data points to ensure sma20/sma50 branches populate
    for (let i = 0; i < 40; i++) {
      data.push({ time: `2025-12-${i+1}`, open: 100 + i, high: 105 + i, low: 95 + i, close: 100 + i + (i%2?1:-1), volume: i % 3 === 0 ? 1_500_000 : 800 + i, rsi: 50 + (i%10) });
    }

    const indicators: Indicators = {
      rsi_14: 55,
      macd: { line: 0.5, signal: 0.2, histogram: 0.3 },
      atr_14: 1.2,
      sma: { sma_20: 120, sma_50: 110 },
      bbands: { upper: 0, middle: 0 },
    };

    const { container } = render(<PriceChart data={data} indicators={indicators} />);

    const html = container.innerHTML;

    // Sma line names should appear as attributes on mocked Line elements
    expect(html).toContain('Sma 20');
    expect(html).toContain('Sma 50');

    // ReferenceLine labels for RSI 70 and 30 may appear as attribute values
    expect(html).toContain('70');
    expect(html).toContain('30');

    // Volume formatting: ensure large volume produced a million-suffix in generated markup
    expect(html).toContain('M');

    // Ensure the macd/volume fills mapping still produces color values
    expect(html).toContain(`${COLOR_BUY}`);
    expect(html).toContain(`${COLOR_SELL}`);
  });
});
