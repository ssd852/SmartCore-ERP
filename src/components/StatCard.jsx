import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,        // 'up' | 'down' | 'neutral'
  trendValue,   // e.g. '+12.5%'
  accentColor = '#6366f1',
  valueColor,
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#f43f5e' : '#64748b';

  return (
    <div
      className="glass-strong rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group"
      style={{ borderTop: `2px solid ${accentColor}35` }}
    >
      {/* Background glow */}
      <div
        className="absolute -top-6 -end-6 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accentColor}20, transparent 70%)` }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 mb-2 tracking-wide uppercase">{title}</p>
          <p
            className="text-2xl font-black leading-tight"
            style={{ color: valueColor || accentColor }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-600 mt-1 font-medium">{subtitle}</p>
          )}
          {trendValue && (
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon size={12} style={{ color: trendColor }} />
              <span className="text-[11px] font-bold" style={{ color: trendColor }}>{trendValue}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ms-3"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}25` }}
          >
            <Icon size={20} style={{ color: accentColor }} />
          </div>
        )}
      </div>
    </div>
  );
}
