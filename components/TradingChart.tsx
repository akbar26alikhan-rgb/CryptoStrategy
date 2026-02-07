
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

    const svgElement = d3.select(containerRef.current).select('svg');
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

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickValues(x.domain().filter((_, i) => i % (Math.floor(candles.length / 10) || 1) === 0)).tickFormat(d => new Date(+d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })))
      .attr('color', '#475569');

    svg.append('g')
      .attr('transform', `translate(${width},0)`)
      .call(d3.axisRight(y).ticks(8))
      .attr('color', '#475569');

    svg.append('g')
      .attr('stroke', '#1e293b')
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

    // Helper for lines
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

    // Render Overlay Indicators
    if (indicators.length > 0) {
      if (indicators[0].ema200) drawLine(indicators, 'ema200', '#6366f1');
      if (indicators[0].ema50) drawLine(indicators, 'ema50', '#f59e0b');
      if (indicators[0].upperBB) {
        drawLine(indicators, 'upperBB', '#334155', 1);
        drawLine(indicators, 'lowerBB', '#334155', 1);
      }
      if (indicators[0].vwap) drawLine(indicators, 'vwap', '#ec4899', 1.2);
      if (indicators[0].supertrend) {
        // Render supertrend as colored segments or dots
        indicators.forEach((ind, i) => {
          if (ind.supertrend) {
            svg.append('circle')
              .attr('cx', x(ind.time.toString())! + x.bandwidth() / 2)
              .attr('cy', y(ind.supertrend))
              .attr('r', 1.5)
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
      
      const yPos = trade.type === 'long' ? y(candle.low) + 15 : y(candle.high) - 15;
      
      svg.append('path')
        .attr('d', d3.symbol().type(d3.symbolTriangle).size(80)())
        .attr('transform', `translate(${xPos},${yPos}) rotate(${trade.type === 'long' ? 0 : 180})`)
        .attr('fill', trade.type === 'long' ? '#4ade80' : '#f87171')
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5);
    });

  }, [candles, indicators, trades, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-950 overflow-hidden relative border-b border-slate-800">
      <svg className="block w-full h-full" />
      <div className="absolute top-4 left-4 flex gap-4 pointer-events-none z-10">
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
