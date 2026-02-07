
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

    d3.select(containerRef.current).select('svg').remove();

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand()
      .domain(candles.map(d => d.time.toString()))
      .range([0, width])
      .padding(0.2);

    const minPrice = d3.min(candles, d => d.low)! * 0.99;
    const maxPrice = d3.max(candles, d => d.high)! * 1.01;

    const y = d3.scaleLinear()
      .domain([minPrice, maxPrice])
      .range([height, 0]);

    // Axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickValues(x.domain().filter((_, i) => i % (Math.floor(candles.length / 10)) === 0)).tickFormat(d => new Date(+d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })))
      .attr('color', '#64748b');

    svg.append('g')
      .attr('transform', `translate(${width},0)`)
      .call(d3.axisRight(y))
      .attr('color', '#64748b');

    // Grid
    svg.append('g')
      .attr('class', 'grid')
      .attr('stroke', '#1e293b')
      .attr('stroke-opacity', 0.5)
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ""));

    // Candlesticks
    const candleGroup = svg.selectAll('.candle')
      .data(candles)
      .enter()
      .append('g')
      .attr('class', 'candle');

    candleGroup.append('line')
      .attr('x1', d => x(d.time.toString())! + x.bandwidth() / 2)
      .attr('x2', d => x(d.time.toString())! + x.bandwidth() / 2)
      .attr('y1', d => y(d.low))
      .attr('y2', d => y(d.high))
      .attr('stroke', d => d.close >= d.open ? '#22c55e' : '#ef4444')
      .attr('stroke-width', 1);

    candleGroup.append('rect')
      .attr('x', d => x(d.time.toString())!)
      .attr('y', d => y(Math.max(d.open, d.close)))
      .attr('width', x.bandwidth())
      .attr('height', d => Math.abs(y(d.open) - y(d.close)) || 1)
      .attr('fill', d => d.close >= d.open ? '#22c55e' : '#ef4444');

    // Indicators (EMA 200 example)
    const lineGenerator = d3.line<IndicatorData>()
      .defined(d => d.ema200 !== undefined && d.ema200 !== null)
      .x(d => x(d.time.toString())! + x.bandwidth() / 2)
      .y(d => y(d.ema200!));

    svg.append('path')
      .datum(indicators)
      .attr('fill', 'none')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 2)
      .attr('d', lineGenerator);

    // Indicator Labels
    svg.append('text')
      .attr('x', 10)
      .attr('y', 20)
      .attr('fill', '#6366f1')
      .attr('font-size', '12px')
      .text('EMA 200');

    // Trade Signal Markers
    trades.forEach(trade => {
      const timeStr = trade.entryTime.toString();
      const xPos = x(timeStr)! + x.bandwidth() / 2;
      const yPos = trade.type === 'long' ? y(candles.find(c => c.time === trade.entryTime)?.low || 0) + 15 : y(candles.find(c => c.time === trade.entryTime)?.high || 0) - 15;
      
      svg.append('path')
        .attr('d', d3.symbol().type(trade.type === 'long' ? d3.symbolTriangle : d3.symbolTriangle).size(60))
        .attr('transform', `translate(${xPos},${yPos}) rotate(${trade.type === 'long' ? 0 : 180})`)
        .attr('fill', trade.type === 'long' ? '#4ade80' : '#f87171');
    });

  }, [candles, indicators, trades, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-900 overflow-hidden relative border-b border-slate-700">
      <div className="absolute top-4 left-4 flex gap-4 pointer-events-none z-10">
        <div className="bg-slate-800/80 px-2 py-1 rounded text-xs border border-slate-700">
          <span className="text-slate-400">BTC/USDT</span>
          <span className="ml-2 text-green-400">$64,231.40 (+2.4%)</span>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;
