import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Download, Trash2, AlertTriangle, Loader2,
  Database, FileDown, CheckCircle2, XCircle, Server, Lock
} from 'lucide-react';
import { supabase, supabaseReady } from '../config/supabaseClient';
import { exportMultipleToCSV } from '../utils/exportToCSV';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';

/* ── Mock data fallback for tables not in Supabase ── */
import {
  MOCK_SUPPLIERS, MOCK_CUSTOMERS, MOCK_EMPLOYEES,
  MOCK_INVENTORY, MOCK_SALES_INVOICES, MOCK_PURCHASE_INVOICES,
  MOCK_PAYROLL, MOCK_FIXED_ASSETS, MOCK_CHECKS,
  MOCK_CHART_OF_ACCOUNTS, MOCK_JOURNAL_ENTRIES
} from '../data/mockData';

const CONFIRM_PHRASE = 'تأكيد الحذف';
const MASTER_CONFIRM_PHRASE = 'مسح شامل';

const BACKUP_TABLES = [
  { key: 'suppliers',         label: 'الموردون',         mock: MOCK_SUPPLIERS },
  { key: 'customers',         label: 'العملاء',          mock: MOCK_CUSTOMERS },
  { key: 'employees',         label: 'الموظفون',         mock: MOCK_EMPLOYEES },
  { key: 'inventory',         label: 'المخزون',          mock: MOCK_INVENTORY },
  { key: 'sales_invoices',    label: 'فواتير المبيعات',  mock: MOCK_SALES_INVOICES },
  { key: 'purchase_invoices', label: 'فواتير المشتريات', mock: MOCK_PURCHASE_INVOICES },
  { key: 'payroll',           label: 'مسيرات الرواتب',   mock: MOCK_PAYROLL },
  { key: 'fixed_assets',      label: 'الأصول الثابتة',   mock: MOCK_FIXED_ASSETS },
  { key: 'checks',            label: 'الشيكات',          mock: MOCK_CHECKS },
  { key: 'chart_of_accounts', label: 'دليل الحسابات',    mock: MOCK_CHART_OF_ACCOUNTS },
  { key: 'journal_entries',   label: 'القيود اليومية',   mock: MOCK_JOURNAL_ENTRIES },
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
function BackupSection() {
  const addToast = useToast();
  const [backupState, setBackupState] = useState('idle');
  const [progress, setProgress] = useState({ current: 0, total: BACKUP_TABLES.length, label: '' });

  const handleFullBackup = async () => {
    setBackupState('loading');
    setProgress({ current: 0, total: BACKUP_TABLES.length, label: 'جارٍ جلب البيانات...' });
    try {
      const tables = [];
      for (let i = 0; i < BACKUP_TABLES.length; i++) {
        const { key, label, mock } = BACKUP_TABLES[i];
        setProgress({ current: i + 1, total: BACKUP_TABLES.length, label });

        let data = mock; // fallback
        if (supabaseReady && supabase) {
          const { data: rows, error } = await supabase.from(key).select('*');
          if (!error && rows?.length > 0) data = rows;
        }
        tables.push({ name: key, data });
      }

      await exportMultipleToCSV(tables);
      setBackupState('success');
      addToast(`✓ تم تنزيل ${tables.length} ملفات CSV بنجاح`, 'success');
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
      <div className="flex items-start justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <ShieldCheck size={22} className="text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-base font-black text-slate-100">النسخ الاحتياطي الكامل</h2>
              <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full px-2.5 py-0.5 font-bold">
                Zone Sûre ✓
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              تصدير جميع جداول النظام كملفات CSV مضمّنة بترميز UTF-8 (متوافقة مع Excel)
            </p>
          </div>
        </div>
        <StatusBadge state={backupState} />
      </div>

      {/* Table list */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-5">
          {BACKUP_TABLES.map(({ key, label, mock }) => (
            <div key={key}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs border border-white/5"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <Database size={11} className="text-emerald-500/70 shrink-0" />
              <span className="text-slate-400 truncate">{label}</span>
              <span className="ms-auto text-slate-700 font-mono text-[10px]">{mock.length}</span>
            </div>
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
        <div className="flex items-start justify-between px-6 py-5 border-b border-rose-500/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 relative"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <Trash2 size={22} className="text-rose-400" />
              <motion.div className="absolute inset-0 rounded-2xl"
                style={{ border: '1px solid rgba(239,68,68,0.4)' }}
                animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="text-base font-black text-slate-100">حذف بيانات الأشخاص والموردين</h2>
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
        <div className="px-6 py-4 space-y-4">
          <div className="rounded-xl p-4 flex items-start gap-3"
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
        <div className="flex items-start justify-between px-6 py-5 border-b border-rose-500/10" style={{ background: 'rgba(153,27,27,0.1)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 relative"
              style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.4)' }}>
              <AlertTriangle size={24} className="text-rose-500" />
              <motion.div className="absolute inset-0 rounded-2xl"
                style={{ border: '2px solid rgba(220,38,38,0.5)' }}
                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="text-base font-black text-rose-500">Database Reset (Master Reset)</h2>
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
        <div className="px-6 py-4 space-y-4">
          <div className="rounded-xl p-4 flex items-start gap-3"
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
        className="glass-strong rounded-2xl px-6 py-5 flex items-center gap-4"
        style={{ borderTop: '2px solid rgba(99,102,241,0.4)' }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
          <Server size={20} color="white" />
        </div>
        <div>
          <h1 className="text-base font-black text-slate-100">
            {lang === 'ar' ? 'إدارة البيانات والنسخ الاحتياطي' : 'Data Management & Backup'}
          </h1>
          <p className="text-xs text-slate-500">
            {lang === 'ar' ? 'تصدير البيانات وإدارة السجلات بأمان' : 'Safely export data and manage records'}
          </p>
        </div>
        {/* Live indicator */}
        <div className="ms-auto flex items-center gap-2 text-xs text-slate-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {supabaseReady ? 'Supabase Connected' : 'Mock Data Mode'}
        </div>
      </motion.div>

      {/* Section A — Backup */}
      <BackupSection key={`backup-${refreshKey}`} />

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
