import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

/** RankingChart — bar chart for classement produits / comparaison de périodes. */
export function RankingChart({ data = [], dataKey = 'value', xKey = 'label', height = 240, color = 'var(--color-accent)', horizontal = false }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return React.createElement('div', { style: { height } });

  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  const cs = typeof window !== 'undefined' && typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const tok = (name, fallback) => (cs ? cs.getPropertyValue(name).trim() || fallback : fallback);
  const resolvedColor = color.startsWith('var(') ? tok(color.slice(4, -1), '#F97316') : color;

  const gridStroke = isDark ? '#1E293B' : tok('--border-default', '#E2E8F0');
  const tickFill = isDark ? '#94A3B8' : tok('--text-tertiary', '#64748B');
  const tooltipBg = isDark ? '#0F172A' : tok('--surface-card', '#FFFFFF');
  const tooltipText = isDark ? '#F8FAFC' : tok('--text-primary', '#1F2937');

  const formatTick = (v) => {
    if (typeof v !== 'number') return v;
    if (Math.abs(v) >= 1000) return (v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + 'k';
    return v;
  };

  const maxValue = Math.max(...data.map((d) => Number(d[dataKey]) || 0), 1);

  if (horizontal) {
    return (
      <div style={{ width: '100%', height, fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px', padding: '4px 0' }}>
        {data.map((item, idx) => {
          const val = Number(item[dataKey]) || 0;
          const pct = Math.min(100, Math.max(6, (val / maxValue) * 100));
          const label = item[xKey] || item.name || '';
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
              <div style={{ width: '130px', minWidth: '130px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: isDark ? '#CBD5E1' : '#334155', fontWeight: 500, textAlign: 'right' }} title={label}>
                {label}
              </div>
              <div style={{ flex: 1, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: '6px', height: '20px', overflow: 'hidden', position: 'relative' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: resolvedColor,
                    borderRadius: '6px',
                    transition: 'width 0.4s ease-out',
                    boxShadow: '0 2px 6px rgba(249,115,22,0.25)'
                  }}
                />
              </div>
              <div style={{ width: '60px', minWidth: '60px', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600, fontSize: '12px', textAlign: 'right' }}>
                {val.toLocaleString('fr-FR')} u.
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      const val = payload[0].value;
      return (
        <div style={{ background: tooltipBg, border: `1px solid ${gridStroke}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: tooltipText, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: tooltipText }}>{dataItem.label || dataItem.name}</div>
          <div style={{ color: isDark ? '#60A5FA' : '#1D4ED8', fontWeight: 600 }}>
            Ventes : {typeof val === 'number' ? val.toLocaleString('fr-FR') : val} unités
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height, fontFamily: 'var(--font-sans)' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 24, left: 10, bottom: 10 }}
        >
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey={xKey} interval={0} tick={{ fontSize: 12, fill: tickFill }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: tickFill }} axisLine={false} tickLine={false} width={56} tickFormatter={formatTick} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(128,128,128,0.12)' }} />
          <Bar dataKey={dataKey} fill={resolvedColor} radius={[6, 6, 0, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
