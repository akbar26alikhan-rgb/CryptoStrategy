
import { Candle } from '../types';

export const calculateEMA = (data: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  const ema = new Array(data.length).fill(null);
  let prevEma = data[0];
  ema[0] = prevEma;
  
  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * k + prevEma * (1 - k);
    prevEma = ema[i];
  }
  return ema;
};

export const calculateSMA = (data: number[], period: number): number[] => {
  const sma = new Array(data.length).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma[i] = sum / period;
  }
  return sma;
};

export const calculateRSI = (data: number[], period: number = 14): number[] => {
  const rsi = new Array(data.length).fill(null);
  if (data.length <= period) return rsi;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }

  avgGain /= period;
  avgLoss /= period;
  rsi[period] = 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    let gain = diff >= 0 ? diff : 0;
    let loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi[i] = 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
};

export const calculateATR = (candles: Candle[], period: number = 14): number[] => {
  const tr = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const hL = c.high - c.low;
    const hPc = Math.abs(c.high - (candles[i - 1]?.close ?? c.close));
    const lPc = Math.abs(c.low - (candles[i - 1]?.close ?? c.close));
    return Math.max(hL, hPc, lPc);
  });
  
  const atr = new Array(candles.length).fill(0);
  let sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
  atr[period - 1] = sum / period;

  for (let i = period; i < candles.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
};

export const calculateBB = (data: number[], period: number = 20, multiplier: number = 2) => {
  const upper = new Array(data.length).fill(null);
  const lower = new Array(data.length).fill(null);
  const middle = new Array(data.length).fill(null);

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    middle[i] = avg;
    upper[i] = avg + multiplier * stdDev;
    lower[i] = avg - multiplier * stdDev;
  }
  return { upper, lower, middle };
};

export const calculateKeltner = (candles: Candle[], period: number = 20, multiplier: number = 1.5) => {
  const mid = calculateEMA(candles.map(c => c.close), period);
  const atr = calculateATR(candles, period);
  const upper = mid.map((m, i) => (m && atr[i] ? m + multiplier * atr[i] : null));
  const lower = mid.map((m, i) => (m && atr[i] ? m - multiplier * atr[i] : null));
  return { upper, lower, middle: mid };
};

export const calculateMACD = (data: number[], fast: number = 12, slow: number = 26, signal: number = 9) => {
  const fastEMA = calculateEMA(data, fast);
  const slowEMA = calculateEMA(data, slow);
  const macdLine = fastEMA.map((f, i) => (f !== null && slowEMA[i] !== null ? f - slowEMA[i] : null));
  const validMacd = macdLine.filter(m => m !== null) as number[];
  const sig = calculateEMA(validMacd, signal);
  
  const paddedSignalLine = new Array(data.length).fill(null);
  const offset = data.length - sig.length;
  for (let i = 0; i < sig.length; i++) {
    paddedSignalLine[i + offset] = sig[i];
  }

  return {
    macd: macdLine,
    signal: paddedSignalLine,
    histogram: macdLine.map((m, i) => (m !== null && paddedSignalLine[i] !== null ? m - paddedSignalLine[i] : null))
  };
};

export const calculateVWAP = (candles: Candle[]) => {
  let cumTPV = 0;
  let cumV = 0;
  return candles.map(c => {
    const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * c.volume;
    cumV += c.volume;
    return cumTPV / cumV;
  });
};

export const calculateDonchian = (candles: Candle[], period: number) => {
  const upper = new Array(candles.length).fill(null);
  const lower = new Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    upper[i] = Math.max(...slice.map(c => c.high));
    lower[i] = Math.min(...slice.map(c => c.low));
  }
  return { upper, lower };
};

export const calculateSupertrend = (candles: Candle[], period: number = 10, multiplier: number = 3) => {
  const atr = calculateATR(candles, period);
  const st = new Array(candles.length).fill(null);
  const dir = new Array(candles.length).fill('up');
  
  for (let i = period; i < candles.length; i++) {
    const hl2 = (candles[i].high + candles[i].low) / 2;
    const basicUpper = hl2 + multiplier * atr[i];
    const basicLower = hl2 - multiplier * atr[i];
    
    // Trailing logic simplified for backtest
    st[i] = hl2; // Simplified
    dir[i] = candles[i].close > hl2 ? 'up' : 'down';
  }
  return { st, dir };
};

export const calculatePivots = (candles: Candle[], left: number = 5, right: number = 5) => {
  const pivotHighs = new Array(candles.length).fill(null);
  const pivotLows = new Array(candles.length).fill(null);
  
  for (let i = left; i < candles.length - right; i++) {
    const slice = candles.slice(i - left, i + right + 1);
    const target = candles[i];
    const isHigh = slice.every(c => c.high <= target.high);
    const isLow = slice.every(c => c.low >= target.low);
    if (isHigh) pivotHighs[i] = target.high;
    if (isLow) pivotLows[i] = target.low;
  }
  return { highs: pivotHighs, lows: pivotLows };
};
