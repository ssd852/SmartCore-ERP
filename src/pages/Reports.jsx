import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, TrendingUp, DollarSign, Users, Package } from 'lucide-react';
import { formatCurrency } from '../utils/currencyFormatter';
import StatCard from '../components/StatCard';
import { MOCK_SALES_INVOICES, MOCK_PURCHASE_INVOICES, MOCK_EMPLOYEES, MOCK_PAYROLL, MOCK_INVENTORY, MOCK_CUSTOMERS } from '../data/mockData';

export default function Reports() {
  const { t } = useTranslation();

  const totalSales = MOCK_SALES_INVOICES.reduce((s, i) => s + i.amount, 0);
  const totalPurchases = MOCK_PURCHASE_INVOICES.reduce((s, i) => s + i.total_amount, 0);
  const totalPayroll = MOCK_PAYROLL.reduce((s, p) => s + p.net_salary, 0);
  const grossProfit = totalSales - totalPurchases;

  const fmt = (n) => formatCurrency(n);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-5 flex items-center gap-4" style={{ borderTop: '2px solid rgba(168,85,247,0.4)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)' }}>
          <BarChart3 size={20} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-base font-black text-slate-100">{t('reports')}</h1>
          <p className="text-xs text-slate-500">ملخص مالي شامل للمؤسسة</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المبيعات" value={fmt(totalSales)} icon={TrendingUp} trend="up" trendValue="+18%" accentColor="#10b981" />
        <StatCard title="إجمالي المشتريات" value={fmt(totalPurchases)} icon={Package} trend="neutral" accentColor="#f59e0b" />
        <StatCard title="مصروفات الرواتب" value={fmt(totalPayroll)} icon={DollarSign} trend="down" trendValue="-3%" accentColor="#f43f5e" />
        <StatCard title="إجمالي الأرباح" value={fmt(grossProfit)} icon={BarChart3} trend="up" trendValue="+22%" accentColor="#6366f1" />
      </div>

      {/* Summary tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sales by status */}
        <div className="glass-strong rounded-2xl overflow-hidden" style={{ borderTop: '2px solid rgba(16,185,129,0.35)' }}>
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-bold text-slate-200">توزيع فواتير المبيعات حسب الحالة</h2>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {['مدفوع', 'غير مدفوع', 'جزئي'].map(status => {
              const items = MOCK_SALES_INVOICES.filter(i => i.status === status);
              const total = items.reduce((s, i) => s + i.amount, 0);
              const pct = totalSales > 0 ? Math.round((total / totalSales) * 100) : 0;
              const colors = { 'مدفوع': '#10b981', 'غير مدفوع': '#f43f5e', 'جزئي': '#f59e0b' };
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-20 shrink-0">{status}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: colors[status] }} />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300 w-16 text-end">{fmt(total)}</span>
                  <span className="text-xs text-slate-600 w-8 text-end">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payroll by dept */}
        <div className="glass-strong rounded-2xl overflow-hidden" style={{ borderTop: '2px solid rgba(99,102,241,0.35)' }}>
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-bold text-slate-200">الرواتب حسب القسم</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['الموظف', 'القسم', 'صافي الراتب'].map(h => (
                    <th key={h}><span className="text-slate-600">{h}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_PAYROLL.slice(0, 6).map((p, i) => {
                  const emp = MOCK_EMPLOYEES.find(e => e.emp_id === p.emp_id);
                  return (
                    <tr key={i}>
                      <td className="text-slate-300 text-xs">{emp?.name || p.emp_id}</td>
                      <td className="text-slate-500 text-xs">{emp?.department || '—'}</td>
                      <td className="font-mono text-emerald-400 text-xs font-bold">{p.net_salary.toLocaleString()} ر.س</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'الموردون', val: 5, color: '#10b981' },
          { label: 'العملاء', val: MOCK_CUSTOMERS.length, color: '#0ea5e9' },
          { label: 'أصناف المخزون', val: MOCK_INVENTORY.length, color: '#f59e0b' },
          { label: 'الموظفون', val: MOCK_EMPLOYEES.length, color: '#6366f1' },
          { label: 'فواتير مبيعات', val: MOCK_SALES_INVOICES.length, color: '#a855f7' },
          { label: 'فواتير مشتريات', val: MOCK_PURCHASE_INVOICES.length, color: '#f43f5e' },
        ].map(({ label, val, color }) => (
          <div key={label} className="glass rounded-xl p-3 text-center">
            <p className="text-2xl font-black" style={{ color }}>{val}</p>
            <p className="text-[10px] text-slate-600 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
