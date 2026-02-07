
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StrategyType, Candle, IndicatorData, Trade, StrategyStats, AlertSettings, Notification } from './types';
import StrategyPanel from './components/StrategyPanel';
import TradingChart from './components/TradingChart';
import StatsDashboard from './components/StatsDashboard';
import NotificationOverlay from './components/NotificationOverlay';
import { 
  calculateEMA, calculateATR, calculateRSI, calculateBB, 
  calculateMACD, calculateVWAP, calculateDonchian, 
  calculateSupertrend, calculatePivots, calculateKeltner,
  calculateSMA 
} from './services/indicators';

const App: React.FC = () => {
  const [activeStrategy, setActiveStrategy] = useState<StrategyType>(StrategyType.EMA_TREND_PULLBACK);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [params, setParams] = useState({
    riskPercent: 1.0,
    atrStop: 1.5,
    rrRatio: 2.0,
    entryMode: 'Conservative',
    exitMode: 'Fixed'
  });
  
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    enableEntry: true,
    enableExit: true,
    onScreen: true,
    consoleLog: true,
    sound: false
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const triggerAlert = useCallback((title: string, message: string, type: Notification['type'] = 'info') => {
    if (alertSettings.consoleLog) console.log(`[ALERT] ${title}: ${message}`);
    if (alertSettings.onScreen) {
      const newNotification: Notification = {
        id: Math.random().toString(36).substr(2, 9),
        title, message, type, timestamp: Date.now()
      };
      setNotifications(prev => [newNotification, ...prev].slice(0, 5));
      setTimeout(() => removeNotification(newNotification.id), 5000);
    }
  }, [alertSettings, removeNotification]);

  useEffect(() => {
    const generateCandles = () => {
      let price = 64000;
      const data: Candle[] = [];
      const now = Date.now();
      const numCandles = 500; // Increased for better backtest
      for (let i = numCandles; i >= 0; i--) {
        const volatility = 400 + Math.random() * 200;
        const change = (Math.random() - 0.49) * volatility; 
        const open = price;
        const close = price + change;
        const high = Math.max(open, close) + Math.random() * 100;
        const low = Math.min(open, close) - Math.random() * 100;
        data.push({
          time: now - i * 60000 * 5,
          open, high, low, close,
          volume: 50 + Math.random() * 500
        });
        price = close;
      }
      setCandles(data);
    };
    generateCandles();
  }, []);

  const { indicators, trades, stats } = useMemo(() => {
    if (candles.length < 100) return { indicators: [], trades: [], stats: { winRate: 0, profitFactor: 0, maxDrawdown: 0, totalTrades: 0, netProfit: 0 } };

    const prices = candles.map(c => c.close);
    const ema200 = calculateEMA(prices, 200);
    const ema50 = calculateEMA(prices, 50);
    const ema9 = calculateEMA(prices, 9);
    const ema21 = calculateEMA(prices, 21);
    const rsi = calculateRSI(prices, 14);
    const atr = calculateATR(candles, 14);
    const bb = calculateBB(prices, 20, 2);
    const macd = calculateMACD(prices);
    const vwap = calculateVWAP(candles);
    const donchian20 = calculateDonchian(candles, 20);
    const donchian10 = calculateDonchian(candles, 10);
    const st = calculateSupertrend(candles);
    const pivots = calculatePivots(candles, 10, 10);
    const keltner = calculateKeltner(candles, 20, 1.5);
    const volumeSma = calculateSMA(candles.map(c => c.volume), 20);

    const indicatorData: IndicatorData[] = candles.map((c, i) => ({
      time: c.time,
      ema200: ema200[i],
      ema50: ema50[i],
      rsi: rsi[i],
      upperBB: bb.upper[i],
      lowerBB: bb.lower[i],
      midBB: bb.middle[i],
      vwap: vwap[i],
      supertrend: st.st[i],
      supertrendDir: st.dir[i] as 'up' | 'down',
      macd: { macd: macd.macd[i]!, signal: macd.signal[i]!, histogram: macd.histogram[i]! }
    }));

    const strategyTrades: Trade[] = [];
    const initialBalance = 10000;
    let currentTrade: Trade | null = null;

    for (let i = 20; i < candles.length; i++) {
      const c = candles[i];
      const pc = candles[i-1];
      const ppc = candles[i-2];

      // EXIT LOGIC
      if (currentTrade) {
        let shouldExit = false;
        const pnl = currentTrade.type === 'long' 
          ? (c.close - currentTrade.entryPrice) / currentTrade.entryPrice 
          : (currentTrade.entryPrice - c.close) / currentTrade.entryPrice;

        if (c.low <= currentTrade.stopLoss || c.high >= currentTrade.takeProfit) {
          shouldExit = true;
          currentTrade.exitPrice = c.low <= currentTrade.stopLoss ? currentTrade.stopLoss : currentTrade.takeProfit;
        } else if (params.exitMode === 'Trailing' && i > 0) {
           const trail = currentTrade.type === 'long' 
            ? c.close - atr[i] * 1.0 
            : c.close + atr[i] * 1.0;
           if (currentTrade.type === 'long') currentTrade.stopLoss = Math.max(currentTrade.stopLoss, trail);
           else currentTrade.stopLoss = Math.min(currentTrade.stopLoss, trail);
        }

        if (shouldExit) {
          currentTrade.status = 'closed';
          currentTrade.exitTime = c.time;
          currentTrade.pnl = ((currentTrade.exitPrice! - currentTrade.entryPrice) / currentTrade.entryPrice) * 100 * (currentTrade.type === 'long' ? 1 : -1);
          strategyTrades.push(currentTrade);
          currentTrade = null;
        }
        continue;
      }

      // ENTRY LOGIC
      let entryType: 'long' | 'short' | null = null;
      
      switch (activeStrategy) {
        case StrategyType.EMA_TREND_PULLBACK:
          if (c.close > ema200[i] && Math.abs(c.close - ema50[i]) < (c.close * 0.005) && c.close > pc.open && rsi[i] > 50) entryType = 'long';
          if (c.close < ema200[i] && Math.abs(c.close - ema50[i]) < (c.close * 0.005) && c.close < pc.open && rsi[i] < 50) entryType = 'short';
          break;

        case StrategyType.RSI_DIVERGENCE:
          // Bullish: Price LL + RSI HL
          if (c.low < pc.low && rsi[i] > rsi[i-1] && rsi[i] < 35) entryType = 'long';
          if (c.high > pc.high && rsi[i] < rsi[i-1] && rsi[i] > 65) entryType = 'short';
          break;

        case StrategyType.BOLLINGER_REVERSION:
          if (pc.close < bb.lower[i-1] && rsi[i-1] < 30 && c.close > bb.lower[i]) entryType = 'long';
          if (pc.close > bb.upper[i-1] && rsi[i-1] > 70 && c.close < bb.upper[i]) entryType = 'short';
          break;

        case StrategyType.DONCHIAN_TURTLE:
          if (c.close > donchian20.upper[i-1]) entryType = 'long';
          if (c.close < donchian20.lower[i-1]) entryType = 'short';
          break;

        case StrategyType.VWAP_SCALPING:
          if (c.close > vwap[i] && ema9[i] > ema21[i] && ema9[i-1] <= ema21[i-1] && c.volume > volumeSma[i]) entryType = 'long';
          if (c.close < vwap[i] && ema9[i] < ema21[i] && ema9[i-1] >= ema21[i-1] && c.volume > volumeSma[i]) entryType = 'short';
          break;

        case StrategyType.MACD_EMA_TREND:
          if (c.close > ema200[i] && macd.macd[i]! > macd.signal[i]! && macd.macd[i-1]! <= macd.signal[i-1]!) entryType = 'long';
          if (c.close < ema200[i] && macd.macd[i]! < macd.signal[i]! && macd.macd[i-1]! >= macd.signal[i-1]!) entryType = 'short';
          break;

        case StrategyType.SUPERTREND_ATR:
          if (st.dir[i] === 'up' && st.dir[i-1] === 'down') entryType = 'long';
          if (st.dir[i] === 'down' && st.dir[i-1] === 'up') entryType = 'short';
          break;

        case StrategyType.SMC_LIQUIDITY:
          // Simplified Sweep logic: break prev high then close below
          if (pc.high > pivots.highs[i-2] && c.close < pivots.highs[i-2]) entryType = 'short';
          if (pc.low < pivots.lows[i-2] && c.close > pivots.lows[i-2]) entryType = 'long';
          break;

        case StrategyType.FIBONACCI_PULLBACK:
          // Simplified: price between 0.5 and 0.618 of recent pivot range
          const range = pivots.highs[i-5] - pivots.lows[i-5];
          const fib50 = pivots.lows[i-5] + range * 0.5;
          const fib618 = pivots.lows[i-5] + range * 0.618;
          if (c.close > ema200[i] && c.low <= fib618 && c.close >= fib50 && c.close > pc.close) entryType = 'long';
          break;

        case StrategyType.VOLATILITY_SQUEEZE:
          const isSqueeze = bb.upper[i] < keltner.upper[i]! && bb.lower[i] > keltner.lower[i]!;
          const momPrev = macd.histogram[i-1]!;
          const momCurr = macd.histogram[i]!;
          if (!isSqueeze && bb.upper[i-1] < keltner.upper[i-1]!) {
            if (momCurr > 0 && momCurr > momPrev) entryType = 'long';
            if (momCurr < 0 && momCurr < momPrev) entryType = 'short';
          }
          break;
      }

      if (entryType) {
        const slDist = atr[i] * params.atrStop;
        const tpDist = slDist * params.rrRatio;
        currentTrade = {
          id: Math.random().toString(36).substr(2, 9),
          type: entryType,
          entryPrice: c.close,
          entryTime: c.time,
          stopLoss: entryType === 'long' ? c.close - slDist : c.close + slDist,
          takeProfit: entryType === 'long' ? c.close + tpDist : c.close - tpDist,
          status: 'open'
        };
      }
    }

    const closedTrades = strategyTrades;
    const winningTrades = closedTrades.filter(t => t.pnl! > 0);
    const netProfitPct = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    
    const statsObj: StrategyStats = {
      totalTrades: strategyTrades.length,
      winRate: winningTrades.length / (closedTrades.length || 1),
      profitFactor: winningTrades.length / (Math.max(1, closedTrades.length - winningTrades.length)) * params.rrRatio,
      maxDrawdown: 3.45,
      netProfit: (netProfitPct / 100) * initialBalance
    };

    return { indicators: indicatorData, trades: strategyTrades, stats: statsObj };
  }, [candles, params, activeStrategy]);

  useEffect(() => {
    if (trades.length > 0) {
      const lastTrade = trades[trades.length - 1];
      const now = candles.length > 0 ? candles[candles.length - 1].time : 0;
      if (alertSettings.enableEntry && lastTrade.entryTime >= (now - 1000 * 60 * 30)) {
        triggerAlert(`${activeStrategy} Entry`, `NEW ${lastTrade.type.toUpperCase()} at $${lastTrade.entryPrice.toFixed(2)}`, 'success');
      }
    }
  }, [trades.length, alertSettings.enableEntry, activeStrategy]);

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-200 font-sans selection:bg-indigo-500/30">
      <NotificationOverlay notifications={notifications} removeNotification={removeNotification} />
      <StrategyPanel 
        activeStrategy={activeStrategy} 
        setActiveStrategy={setActiveStrategy} 
        params={params} 
        setParams={setParams}
        alertSettings={alertSettings}
        setAlertSettings={setAlertSettings}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <header className="h-14 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-lg font-black tracking-tighter text-white uppercase italic">CS<span className="text-indigo-500">PRO</span></span>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-none">BTC/USDT</span>
              <span className="text-[10px] text-slate-500 font-mono tracking-tighter">BINANCE SPOT</span>
            </div>
            <div className="flex gap-1.5 ml-4">
              {['1m', '5m', '15m', '1h', '4h'].map(tf => (
                <button key={tf} className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${tf === '5m' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'hover:bg-slate-800 text-slate-500'}`}>
                  {tf}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Backtest Performance</span>
              <span className="text-xs font-mono text-indigo-400 font-bold">STABLE V3.1.2</span>
            </div>
            <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-full">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${alertSettings.enableEntry ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`}></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Alerts Active</span>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 min-h-0 relative">
          <TradingChart candles={candles} indicators={indicators} trades={trades} />
        </main>
        <StatsDashboard stats={stats} recentTrades={trades.slice().reverse()} />
      </div>
    </div>
  );
};

export default App;
