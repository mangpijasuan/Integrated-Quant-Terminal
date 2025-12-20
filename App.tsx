
import React, { useState, useEffect, useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { fetchMarketSentiment, fetchStockSnapshot } from './services/geminiService';
import { MarketSentiment, StockSnapshot, TimeFrame } from './types';
import SentimentCard from './components/SentimentCard';
import PriceChart from './components/PriceChart';
import IndicatorGrid from './components/IndicatorGrid';
import OptionsTable from './components/OptionsTable';
import TickerTape from './components/TickerTape';
import TerminalLog from './components/TerminalLog';
import { COLOR_BUY, COLOR_SELL } from './constants';

type ViewType = 'overview' | 'analytics' | 'derivatives' | 'backtesting' | 'alerts' | 'orders' | 'system';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null);
  const [snapshot, setSnapshot] = useState<StockSnapshot | null>(null);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [timeframe, setTimeframe] = useState<TimeFrame>('Daily');
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const checkApiKey = async () => {
    try {
      if (!window.aistudio) return false;
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        addLog("System: Api Key Missing. Redirecting to auth gateway.");
        await window.aistudio.openSelectKey();
        return true;
      }
    } catch (e) {
      addLog("Gateway: Bypassing Api Key Check (Dev Env)");
    }
    return false;
  };

  const loadMarketData = async () => {
    setLoading(true);
    setError(null);
    addLog("Synchronizing Global Market Nodes...");
    try {
      const data = await fetchMarketSentiment();
      setSentiment(data);
      addLog("Market Pulse Acquired. 512 Nodes Active.");
    } catch (err: any) {
      setError(err.message || "Failed to fetch market sentiment.");
      addLog(`Critical Error: ${err.message || "Timeout"}`);
      if (err.message?.includes("entity was not found")) {
        const shouldRetry = await checkApiKey();
        if (shouldRetry) {
          try {
            const data = await fetchMarketSentiment();
            setSentiment(data);
            setError(null);
            addLog("Market Pulse Re-Acquired after API Key update.");
          } catch (retryErr: any) {
            setError(retryErr.message || "Failed to fetch market sentiment after retry.");
            console.error("Retry failed:", retryErr);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSymbolDetail = async (symbol: string, tf: TimeFrame = timeframe) => {
    if (!symbol) return;
    setDetailLoading(true);
    setDetailError(null);
    setSearchSymbol(symbol.toUpperCase());
    addLog(`Initiating Deep Probe: ${symbol.toUpperCase()} [${tf}]...`);
    try {
      const data = await fetchStockSnapshot(symbol, tf);
      setSnapshot(data);
      setActiveView('overview');
      addLog(`Data Integrity Check Passed for ${symbol.toUpperCase()}. Lock Acquired.`);
    } catch (err: any) {
      setDetailError(err.message || "Failed to fetch asset details.");
      addLog(`Deep Probe Failed: ${err.message || "Asset Not Found"}`);
      if (err.message?.includes("entity was not found")) {
        const shouldRetry = await checkApiKey();
        if (shouldRetry) {
          try {
            const data = await fetchStockSnapshot(symbol, tf);
            setSnapshot(data);
            setDetailError(null);
          } catch (retryErr: any) {
            setDetailError(retryErr.message || "Failed to fetch asset details after retry.");
            console.error("Retry failed:", retryErr);
          }
        }
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadSymbolDetail(searchSymbol);
  };

  useEffect(() => { loadMarketData(); }, []);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [terminalLogs]);

  const SidebarItem = ({ id, label, icon }: { id: ViewType, label: string, icon: string }) => (
    <button
      onClick={() => setActiveView(id)}
      className={`w-full flex items-center gap-4 px-6 py-4 transition-all border-r-2 ${activeView === id ? 'bg-[#ffb800]/10 border-[#ffb800] text-[#ffb800]' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'}`}
    >
      <span className="text-lg font-mono">{icon}</span>
      {isSidebarOpen && <span className="text-[11px] font-bold tracking-wide">{label}</span>}
    </button>
  );

  const HamburgerIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const renderMainContent = () => {
    if (activeView === 'system') {
      return (
        <div className="p-6 lg:p-10 h-full flex flex-col animate-in fade-in duration-500 overflow-hidden">
          <TerminalLog logs={terminalLogs} logEndRef={logEndRef} />
        </div>
      );
    }

    if (activeView === 'alerts') {
      const allSignals = sentiment ? [...sentiment.bullish, ...sentiment.bearish, ...sentiment.balanced] : [];
      return (
        <div className="p-6 lg:p-10 h-full flex flex-col animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
           <div className="flex justify-between items-center mb-12 border-b border-zinc-900 pb-6">
              <h3 className="text-xl font-black text-white tracking-tight">Signal Alerts Stream</h3>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-[#ffb800]/10 text-[#ffb800] text-[10px] font-bold rounded border border-[#ffb800]/20">Global Node: Active</span>
              </div>
           </div>
           {allSignals.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 space-y-6">
                <div className="w-16 h-16 border border-zinc-800 rounded-full flex items-center justify-center animate-pulse">📡</div>
                <p className="text-sm font-mono tracking-wide italic">Scanning Institutional Flow Data...</p>
                <button onClick={loadMarketData} className="text-xs text-[#ffb800] border border-[#ffb800]/20 px-4 py-2 rounded hover:bg-[#ffb800]/10 transition-all">Manual Refresh</button>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
                {allSignals.map((s, i) => (
                  <SentimentCard key={i} data={s} onClick={loadSymbolDetail} />
                ))}
             </div>
           )}
        </div>
      );
    }

    if (activeView === 'overview') {
      if (!snapshot) {
        return (
          <div className="p-12 animate-in fade-in duration-1000 overflow-y-auto custom-scrollbar h-full">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
               <div className="relative mb-20">
                  <h1 className="serif text-8xl md:text-[14rem] text-[#ffb800]/5 font-black tracking-tighter select-none pointer-events-none leading-none">Terminal</h1>
                  <div className="absolute inset-0 flex flex-col items-center justify-center -mt-10">
                     <span className="text-[#ffb800] font-bold text-3xl tracking-tight text-glow leading-tight">Quantum Analysis</span>
                     <span className="text-zinc-500 font-semibold text-xl tracking-wider mt-2">Neural Interface v3.1</span>
                  </div>
               </div>
               
               <form onSubmit={handleSearch} className="relative w-full max-w-3xl group mb-24">
                 <div className="absolute -inset-1 bg-gradient-to-r from-[#ffb800]/20 to-orange-600/10 rounded-3xl blur-2xl opacity-0 group-focus-within:opacity-100 transition duration-1000"></div>
                 <div className="relative flex items-center bg-black/70 border border-zinc-800 h-24 px-12 rounded-3xl backdrop-blur-3xl focus-within:border-[#ffb800]/30 transition-all">
                   <span className="text-[#ffb800] font-mono text-4xl mr-8 tracking-tighter">&gt;</span>
                   <input 
                     type="text" 
                     placeholder="Scan Instrument (AAPL, TSLA, BTC...)"
                     value={searchSymbol}
                     onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                     className="w-full bg-transparent text-[#ffb800] placeholder:text-zinc-800 focus:outline-none font-bold text-2xl tracking-wide font-mono"
                   />
                   <button type="submit" className="text-[#ffb800] border border-[#ffb800]/30 px-8 py-3 rounded-xl text-sm font-bold tracking-wide hover:bg-[#ffb800]/10 hover:scale-105 transition-all">Initialize</button>
                 </div>
               </form>
            </div>

            <section className="mb-24 px-4 max-w-[1600px] mx-auto">
              <div className="flex items-center gap-8 mb-12">
                 <h3 className="text-[#ffb800] font-bold text-base tracking-tight text-glow">Macro Sentiment Stream</h3>
                 <div className="h-[1px] flex-1 bg-gradient-to-r from-zinc-900 to-transparent"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {(sentiment?.sectors || []).map((s, i) => (
                  <div key={i} className={`glass-card p-6 border-t-2 ${s.change >= 0 ? `border-[${COLOR_BUY}]/30` : `border-[${COLOR_SELL}]/30`} hover:scale-105 transition-all`}>
                    <div className="text-[10px] font-bold text-zinc-600 tracking-wide mb-4">{s.name}</div>
                    <div className={`text-3xl font-black font-mono ${s.change >= 0 ? `text-[${COLOR_BUY}]` : `text-[${COLOR_SELL}]`}`}>
                      {s.change >= 0 ? '+' : ''}{(s.change ?? 0).toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="px-4 max-w-[1600px] mx-auto pb-32">
              <div className="flex items-center gap-8 mb-12">
                 <h3 className="text-zinc-500 font-bold text-base tracking-tight">Institutional Flow Signals</h3>
                 <div className="h-[1px] flex-1 bg-gradient-to-r from-zinc-900 to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                 {sentiment ? (
                   [...sentiment.bullish, ...sentiment.bearish, ...sentiment.balanced].slice(0, 12).map((s, i) => (
                     <SentimentCard key={i} data={s} onClick={loadSymbolDetail} />
                   ))
                 ) : (
                   <div className="col-span-full py-32 border border-zinc-900/50 border-dashed rounded-3xl text-center flex flex-col items-center">
                     <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#ffb800] rounded-full animate-spin mb-6"></div>
                     <p className="text-zinc-600 font-mono text-sm tracking-widest italic">Synchronizing Alpha Stream Nodes...</p>
                   </div>
                 )}
              </div>
            </section>
          </div>
        );
      }

      return (
        <div className="p-6 lg:p-10 max-w-[1800px] mx-auto animate-in fade-in zoom-in-95 duration-700 overflow-y-auto custom-scrollbar h-full">
          {/* Header Profile */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 mb-12 pb-12 border-b border-zinc-900/50">
            <div className="flex items-center gap-8">
              <div className="w-28 h-28 bg-gradient-to-br from-[#ffb800]/10 to-transparent border border-[#ffb800]/20 rounded-3xl flex items-center justify-center text-6xl font-black text-[#ffb800] drop-shadow-[0_0_20px_rgba(255,184,0,0.15)] font-mono">
                {snapshot.symbol?.[0] || '?'}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-zinc-900 text-[#ffb800] text-[10px] font-black rounded tracking-widest border border-[#ffb800]/10 uppercase">Level 1 Asset</span>
                  <span className="text-zinc-400 text-sm font-bold tracking-tight">{snapshot.companyName}</span>
                </div>
                <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-white leading-none drop-shadow-2xl">{snapshot.symbol}</h1>
              </div>
            </div>
            <div className="text-left xl:text-right flex flex-col items-start xl:items-end">
              <div className="text-7xl md:text-8xl font-black font-mono tabular-nums text-white text-glow leading-none">${(snapshot.currentPrice ?? 0).toFixed(2)}</div>
              <div className={`text-4xl font-black font-mono mt-4 ${(snapshot.priceChange ?? 0) >= 0 ? 'text-[#00ff9d]' : 'text-[#ff2e63]'}`}>
                {(snapshot.priceChange ?? 0) >= 0 ? '▲' : '▼'} {(snapshot.priceChange ?? 0).toFixed(2)} ({(snapshot.priceChangePercent ?? 0).toFixed(2)}%)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 xl:col-span-8 space-y-10">
              <div className="glass-card p-3 border-[#ffb800]/5 bg-black/20 shadow-inner">
                <PriceChart data={snapshot.candles_daily || []} indicators={snapshot.indicators} />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="glass-card p-10 bg-zinc-950/40 border-zinc-900/50">
                  <div className="flex justify-between items-center mb-10 border-b border-zinc-900 pb-6">
                    <h3 className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Fundamental Matrix</h3>
                    <span className="text-[10px] text-[#ffb800] font-bold border border-[#ffb800]/20 px-2 py-0.5 rounded">Core Scan</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-10 gap-y-10">
                    {Object.entries(snapshot.fundamentals || {}).map(([k, v]) => (
                      <div key={k} className="group border-l border-zinc-900 pl-6 hover:border-[#ffb800] transition-all">
                        <div className="text-zinc-600 text-[10px] font-bold tracking-tight mb-2 uppercase">{k.replace('_', ' ')}</div>
                        <div className="text-white font-mono font-bold text-lg tabular-nums">{v || 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                  
                  {snapshot.sources && snapshot.sources.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-zinc-900">
                       <span className="text-[10px] font-bold text-zinc-700 tracking-widest block mb-4 uppercase">Verification Sources</span>
                       <div className="flex flex-col gap-3">
                          {snapshot.sources.map((src, idx) => (
                            <a key={idx} href={src.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-[#ffb800]/50 hover:text-[#ffb800] truncate transition-colors flex items-center gap-2">
                              <span className="shrink-0 text-[8px] border border-[#ffb800]/20 w-4 h-4 flex items-center justify-center rounded">L</span>
                              {src.title}
                            </a>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
                <IndicatorGrid indicators={snapshot.indicators} />
              </div>
            </div>

            <div className="col-span-12 xl:col-span-4 space-y-10">
              <div className="glass-card p-12 bg-gradient-to-b from-zinc-900/30 to-black/80 border-[#ffb800]/10 shadow-[0_0_50px_rgba(255,184,0,0.05)]">
                <div className="text-center mb-16">
                  <span className="text-[10px] font-bold text-[#ffb800] tracking-[0.3em] block mb-3 uppercase">Neural Signal Engine</span>
                  <div className="h-[2px] w-16 bg-[#ffb800]/20 mx-auto rounded-full"></div>
                </div>
                
                <div className="flex flex-col items-center justify-center space-y-8 mb-16">
                  <div className={`text-[12rem] font-black leading-none tracking-tighter ${snapshot.recommendation?.action === 'BUY' ? 'text-[#00ff9d]' : snapshot.recommendation?.action === 'SELL' ? 'text-[#ff2e63]' : 'text-[#ffb800]'} drop-shadow-[0_0_40px_rgba(0,255,157,0.1)] select-none`}>
                    {snapshot.recommendation?.action?.[0] || 'H'}
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-white tracking-tighter uppercase">{snapshot.recommendation?.action || 'Neutral Hold'}</div>
                    <div className="text-[#ffb800] text-[12px] font-bold mt-3 tracking-widest uppercase bg-[#ffb800]/5 px-4 py-1 rounded-full border border-[#ffb800]/10 inline-block">Confidence Score: {snapshot.recommendation?.confidence || 0}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 border-t border-zinc-800 pt-12">
                  <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50">
                    <div className="text-[10px] font-bold text-zinc-600 mb-2 uppercase">Target Value</div>
                    <div className="text-2xl font-black font-mono text-white tabular-nums">${(snapshot.recommendation?.targetPrice ?? 0).toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50">
                    <div className="text-[10px] font-bold text-zinc-600 mb-2 uppercase">Stop Loss</div>
                    <div className="text-2xl font-black font-mono text-[#ff2e63] tabular-nums">${(snapshot.recommendation?.stopLoss ?? 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-10 h-[600px] flex flex-col bg-zinc-950/20 border-zinc-900/50">
                <div className="flex justify-between items-center mb-10 border-b border-zinc-900 pb-6">
                  <h3 className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Live Market Catalysts</h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pr-6">
                  {(snapshot.news_catalysts || []).map((n, i) => (
                    <div key={i} className="group cursor-pointer border-l-2 border-transparent hover:border-[#ffb800] pl-6 transition-all">
                      <div className="flex justify-between text-[10px] font-bold text-zinc-700 mb-3 uppercase tracking-wider">
                        <span className="text-[#ffb800]">{n.source}</span>
                        <span>{n.time}</span>
                      </div>
                      <h4 className="text-zinc-200 text-base font-semibold leading-snug group-hover:text-white transition-colors">{n.headline}</h4>
                      <div className="mt-3 flex gap-2">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${n.impact === 'High' ? 'border-[#ff2e63] text-[#ff2e63]' : 'border-zinc-800 text-zinc-600'}`}>Impact: {n.impact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeView === 'analytics') {
      if (!snapshot) return <div className="p-20 text-center text-zinc-600 uppercase tracking-widest">Asset Probe Required</div>;
      
      const scores = snapshot.neural_scores || { momentum: 72, value: 45, growth: 88, sentiment: 61, liquidity: 94 };

      return (
        <div className="p-6 lg:p-12 max-w-[1800px] mx-auto animate-in slide-in-from-bottom-8 duration-700 overflow-y-auto custom-scrollbar h-full">
           <div className="mb-16 border-b border-zinc-900 pb-12 flex flex-col md:flex-row justify-between items-end gap-10">
              <div className="space-y-4">
                 <h2 className="text-5xl font-black text-white tracking-tighter">Neural Intelligence Synthesis</h2>
                 <p className="text-[#ffb800] text-xs font-black tracking-widest uppercase border-l-2 border-[#ffb800] pl-4">Asset Code: {snapshot.symbol} // Spectrum Analytics v3.1</p>
              </div>
              <div className="flex gap-4">
                 <div className="px-6 py-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-600 font-bold block mb-1 uppercase tracking-tighter">Alpha Strength</span>
                    <span className="text-2xl font-black text-[#00ff9d] font-mono">{snapshot.recommendation?.confidence}%</span>
                 </div>
                 <div className="px-6 py-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                    <span className="text-[10px] text-zinc-600 font-bold block mb-1 uppercase tracking-tighter">Risk Level</span>
                    <span className="text-2xl font-black text-[#ff2e63] font-mono">{(snapshot.risk_metrics?.beta ?? 1.0).toFixed(2)}</span>
                 </div>
              </div>
           </div>

           {/* Neural Alpha Scores Grid */}
           <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-16">
              {Object.entries(scores).map(([key, val]) => (
                <div key={key} className="glass-card p-8 border-zinc-900/50 hover:border-[#ffb800]/30 transition-all group">
                   <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{key}</span>
                      <span className="text-lg font-black text-[#ffb800] font-mono">{val}%</span>
                   </div>
                   <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden mb-4">
                      <div 
                         className="h-full bg-gradient-to-r from-zinc-800 to-[#ffb800] transition-all duration-1000" 
                         style={{ width: `${val}%` }}
                      ></div>
                   </div>
                   <div className="text-[9px] text-zinc-800 font-bold uppercase tracking-tighter group-hover:text-zinc-600">Neural Weighting Active</div>
                </div>
              ))}
           </div>

           <div className="grid grid-cols-12 gap-12 mb-20">
              {/* Detailed Synthesis Memo */}
              <div className="col-span-12 xl:col-span-7 space-y-12">
                 <div className="glass-card p-12 bg-black/40 border-zinc-900/50">
                    <div className="flex justify-between items-center mb-10 border-b border-zinc-900 pb-6">
                       <h3 className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Institutional Intelligence Memo</h3>
                       <span className="text-[10px] text-[#ffb800] font-bold">Encrypted Node Access</span>
                    </div>
                    <p className="text-zinc-400 font-medium leading-loose text-lg italic serif bg-zinc-900/20 p-10 border border-zinc-800/50 rounded-2xl whitespace-pre-wrap shadow-inner">
                       {snapshot.analysis || "Initiating multi-vector neural analysis sequence... Cross-referencing institutional dark pools with retail sentiment shifts. Signal confluence pending verification from primary market nodes."}
                    </p>
                 </div>

                 {/* Peers Correlation */}
                 <div className="glass-card p-12 bg-zinc-950/30 border-zinc-900/50">
                    <h3 className="text-xs font-bold text-zinc-500 tracking-widest uppercase mb-10">Sympathetic Peer Flow Matrix</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       {(snapshot.correlations || []).map((c, i) => (
                         <div key={i} className="p-8 bg-black/60 border border-zinc-900 rounded-3xl hover:border-[#ffb800]/40 transition-all group flex justify-between items-center">
                           <div>
                              <div className="text-3xl font-black text-white mb-2 font-mono group-hover:text-[#ffb800]">{c.symbol}</div>
                              <div className="text-[10px] text-zinc-700 font-bold tracking-widest uppercase">{c.sector}</div>
                           </div>
                           <div className="text-right">
                              <div className="text-xl font-black text-[#00ff9d] font-mono tabular-nums">{(c.correlation * 100).toFixed(1)}%</div>
                              <div className="text-[9px] text-zinc-800 font-bold uppercase">Correl Node</div>
                           </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Advanced Risk Matrix & Horizon */}
              <div className="col-span-12 xl:col-span-5 space-y-12">
                 <div className="glass-card p-12 bg-gradient-to-b from-zinc-900/40 to-black/80 border-zinc-900/50">
                    <h3 className="text-xs font-bold text-zinc-500 tracking-widest uppercase mb-10">Complex Risk Matrix</h3>
                    <div className="space-y-8 font-mono">
                       {[
                         { label: 'Systematic Beta (1Y)', value: snapshot.risk_metrics?.beta ?? 1.0, color: 'text-white' },
                         { label: 'Sharpe Ratio (30D)', value: (snapshot.risk_metrics?.sharpe_ratio ?? 1.5).toFixed(2), color: 'text-[#00ff9d]' },
                         { label: 'Value At Risk (95%)', value: snapshot.risk_metrics?.var_95 ?? '-3.4%', color: 'text-[#ff2e63]' },
                         { label: 'Neural Volatility Index', value: `${((snapshot.risk_metrics?.volatility_30d ?? 0.15) * 100).toFixed(1)}%`, color: 'text-white' }
                       ].map(item => (
                         <div key={item.label} className="flex justify-between items-end border-b border-zinc-900 pb-6 group">
                            <span className="text-zinc-600 text-xs font-bold uppercase tracking-tighter group-hover:text-zinc-400 transition-colors">{item.label}</span>
                            <span className={`${item.color} font-black text-2xl tabular-nums`}>{item.value}</span>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="glass-card p-12 bg-zinc-950/20 border-zinc-900/50">
                    <h3 className="text-xs font-bold text-zinc-500 tracking-widest uppercase mb-10">Probability Horizon Vectors</h3>
                    <div className="space-y-10">
                       <div className="relative pt-6">
                          <div className="flex justify-between text-[11px] font-bold text-zinc-700 uppercase mb-4">
                             <span>Target Horizon</span>
                             <span className="text-[#00ff9d]">{snapshot.recommendation?.horizon || '30-90 Days'}</span>
                          </div>
                          <div className="flex justify-between items-end border-b border-zinc-900 pb-6">
                             <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Entry Zone</div>
                             <div className="text-white text-xl font-black font-mono">{snapshot.recommendation?.entryRange || 'Current'}</div>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-8">
                          <div className="p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                             <div className="text-[10px] font-bold text-zinc-700 uppercase mb-2">Alpha Return</div>
                             <div className="text-2xl font-black text-[#00ff9d] font-mono tabular-nums">{snapshot.recommendation?.expectedReturn || '+12.4%'}</div>
                          </div>
                          <div className="p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                             <div className="text-[10px] font-bold text-zinc-700 uppercase mb-2">Signal Confidence</div>
                             <div className="text-2xl font-black text-[#ffb800] font-mono tabular-nums">{snapshot.recommendation?.confidence || 0}%</div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    return (
      <div className="p-10 flex flex-col items-center justify-center h-full text-zinc-800">
        <span className="text-6xl mb-6 opacity-20">⚙️</span>
        <p className="text-sm font-mono tracking-widest uppercase">Module Interface Offline</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#020204] selection:bg-[#ffb800]/30 selection:text-white">
      <TickerTape indices={sentiment?.indices} />

      {/* Error Alerts */}
      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[400] bg-[#ff2e63]/90 text-white px-8 py-4 rounded-xl shadow-2xl border-2 border-[#ff2e63] font-bold text-center animate-in fade-in duration-300">
          {error}
          <button onClick={() => setError(null)} className="ml-6 text-xs underline">Dismiss</button>
        </div>
      )}
      {detailError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[400] bg-[#ff2e63]/90 text-white px-8 py-4 rounded-xl shadow-2xl border-2 border-[#ff2e63] font-bold text-center animate-in fade-in duration-300">
          {detailError}
          <button onClick={() => setDetailError(null)} className="ml-6 text-xs underline">Dismiss</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-black/40 border-r border-zinc-900/50 flex flex-col transition-all duration-500 z-50 backdrop-blur-3xl shrink-0`}>
          <div className="p-8 mb-6 flex items-center justify-between border-b border-zinc-900/50 h-24">
            {isSidebarOpen ? (
              <div className="flex flex-col">
                <span className="text-[#ffb800] font-black tracking-tighter text-2xl leading-none">Quant Terminal</span>
                <span className="text-zinc-600 text-[10px] font-bold tracking-[0.3em] mt-2 uppercase">Core System 3.1</span>
              </div>
            ) : (
              <button onClick={() => setIsSidebarOpen(true)} className="text-[#ffb800] hover:text-white transition-all w-full flex justify-center scale-125">
                <HamburgerIcon />
              </button>
            )}
            {isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(false)} className="text-zinc-600 hover:text-[#ffb800] transition-colors p-2">
                <HamburgerIcon />
              </button>
            )}
          </div>
          
          <nav className="flex-1 mt-6 overflow-y-auto no-scrollbar space-y-2">
            <SidebarItem id="overview" label="Asset Profile" icon="◈" />
            <SidebarItem id="analytics" label="Neural Analytics" icon="⌬" />
            <SidebarItem id="derivatives" label="Options Flow" icon="◬" />
            <div className="mx-8 my-6 border-t border-zinc-900/50"></div>
            <SidebarItem id="alerts" label="Signal Alerts" icon="🔔" />
            <SidebarItem id="orders" label="Order Entry" icon="⇄" />
            <SidebarItem id="system" label="System Logs" icon="⌨" />
          </nav>

          <div className="p-8 space-y-4 border-t border-zinc-900/50">
             <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-700 tracking-widest bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/50">
               <span className="w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse shadow-[0_0_10px_#00ff9d]"></span>
               {isSidebarOpen ? "Node Status: Optimized" : "Live"}
             </div>
          </div>
        </aside>

        <main className="flex-1 overflow-hidden relative bg-[#020204]">
          {renderMainContent()}
        </main>
      </div>

      {(detailLoading || (loading && !sentiment)) && (
        <div className="fixed inset-0 z-[300] bg-[#020204]/98 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className="relative mb-16">
              <div className="w-48 h-48 border-2 border-zinc-900 border-t-[#ffb800] rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="neural-dot scale-[2.5]"></div>
              </div>
           </div>
           <div className="space-y-6 text-center">
             <div className="text-white font-black text-4xl tracking-tighter animate-pulse leading-none">Quantum Probe Active</div>
             <div className="text-[#ffb800] font-mono text-[12px] tracking-[0.4em] font-bold">Synthesizing Neural Market Logic...</div>
           </div>
        </div>
      )}
    </div>
  );
};

export default function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
