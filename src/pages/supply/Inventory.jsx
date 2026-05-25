import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { Package, Loader2, ScanBarcode, Printer, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Plus, Tag } from 'lucide-react';
import CrudTable from '../../components/CrudTable';
import { useToast } from '../../context/ToastContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { getAuthUserId } from '../../utils/getAuthUserId';
import { formatCurrency } from '../../utils/currencyFormatter';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['إلكترونيات', 'مستلزمات', 'أثاث', 'قرطاسية', 'أخرى'];

// --- Audio Utility ---
const playBeep = (freq, duration, type = 'sine') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) { }
};
const playSuccessSound = () => playBeep(880, 0.1, 'sine');
const playErrorSound = () => playBeep(150, 0.3, 'sawtooth');

// --- Add Item Form ---
function InventoryForm({ row, prefilledBarcode, onClose, onSave, isSaving }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    item_name: row?.item_name || '',
    category: row?.category || CATEGORIES[0],
    unit_price: row?.unit_price ?? '',
    quantity: row?.quantity ?? '',
    barcode: row?.barcode || prefilledBarcode || '',
    min_stock_level: row?.min_stock_level ?? 5,
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('item_name')}</label>
        <input className="erp-input" value={form.item_name} onChange={e => set('item_name', e.target.value)} required disabled={isSaving} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('category')}</label>
          <select className="erp-select" value={form.category} onChange={e => set('category', e.target.value)} disabled={isSaving}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">باركود</label>
          <input className="erp-input text-left" dir="ltr" value={form.barcode} onChange={e => set('barcode', e.target.value)} disabled={isSaving} placeholder="مسح للباركود..." />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('unit_price')}</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.unit_price} onChange={e => set('unit_price', e.target.value)} required disabled={isSaving} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('quantity')}</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.quantity} onChange={e => set('quantity', e.target.value)} required disabled={isSaving} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">الحد الأدنى</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.min_stock_level} onChange={e => set('min_stock_level', e.target.value)} required disabled={isSaving} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-all disabled:opacity-50">
          {t('cancel')}
        </button>
        <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
          {t('save')}
        </button>
      </div>
    </form>
  );
}

