
import React from 'react';
import { StrategyStats, Trade } from '../types';

interface StatsDashboardProps {
  stats: StrategyStats;
  recentTrades: Trade[];
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({ stats, recentTrades }) => {
  return (
    <div className="bg-slate-800 h-64 border-t border-slate-700 flex flex-col">
      <div className="grid grid-cols-5 divide-x divide-slate-700 border-b border-slate-700">
        <StatItem label="Net Profit" value={`$${stats.netProfit.toLocaleString()}`} color={stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'} />
        <StatItem label="Win Rate" value={`${(stats.winRate * 100).toFixed(1)}%`} />
        <StatItem label="Profit Factor" value={stats.profitFactor.toFixed(2)} />
        <StatItem label="Max Drawdown" value={`${stats.maxDrawdown.toFixed(1)}%`} color="text-red-400" />
        <StatItem label="Total Trades" value={stats.totalTrades.toString()} />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-800 text-slate-500 uppercase font-bold border-b border-slate-700">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Entry</th>
              <th className="px-4 py-2">Exit</th>
              <th className="px-4 py-2">PnL</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {recentTrades.map((trade) => (
              <tr key={trade.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-2">{new Date(trade.entryTime).toLocaleTimeString()}</td>
                <td className={`px-4 py-2 font-bold ${trade.type === 'long' ? 'text-green-400' : 'text-red-400'}`}>{trade.type.toUpperCase()}</td>
                <td className="px-4 py-2">${trade.entryPrice.toFixed(2)}</td>
                <td className="px-4 py-2">${trade.exitPrice?.toFixed(2) || '-'}</td>
                <td className={`px-4 py-2 font-bold ${trade.pnl && trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(2)}%` : '-'}
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${trade.status === 'closed' ? 'bg-slate-600' : 'bg-indigo-600'}`}>
                    {trade.status}
                  </span>
                </td>
              </tr>
            ))}
            {recentTrades.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">No trades generated for this timeframe.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatItem = ({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) => (
  <div className="p-3 text-center">
    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">{label}</div>
    <div className={`text-lg font-bold ${color}`}>{value}</div>
  </div>
);

export default StatsDashboard;
