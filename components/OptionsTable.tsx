
import React, { useState, useMemo } from 'react';
import { OptionContract, OptionType } from '../types';

interface OptionsTableProps {
  options: OptionContract[];
}

const OptionsTable: React.FC<OptionsTableProps> = ({ options }) => {
  const [filterType, setFilterType] = useState<'all' | OptionType.call | OptionType.put>('all');

  const filteredOptions = useMemo(() => {
    if (filterType === 'all') return options;
    return options.filter(o => o.type === filterType);
  }, [options, filterType]);

  if (!options.length) return <div className="text-zinc-600 text-xs italic py-8">No option data available for this stream.</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        {(['all', OptionType.call, OptionType.put] as const).map(t => (
          <button 
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider transition-all ${filterType === t ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500'}`}
          >
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}s
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-zinc-600 font-bold tracking-wider border-b border-zinc-800">
            <tr>
              <th className="pb-4">Strike</th>
              <th className="pb-4">Price</th>
              <th className="pb-4">Expiry</th>
              <th className="pb-4">Iv</th>
              <th className="pb-4">Delta</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {filteredOptions.slice(0, 10).map((opt, i) => (
              <tr key={i} className="border-b border-zinc-900/50 hover:bg-zinc-900/20">
                <td className="py-3 font-bold text-white">${opt.strike}</td>
                <td className="py-3 tabular-nums text-zinc-400">${opt.lastPrice.toFixed(2)}</td>
                <td className="py-3 text-[10px] font-bold">{opt.expiry}</td>
                <td className="py-3 text-zinc-500">{(opt.iv * 100).toFixed(1)}%</td>
                <td className={`py-3 font-bold ${opt.delta > 0 ? 'text-green-500' : 'text-rose-500'}`}>{opt.delta.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OptionsTable;
