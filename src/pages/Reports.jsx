import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, TrendingUp, DollarSign, Users, Package, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/currencyFormatter';
import StatCard from '../components/StatCard';
import { supabase, supabaseReady } from '../config/supabaseClient';

/* ─── initial state ─── */
const INIT = {
  totalSales: 0, totalPurchases: 0, totalPayroll: 0, netProfit: 0,
  salesByStatus: { 'مدفوع': 0, 'غير مدفوع': 0, 'جزئي': 0 },
  payrollRows: [],
  counts: { suppliers: 0, customers: 0, inventory: 0, employees: 0, sales: 0, purchases: 0 },
};

export default function Reports() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(INIT);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabaseReady) { setIsLoading(false); return; }

    async function fetchAll() {
      setIsLoading(true);
      try {
        const [
          salesRes, purchasesRes, payrollRes,
          suppliersRes, customersRes, inventoryRes, employeesRes,
        ] = await Promise.allSettled([
          supabase.from('sales').select('*'),
          supabase.from('purchases').select('*'),
          supabase.from('payroll').select('*'),
          supabase.from('suppliers').select('*'),
          supabase.from('customers').select('*'),
          supabase.from('inventory').select('*'),
          supabase.from('employees').select('*'),
        ]);

        const ok = (res) =>
          res.status === 'fulfilled' && !res.value.error ? (res.value.data ?? []) : [];

        const salesData     = ok(salesRes);
        const purchasesData = ok(purchasesRes);
        const payrollData   = ok(payrollRes);
        const suppliersData = ok(suppliersRes);
        const customersData = ok(customersRes);
        const inventoryData = ok(inventoryRes);
        const employeesData = ok(employeesRes);

        /* ── Aggregations ── */
        const totalSales = salesData.reduce(
          (s, i) => s + (Number(i.amount) || Number(i.total_amount) || 0), 0
        );
        const totalPurchases = purchasesData.reduce(
          (s, i) => s + (Number(i.total_amount) || Number(i.amount) || 0), 0
        );
        const totalPayroll = payrollData.reduce(
          (s, p) => s + (Number(p.net_salary) || Number(p.basic_salary) || 0), 0
        );
        const netProfit = totalSales - (totalPurchases + totalPayroll);

        /* ── Sales by status ── */
        const salesByStatus = { 'مدفوع': 0, 'غير مدفوع': 0, 'جزئي': 0 };
        salesData.forEach(i => {
          const s = i.status;
          if (s in salesByStatus)
            salesByStatus[s] += Number(i.amount) || Number(i.total_amount) || 0;
        });

        /* ── Payroll table rows (latest 6) ── */
        const payrollRows = payrollData.slice(0, 6).map(p => ({
          emp_id:     p.emp_id     ?? '—',
          month_year: p.month_year ?? '—',
          net_salary: Number(p.net_salary) || Number(p.basic_salary) || 0,
        }));

        /* ── Counts ── */
        const counts = {
          suppliers: suppliersData.length,
          customers: customersData.length,
          inventory: inventoryData.length,
          employees: employeesData.length,
          sales:     salesData.length,
          purchases: purchasesData.length,
        };

        setStats({ totalSales, totalPurchases, totalPayroll, netProfit, salesByStatus, payrollRows, counts });
      } catch (err) {
        console.error('[Reports] fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAll();
  }, []);

  const { totalSales, totalPurchases, totalPayroll, netProfit, salesByStatus, payrollRows, counts } = stats;
  const fmt = (n) => formatCurrency(n);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="glass-strong rounded-2xl p-5 flex items-center gap-4" style={{ borderTop: '2px solid rgba(168,85,247,0.4)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)' }}>
          <BarChart3 size={20} className="text-purple-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-black text-slate-100">{t('reports')}</h1>
          <p className="text-xs text-slate-500">ملخص مالي شامل للمؤسسة — بيانات حية من قاعدة البيانات</p>
        </div>
        {isLoading && <Loader2 size={18} className="text-purple-400 animate-spin" />}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المبيعات"    value={fmt(totalSales)}     icon={TrendingUp} trend="up"      accentColor="#10b981" />
        <StatCard title="إجمالي المشتريات"  value={fmt(totalPurchases)} icon={Package}    trend="neutral"  accentColor="#f59e0b" />
        <StatCard title="مصروفات الرواتب"   value={fmt(totalPayroll)}   icon={DollarSign} trend="down"     accentColor="#f43f5e" />
        <StatCard title="صافي الأرباح"       value={fmt(netProfit)}      icon={BarChart3}  trend={netProfit >= 0 ? 'up' : 'down'} accentColor="#6366f1" />
      </div>

      {/* ── Summary tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Sales by status */}
        <div className="glass-strong rounded-2xl overflow-hidden" style={{ borderTop: '2px solid rgba(16,185,129,0.35)' }}>
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-bold text-slate-200">توزيع فواتير المبيعات حسب الحالة</h2>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {isLoading
              ? <div className="flex items-center gap-2 text-slate-600 text-xs"><Loader2 size={14} className="animate-spin" /> جارٍ التحميل...</div>
              : ['مدفوع', 'غير مدفوع', 'جزئي'].map(status => {
                  const val = salesByStatus[status] ?? 0;
                  const pct = totalSales > 0 ? Math.round((val / totalSales) * 100) : 0;
                  const colors = { 'مدفوع': '#10b981', 'غير مدفوع': '#f43f5e', 'جزئي': '#f59e0b' };
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-20 shrink-0">{status}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: colors[status] }} />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-300 w-16 text-end">{fmt(val)}</span>
                      <span className="text-xs text-slate-600 w-8 text-end">{pct}%</span>
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* Payroll table */}
        <div className="glass-strong rounded-2xl overflow-hidden" style={{ borderTop: '2px solid rgba(99,102,241,0.35)' }}>
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-bold text-slate-200">آخر سجلات الرواتب</h2>
          </div>
          <div className="overflow-x-auto">
            {isLoading
              ? <div className="flex items-center gap-2 p-5 text-slate-600 text-xs"><Loader2 size={14} className="animate-spin" /> جارٍ التحميل...</div>
              : payrollRows.length === 0
                ? <p className="text-xs text-slate-600 p-5 text-center">لا توجد بيانات رواتب</p>
                : (
                  <table className="erp-table">
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        {['رقم الموظف', 'الشهر', 'صافي الراتب'].map(h => (
                          <th key={h}><span className="text-slate-600">{h}</span></th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payrollRows.map((p, i) => (
                        <tr key={i}>
                          <td className="text-slate-300 text-xs">{p.emp_id}</td>
                          <td className="text-slate-500 text-xs">{p.month_year}</td>
                          <td className="font-mono text-emerald-400 text-xs font-bold">{fmt(p.net_salary)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
            }
          </div>
        </div>
      </div>

      {/* ── Quick count cards ── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'الموردون',       val: counts.suppliers, color: '#10b981' },
          { label: 'العملاء',         val: counts.customers,  color: '#0ea5e9' },
          { label: 'أصناف المخزون', val: counts.inventory,  color: '#f59e0b' },
          { label: 'الموظفون',       val: counts.employees, color: '#6366f1' },
          { label: 'فواتير مبيعات', val: counts.sales,     color: '#a855f7' },
          { label: 'فواتير مشتريات',val: counts.purchases, color: '#f43f5e' },
        ].map(({ label, val, color }) => (
          <div key={label} className="glass rounded-xl p-3 text-center">
            {isLoading
              ? <Loader2 size={20} className="mx-auto animate-spin mb-1" style={{ color }} />
              : <p className="text-2xl font-black" style={{ color }}>{val}</p>
            }
            <p className="text-[10px] text-slate-600 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
