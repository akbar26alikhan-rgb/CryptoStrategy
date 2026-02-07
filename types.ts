
export enum StrategyType {
  EMA_TREND_PULLBACK = 'EMA Trend Pullback',
  RSI_DIVERGENCE = 'RSI Divergence',
  BOLLINGER_REVERSION = 'Bollinger Mean Reversion',
  DONCHIAN_TURTLE = 'Donchian Turtle',
  VWAP_SCALPING = 'VWAP Scalping',
  MACD_EMA_TREND = 'MACD EMA Trend',
  SUPERTREND_ATR = 'Supertrend ATR',
  SMC_LIQUIDITY = 'SMC Liquidity Sweep',
  FIBONACCI_PULLBACK = 'Fibonacci Pullback',
  VOLATILITY_SQUEEZE = 'Volatility Squeeze'
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  time: number;
  ema200?: number;
  ema50?: number;
  rsi?: number;
  upperBB?: number;
  lowerBB?: number;
  midBB?: number;
  supertrend?: number;
  supertrendDir?: 'up' | 'down';
  vwap?: number;
  macd?: { macd: number; signal: number; histogram: number };
  squeeze?: boolean;
}

export interface Trade {
  id: string;
  type: 'long' | 'short';
  entryPrice: number;
  entryTime: number;
  exitPrice?: number;
  exitTime?: number;
  stopLoss: number;
  takeProfit: number;
  status: 'open' | 'closed';
  pnl?: number;
}

export interface StrategyStats {
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  totalTrades: number;
  netProfit: number;
}

export interface AlertSettings {
  enableEntry: boolean;
  enableExit: boolean;
  onScreen: boolean;
  consoleLog: boolean;
  sound: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}
