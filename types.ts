
export enum TimeFrame {
  Daily = 'Daily',
  Weekly = 'Weekly',
  Monthly = 'Monthly',
  Yearly = 'Yearly',
}

export enum Recommendation {
  Buy = 'BUY',
  Sell = 'SELL',
  Hold = 'HOLD',
}

export enum OptionType {
  Call = 'CALL',
  Put = 'PUT',
  call = 'call',
  put = 'put',
}

export interface SentimentSymbol {
  symbol: string;
  currentPrice: number;
  priceChangePercent: number;
  totalVolume: number;
  callVolume: number;
  putVolume: number;
  dominancePercent: number;
  possibleReason: string;
  recommendation: Recommendation;
  topContract: {
    type: OptionType.Call | OptionType.Put;
    strike: number;
    expiry: string;
    dollarVolume: number;
    contracts: number;
    midPrice: number;
  };
}

export interface MarketIndex {
  name: string;
  value: string;
  change: string;
  up: boolean;
}

export enum SentimentType {
  Bullish = 'bullish',
  Bearish = 'bearish',
  Neutral = 'neutral',
}

export interface SectorMetric {
  name: string;
  change: number;
  sentiment: SentimentType;
}

export interface MarketSentiment {
  timestamp: string;
  totalDollarVolume: number;
  callDominance: number;
  putDominance: number;
  bullish: SentimentSymbol[];
  bearish: SentimentSymbol[];
  balanced: SentimentSymbol[];
  indices: MarketIndex[];
  sectors: SectorMetric[];
  sources: { title: string; uri: string }[];
}

export interface TradeSignal {
  action: Recommendation;
  confidence: number;
  entryRange: string;
  targetPrice: number;
  stopLoss: number;
  horizon: string;
  expectedReturn: string;
}

export interface NewsItem {
  headline: string;
  source: string;
  time: string;
  sentiment: SentimentType;
  impact: string;
}

export interface RiskMetrics {
  beta: number;
  volatility_30d: number;
  var_95: string;
  sharpe_ratio: number;
}

export interface CorrelatedAsset {
  symbol: string;
  correlation: number;
  sector: string;
}

export interface Fundamentals {
  pe_ratio: number;
  market_cap: string;
  dividend_yield: string;
  eps: number;
  revenue_growth: string;
  net_margin: string;
}

export interface NeuralScores {
  momentum: number;
  value: number;
  growth: number;
  sentiment: number;
  liquidity: number;
}

export interface StockSnapshot {
  symbol: string;
  companyName: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  as_of_utc: string;
  candles_daily: Candle[];
  indicators: Indicators;
  analysis: string;
  recommendation: TradeSignal;
  news_catalysts: NewsItem[];
  risk_metrics: RiskMetrics;
  correlations: CorrelatedAsset[];
  fundamentals: Fundamentals;
  neural_scores?: NeuralScores;
  option_chain_snapshot?: OptionContract[];
  sources?: { title: string; uri: string }[];
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  macd_line?: number;
  macd_signal?: number;
  macd_hist?: number;
  rsi?: number;
}

export interface Indicators {
  rsi_14: number;
  macd: {
    line: number;
    signal: number;
    histogram: number;
  };
  atr_14: number;
  sma: {
    sma_20: number;
    sma_50: number;
  };
  bbands: {
    upper: number;
    middle: number;
  };
}

export interface OptionContract {
  expiry: string;
  type: OptionType.call | OptionType.put;
  strike: number;
  lastPrice: number;
  iv: number;
  delta: number;
  theta: number;
}
