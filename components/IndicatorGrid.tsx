
import React from 'react';
import { Indicators } from '../types';

interface IndicatorGridProps {
  indicators?: Indicators;
}

const IndicatorGrid: React.FC<IndicatorGridProps> = ({ indicators }) => {
  const Metric = ({ label, value, sub, color }: { label: string, value: string | number, sub?: string, color?: string }) => (
    <div className="glass-card p-6 bg-zinc-950/30">
      <div className="text-zinc-600 text-[11px] font-bold tracking-wide mb-4 flex items-center gap-2">
         <span className={`w-1 h-1 rounded-full ${color || 'bg-zinc-800'}`}></span>
         {label}
      </div>
      <div className="text-2xl font-black text-white font-mono tabular-nums">{value}</div>
      {sub && (
        <div className={`text-[10px] font-bold mt-2 tracking-wide ${sub.toLowerCase().includes('over') ? 'text-[#ffb800]' : 'text-zinc-600'}`}>
          {sub}
        </div>
      )}
    </div>
  );

  const rsi = indicators?.rsi_14 ?? 50;
  const macd = indicators?.macd?.line ?? 0;
  const sig = indicators?.macd?.signal ?? 0;
  const atr = indicators?.atr_14 ?? 0;
  const sma20 = indicators?.sma?.sma_20 ?? 0;
  const sma50 = indicators?.sma?.sma_50 ?? 0;

  return (
    <div className="grid grid-cols-2 gap-4">
      <Metric 
        label="Rsi (14)" 
        value={rsi.toFixed(1)} 
        sub={rsi > 70 ? 'Overbought Warn' : rsi < 30 ? 'Oversold Opp' : 'Stable Range'} 
        color={rsi > 70 ? 'bg-[#ff2e63]' : rsi < 30 ? 'bg-[#00ff9d]' : 'bg-zinc-800'}
      />
      <Metric 
        label="Macd Line" 
        value={macd.toFixed(2)} 
        sub={`Signal: ${sig.toFixed(2)}`} 
        color="bg-blue-500"
      />
      <Metric 
        label="Volatility Atr" 
        value={atr.toFixed(2)} 
        sub="Dynamic Risk Index" 
        color="bg-[#ffb800]"
      />
      <Metric 
        label="Ribbon Sma" 
        value={`${sma20.toFixed(0)}/${sma50.toFixed(0)}`} 
        sub="Trend Confluence" 
        color="bg-purple-500"
      />
    </div>
  );
};

export default IndicatorGrid;
