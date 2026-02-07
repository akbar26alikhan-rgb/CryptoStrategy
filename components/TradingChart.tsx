
import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Candle, IndicatorData, Trade } from '../types';

interface TradingChartProps {
  candles: Candle[];
  indicators: IndicatorData[];
  trades: Trade[];
}

const TradingChart: React.FC<TradingChartProps> = ({ candles, indicators, trades }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const observeTarget = containerRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height
        });
      }
    });

    if (observeTarget) resizeObserver.observe(observeTarget);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current || dimensions.width === 0 || candles.length === 0) return;

    const margin = { top: 20, right: 60, bottom: 30, left: 10 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const container = d3.select(containerRef.current);
    const svgElement = container.select('svg');
    svgElement.selectAll('*').remove();

    const svg = svgElement
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(candles.map(d => d.time.toString()))
      .range([0, width])
      .padding(0.2);

    const minPrice = d3.min(candles, d => d.low)! * 0.995;
    const maxPrice = d3.max(candles, d => d.high)! * 1.005;

    const y = d3.scaleLinear()
      .domain([minPrice, maxPrice])
      .range([height, 0]);

    // X-Axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .tickValues(x.domain().filter((_, i) => i % (Math.floor(candles.length / 10) || 1) === 0))
        .tickFormat(d => new Date(+d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })))
      .attr('color', '#475569')
      .selectAll('text')
      .style('font-size', '10px');

    // Y-Axis
    svg.append('g')
      .attr('transform', `translate(${width},0)`)
      .call(d3.axisRight(y).ticks(8).tickFormat(d => `$${d}`))
      .attr('color', '#475569')
      .selectAll('text')
      .style('font-size', '10px');

    // Grid lines
    svg.append('g')
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '2,2')
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ""));

    // Candlesticks
    const candleGroup = svg.selectAll('.candle')
      .data(candles)
      .enter()
      .append('g');

    candleGroup.append('line')
      .attr('x1', d => x(d.time.toString())! + x.bandwidth() / 2)
      .attr('x2', d => x(d.time.toString())! + x.bandwidth() / 2)
      .attr('y1', d => y(d.low))
      .attr('y2', d => y(d.high))
      .attr('stroke', d => d.close >= d.open ? '#22c55e' : '#ef4444');

    candleGroup.append('rect')
      .attr('x', d => x(d.time.toString())!)
      .attr('y', d => y(Math.max(d.open, d.close)))
      .attr('width', x.bandwidth())
      .attr('height', d => Math.abs(y(d.open) - y(d.close)) || 1)
      .attr('fill', d => d.close >= d.open ? '#22c55e' : '#ef4444');

    // Indicators Drawing Helper
    const drawLine = (data: any[], key: string, color: string, stroke = 1.5) => {
      const line = d3.line<any>()
        .defined(d => d[key] !== undefined && d[key] !== null)
        .x(d => x(d.time.toString())! + x.bandwidth() / 2)
        .y(d => y(d[key]!));
      
      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', stroke)
        .attr('d', line);
    };

    if (indicators.length > 0) {
      if (indicators[0].ema200) drawLine(indicators, 'ema200', '#6366f1', 1);
      if (indicators[0].ema50) drawLine(indicators, 'ema50', '#f59e0b', 1);
      if (indicators[0].upperBB) {
        drawLine(indicators, 'upperBB', '#334155', 0.8);
        drawLine(indicators, 'lowerBB', '#334155', 0.8);
      }
      if (indicators[0].vwap) drawLine(indicators, 'vwap', '#ec4899', 1);
      if (indicators[0].supertrend) {
        indicators.forEach((ind) => {
          if (ind.supertrend) {
            svg.append('circle')
              .attr('cx', x(ind.time.toString())! + x.bandwidth() / 2)
              .attr('cy', y(ind.supertrend))
              .attr('r', 1.2)
              .attr('fill', ind.supertrendDir === 'up' ? '#22c55e' : '#ef4444');
          }
        });
      }
    }

    // Trade Signals
    trades.forEach(trade => {
      const xPos = x(trade.entryTime.toString())! + x.bandwidth() / 2;
      const candle = candles.find(c => c.time === trade.entryTime);
      if (!candle) return;
      const yPos = trade.type === 'long' ? y(candle.low) + 12 : y(candle.high) - 12;
      
      svg.append('path')
        .attr('d', d3.symbol().type(d3.symbolTriangle).size(60)())
        .attr('transform', `translate(${xPos},${yPos}) rotate(${trade.type === 'long' ? 0 : 180})`)
        .attr('fill', trade.type === 'long' ? '#4ade80' : '#f87171')
        .attr('class', 'trade-marker')
        .style('cursor', 'pointer');
    });

    // Interaction Layer
    const crosshair = svg.append('line')
      .attr('stroke', '#64748b')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .attr('y1', 0)
      .attr('y2', height)
      .style('opacity', 0);

    const tooltip = container.append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(15, 23, 42, 0.95)')
      .style('border', '1px solid #334155')
      .style('border-radius', '4px')
      .style('padding', '10px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 100)
      .style('font-family', 'ui-monospace, monospace')
      .style('box-shadow', '0 10px 15px -3px rgba(0, 0, 0, 0.5)');

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .on('mousemove', function(event) {
        const [mx] = d3.pointer(event);
        
        // Find nearest candle
        const step = x.step();
        const index = Math.max(0, Math.min(candles.length - 1, Math.floor(mx / step)));
        const candle = candles[index];
        const indicator = indicators[index];
        const tradeAtThisTime = trades.find(t => t.entryTime === candle.time);

        const xPos = x(candle.time.toString())! + x.bandwidth() / 2;
        crosshair.attr('x1', xPos).attr('x2', xPos).style('opacity', 1);

        // Tooltip Content
        let tooltipHTML = `
          <div style="color: #94a3b8; font-size: 10px; margin-bottom: 6px;">${new Date(candle.time).toLocaleString()}</div>
          <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 4px 12px; font-size: 11px;">
            <div style="color: #64748b">O: <span style="color: #f8fafc">$${candle.open.toFixed(2)}</span></div>
            <div style="color: #64748b">H: <span style="color: #f8fafc">$${candle.high.toFixed(2)}</span></div>
            <div style="color: #64748b">L: <span style="color: #f8fafc">$${candle.low.toFixed(2)}</span></div>
            <div style="color: #64748b">C: <span style="color: #f8fafc">$${candle.close.toFixed(2)}</span></div>
          </div>
          <div style="border-top: 1px solid #1e293b; margin: 6px 0; padding-top: 6px;"></div>
        `;

        if (indicator) {
          tooltipHTML += `<div style="font-size: 10px; display: flex; flex-direction: column; gap: 2px;">`;
          if (indicator.ema200) tooltipHTML += `<div style="color: #6366f1">EMA 200: $${indicator.ema200.toFixed(2)}</div>`;
          if (indicator.ema50) tooltipHTML += `<div style="color: #f59e0b">EMA 50: $${indicator.ema50.toFixed(2)}</div>`;
          if (indicator.rsi) tooltipHTML += `<div style="color: #94a3b8">RSI(14): ${indicator.rsi.toFixed(2)}</div>`;
          if (indicator.vwap) tooltipHTML += `<div style="color: #ec4899">VWAP: $${indicator.vwap.toFixed(2)}</div>`;
          tooltipHTML += `</div>`;
        }

        if (tradeAtThisTime) {
          tooltipHTML += `
            <div style="border-top: 1px solid #1e293b; margin: 6px 0; padding-top: 6px;"></div>
            <div style="background: ${tradeAtThisTime.type === 'long' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}; padding: 4px; border-radius: 2px; border: 1px solid ${tradeAtThisTime.type === 'long' ? '#22c55e' : '#ef4444'}">
              <div style="color: ${tradeAtThisTime.type === 'long' ? '#4ade80' : '#f87171'}; font-weight: bold; font-size: 11px; text-transform: uppercase;">${tradeAtThisTime.type} ENTRY</div>
              <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px;">Target: $${tradeAtThisTime.takeProfit.toFixed(2)}</div>
              <div style="font-size: 10px; color: #cbd5e1;">Stop: $${tradeAtThisTime.stopLoss.toFixed(2)}</div>
            </div>
          `;
        }

        tooltip.html(tooltipHTML)
          .style('opacity', 1)
          .style('left', (mx > width / 2 ? mx - 220 : mx + 40) + 'px')
          .style('top', '40px');
      })
      .on('mouseleave', function() {
        crosshair.style('opacity', 0);
        tooltip.style('opacity', 0);
      });

  }, [candles, indicators, trades, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-950 overflow-hidden relative border-b border-slate-800">
      <svg className="block w-full h-full" />
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
        <div className="bg-slate-900/90 px-3 py-1.5 rounded-md text-[10px] border border-slate-800 flex items-center gap-3 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-slate-300 font-bold uppercase">EMA 200</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-slate-300 font-bold uppercase">EMA 50</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-pink-500"></div>
            <span className="text-slate-300 font-bold uppercase">VWAP</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;
