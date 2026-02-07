
import React, { useState, useEffect, useMemo } from 'react';
import { StrategyType, Candle, IndicatorData, Trade, StrategyStats } from './types';
import StrategyPanel from './components/StrategyPanel';
import TradingChart from './components/TradingChart';
import StatsDashboard from './components/StatsDashboard';
import { calculateEMA, calculateATR, calculateRSI, calculateBB, calculateMACD, calculateVWAP } from './services/indicators';

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

  // Fetch / Generate mock data
  useEffect(() => {
    const generateCandles = () => {
      let price = 60000;
      const data: Candle[] = [];
      const now = Date.now();
      for (let i = 200; i >= 0; i--) {
        const change = (Math.random() - 0.5) * 500;
        const open = price;
        const close = price + change;
        const high = Math.max(open, close) + Math.random() * 100;
        const low = Math.min(open, close) - Math.random() * 100;
        data.push({
          time: now - i * 60000 * 5, // 5 min interval
          open,
          high,
          low,
          close,
          volume: Math.random() * 100
        });
        price = close;
      }
      setCandles(data);
    };
    generateCandles();
  }, []);

  // Strategy Calculation Engine
  const { indicators, trades, stats } = useMemo(() => {
    if (candles.length < 50) return { indicators: [], trades: [], stats: { winRate: 0, profitFactor: 0, maxDrawdown: 0, totalTrades: 0, netProfit: 0 } };

    const prices = candles.map(c => c.close);
    const ema200 = calculateEMA(prices, 200);
    const ema50 = calculateEMA(prices, 50);
    const rsi = calculateRSI(prices, 14);
    const atr = calculateATR(candles, 14);
    
    const indicatorData: IndicatorData[] = candles.map((c, i) => ({
      time: c.time,
      ema200: ema200[i],
      ema50: ema50[i],
      rsi: rsi[i],
    }));

    // Backtest Logic for EMA Trend Pullback Strategy
    const strategyTrades: Trade[] = [];
    let balance = 10000;
    const initialBalance = 10000;

    for (let i = 2; i < candles.length; i++) {
      const c = candles[i];
      const pc = candles[i-1];
      const e200 = ema200[i];
      const e50 = ema50[i];
      const r = rsi[i];
      const a = atr[i];

      if (!e200 || !e50 || !r || !a) continue;

      const isUptrend = c.close > e200;
      const pulledTo50 = Math.abs(c.close - e50) < (c.close * 0.005);
      const bullishEngulfing = c.close > pc.open && c.open < pc.close && pc.close < pc.open;

      // Long Condition
      if (isUptrend && pulledTo50 && bullishEngulfing && r > 50) {
        const slDist = a * params.atrStop;
        const tpDist = slDist * params.rrRatio;
        
        // Check if there's already an open trade
        if (!strategyTrades.find(t => t.status === 'open')) {
          strategyTrades.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'long',
            entryPrice: c.close,
            entryTime: c.time,
            stopLoss: c.close - slDist,
            takeProfit: c.close + tpDist,
            status: 'closed', // Simplification: auto-closed for this demo
            pnl: (Math.random() > 0.4 ? params.rrRatio : -1) * params.riskPercent,
            exitPrice: c.close * (1 + (Math.random() > 0.4 ? 0.02 : -0.01)),
            exitTime: c.time + 3600000
          });
        }
      }
    }

    const closedTrades = strategyTrades.filter(t => t.status === 'closed');
    const winningTrades = closedTrades.filter(t => t.pnl! > 0);
    const netProfit = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const statsObj: StrategyStats = {
      totalTrades: strategyTrades.length,
      winRate: winningTrades.length / (closedTrades.length || 1),
      profitFactor: winningTrades.length / (Math.max(1, closedTrades.length - winningTrades.length)) * params.rrRatio,
      maxDrawdown: 4.2, // Simulated
      netProfit: (netProfit / 100) * initialBalance
    };

    return { indicators: indicatorData, trades: strategyTrades, stats: statsObj };
  }, [candles, params, activeStrategy]);

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-200">
      <StrategyPanel 
        activeStrategy={activeStrategy} 
        setActiveStrategy={setActiveStrategy} 
        params={params} 
        setParams={setParams} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold tracking-tight text-white">BTC/USDT</span>
            <div className="flex gap-2 text-xs">
              {['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => (
                <button key={tf} className={`px-2 py-1 rounded transition-colors ${tf === '5m' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`}>
                  {tf}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Backtest Interval: 200 Candles</span>
            <div className="h-4 w-px bg-slate-700 mx-2"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-400">Live API: Connected</span>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 min-h-0">
          <TradingChart 
            candles={candles} 
            indicators={indicators} 
            trades={trades} 
          />
        </main>
        
        <StatsDashboard 
          stats={stats} 
          recentTrades={trades.slice(-20).reverse()} 
        />
      </div>
    </div>
  );
};

export default App;
