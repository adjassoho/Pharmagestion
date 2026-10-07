import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const PALETTE = ['#3B82F6', '#F97316', '#10B981', '#64748B', '#EF4444'];

/** CategoryDonut — donut chart for répartition par catégorie (stock, ventes). */
export function CategoryDonut({ data = [], height = 220, legend = true }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return React.createElement('div', { style: { height } });

  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  const cs = typeof window !== 'undefined' && typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const resolve = (c) => (c && c.startsWith('var(') && cs ? cs.getPropertyValue(c.slice(4, -1)).trim() || c : c);

  const gridStroke = isDark ? '#1E293B' : (resolve('var(--border-default)') || '#E2E8F0');
  const tooltipBg = isDark ? '#0F172A' : (resolve('var(--surface-card)') || '#FFFFFF');
  const tooltipText = isDark ? '#F8FAFC' : (resolve('var(--text-primary)') || '#1F2937');
  const legendText = isDark ? '#E2E8F0' : (resolve('var(--text-secondary)') || '#64748B');

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      const val = payload[0].value;
      return (
        <div style={{ background: tooltipBg, border: `1px solid ${gridStroke}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: tooltipText, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: tooltipText }}>{dataItem.label || dataItem.name}</div>
          <div style={{ color: isDark ? '#60A5FA' : '#1D4ED8', fontWeight: 600 }}>
            Part de marché : {val}%
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height, fontFamily: 'var(--font-sans)' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="85%" paddingAngle={2}>
            {data.map((d, i) => (
              <Cell key={i} fill={resolve(d.color || PALETTE[i % PALETTE.length])} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {legend && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-sans)', color: legendText }} />}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
