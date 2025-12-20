import React, { RefObject } from 'react';

interface TerminalLogProps {
  logs: string[];
  logEndRef: RefObject<HTMLDivElement>;
}

const TerminalLog: React.FC<TerminalLogProps> = ({ logs, logEndRef }) => (
  <div className="glass-card flex-1 p-8 bg-zinc-950/40 flex flex-col border-[#ffb800]/10 animate-in fade-in duration-500 overflow-hidden shadow-[0_8px_40px_#ffb80022] backdrop-blur-2xl">
    <div className="flex justify-between items-center mb-10 border-b border-zinc-900 pb-6">
      <h3 className="text-sm font-bold text-zinc-500 tracking-wide flex items-center gap-2">
        <span className="neon-dot bg-[#ffb800] animate-pulse w-2 h-2 rounded-full shadow-[0_0_8px_#ffb800]" />
        Centralized Memory Stack
      </h3>
      <span className="text-[10px] font-bold text-[#ffb800]">Crc: Ok X86 64</span>
    </div>
    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 font-mono text-[11px] pr-4">
      {logs.map((log, i) => (
        <div key={i} className="flex gap-6 group">
          <span className="text-zinc-800 font-bold w-12 shrink-0">[{i.toString().padStart(3, '0')}]</span>
          <span className="text-[#ffb800]/70 group-hover:text-white transition-colors break-all animate-glow-text">{log}</span>
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
    <style>{`
      .animate-glow-text {
        text-shadow: 0 0 8px #ffb80044, 0 0 2px #ffb80022;
        transition: text-shadow 0.3s;
      }
      .neon-dot {
        box-shadow: 0 0 12px #ffb800, 0 0 24px #ffb80044;
      }
    `}</style>
  </div>
);

export default TerminalLog;
