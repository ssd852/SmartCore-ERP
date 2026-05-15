import React from 'react';

const VARIANTS = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  error:   'bg-rose-500/15 text-rose-400 border-rose-500/25',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  info:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  neutral: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
  indigo:  'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  purple:  'bg-purple-500/15 text-purple-400 border-purple-500/25',
};

const STATUS_MAP = {
  // Arabic
  'مدفوع': 'success', 'مكتمل': 'success', 'نشط': 'success',
  'غير مدفوع': 'error', 'متأخر': 'error', 'غير نشط': 'error',
  'جزئي': 'warning', 'معلق': 'warning',
  // English
  'paid': 'success', 'active': 'success', 'completed': 'success',
  'unpaid': 'error', 'inactive': 'error', 'overdue': 'error',
  'partial': 'warning', 'pending': 'warning',
  // Account types
  'دخل': 'success', 'income': 'success',
  'مصروف': 'error', 'expense': 'error',
  'أصل': 'info', 'asset': 'info',
  'التزام': 'warning', 'liability': 'warning',
  'حقوق ملكية': 'indigo', 'equity': 'indigo',
  // Check types
  'وارد': 'success', 'incoming': 'success',
  'صادر': 'warning', 'outgoing': 'warning',
};

export default function Badge({ label, variant }) {
  const v = variant || STATUS_MAP[label?.toLowerCase?.()] || STATUS_MAP[label] || 'neutral';
  const classes = VARIANTS[v] || VARIANTS.neutral;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${classes}`}>
      {label}
    </span>
  );
}
