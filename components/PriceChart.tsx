
import * as React from 'react';
import { COLOR_HOLD, COLOR_BUY, COLOR_SELL } from '../constants';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Candle, Indicators } from '../types';

interface PriceChartProps {
  data: Candle[];
  indicators: Indicators;
}

const PriceChart: React.FC<PriceChartProps> = React.memo(({ data, indicators }) => {
  const chartData = data.map((d, i) => ({
    ...d,
    sma20: i > 15 ? indicators.sma.sma_20 : null,
    sma50: i > 30 ? indicators.sma.sma_50 : null,
    rsi: d.rsi ?? (i === data.length - 1 ? indicators.rsi_14 : null),
    volColor: d.close >= d.open ? `${COLOR_BUY}66` : `${COLOR_SELL}66`,
    macdLine: d.macd_line ?? null,
    macdSignal: d.macd_signal ?? null,
    macdHist: d.macd_hist ?? null,
    macdHistColor: (d.macd_hist ?? 0) >= 0 ? `${COLOR_BUY}88` : `${COLOR_SELL}88`,
  }));

  const formatPrice = (value: number) => `$${(value ?? 0).toFixed(1)}`;
  const formatVolume = (value: number) => {
    if (!value) return "0";
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toString();
  };

  const formatDate = (str: string) => {
    try {
      const date = new Date(str);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch { return str; }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/95 border border-zinc-800 p-4 rounded-xl shadow-2xl backdrop-blur-md z-50 ring-1 ring-white/10">
          <p className="font-bold text-zinc-500 text-[11px] mb-3 border-b border-zinc-800 pb-2 tracking-wide">{formatDate(label)}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between gap-8 items-center">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-zinc-600 text-[10px] font-bold tracking-tight">{entry.name}:</span>
                </div>
                <span className={`font-bold tabular-nums text-xs`} style={{ color: entry.color || 'white' }}>
                  {entry.name === 'Volume' ? formatVolume(entry.value) : 
                   entry.name === 'Price' ? formatPrice(entry.value) : 
                   (entry.value ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[800px] flex flex-col font-mono bg-gradient-to-br from-black via-zinc-900/80 to-[#020204] rounded-2xl shadow-2xl border border-cyan-400/10 backdrop-blur-xl">
      <div className="h-[45%] w-full relative group">
        <div className="absolute top-2 left-8 z-10 text-[10px] font-bold text-cyan-400 tracking-wide bg-black/60 px-2 py-1 border border-cyan-400/20 rounded shadow-md animate-fade-in">Price Execution // Sma Ribbon</div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} syncId="stockSync" margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} strokeOpacity={0.5} />
            <XAxis dataKey="time" hide />
            <YAxis 
              yAxisId="price"
              stroke="#3f3f46" 
              tick={{ fontSize: 9, fill: '#52525b', fontWeight: 900 }} 
              orientation="right" 
              tickFormatter={formatPrice}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              label={{ value: 'Price (Usd)', angle: 90, position: 'insideRight', style: { fill: '#3f3f46', fontSize: 9, fontWeight: 700, textAnchor: 'middle' }, offset: -10 }}
            />
            <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: '#ffb800', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Area yAxisId="price" type="monotone" dataKey="close" name="Price" stroke="#ffffff" strokeWidth={2} fillOpacity={0.05} fill="#ffffff" isAnimationActive={false} />
            <Line yAxisId="price" type="monotone" dataKey="sma20" name="Sma 20" stroke="#fbbf24" strokeWidth={1} dot={false} isAnimationActive={false} strokeDasharray="5 5" />
            <Line yAxisId="price" type="monotone" dataKey="sma50" name="Sma 50" stroke="#8b5cf6" strokeWidth={1} dot={false} isAnimationActive={false} strokeDasharray="5 5" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="h-[30%] w-full relative border-t border-cyan-400/10">
        <div className="absolute top-2 left-8 z-10 text-[10px] font-bold text-cyan-400 tracking-wide bg-black/60 px-2 py-1 border border-cyan-400/20 rounded shadow-md flex gap-4 animate-fade-in">
          <span className="text-[#3b82f6]">Macd (Right)</span>
          <span className="text-cyan-400/40">|</span>
          <span className="text-[#00ff9d]">Rsi (Left)</span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} syncId="stockSync" margin={{ top: 20, right: 30, left: 30, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} strokeOpacity={0.5} />
            <XAxis dataKey="time" hide />
            <YAxis 
              yAxisId="macd"
              stroke="#3f3f46" 
              tick={{ fontSize: 9, fill: '#3b82f6', fontWeight: 900 }} 
              orientation="right" 
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              label={{ value: 'Macd', angle: 90, position: 'insideRight', style: { fill: '#3f3f46', fontSize: 9, fontWeight: 700, textAnchor: 'middle' }, offset: -10 }}
            />
            <YAxis 
              yAxisId="rsi"
              stroke="#3f3f46" 
              tick={{ fontSize: 9, fill: '#00ff9d', fontWeight: 900 }} 
              orientation="left" 
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              label={{ value: 'Rsi (14)', angle: -90, position: 'insideLeft', style: { fill: '#3f3f46', fontSize: 9, fontWeight: 700, textAnchor: 'middle' }, offset: -10 }}
            />
            <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: '#ffb800', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <ReferenceLine yAxisId="macd" y={0} stroke="#3f3f46" strokeWidth={1} strokeOpacity={0.3} />
            <ReferenceLine yAxisId="rsi" y={70} stroke="#ff2e63" strokeDasharray="3 3" strokeOpacity={0.5} label={{ position: 'left', value: '70', fill: '#ff2e63', fontSize: 8, fontWeight: 700 }} />
            <ReferenceLine yAxisId="rsi" y={30} stroke="#00ff9d" strokeDasharray="3 3" strokeOpacity={0.5} label={{ position: 'left', value: '30', fill: '#00ff9d', fontSize: 8, fontWeight: 700 }} />
            <Bar yAxisId="macd" dataKey="macdHist" name="Macd Hist" isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.macdHistColor} fillOpacity={0.2} />
              ))}
            </Bar>
            <Line yAxisId="macd" type="monotone" dataKey="macdLine" name="Macd Line" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line yAxisId="macd" type="monotone" dataKey="macdSignal" name="Signal" stroke="#f43f5e" strokeWidth={1} dot={false} isAnimationActive={false} strokeDasharray="3 3" />
            <Line yAxisId="rsi" type="monotone" dataKey="rsi" name="Rsi" stroke="#00ff9d" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div className="h-[25%] w-full relative border-t border-cyan-400/10">
        <div className="absolute top-2 left-8 z-10 text-[10px] font-bold text-cyan-400 tracking-wide bg-black/60 px-2 py-1 border border-cyan-400/20 rounded shadow-md animate-fade-in">Volume Delta // Accumulation</div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} syncId="stockSync" margin={{ top: 10, right: 30, left: 30, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} strokeOpacity={0.5} />
            <XAxis 
              dataKey="time" 
              stroke="#3f3f46" 
              tick={{ fontSize: 9, fill: '#52525b', fontWeight: 900 }} 
              tickFormatter={formatDate}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              stroke="#3f3f46" 
              tick={{ fontSize: 9, fill: '#52525b', fontWeight: 900 }} 
              orientation="right" 
              tickFormatter={formatVolume}
              axisLine={false}
              tickLine={false}
              domain={[0, 'auto']}
              label={{ value: 'Volume', angle: 90, position: 'insideRight', style: { fill: '#3f3f46', fontSize: 9, fontWeight: 700, textAnchor: 'middle' }, offset: -10 }}
            />
            <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: '#ffb800', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Bar dataKey="volume" name="Volume" isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-vol-${index}`} fill={entry.volColor} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default PriceChart;
