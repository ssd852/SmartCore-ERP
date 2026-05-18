import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import { supabase, supabaseReady } from '../config/supabaseClient';
import {
  TrendingUp, TrendingDown, Users, Package,
  FileText, UserCheck, AlertTriangle,
  BarChart3, Building, Loader2
} from 'lucide-react';

/* ── Currency formatter using ₪ ── */
function fmt(n) {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(n);
  let display;
  if (abs >= 1_000_000) {
    display = (n / 1_000_000).toFixed(2) + 'M';
  } else if (abs >= 1_000) {
    display = (n / 1_000).toFixed(1) + 'K';
  } else {
    display = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return '₪' + display;
}

/* ── Skeleton shimmer for loading cards ── */
function SkeletonCard() {
  return (
    <div className="glass-strong rounded-2xl p-5 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 rounded-full bg-white/8" />
        <div className="w-10 h-10 rounded-xl bg-white/8" />
      </div>
      <div className="h-7 w-32 rounded-lg bg-white/10" />
      <div className="h-2.5 w-20 rounded-full bg-white/6" />
    </div>
  );
}

/* ── Dashboard default stats shape ── */
const DEFAULT_STATS = {
  totalSales:        0,
  totalPurchases:    0,
  totalPayroll:      0,
  netProfit:         0,
  totalCustomers:    0,
  employeeCount:     0,
  unpaidInvoices:    0,
  lowStockItems:     0,
  salesInvoiceCount: 0,
  inventoryCount:    0,
  recentInvoices:    [],
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { lang } = useApp();

  const [stats, setStats]       = useState(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);

  /* ── Read the logged-in role for welcome text ── */
  const userRole = localStorage.getItem('userRole') || 'Admin';
  const roleLabel =
    userRole === 'Admin'     ? (lang === 'ar' ? 'مدير النظام' : 'Admin') :
    userRole === 'Accountant'? (lang === 'ar' ? 'محاسب'       : 'Accountant') :
                               (lang === 'ar' ? 'مدقق'        : 'Auditor');

  useEffect(() => {
    if (!supabaseReady) {
      setIsLoading(false);
      return;
    }

    /* ── Fetch ALL raw rows from every table concurrently.
          Hoisted outside the channel callback so realtime can re-call it. ── */
    async function fetchDashboardStats() {
      setIsLoading(true);
      try {
        const [salesRes, purchasesRes, payrollRes, customersRes, inventoryRes, employeesRes] =
          await Promise.allSettled([
            supabase.from('sales').select('*').order('invoice_id', { ascending: false }),
            supabase.from('purchases').select('*').order('invoice_id', { ascending: false }),
            supabase.from('payroll').select('*'),
            supabase.from('customers').select('*'),
            supabase.from('inventory').select('*'),
            supabase.from('employees').select('*'),
          ]);

        const salesData     = (salesRes.status     === 'fulfilled' && !salesRes.value.error)     ? (salesRes.value.data     ?? []) : [];
        const purchasesData = (purchasesRes.status === 'fulfilled' && !purchasesRes.value.error) ? (purchasesRes.value.data ?? []) : [];
        const payrollData   = (payrollRes.status   === 'fulfilled' && !payrollRes.value.error)   ? (payrollRes.value.data   ?? []) : [];
        const customersData = (customersRes.status === 'fulfilled' && !customersRes.value.error) ? (customersRes.value.data ?? []) : [];
        const inventoryData = (inventoryRes.status === 'fulfilled' && !inventoryRes.value.error) ? (inventoryRes.value.data ?? []) : [];
        const employeesData = (employeesRes.status === 'fulfilled' && !employeesRes.value.error) ? (employeesRes.value.data ?? []) : [];

        console.log('[Dashboard] Raw data:', {
          salesData, purchasesData, payrollData,
          customersData, inventoryData, employeesData,
          salesErr:     salesRes.status     === 'fulfilled' ? salesRes.value.error     : salesRes.reason,
          purchasesErr: purchasesRes.status === 'fulfilled' ? purchasesRes.value.error : purchasesRes.reason,
          payrollErr:   payrollRes.status   === 'fulfilled' ? payrollRes.value.error   : payrollRes.reason,
        });

        const totalSales = salesData.reduce(
          (sum, item) => sum + (Number(item.amount) || Number(item.total_amount) || Number(item.total) || 0), 0
        );
        const totalPurchases = purchasesData.reduce(
          (sum, item) => sum + (Number(item.total_amount) || Number(item.amount) || Number(item.total) || 0), 0
        );
        const totalPayroll = payrollData.reduce(
          (sum, item) => sum + (Number(item.net_salary) || Number(item.amount) || Number(item.salary) || 0), 0
        );

        const totalCustomers    = customersData.length;
        const employeeCount     = employeesData.length;
        const salesInvoiceCount = salesData.length;
        const inventoryCount    = inventoryData.length;
        const unpaidInvoices    = salesData.filter(r => r.status === 'غير مدفوع').length;
        const lowStockItems     = inventoryData.filter(r => Number(r.quantity) < 20).length;
        const recentInvoices    = salesData.slice(0, 5);
        const netProfit         = totalSales - (totalPurchases + totalPayroll);

        console.log('[Dashboard] Metrics:', { totalSales, totalPurchases, totalPayroll, netProfit, totalCustomers, employeeCount });

        setStats({
          totalSales, totalPurchases, totalPayroll, netProfit,
          totalCustomers, employeeCount,
          unpaidInvoices, lowStockItems,
          salesInvoiceCount, inventoryCount,
          recentInvoices,
        });
      } catch (err) {
        console.error('[Dashboard] fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    /* ── Initial load ── */
    fetchDashboardStats();

    /* ── Realtime subscription ───────────────────────────────────────────
          Listens to INSERT / UPDATE / DELETE on the 3 financial tables.
          Any change triggers a full re-fetch so numbers update instantly.
          One channel handles all 3 tables to minimise WebSocket connections.
    ─────────────────────────────────────────────────────────────────── */
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          console.log('[Realtime] sales change:', payload.eventType);
          fetchDashboardStats();
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' },
        (payload) => {
          console.log('[Realtime] purchases change:', payload.eventType);
          fetchDashboardStats();
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll' },
        (payload) => {
          console.log('[Realtime] payroll change:', payload.eventType);
          fetchDashboardStats();
        })
      .subscribe((status) => {
        console.log('[Dashboard] Realtime channel status:', status);
      });

    /* ── Cleanup: remove channel on unmount to avoid duplicate listeners ── */
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const {
    totalSales, totalPurchases, totalPayroll, netProfit,
    totalCustomers, employeeCount,
    unpaidInvoices, lowStockItems, salesInvoiceCount,
    inventoryCount, recentInvoices,
  } = stats;

  /* ── Dynamic profit color ── */
  const profitColor  = netProfit >= 0 ? '#10b981' : '#f43f5e';
  const profitTrend  = netProfit >= 0 ? 'up'      : 'down';
  const profitIcon   = netProfit >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="flex flex-col gap-4 md:gap-6">

      {/* ── Welcome Banner ── */}
      <div
        className="glass-strong rounded-2xl p-4 md:p-6 relative overflow-hidden"
        style={{ borderTop: '2px solid rgba(99,102,241,0.4)' }}
      >
        <div
          className="absolute -top-12 -end-12 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)' }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}
            >
              <BarChart3 size={18} color="white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-black text-slate-100 truncate">
                {lang === 'ar' ? `👋 مرحباً، ${roleLabel}` : `👋 Welcome, ${roleLabel}`}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                {lang === 'ar' ? 'هذا ملخص أداء المؤسسة — بيانات حية من قاعدة البيانات' : "Live enterprise performance summary from the database"}
              </p>
            </div>
          </div>
        </div>
        {/* Live badge */}
        {!isLoading && (
          <div className="absolute top-3 end-3 md:top-4 md:end-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase">Live</span>
          </div>
        )}
        {isLoading && (
          <div className="absolute top-3 end-3 md:top-4 md:end-4 flex items-center gap-1.5">
            <Loader2 size={13} className="text-slate-500 animate-spin" />
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Loading</span>
          </div>
        )}
      </div>

      {/* ── KPI Stats — 6 cards: 1 col on xs, 2 on sm, 3 on lg ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {isLoading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            {/* Row 1 — Revenue / Purchases / Payroll */}
            <StatCard
              title={lang === 'ar' ? 'المبيعات' : 'Total Sales'}
              value={fmt(totalSales)}
              subtitle={lang === 'ar' ? `${salesInvoiceCount} فاتورة مبيعات` : `${salesInvoiceCount} sales invoices`}
              icon={TrendingUp}
              trend="up"
              trendValue={salesInvoiceCount > 0 ? `${salesInvoiceCount}` : '—'}
              accentColor="#10b981"
            />
            <StatCard
              title={lang === 'ar' ? 'المشتريات' : 'Total Purchases'}
              value={fmt(totalPurchases)}
              subtitle={lang === 'ar' ? 'إجمالي فواتير الموردين' : 'Total supplier invoices'}
              icon={TrendingDown}
              trend="down"
              trendValue="—"
              accentColor="#f43f5e"
            />
            <StatCard
              title={lang === 'ar' ? 'الرواتب المدفوعة' : 'Total Payroll'}
              value={fmt(totalPayroll)}
              subtitle={lang === 'ar' ? 'صافي رواتب الموظفين' : 'Net employee salaries paid'}
              icon={UserCheck}
              trend="down"
              trendValue="—"
              accentColor="#a855f7"
            />

            {/* Row 2 — Net Profit / Customers / Employees */}
            <StatCard
              title={lang === 'ar' ? 'صافي الربح' : 'Net Profit'}
              value={fmt(netProfit)}
              subtitle={
                lang === 'ar'
                  ? 'المبيعات − (المشتريات + الرواتب)'
                  : 'Sales − (Purchases + Payroll)'
              }
              icon={profitIcon}
              trend={profitTrend}
              trendValue={netProfit >= 0 ? '▲ ربح' : '▼ خسارة'}
              accentColor={profitColor}
            />
            <StatCard
              title={lang === 'ar' ? 'عدد العملاء' : 'Customers'}
              value={totalCustomers}
              subtitle={lang === 'ar' ? 'عملاء مسجلون في النظام' : 'Registered clients in system'}
              icon={Users}
              trend="up"
              trendValue={`${totalCustomers}`}
              accentColor="#6366f1"
            />
            <StatCard
              title={lang === 'ar' ? 'عدد الموظفين' : 'Employees'}
              value={employeeCount}
              subtitle={lang === 'ar' ? 'موظفون نشطون' : 'Active staff members'}
              icon={Building}
              trend="up"
              trendValue={`${employeeCount}`}
              accentColor="#0ea5e9"
            />
          </>
        )}
      </div>

      {/* ── Alerts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* Unpaid invoices */}
        <div className="glass rounded-2xl p-4 flex items-center gap-4 border border-rose-500/15">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-500/15">
            <AlertTriangle size={18} className="text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200">
              {isLoading
                ? <span className="inline-block h-3 w-28 rounded-full bg-white/10 animate-pulse" />
                : lang === 'ar' ? `${unpaidInvoices} فاتورة غير مدفوعة` : `${unpaidInvoices} Unpaid Invoices`
              }
            </p>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'تتطلب مراجعة ومتابعة عاجلة' : 'Require urgent follow-up'}
            </p>
          </div>
        </div>

        {/* Low stock */}
        <div className="glass rounded-2xl p-4 flex items-center gap-4 border border-amber-500/15">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/15">
            <Package size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200">
              {isLoading
                ? <span className="inline-block h-3 w-28 rounded-full bg-white/10 animate-pulse" />
                : lang === 'ar' ? `${lowStockItems} أصناف منخفضة المخزون` : `${lowStockItems} Low Stock Items`
              }
            </p>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'الكمية أقل من 20 وحدة' : 'Quantity below 20 units'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { icon: FileText,  label: lang === 'ar' ? 'فواتير المبيعات' : 'Sales Invoices', val: salesInvoiceCount, color: '#10b981' },
          { icon: Package,   label: lang === 'ar' ? 'أصناف المخزون'  : 'Inventory Items', val: inventoryCount,   color: '#f59e0b' },
          { icon: UserCheck, label: lang === 'ar' ? 'الموظفون'       : 'Employees',       val: employeeCount,    color: '#0ea5e9' },
          { icon: Building,  label: lang === 'ar' ? 'إجمالي العملاء' : 'Total Customers', val: totalCustomers,   color: '#a855f7' },
        ].map(({ icon: Icon, label, val, color }) => (
          <div key={label} className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div>
              {isLoading
                ? <div className="h-6 w-12 rounded-lg bg-white/10 animate-pulse mb-1" />
                : <p className="text-xl font-black" style={{ color }}>{val}</p>
              }
              <p className="text-[11px] text-slate-600 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent Invoices Table ── */}
      <div className="glass-strong rounded-2xl overflow-hidden" style={{ borderTop: '2px solid rgba(16,185,129,0.35)' }}>
        <div className="px-4 md:px-5 py-3 md:py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200">
            {lang === 'ar' ? 'آخر فواتير المبيعات' : 'Recent Sales Invoices'}
          </h2>
          <span className="text-xs text-slate-600">
            {lang === 'ar' ? 'آخر 5 فواتير' : 'Last 5 invoices'}
          </span>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col gap-0">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/4 animate-pulse">
                  <div className="h-3 w-16 rounded-full bg-white/8" />
                  <div className="h-3 w-20 rounded-full bg-white/6" />
                  <div className="h-3 w-16 rounded-full bg-white/8 ms-auto" />
                  <div className="h-5 w-14 rounded-full bg-white/6" />
                </div>
              ))}
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-600 gap-2">
              <FileText size={22} />
              <p className="text-xs font-medium">{lang === 'ar' ? 'لا توجد فواتير بعد' : 'No invoices yet'}</p>
            </div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {[
                    lang === 'ar' ? 'رقم الفاتورة' : 'Invoice #',
                    lang === 'ar' ? 'العميل'        : 'Customer ID',
                    lang === 'ar' ? 'التاريخ'       : 'Date',
                    lang === 'ar' ? 'المبلغ'        : 'Amount',
                    lang === 'ar' ? 'الحالة'        : 'Status',
                  ].map(h => (
                    <th key={h}><span className="text-slate-600 font-bold">{h}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv, i) => (
                  <tr key={inv.invoice_id ?? i}>
                    <td className="text-indigo-400 font-mono font-semibold text-xs">{inv.invoice_id}</td>
                    <td className="text-slate-400">{inv.customer_id || '—'}</td>
                    <td className="text-slate-400">{inv.invoice_date || '—'}</td>
                    <td className="font-mono text-amber-400 font-bold">
                      {inv.amount != null ? `₪${Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        inv.status === 'مدفوع'     ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                        : inv.status === 'غير مدفوع' ? 'bg-rose-500/15    text-rose-400    border-rose-500/25'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                      }`}>
                        {inv.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
