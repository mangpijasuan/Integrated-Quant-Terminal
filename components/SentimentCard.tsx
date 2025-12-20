
import React from 'react';
import { SentimentSymbol, Recommendation } from '../types';
import { COLOR_BUY, COLOR_SELL, COLOR_HOLD } from '../constants';

interface SentimentCardProps {
  data: SentimentSymbol;
  type?: 'bullish' | 'bearish' | 'balanced';
  onClick?: (symbol: string) => void;
}

const SentimentCard: React.FC<SentimentCardProps> = React.memo(({ data, type, onClick }) => {
  const action = data.recommendation ?? Recommendation.Hold;
  const isBuy = action === Recommendation.Buy;
  const isSell = action === Recommendation.Sell;
  
  const accentColor = isBuy ? `text-[${COLOR_BUY}]` : isSell ? `text-[${COLOR_SELL}]` : `text-[${COLOR_HOLD}]`;
  const bgColor = isBuy ? `bg-[${COLOR_BUY}]` : isSell ? `bg-[${COLOR_SELL}]` : `bg-[${COLOR_HOLD}]`;
  const borderColor = isBuy ? `border-[${COLOR_BUY}]` : isSell ? `border-[${COLOR_SELL}]` : `border-[${COLOR_HOLD}]`;
  const glowShadow = isBuy ? `shadow-[${COLOR_BUY}]/10` : isSell ? `shadow-[${COLOR_SELL}]/10` : `shadow-[${COLOR_HOLD}]/10`;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div
      onClick={() => onClick?.(data.symbol)}
      className={`backdrop-blur-xl bg-gradient-to-br from-black/70 via-zinc-900/60 to-black/80 border-l-4 ${borderColor} ${glowShadow} shadow-[0_4px_32px_0_rgba(0,255,160,0.08)] hover:shadow-[0_8px_48px_0_rgba(0,255,160,0.18)] transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col h-full rounded-2xl`}
      style={{ boxShadow: isBuy ? `0 0 24px 2px ${COLOR_BUY}44` : isSell ? `0 0 24px 2px ${COLOR_SELL}44` : `0 0 24px 2px ${COLOR_HOLD}44` }}
    >
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase">Signal Id: {data.symbol}</span>
              <div className={`w-2 h-2 rounded-full animate-pulse ${bgColor}`}></div>
            </div>
            <h3 className="text-6xl font-black text-white tracking-tighter leading-none group-hover:text-[#ffb800] transition-colors font-mono drop-shadow-[0_2px_16px_rgba(0,255,160,0.15)] animate-pulse-slow">
              {data.symbol}
            </h3>
            <div className="flex items-center gap-2 mt-4 text-zinc-500 font-mono text-xs font-bold">
              <span className="uppercase tracking-tighter">Volume:</span>
              <span className="text-white tabular-nums">{formatCurrency(data.totalVolume)}</span>
            </div>
          </div>
          
           <div className={`px-6 py-3 rounded-bl-2xl absolute top-0 right-0 ${bgColor} text-black font-black text-xl tracking-tighter shadow-xl shadow-black/50 animate-fade-in`}
                style={{ filter: 'drop-shadow(0 0 8px #00ff9d88)' }}>
             {action === Recommendation.Buy ? 'Buy Signal' : action === Recommendation.Sell ? 'Sell Signal' : 'Hold Pattern'}
           </div>
        </div>

        <div className="flex-1 mb-10">
          <div className="text-[10px] text-zinc-600 font-bold tracking-widest mb-3 uppercase">Neural Synthesis</div>
          <p className="text-sm text-zinc-300 leading-relaxed font-medium italic border-l-2 border-cyan-400/30 pl-6 py-2 group-hover:border-[#00ff9d]/60 transition-colors animate-fade-in">
            "{data.possibleReason || 'Processing institutional order flow for multi-layer signal confluence...'}"
          </p>
        </div>

        <div className="mt-auto pt-8 border-t border-zinc-900/80 space-y-6">
          <div className="flex justify-between items-end">
            <div className="flex-1">
               <div className="flex justify-between text-[10px] font-bold text-zinc-700 tracking-widest mb-3 uppercase">
                 <span>Confidence Matrix</span>
                 <span className={accentColor}>{data.dominancePercent}%</span>
               </div>
               <div className="h-1.5 w-full bg-gradient-to-r from-cyan-900/60 to-zinc-900 rounded-full overflow-hidden">
                 <div
                   className={`h-full ${bgColor} transition-all duration-1000 shadow-[0_0_16px_currentColor] animate-glow-bar`}
                   style={{ width: `${data.dominancePercent}%` }}
                 ></div>
               </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] font-bold tracking-widest text-zinc-800 uppercase">
             <div className="flex items-center gap-2">
                <span className="text-zinc-600">Source Node:</span>
                <span className="text-zinc-400">L1 Alpha</span>
             </div>
             <span className={`${accentColor} font-mono font-black`}>{(data.priceChangePercent ?? 0) >= 0 ? '+' : ''}{(data.priceChangePercent ?? 0).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-[-15%] right-[-5%] p-2 opacity-[0.06] select-none pointer-events-none rotate-12 scale-125 blur-[2px]">
        <div className="text-[12rem] font-black font-mono tracking-tighter text-cyan-400/40 animate-fade-in">{data.symbol}</div>
      </div>
    </div>
  );
});

export default SentimentCard;
