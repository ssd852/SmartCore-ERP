import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Download, Trash2, AlertTriangle, Loader2,
  Database, FileDown, CheckCircle2, XCircle, Server, Lock, Zap
} from 'lucide-react';
import { supabase, supabaseReady } from '../config/supabaseClient';
import { exportMultipleToCSV } from '../utils/exportToCSV';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';

const CONFIRM_PHRASE = 'تأكيد الحذف';
const MASTER_CONFIRM_PHRASE = 'مسح شامل';

const BACKUP_TABLES = [
  { key: 'suppliers',         label: 'الموردون' },
  { key: 'customers',         label: 'العملاء' },
  { key: 'employees',         label: 'الموظفون' },
  { key: 'inventory',         label: 'المخزون' },
  { key: 'sales',             label: 'فواتير المبيعات' },
  { key: 'purchases',         label: 'فواتير المشتريات' },
  { key: 'payroll',           label: 'مسيرات الرواتب' },
  { key: 'fixed_assets',      label: 'الأصول الثابتة' },
  { key: 'checks',            label: 'الشيكات' },
  { key: 'chart_of_accounts', label: 'دليل الحسابات' },
  { key: 'journal_entries',   label: 'القيود اليومية' },
];

/* ── Animated status badge ── */
function StatusBadge({ state }) {
  const cfg = {
    idle:    { color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-600',  label: 'جاهز' },
    loading: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20',  dot: 'bg-amber-400',  label: 'جارٍ التنفيذ...' },
    success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400', label: 'تم بنجاح' },
    error:   { color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20',        dot: 'bg-rose-400',    label: 'خطأ' },
  };
  const c = cfg[state] || cfg.idle;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${state === 'loading' ? 'animate-pulse' : ''}`} />
      {c.label}
    </span>
  );
}

/* ── Section wrapper card ── */
function SectionCard({ children, glowColor = '#6366f1', danger = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: `0 0 40px ${glowColor}12, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${glowColor}90, transparent)` }}
      />
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   SECTION A — DATA BACKUP
═══════════════════════════════════════════ */

const columnTranslations = {
  // Common Fields
  id: "المعرف",
  created_at: "تاريخ التسجيل",
  status: "الحالة",
  type: "النوع",
  user_id: "رقم المستخدم",
  created_by: "بواسطة",
  
  // Checks Module (From image_7dcba1.png)
  check_id: "معرف الشيك",
  check_number: "رقم الشيك",
  bank_name: "اسم البنك",
  due_date: "تاريخ الاستحقاق",
  amount: "المبلغ",
  
  // Invoices (Sales & Purchases)
  invoice_number: "رقم الفاتورة",
  customer_name: "اسم العميل",
  supplier_name: "اسم المورد",
  total_amount: "إجمالي القيمة",
  tax: "الضريبة",
  discount: "الخصم",
  
  // Inventory & Items
  item_name: "اسم الصنف",
  sku: "رمز المنتج",
  quantity: "الكمية المتوفرة",
  price: "سعر الوحدة",
  category: "الفئة",
  
  // HR & Payroll
  employee_name: "اسم الموظف",
  salary: "الراتب الأساسي",
  net_salary: "صافي الراتب",
  allowances: "البدلات",
  deductions: "الاستقطاعات",
  month: "الشهر"
};
const generateHTMLReport = (tableNameArabic, tableNameEnglish, data) => {
  const dateStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const rowCount = data ? data.length : 0;
  
  const headers = rowCount > 0 ? Object.keys(data[0]) : [];

  const rowsHtml = rowCount > 0 ? data.map(row => `
    <tr>
      ${headers.map(h => `<td>${row[h] !== null && row[h] !== undefined ? String(row[h]).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</td>`).join('')}
    </tr>
  `).join('') : '<tr><td colspan="100%" style="text-align: center; padding: 20px; font-weight: bold; color: var(--secondary);">لا توجد سجلات مسجلة في هذا القسم حالياً.</td></tr>';

  const theadHtml = headers.length > 0 ? `
    <thead>
      <tr>
        ${headers.map(h => {
          const translatedHeader = columnTranslations[h] || h;
          return `<th>${translatedHeader}</th>`;
        }).join('')}
      </tr>
    </thead>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>نسخة احتياطية - ${tableNameArabic}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1e293b;
      --secondary: #475569;
      --accent: #4f46e5;
      --bg: #f8fafc;
      --border: #e2e8f0;
    }
    body {
      font-family: 'Cairo', sans-serif;
      background-color: var(--bg);
      color: var(--primary);
      margin: 0;
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .header {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      padding: 24px 32px;
      background: linear-gradient(135deg, #f1f5f9, #ffffff);
      border-bottom: 2px solid var(--accent);
    }
    .header-right { text-align: right; }
    .header-center { text-align: center; }
    .header-left { text-align: left; }
    .system-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--accent);
      margin: 0 0 4px 0;
    }
    .report-title {
      font-size: 24px;
      font-weight: 900;
      color: var(--primary);
      margin: 0;
    }
    .meta-text {
      font-size: 13px;
      color: var(--secondary);
      font-weight: 600;
      margin: 2px 0;
    }
    .table-wrapper {
      overflow-x: auto;
      padding: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: right;
    }
    th {
      background: var(--primary);
      color: white;
      font-weight: 600;
      padding: 14px 16px;
      font-size: 14px;
      white-space: nowrap;
      border: 1px solid var(--primary);
      text-align: right;
    }
    td {
      padding: 12px 16px;
      font-size: 13px;
      color: var(--secondary);
      border-bottom: 1px solid var(--border);
      border-right: 1px solid var(--border);
    }
    td:last-child { border-left: 1px solid var(--border); }
    tbody tr:nth-child(even) { background-color: #f8fafc; }
    tbody tr:hover { background-color: #f1f5f9; }
    .footer {
      padding: 16px 32px;
      background: #ffffff;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 12px;
      color: var(--secondary);
    }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; border: none; }
      .no-print { display: none; }
      th { background: #f1f5f9; color: black; }
      @page { margin: 1cm; size: landscape; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-right">
        <h3 class="system-title">المحاسب الذكي ERP - نظام إدارة البيانات</h3>
      </div>
      <div class="header-center">
        <h1 class="report-title">تقرير سجلات: ${tableNameArabic}</h1>
      </div>
      <div class="header-left">
        <p class="meta-text">تاريخ التصدير: <span dir="ltr">${dateStr}</span></p>
        <p class="meta-text">إجمالي السجلات: <strong style="color:var(--accent)">${rowCount}</strong></p>
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        ${theadHtml}
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
    <div class="footer">
      تم إنشاء هذا التقرير تلقائياً بواسطة نظام المحاسب الذكي ERP © ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>
  `.trim();
};

function BackupSection() {
  const addToast = useToast();
  const [backupState, setBackupState] = useState('idle');
  const [progress, setProgress] = useState({ current: 0, total: BACKUP_TABLES.length, label: '' });
  const [tableCounts, setTableCounts] = useState({});

  useEffect(() => {
    async function fetchCounts() {
      if (!supabaseReady || !supabase) return;
      const counts = {};
      for (const t of BACKUP_TABLES) {
        try {
          const { count, error } = await supabase.from(t.key).select('*', { count: 'exact', head: true });
          counts[t.key] = error ? '?' : count;
        } catch (e) {
          counts[t.key] = '?';
        }
      }
      setTableCounts(counts);
    }
    fetchCounts();
  }, []);

  const downloadSingleTable = async (key, label) => {
    try {
      if (!supabaseReady || !supabase) throw new Error("قاعدة البيانات غير متصلة");
      const { data: rows, error } = await supabase.from(key).select('*');
      if (error) throw error;
      const data = rows || [];
      const htmlString = generateHTMLReport(label, key, data);
      const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `نسخة_احتياطية_${key}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast(`✓ تم تنزيل تقرير ${label} بنجاح`, 'success');
    } catch (err) {
      addToast('فشل التنزيل: ' + err.message, 'error');
    }
  };

  const handleFullBackup = async () => {
    setBackupState('loading');
    setProgress({ current: 0, total: BACKUP_TABLES.length, label: 'جارٍ جلب البيانات...' });
    try {
      if (!supabaseReady || !supabase) throw new Error("قاعدة البيانات غير متصلة");
      for (let i = 0; i < BACKUP_TABLES.length; i++) {
        const { key, label } = BACKUP_TABLES[i];
        setProgress({ current: i + 1, total: BACKUP_TABLES.length, label });

        try {
          const { data: rows, error } = await supabase.from(key).select('*');
          if (error) {
            console.error(`Error fetching table ${key}:`, error);
            // We log but don't throw so the other tables can continue
          }
          const data = rows || [];

          const htmlString = generateHTMLReport(label, key, data);
          const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `نسخة_احتياطية_${key}_${new Date().toISOString().split('T')[0]}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (tableErr) {
          console.error(`Failed to export ${key}:`, tableErr);
        }
        
        await new Promise(r => setTimeout(r, 400)); // prevent browser lockup
      }

      setBackupState('success');
      addToast(`✓ تم تنزيل ${BACKUP_TABLES.length} تقارير HTML بنجاح`, 'success');
      setTimeout(() => setBackupState('idle'), 3500);
    } catch (err) {
      setBackupState('error');
      addToast('فشل التصدير: ' + err.message, 'error');
      setTimeout(() => setBackupState('idle'), 4000);
    }
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <SectionCard glowColor="#10b981">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-4 md:px-6 py-4 md:py-5 border-b border-white/5">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-sm md:text-base font-black text-slate-100">النسخ الاحتياطي الكامل</h2>
              <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full px-2.5 py-0.5 font-bold">
                Zone Sûre ✓
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              تصدير جميع جداول النظام كتقارير HTML تفاعلية واحترافية جاهزة للطباعة والتحليل.
            </p>
          </div>
        </div>
        <StatusBadge state={backupState} />
      </div>

      {/* Table list */}
      <div className="px-4 md:px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-5">
          {BACKUP_TABLES.map(({ key, label }) => (
            <button key={key}
              onClick={() => downloadSingleTable(key, label)}
              title={`تنزيل تقرير ${label}`}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs border border-white/5 hover:bg-white/10 transition-colors text-left"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <Database size={11} className="text-emerald-500/70 shrink-0" />
              <span className="text-slate-400 truncate">{label}</span>
              <Download size={10} className="ms-auto text-emerald-400/50" />
              <span className="text-slate-700 font-mono text-[10px] ms-1">{tableCounts[key] !== undefined ? tableCounts[key] : '...'}</span>
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <AnimatePresence>
          {backupState === 'loading' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 font-medium">{progress.label}</span>
                <span className="text-emerald-400 font-mono font-bold">{pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #10b981, #34d399)', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}
                  animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action button */}
        <motion.button
          onClick={handleFullBackup}
          disabled={backupState === 'loading'}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.02 }}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          style={{
            background: backupState === 'loading'
              ? 'rgba(30,41,59,0.8)'
              : 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
            boxShadow: backupState === 'loading' ? 'none' : '0 4px 20px rgba(16,185,129,0.35)',
            color: 'white',
          }}
        >
          {backupState === 'loading' ? (
            <><Loader2 size={16} className="animate-spin" />جارٍ تحميل البيانات...</>
          ) : backupState === 'success' ? (
            <><CheckCircle2 size={16} className="text-white" />تم التنزيل بنجاح!</>
          ) : (
            <><Download size={16} /><FileDown size={16} />تنزيل النسخة الاحتياطية الكاملة ({BACKUP_TABLES.length} جداول)</>
          )}
        </motion.button>
      </div>
    </SectionCard>
  );
}

/* ═══════════════════════════════════════════
   SECTION A.2 — RECHARGE TENANT CREDITS
═══════════════════════════════════════════ */
function RechargeSection() {
  const addToast = useToast();
  const [tenantId, setTenantId] = useState('');
  const [amount, setAmount] = useState(1000);
  const [rechargeState, setRechargeState] = useState('idle');

  const handleRecharge = async () => {
    if (!tenantId.trim()) return addToast('يرجى إدخال معرف المشترك (Tenant ID)', 'error');
    
    setRechargeState('loading');
    try {
      if (!supabaseReady || !supabase) throw new Error('Supabase غير متصل');
      
      const { data, error } = await supabase.rpc('recharge_tenant_credits', {
        p_tenant_id: tenantId,
        p_amount: Number(amount)
      });
      
      if (error) throw error;
      if (data?.success === false) throw new Error(data.message);
      
      addToast(`✓ تم إضافة ${amount} نقطة بنجاح`, 'success');
      setRechargeState('success');
      setTimeout(() => setRechargeState('idle'), 3000);
      setTenantId('');
    } catch (err) {
      console.error('Recharge Error:', err);
      addToast(err.message || 'فشل الشحن', 'error');
      setRechargeState('error');
      setTimeout(() => setRechargeState('idle'), 3000);
    }
  };

  return (
    <SectionCard glowColor="#3b82f6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-4 md:px-6 py-4 md:py-5 border-b border-white/5">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <Zap size={20} className="text-blue-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-sm md:text-base font-black text-slate-100">شحن نقاط المشتركين</h2>
              <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded-full px-2.5 py-0.5 font-bold">
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              إضافة نقاط (Credits) للمشتركين لاستخدام خدمات الذكاء الاصطناعي والواتساب
            </p>
          </div>
        </div>
        <StatusBadge state={rechargeState} />
      </div>

      <div className="px-4 md:px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">معرف المشترك (Tenant ID)</label>
            <input 
              className="erp-input text-left font-mono text-sm" 
              dir="ltr"
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">كمية النقاط</label>
            <input 
              type="number" 
              className="erp-input text-left font-mono text-sm" 
              dir="ltr"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
        </div>
        
        <motion.button
          onClick={handleRecharge}
          disabled={rechargeState === 'loading'}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.02 }}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: rechargeState === 'loading'
              ? 'rgba(30,41,59,0.8)'
              : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            boxShadow: rechargeState === 'loading' ? 'none' : '0 4px 20px rgba(59,130,246,0.35)',
            color: 'white',
          }}
        >
          {rechargeState === 'loading' ? (
            <><Loader2 size={16} className="animate-spin" />جارٍ الشحن...</>
          ) : rechargeState === 'success' ? (
            <><CheckCircle2 size={16} className="text-white" />تم الشحن بنجاح!</>
          ) : (
            <><Zap size={16} />شحن الحساب</>
          )}
        </motion.button>
      </div>
    </SectionCard>
  );
}

/* ═══════════════════════════════════════════
   SECTION B — DANGER ZONE
═══════════════════════════════════════════ */
function DangerSection({ onWipeComplete }) {
  const addToast = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [wipeState, setWipeState] = useState('idle'); // idle | loading | success | error
  const [wipeResult, setWipeResult] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const isConfirmed = confirmText.trim() === CONFIRM_PHRASE;

  const handleWipe = async () => {
    setShowConfirmDialog(false);
    setWipeState('loading');
    setWipeResult(null);
    try {
      if (!supabaseReady || !supabase) throw new Error('Supabase غير متصل');
      const { data, error } = await supabase.rpc('clear_entities_data');
      if (error) throw error;
      const result = data || {};
      if (result.success === false) throw new Error(result.error || 'فشل التنفيذ');
      setWipeResult(result);
      setWipeState('success');
      addToast(`✓ تم حذف ${result.details?.total_removed ?? '—'} سجل بنجاح`, 'success');
      setConfirmText('');
      onWipeComplete?.();
    } catch (err) {
      setWipeState('error');
      setWipeResult({ error: err.message });
      addToast('فشل الحذف: ' + err.message, 'error');
    } finally {
      setTimeout(() => { if (wipeState !== 'idle') setWipeState('idle'); }, 6000);
    }
  };

  return (
    <>
      <SectionCard glowColor="#ef4444" danger>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-4 md:px-6 py-4 md:py-5 border-b border-rose-500/10">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0 relative"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <Trash2 size={20} className="text-rose-400" />
              <motion.div className="absolute inset-0 rounded-2xl"
                style={{ border: '1px solid rgba(239,68,68,0.4)' }}
                animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-sm md:text-base font-black text-slate-100">حذف بيانات الأشخاص والموردين</h2>
                <span className="text-xs bg-rose-500/15 text-rose-400 border border-rose-500/25 rounded-full px-2.5 py-0.5 font-bold flex items-center gap-1">
                  <AlertTriangle size={10} /> Danger Zone
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                يحذف جميع بيانات الموردين · العملاء · الموظفين والمعاملات المرتبطة بهم (الفواتير، الرواتب...)
              </p>
            </div>
          </div>
          <StatusBadge state={wipeState} />
        </div>

        {/* Warning boxes */}
        <div className="px-4 md:px-6 py-4 space-y-4">
          <div className="rounded-xl p-3 md:p-4 flex items-start gap-3"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <AlertTriangle size={16} className="text-rose-400 mt-0.5 shrink-0" />
            <div className="text-xs text-rose-300/80 leading-relaxed">
              <strong className="text-rose-400 block mb-1">تحذير: هذه العملية لا يمكن التراجع عنها!</strong>
              الجداول المتأثرة: <span className="font-mono text-rose-300">suppliers · customers · employees</span>
              <br />وبسبب CASCADE: <span className="font-mono text-rose-300">sales_invoices · purchase_invoices · payroll</span>
            </div>
          </div>

          {/* Affected tables summary */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'الموردون', icon: Server },
              { label: 'العملاء', icon: Server },
              { label: 'الموظفون', icon: Server },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
                <Icon size={12} className="text-rose-500/60 shrink-0" />
                <span className="text-rose-300/70">{label}</span>
              </div>
            ))}
          </div>

          {/* Confirmation input */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2">
              اكتب <span className="font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">{CONFIRM_PHRASE}</span> للتفعيل
            </label>
            <div className="relative">
              <Lock size={14} className="absolute top-1/2 -translate-y-1/2 end-3.5 text-slate-600 pointer-events-none" />
              <input
                className="erp-input pe-10 font-mono text-sm"
                placeholder={CONFIRM_PHRASE}
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                style={{
                  borderColor: confirmText.length > 0
                    ? isConfirmed ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.4)'
                    : undefined,
                  boxShadow: confirmText.length > 0 && isConfirmed
                    ? '0 0 0 3px rgba(16,185,129,0.12)' : undefined
                }}
                disabled={wipeState === 'loading'}
                dir="rtl"
              />
              {confirmText.length > 0 && (
                <span className="absolute top-1/2 -translate-y-1/2 start-3">
                  {isConfirmed
                    ? <CheckCircle2 size={14} className="text-emerald-400" />
                    : <XCircle size={14} className="text-rose-500" />}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-700 mt-1.5 font-medium">
              {isConfirmed ? '✓ تم التحقق — يمكنك الآن الضغط على زر الحذف' : 'يجب أن يطابق النص بالضبط'}
            </p>
          </div>

          {/* Wipe result */}
          <AnimatePresence>
            {wipeResult && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                {wipeResult.error ? (
                  <div className="rounded-xl px-4 py-3 text-xs font-mono text-rose-300"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    ✕ {wipeResult.error}
                  </div>
                ) : (
                  <div className="rounded-xl px-4 py-3 text-xs font-mono"
                    style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div className="text-emerald-400 font-bold mb-1.5">✓ تم الحذف بنجاح</div>
                    {wipeResult.details && Object.entries(wipeResult.details).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-slate-400">
                        <span>{k.replace(/_/g,' ')}</span>
                        <span className="text-emerald-400 font-bold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delete button */}
          <motion.button
            onClick={() => isConfirmed && setShowConfirmDialog(true)}
            disabled={!isConfirmed || wipeState === 'loading'}
            whileTap={{ scale: isConfirmed ? 0.97 : 1 }}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm transition-all duration-300"
            style={{
              background: !isConfirmed
                ? 'rgba(30,41,59,0.5)'
                : wipeState === 'loading'
                  ? 'rgba(127,29,29,0.5)'
                  : 'linear-gradient(135deg,#991b1b,#dc2626,#ef4444)',
              boxShadow: isConfirmed && wipeState === 'idle' ? '0 4px 20px rgba(239,68,68,0.3), 0 0 0 1px rgba(239,68,68,0.2)' : 'none',
              color: isConfirmed ? 'white' : '#475569',
              cursor: !isConfirmed ? 'not-allowed' : 'pointer',
            }}
          >
            {wipeState === 'loading'
              ? <><Loader2 size={16} className="animate-spin" />جارٍ الحذف...</>
              : <><Trash2 size={16} />حذف بيانات الأشخاص والموردين</>}
          </motion.button>
        </div>
      </SectionCard>

      {/* ── Final confirm dialog ── */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl p-6 text-center"
              style={{ background: '#0f172a', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 60px rgba(239,68,68,0.15)' }}
            >
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                ⚠️
              </div>
              <h3 className="text-lg font-black text-slate-100 mb-2">تأكيد الحذف النهائي</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                سيتم حذف جميع بيانات الموردين والعملاء والموظفين وجميع معاملاتهم المرتبطة. <br />
                <strong className="text-rose-400">لا يمكن التراجع عن هذه العملية.</strong>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-all">
                  إلغاء
                </button>
                <button onClick={handleWipe}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)', boxShadow: '0 4px 16px rgba(239,68,68,0.4)' }}>
                  نعم، احذف الآن
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════
   SECTION C — MASTER SYSTEM RESET (ULTIMATE DANGER ZONE)
═══════════════════════════════════════════ */
function MasterResetSection({ onWipeComplete }) {
  const addToast = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [wipeState, setWipeState] = useState('idle'); // idle | loading | success | error
  const [wipeResult, setWipeResult] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const isConfirmed = confirmText.trim() === MASTER_CONFIRM_PHRASE;

  const handleWipe = async () => {
    setShowConfirmDialog(false);
    setWipeState('loading');
    setWipeResult(null);
    try {
      if (!supabaseReady || !supabase) throw new Error('Supabase غير متصل');
      const { data, error } = await supabase.rpc('master_system_reset');
      if (error) throw error;
      const result = data || {};
      if (result.success === false) throw new Error(result.error || 'فشل التنفيذ');
      setWipeResult(result);
      setWipeState('success');
      addToast('تم تصفير النظام بالكامل بنجاح', 'success');
      setConfirmText('');
      onWipeComplete?.();
    } catch (err) {
      setWipeState('error');
      setWipeResult({ error: err.message });
      addToast('فشل تصفير النظام: ' + err.message, 'error');
    } finally {
      setTimeout(() => { if (wipeState !== 'idle') setWipeState('idle'); }, 6000);
    }
  };

  return (
    <>
      <SectionCard glowColor="#dc2626" danger>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-4 md:px-6 py-4 md:py-5 border-b border-rose-500/10" style={{ background: 'rgba(153,27,27,0.1)' }}>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0 relative"
              style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.4)' }}>
              <AlertTriangle size={22} className="text-rose-500" />
              <motion.div className="absolute inset-0 rounded-2xl"
                style={{ border: '2px solid rgba(220,38,38,0.5)' }}
                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-sm md:text-base font-black text-rose-500">Database Reset (Master Reset)</h2>
                <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full px-2.5 py-0.5 font-bold flex items-center gap-1">
                  <AlertTriangle size={10} /> Ultimate Danger Zone
                </span>
              </div>
              <p className="text-xs text-rose-300/80 leading-relaxed font-bold">
                تصفير كامل لجميع جداول النظام وإعادة الـ IDs إلى 1 (RESTART IDENTITY)
              </p>
            </div>
          </div>
          <StatusBadge state={wipeState} />
        </div>

        {/* Warning boxes */}
        <div className="px-4 md:px-6 py-4 space-y-4">
          <div className="rounded-xl p-3 md:p-4 flex items-start gap-3"
            style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <AlertTriangle size={18} className="text-rose-500 mt-0.5 shrink-0" />
            <div className="text-xs text-rose-200 leading-relaxed font-medium">
              <strong className="text-rose-500 text-sm block mb-1">خطر بالغ: سيتم مسح جميع البيانات بشكل نهائي!</strong>
              الجداول التي سيتم مسحها بالكامل: <br/>
              <span className="font-mono text-rose-400 mt-1 block leading-relaxed">
                suppliers, customers, employees, accounts, inventory, assets, journals, checks, purchases, sales, payroll
              </span>
            </div>
          </div>

          {/* Confirmation input */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-rose-400 mb-2">
              اكتب <span className="font-mono text-white bg-rose-600 px-1.5 py-0.5 rounded shadow-lg shadow-rose-500/20">{MASTER_CONFIRM_PHRASE}</span> للتفعيل
            </label>
            <div className="relative">
              <Lock size={14} className="absolute top-1/2 -translate-y-1/2 end-3.5 text-rose-500/50 pointer-events-none" />
              <input
                className="erp-input pe-10 font-mono text-sm"
                placeholder={MASTER_CONFIRM_PHRASE}
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderColor: confirmText.length > 0
                    ? isConfirmed ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.6)'
                    : 'rgba(220,38,38,0.2)',
                  boxShadow: confirmText.length > 0 && isConfirmed
                    ? '0 0 0 4px rgba(16,185,129,0.15)' : undefined,
                  color: isConfirmed ? '#10b981' : '#f87171'
                }}
                disabled={wipeState === 'loading'}
                dir="rtl"
              />
              {confirmText.length > 0 && (
                <span className="absolute top-1/2 -translate-y-1/2 start-3">
                  {isConfirmed
                    ? <CheckCircle2 size={16} className="text-emerald-400 drop-shadow-md" />
                    : <XCircle size={16} className="text-rose-500 drop-shadow-md" />}
                </span>
              )}
            </div>
            <p className="text-[10px] text-rose-400/80 mt-1.5 font-bold">
              {isConfirmed ? '✓ إدخال صحيح — جاهز لتصفير النظام' : 'كلمة المرور غير صحيحة'}
            </p>
          </div>

          {/* Wipe result */}
          <AnimatePresence>
            {wipeResult && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                {wipeResult.error ? (
                  <div className="rounded-xl px-4 py-3 text-xs font-mono text-white bg-rose-900 border border-rose-500 shadow-lg shadow-rose-900/50">
                    ✕ {wipeResult.error}
                  </div>
                ) : (
                  <div className="rounded-xl px-4 py-3 text-xs font-mono text-emerald-100 bg-emerald-900/50 border border-emerald-500 shadow-lg shadow-emerald-900/50">
                    <div className="text-emerald-400 font-bold mb-1.5 text-sm drop-shadow-md">✓ {wipeResult.message}</div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delete button */}
          <motion.button
            onClick={() => isConfirmed && setShowConfirmDialog(true)}
            disabled={!isConfirmed || wipeState === 'loading'}
            whileTap={{ scale: isConfirmed ? 0.95 : 1 }}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-sm transition-all duration-300 mt-4"
            style={{
              background: !isConfirmed
                ? 'rgba(30,41,59,0.5)'
                : wipeState === 'loading'
                  ? 'rgba(127,29,29,0.8)'
                  : 'linear-gradient(135deg,#b91c1c,#ef4444,#dc2626)',
              boxShadow: isConfirmed && wipeState === 'idle' ? '0 8px 32px rgba(220,38,38,0.5), inset 0 2px 0 rgba(255,255,255,0.2)' : 'none',
              color: isConfirmed ? 'white' : '#475569',
              cursor: !isConfirmed ? 'not-allowed' : 'pointer',
              textShadow: isConfirmed ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}
          >
            {wipeState === 'loading'
              ? <><Loader2 size={18} className="animate-spin" />جارٍ التصفير العميق...</>
              : <><AlertTriangle size={18} />إعادة ضبط المصنع وتصفير البيانات</>}
          </motion.button>
        </div>
      </SectionCard>

      {/* ── Final confirm dialog ── */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl p-6 text-center"
              style={{ background: '#450a0a', border: '2px solid rgba(239,68,68,0.6)', boxShadow: '0 0 80px rgba(239,68,68,0.4)' }}
            >
              <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(239,68,68,0.5)]"
                style={{ background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)', border: '2px solid rgba(239,68,68,0.8)' }}>
                💀
              </div>
              <h3 className="text-xl font-black text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">تصفير النظام بالكامل!</h3>
              <p className="text-sm text-rose-200 leading-relaxed mb-6 font-medium">
                هل أنت متأكد بنسبة 100% أنك تريد تصفير قاعدة البيانات؟<br/>
                سيتم مسح كل شيء وإعادة الـ IDs للرقم 1.
                <br /><strong className="text-rose-400 mt-2 block">لا رجعة في هذا القرار أبداً.</strong>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 py-3.5 rounded-xl text-sm font-bold text-rose-200 border border-rose-500/30 hover:bg-rose-500/10 hover:text-white transition-all">
                  إلغاء الأمر فوراً
                </button>
                <button onClick={handleWipe}
                  className="flex-1 py-3.5 rounded-xl text-sm font-black text-white transition-all shadow-[0_4px_20px_rgba(220,38,38,0.6)]"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>
                  نعم، دمر البيانات
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function DataManagement() {
  const { lang } = useApp();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl px-4 md:px-6 py-4 md:py-5 flex items-center gap-3 md:gap-4"
        style={{ borderTop: '2px solid rgba(99,102,241,0.4)' }}>
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
          <Server size={18} color="white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm md:text-base font-black text-slate-100 truncate">
            {lang === 'ar' ? 'إدارة البيانات والنسخ الاحتياطي' : 'Data Management & Backup'}
          </h1>
          <p className="text-xs text-slate-500 truncate">
            {lang === 'ar' ? 'تصدير البيانات وإدارة السجلات بأمان' : 'Safely export data and manage records'}
          </p>
        </div>
        {/* Live indicator */}
        <div className="ms-auto flex items-center gap-2 text-xs text-slate-600 font-medium shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">{supabaseReady ? 'Supabase Connected' : 'Mock Data Mode'}</span>
        </div>
      </motion.div>

      {/* Section A — Backup */}
      <BackupSection key={`backup-${refreshKey}`} />

      {/* Section A.2 — Recharge */}
      <RechargeSection />

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(239,68,68,0.25),transparent)' }} />
        <span className="text-xs font-bold text-rose-500/60 uppercase tracking-widest">⚠ Danger Zone</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(239,68,68,0.25),transparent)' }} />
      </div>

      {/* Section B — Danger */}
      <DangerSection onWipeComplete={() => { setRefreshKey(k => k + 1); setTimeout(() => window.location.reload(), 1500); }} />

      {/* Divider */}
      <div className="flex items-center gap-4 mt-4">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(220,38,38,0.5),transparent)' }} />
        <span className="text-xs font-black text-rose-600 uppercase tracking-widest drop-shadow-md flex items-center gap-1"><AlertTriangle size={12}/> Master Reset</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(220,38,38,0.5),transparent)' }} />
      </div>

      {/* Section C — Master Reset */}
      <MasterResetSection onWipeComplete={() => { setRefreshKey(k => k + 1); setTimeout(() => window.location.reload(), 1500); }} />

      {/* Footer note */}
      <p className="text-center text-xs text-slate-700 pb-2">
        يُنصح دائماً بتنزيل نسخة احتياطية قبل إجراء أي عملية حذف ·
        جميع العمليات مسجّلة في سجل النظام
      </p>
    </div>
  );
}
