
import React from 'react';
import { SentimentSymbol, Recommendation } from '../types';

interface StockCardProps {
  data: SentimentSymbol;
  variant?: 'news' | 'trending';
  onClick?: (symbol: string) => void;
}

const StockCard: React.FC<StockCardProps> = ({ data, variant = 'news', onClick }) => {
  const isBullish = data.recommendation === Recommendation.Buy;
  const isBearish = data.recommendation === Recommendation.Sell;
  
  const accentColor = isBullish ? 'text-[#00ff9d]' : isBearish ? 'text-[#ff2e63]' : 'text-[#ffb800]';
  const bgGlow = isBullish ? 'group-hover:bg-[#00ff9d]/5' : isBearish ? 'group-hover:bg-[#ff2e63]/5' : 'group-hover:bg-[#ffb800]/5';

  return (
    <div 
      className={`glass-card p-8 flex flex-col h-64 justify-between transition-all group cursor-pointer relative overflow-hidden ${bgGlow}`} 
      onClick={() => onClick?.(data.symbol)}
    >
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-black border border-zinc-800 rounded-xl flex items-center justify-center group-hover:border-[#ffb800]/30 transition-colors">
               <span className="text-[#ffb800] font-black text-xl font-mono">{data.symbol?.[0] || '?'}</span>
            </div>
            <div>
              <h4 className="text-2xl font-black text-white font-mono tracking-tighter uppercase group-hover:text-[#ffb800] transition-colors">{data.symbol}</h4>
              <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Asset_Stream</span>
            </div>
          </div>
          <div className="text-right">
             <div className={`text-2xl font-black font-mono tabular-nums ${accentColor}`}>{(data.dominancePercent ?? 0).toFixed(0)}%</div>
             <div className="text-[8px] text-zinc-800 font-black uppercase tracking-widest">Confidence</div>
          </div>
        </div>

        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed italic line-clamp-2 opacity-60 group-hover:opacity-100 transition-opacity">
          "{data.possibleReason || 'Scanning market logic...'}"
        </p>
      </div>
      
      <div className="relative z-10 flex items-center justify-between mt-6 pt-6 border-t border-zinc-900">
        <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-black rounded border border-zinc-800 ${accentColor}`}>
          {data.recommendation ?? Recommendation.Hold}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-zinc-700 font-black uppercase tracking-tighter">Volume_M</span>
          <span className="text-xs font-black text-zinc-400 font-mono">{((data.totalVolume ?? 0) / 1000000).toFixed(1)}M</span>
        </div>
      </div>

      <div className="absolute top-0 right-0 p-2 opacity-5">
         <div className="text-4xl font-black font-mono">{data.symbol}</div>
      </div>
    </div>
  );
};

export default StockCard;
