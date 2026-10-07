import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, LineChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

/** TrendChart — line/area chart for évolution du CA over time. */
export function TrendChart({ data = [], dataKey = 'value', xKey = 'label', area = true, height = 240, color = 'var(--color-primary)' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return React.createElement('div', { style: { height } });

  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  const cs = typeof window !== 'undefined' && typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const tok = (name, fallback) => (cs ? cs.getPropertyValue(name).trim() || fallback : fallback);
  const resolvedColor = color.startsWith('var(') ? tok(color.slice(4, -1), '#1D4ED8') : color;
  
  const gridStroke = isDark ? '#1E293B' : tok('--border-default', '#E2E8F0');
  const tickFill = isDark ? '#94A3B8' : tok('--text-tertiary', '#64748B');
  const tooltipBg = isDark ? '#0F172A' : tok('--surface-card', '#FFFFFF');
  const tooltipText = isDark ? '#F8FAFC' : tok('--text-primary', '#1F2937');
  const Chart = area ? AreaChart : LineChart;

  const formatTick = (v) => {
    if (typeof v !== 'number') return v;
    if (Math.abs(v) >= 1000) return (v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + 'k';
    return v;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      return (
        <div style={{ background: tooltipBg, border: `1px solid ${gridStroke}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: tooltipText, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: tooltipText }}>Période : {label}</div>
          <div style={{ color: isDark ? '#60A5FA' : '#1D4ED8', fontWeight: 600 }}>
            CA réalisé : {typeof val === 'number' ? val.toLocaleString('fr-FR') + ' FCFA' : val}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height, fontFamily: 'var(--font-sans)' }}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: tickFill }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: tickFill }} axisLine={false} tickLine={false} width={56} tickFormatter={formatTick} />
          <Tooltip content={<CustomTooltip />} />
          {area ? (
            <Area type="monotone" dataKey={dataKey} stroke={resolvedColor} fill={resolvedColor} fillOpacity={0.12} strokeWidth={2} />
          ) : (
            <Line type="monotone" dataKey={dataKey} stroke={resolvedColor} strokeWidth={2} dot={false} />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
