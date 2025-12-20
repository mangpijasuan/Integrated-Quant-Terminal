
import React from 'react';
import { MarketIndex } from '../types';

interface TickerTapeProps {
  indices?: MarketIndex[];
}

const TickerTape: React.FC<TickerTapeProps> = ({ indices }) => {
  const displayIndices = indices && indices.length > 0 ? indices : [
    { name: 'SPX', value: '...', change: '...', up: true },
    { name: 'CCMP', value: '...', change: '...', up: true },
    { name: 'INDU', value: '...', change: '...', up: false },
    { name: 'VIX', value: '...', change: '...', up: false },
    { name: 'XBT', value: '...', change: '...', up: true },
  ];

  return (
    <div className="w-full bg-zinc-950 border-b border-zinc-800 h-11 overflow-hidden flex items-center whitespace-nowrap z-[100] sticky top-0">
      <div className="flex animate-[ticker_60s_linear_infinite] gap-14 px-14 items-center">
        {[...displayIndices, ...displayIndices, ...displayIndices].map((idx, i) => (
          <div key={i} className="flex gap-3 items-center font-mono text-[12px] uppercase font-bold tracking-tight">
            <span className="text-zinc-600">{idx.name} Index</span>
            <span className="text-white tabular-nums">{idx.value}</span>
            <span className={idx.up ? 'text-[#00ff00]' : 'text-[#ff0000]'}>
              {idx.up ? '▲' : '▼'} {idx.change}
            </span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
      `}</style>
    </div>
  );
};

export default TickerTape;