// --- Main Module ---
export default function Inventory() {
  const { setSidebarCollapsed, lang, printDocument } = useApp();
  const { t } = useTranslation();
  const addToast = useToast();
  
  const [activeTab, setActiveTab] = useState(0); // 0: Live, 1: Terminal, 2: Barcodes
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Terminal State
  const [scannerBuffer, setScannerBuffer] = useState('');
  const scannerBufferRef = useRef(''); // For keydown listener state freshness
  const [terminalMode, setTerminalMode] = useState('stock-in'); // 'stock-in' | 'stock-out'
  const terminalModeRef = useRef('stock-in');
  const [lastScan, setLastScan] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');

  // Widescreen effect
  useEffect(() => {
    setSidebarCollapsed(true);
    fetchData();
  }, []);

  // Update refs for global listener
  useEffect(() => { terminalModeRef.current = terminalMode; }, [terminalMode]);

  // Global Barcode Listener
  useEffect(() => {
    let lastKeyTime = Date.now();
    const handleKeyDown = (e) => {
      if (activeTab !== 1 || showAddForm) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const now = Date.now();
      if (now - lastKeyTime > 100) {
        // Reset buffer if delay is too long (human typing)
        scannerBufferRef.current = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        const barcode = scannerBufferRef.current.trim();
        if (barcode.length > 0) {
          processScan(barcode);
          scannerBufferRef.current = '';
          setScannerBuffer('');
        }
      } else if (e.key.length === 1) {
        scannerBufferRef.current += e.key;
        setScannerBuffer(scannerBufferRef.current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, showAddForm, data]); // Depends on data to find items

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { data: rows, error } = await supabase.from('inventory').select('*').order('item_id', { ascending: false });
      if (error) throw error;
      setData(rows || []);
    } catch (err) {
      addToast(err.message || 'Failed to load inventory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerLowStockAlert = (item) => {
    addToast(`تنبيه: مخزون ${item.item_name} انخفض دون الحد الأدنى! جاري إرسال إشعار WhatsApp...`, 'warning');
    // Mock Background Hook
    console.log(`[Webhook Triggered] Sending WhatsApp alert to supplier for item: ${item.item_name}`);
  };

  const processScan = async (barcode) => {
    const item = data.find(r => r.barcode === barcode);
    
    if (!item) {
      playErrorSound();
      setLastScan({ barcode, status: 'not-found' });
      setScannedBarcode(barcode);
      setShowAddForm(true);
      return;
    }

    const count_change = terminalModeRef.current === 'stock-in' ? 1 : -1;
    const newQty = (item.quantity || 0) + count_change;

    if (newQty < 0) {
      playErrorSound();
      setLastScan({ barcode, status: 'error', item, message: 'لا يمكن أن يكون المخزون بالسالب' });
      return;
    }

    // Optimistic Update
    setData(p => p.map(r => r.barcode === barcode ? { ...r, quantity: newQty } : r));
    playSuccessSound();
    setLastScan({ barcode, status: 'success', item, change: count_change, qty: newQty });

    try {
      // Direct RPC Atomic Update
      const { error } = await supabase.rpc('increment_stock_by_barcode', { 
        target_barcode: barcode, 
        count_change: count_change 
      });
      if (error) {
         if (error.code === '42883') {
           // RPC doesn't exist yet, fallback to update
           await supabase.from('inventory').update({ quantity: newQty }).eq('barcode', barcode);
         } else {
           throw error;
         }
      }

      if (newQty < (item.min_stock_level || 5) && count_change < 0) {
        triggerLowStockAlert(item);
      }
    } catch (err) {
      console.error(err);
      // Revert
      setData(p => p.map(r => r.barcode === barcode ? { ...r, quantity: item.quantity } : r));
      addToast('فشل تحديث المخزون', 'error');
      setLastScan({ barcode, status: 'error', item, message: 'خطأ في قاعدة البيانات' });
    }
  };

  const handleSaveItem = async (form, row, onClose) => {
    setIsSaving(true);
    try {
      const isNew = !row?.item_id;
      if (!isNew) {
        const { error } = await supabase.from('inventory').update(form).eq('item_id', row.item_id);
        if (error) throw error;
        setData(p => p.map(r => r.item_id === row.item_id ? { ...r, ...form } : r));
        addToast('تم التحديث ✓', 'info');
      } else {
        const user_id = await getAuthUserId();
        const payload = { ...form, user_id };
        const { data: newRecords, error } = await supabase.from('inventory').insert([payload]).select();
        if (error) throw error;
        if (newRecords && newRecords.length > 0) setData(p => [newRecords[0], ...p]);
        else await fetchData();
        addToast('تمت الإضافة ✓', 'success');
      }
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const valuation = useMemo(() => {
    const totalItems = data.length;
    const lowStock = data.filter(i => (i.quantity || 0) < (i.min_stock_level || 5)).length;
    const capital = data.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unit_price || 0)), 0);
    return { totalItems, lowStock, capital };
  }, [data]);

  const columns = [
    { key: 'item_name',  label: t('item_name') },
    { key: 'barcode',    label: 'الباركود' },
    { key: 'category',   label: t('category') },
    { key: 'unit_price', label: t('unit_price') },
    { key: 'quantity',   label: t('quantity') },
    { key: 'min_stock_level', label: 'الحد الأدنى' },
  ];

  return (
    <div className="relative min-h-screen flex flex-col gap-6 w-full max-w-full">
      {/* Premium Widescreen Header */}
      <div className="glass-strong rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t-2 border-indigo-500/40">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Package size={28} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">إدارة المخزون والباركود</h1>
            <p className="text-sm text-slate-400 font-medium mt-1">نظام تتبع الأصول عالي الدقة (Widescreen Mode)</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1 bg-slate-900/50 rounded-xl border border-white/5 w-full md:w-auto">
          {[
            { id: 0, label: 'الجرد الحي', icon: Package },
            { id: 1, label: 'محطة الباركود', icon: ScanBarcode },
            { id: 2, label: 'الطباعة', icon: Printer },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 0 && (
          <motion.div key="tab0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="glass-strong rounded-2xl p-5 border-l-4 border-l-indigo-500">
                <p className="text-xs font-bold text-slate-400 mb-1">إجمالي الأصناف المتاحة</p>
                <div className="text-3xl font-black text-white">{valuation.totalItems}</div>
              </div>
              <div className="glass-strong rounded-2xl p-5 border-l-4 border-l-rose-500">
                <p className="text-xs font-bold text-slate-400 mb-1">أصناف تحت الحد الأدنى</p>
                <div className="text-3xl font-black text-rose-400 flex items-center gap-2">
                  {valuation.lowStock} {valuation.lowStock > 0 && <AlertTriangle size={20} className="animate-pulse" />}
                </div>
              </div>
              <div className="glass-strong rounded-2xl p-5 border-l-4 border-l-emerald-500">
                <p className="text-xs font-bold text-slate-400 mb-1">إجمالي قيمة رأس المال بالمخزون</p>
                <div className="text-3xl font-black text-emerald-400 font-mono">{formatCurrency(valuation.capital)}</div>
              </div>
            </div>

            <CrudTable 
              title={t('inventory')} 
              columns={columns} 
              data={data} 
              isLoading={isLoading}
              onDelete={async (row) => {
                 await supabase.from('inventory').delete().eq('item_id', row.item_id);
                 setData(p => p.filter(r => r.item_id !== row.item_id));
              }}
              addForm={({ row, onClose }) => <InventoryForm row={row} onClose={onClose} isSaving={isSaving} onSave={(f) => handleSaveItem(f, row, onClose)} />} 
              addTitle="إضافة بضاعة جديدة"
              editTitle="تعديل البضاعة"
              accentColor="#6366f1" 
            />
          </motion.div>
        )}

        {activeTab === 1 && (
          <motion.div key="tab1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6">
            <div className="glass-strong rounded-3xl p-8 flex flex-col items-center justify-center min-h-[50vh] relative overflow-hidden">
              {/* Animated Background Ring */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-indigo-500/20 rounded-full animate-ring pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center w-full max-w-lg">
                <h2 className="text-xl font-bold text-white mb-6">الحركات السريعة بالباركود</h2>
                
                <div className="flex w-full bg-slate-900/60 rounded-xl p-1 mb-8 border border-white/5">
                  <button 
                    onClick={() => setTerminalMode('stock-in')}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${terminalMode === 'stock-in' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <ArrowDownToLine size={18} />
                    إدخال مخزون (Stock In)
                  </button>
                  <button 
                    onClick={() => setTerminalMode('stock-out')}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${terminalMode === 'stock-out' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <ArrowUpFromLine size={18} />
                    إخراج مخزون (Stock Out)
                  </button>
                </div>

                {/* Scan Status Display */}
                <div className={`w-full h-40 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300 ${
                  !lastScan ? 'border-dashed border-slate-700 bg-slate-800/30 text-slate-500' :
                  lastScan.status === 'success' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]' :
                  'border-rose-500 bg-rose-500/10 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.2)]'
                }`}>
                  {!lastScan ? (
                    <>
                      <ScanBarcode size={40} className="mb-3 opacity-50" />
                      <p className="font-medium animate-pulse">في انتظار مسح الباركود بالكاميرا أو القارئ...</p>
                    </>
                  ) : lastScan.status === 'success' ? (
                    <>
                      <p className="text-sm font-bold mb-1 opacity-80">{lastScan.change > 0 ? 'تمت إضافة' : 'تم سحب'} 1 وحدة</p>
                      <h3 className="text-2xl font-black text-white mb-2">{lastScan.item?.item_name}</h3>
                      <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono text-sm border border-emerald-500/30">
                        المخزون الحالي: {lastScan.qty}
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={32} className="mb-2" />
                      <h3 className="text-lg font-bold text-white">منتج غير مسجل</h3>
                      <p className="text-sm opacity-80">{lastScan.barcode}</p>
                    </>
                  )}
                </div>

                <div className="mt-8 text-center text-xs text-slate-500 font-medium">
                  <p>يعمل الماسح تلقائياً. تأكد من ضبط القارئ لإرسال "Enter" بعد القراءة.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 2 && (
          <motion.div key="tab2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             {data.map(item => (
               <div key={item.item_id} className="glass-strong rounded-2xl p-5 flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
                 <h3 className="font-bold text-white mb-1 line-clamp-1">{item.item_name}</h3>
                 <p className="text-xs text-slate-400 mb-4">{item.category} • {item.quantity} وحدة</p>
                 
                 {item.barcode ? (
                   <div className="bg-white p-3 rounded-xl mb-4 w-full flex justify-center">
                     <img 
                        src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(item.barcode)}&code=Code128&translate-esc=on`} 
                        alt="Barcode" 
                        className="h-14 object-contain"
                     />
                   </div>
                 ) : (
                   <div className="h-14 w-full mb-4 flex items-center justify-center border border-dashed border-slate-700 rounded-xl text-slate-500 text-xs">
                     لا يوجد باركود
                   </div>
                 )}

                 <button
                   onClick={() => printDocument('barcode', item)}
                   disabled={!item.barcode}
                   className="w-full py-2 rounded-xl bg-indigo-600/20 text-indigo-400 font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                 >
                   <Printer size={14} />
                   طباعة الباركود
                 </button>
               </div>
             ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-over Add Form for Terminal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg glass-strong border border-slate-700 rounded-2xl p-6 relative">
            <h2 className="text-xl font-bold text-white mb-6">إضافة منتج جديد (الباركود: {scannedBarcode})</h2>
            <InventoryForm 
              prefilledBarcode={scannedBarcode} 
              onClose={() => setShowAddForm(false)} 
              isSaving={isSaving} 
              onSave={(f) => handleSaveItem(f, null, () => setShowAddForm(false))} 
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}
