
import React from 'react';
import { StrategyType, AlertSettings } from '../types';

interface StrategyPanelProps {
  activeStrategy: StrategyType;
  setActiveStrategy: (s: StrategyType) => void;
  params: any;
  setParams: (p: any) => void;
  alertSettings: AlertSettings;
  setAlertSettings: (s: AlertSettings) => void;
}

const StrategyPanel: React.FC<StrategyPanelProps> = ({ 
  activeStrategy, 
  setActiveStrategy, 
  params, 
  setParams,
  alertSettings,
  setAlertSettings
}) => {
  return (
    <div className="bg-slate-800 p-4 border-r border-slate-700 h-full overflow-y-auto w-80 shrink-0">
      <h2 className="text-xl font-bold mb-6 text-indigo-400">Strategy Engine</h2>
      
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Select Strategy</label>
        <select 
          value={activeStrategy}
          onChange={(e) => setActiveStrategy(e.target.value as StrategyType)}
          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          {Object.values(StrategyType).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase text-slate-400 border-b border-slate-700 pb-1">Parameters</h3>
        
        <div>
          <label className="block text-sm text-slate-300 mb-1">Risk per Trade (%)</label>
          <input 
            type="number" 
            value={params.riskPercent}
            onChange={(e) => setParams({ ...params, riskPercent: parseFloat(e.target.value) })}
            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">ATR Multiplier (Stop Loss)</label>
          <input 
            type="number" 
            value={params.atrStop}
            onChange={(e) => setParams({ ...params, atrStop: parseFloat(e.target.value) })}
            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Reward/Risk Ratio</label>
          <input 
            type="number" 
            value={params.rrRatio}
            onChange={(e) => setParams({ ...params, rrRatio: parseFloat(e.target.value) })}
            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
          />
        </div>

        <h3 className="text-xs font-semibold uppercase text-slate-400 border-b border-slate-700 pb-1 pt-4">Entry / Exit Modes</h3>
        
        <div>
          <label className="block text-sm text-slate-300 mb-1">Entry Mode</label>
          <select 
            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
            value={params.entryMode}
            onChange={(e) => setParams({ ...params, entryMode: e.target.value })}
          >
            <option value="Aggressive">Aggressive (Signal Only)</option>
            <option value="Conservative">Conservative (Confirmed Candle)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Exit Mode</label>
          <select 
            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
            value={params.exitMode}
            onChange={(e) => setParams({ ...params, exitMode: e.target.value })}
          >
            <option value="Fixed">Fixed TP/SL</option>
            <option value="Trailing">Trailing ATR Stop</option>
            <option value="Signal">Opposite Signal</option>
          </select>
        </div>

        <h3 className="text-xs font-semibold uppercase text-slate-400 border-b border-slate-700 pb-1 pt-4">Alert System</h3>
        
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Trade Entry Signals</span>
            <input 
              type="checkbox" 
              checked={alertSettings.enableEntry}
              onChange={(e) => setAlertSettings({ ...alertSettings, enableEntry: e.target.checked })}
              className="w-4 h-4 bg-slate-900 border-slate-700 rounded accent-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Trade Exit Signals</span>
            <input 
              type="checkbox" 
              checked={alertSettings.enableExit}
              onChange={(e) => setAlertSettings({ ...alertSettings, enableExit: e.target.checked })}
              className="w-4 h-4 bg-slate-900 border-slate-700 rounded accent-indigo-500"
            />
          </div>
          
          <div className="mt-4 space-y-2">
            <label className="block text-[10px] uppercase text-slate-500 font-bold">Notification Methods</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setAlertSettings({ ...alertSettings, onScreen: !alertSettings.onScreen })}
                className={`text-[10px] py-1 px-2 rounded border transition-colors ${alertSettings.onScreen ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
              >
                On-Screen
              </button>
              <button 
                onClick={() => setAlertSettings({ ...alertSettings, consoleLog: !alertSettings.consoleLog })}
                className={`text-[10px] py-1 px-2 rounded border transition-colors ${alertSettings.consoleLog ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
              >
                Console Log
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <button 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded font-bold transition-colors shadow-lg"
            onClick={() => window.location.reload()}
          >
            Run Backtest
          </button>
        </div>
      </div>
    </div>
  );
};

export default StrategyPanel;
