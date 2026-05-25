import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { Truck, Search, Plus, Loader2, AlertCircle, CheckCircle2, X, Wallet, ChevronLeft, ChevronRight, Hash } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

export default function Suppliers() {
  const { lang, printDocument } = useApp();
  const { t } = useTranslation();
  const addToast = useToast();

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Selected supplier for actions
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Forms
  const [form, setForm] = useState({ name: '', company_name: '', phone: '', email: '', tax_number: '', current_balance: 0 });
  const [paymentAmount, setPaymentAmount] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { data: rows, error } = await supabase.from('suppliers').select('*').order('id', { ascending: false });
      if (error) {
        if (error.code === '42P01') {
          addToast('يرجى إنشاء جدول suppliers في قاعدة البيانات أولاً', 'error');
          setData([]);
          return;
        }
        throw error;
      }
      setData(rows || []);
    } catch (err) {
      console.error('Fetch Suppliers Error:', err);
      addToast(err.message || 'فشل في تحميل بيانات الموردين', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      const payload = {
        name: form.name,
        company_name: form.company_name,
        phone: form.phone,
        email: form.email,
        tax_number: form.tax_number,
        current_balance: Number(form.current_balance) || 0
      };

      const { error } = await supabase.from('suppliers').insert([payload]);
      if (error) throw error;
      
      addToast('تمت إضافة المورد بنجاح', 'success');
      setShowAddModal(false);
      setForm({ name: '', company_name: '', phone: '', email: '', tax_number: '', current_balance: 0 });
      fetchData();
    } catch (err) {
      console.error('Save Supplier Error:', err);
      addToast(err.message || 'فشلت عملية الحفظ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedSupplier || !paymentAmount) return;
    
    const amountToPay = Number(paymentAmount);
    if (amountToPay <= 0) {
      addToast('يجب أن يكون المبلغ أكبر من صفر', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      // The RPC takes p_supplier_id and p_amount. Paying a supplier decrements their balance (we owe them less).
      // So we pass a negative amount to the increment function.
      const { error } = await supabase.rpc('increment_supplier_balance', { 
        p_supplier_id: selectedSupplier.id, 
        p_amount: -amountToPay 
      });
      
      if (error) throw error;

      addToast(`تم تسجيل دفعة بقيمة ${amountToPay} للمورد ${selectedSupplier.name}`, 'success');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setSelectedSupplier(null);
      fetchData(); // Refresh balances
    } catch (err) {
      console.error('Payment Error:', err);
      addToast(err.message || 'فشلت عملية تسجيل الدفعة', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = data.filter(s => 
    (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.company_name && s.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.phone && s.phone.includes(searchTerm))
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-['Tajawal'] text-white" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] pointer-events-none" />
        
        <div className="flex items-center gap-5 z-10">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Truck size={32} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white mb-2">المرجعية والموردين</h1>
            <p className="text-slate-400 font-medium text-sm">إدارة حسابات الموردين، الأرصدة، والمدفوعات</p>
          </div>
        </div>

        <div className="flex w-full md:w-auto items-center gap-4 z-10">
          <div className="relative w-full md:w-64">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="البحث بالاسم أو الهاتف..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl py-3 pr-12 pl-4 text-sm font-bold text-white outline-none transition-all placeholder:text-slate-600"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-3 px-6 rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-500/25 whitespace-nowrap active:scale-95"
          >
            <Plus size={18} />
            إضافة مورد
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right whitespace-nowrap">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="px-6 py-5">الاسم / الشركة</th>
                <th className="px-6 py-5">التواصل</th>
                <th className="px-6 py-5">الرقم الضريبي</th>
                <th className="px-6 py-5">الرصيد الحالي</th>
                <th className="px-6 py-5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                    جاري تحميل بيانات الموردين...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    لا يوجد موردين مضافين حالياً
                  </td>
                </tr>
              ) : (
                filteredData.map(sup => (
                  <tr key={sup.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-base">{sup.name}</div>
                      {sup.company_name && <div className="text-slate-500 text-xs mt-1">{sup.company_name}</div>}
                    </td>
                    <td className="px-6 py-4">
                      {sup.phone && <div className="font-bold text-slate-300" dir="ltr">{sup.phone}</div>}
                      {sup.email && <div className="text-slate-500 text-xs mt-1" dir="ltr">{sup.email}</div>}
                      {!sup.phone && !sup.email && <span className="text-slate-600">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded inline-block text-xs border border-slate-800">
                        {sup.tax_number || 'غير مسجل'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center px-3 py-1.5 rounded-lg font-black text-sm border ${
                        Number(sup.current_balance) > 0 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                          : Number(sup.current_balance) < 0
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(Number(sup.current_balance))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => { setSelectedSupplier(sup); setShowPaymentModal(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-xl font-bold text-xs transition-colors"
                      >
                        <Wallet size={14} />
                        تسجيل دفعة
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button onClick={() => setShowAddModal(false)} className="absolute top-6 left-6 text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
              
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <Truck className="text-amber-500" />
                تسجيل مورد جديد
              </h2>
              
              <form onSubmit={handleSaveSupplier} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">اسم المورد (المسؤول) *</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">اسم الشركة / المؤسسة</label>
                  <input type="text" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">رقم الجوال</label>
                    <input type="text" dir="ltr" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-right outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">الرقم الضريبي</label>
                    <input type="text" dir="ltr" value={form.tax_number} onChange={e => setForm({...form, tax_number: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-right outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">البريد الإلكتروني</label>
                    <input type="email" dir="ltr" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-right outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">الرصيد الافتتاحي (له)</label>
                    <input type="number" step="any" dir="ltr" value={form.current_balance} onChange={e => setForm({...form, current_balance: e.target.value})} className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-left outline-none font-bold text-lg" />
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button type="submit" disabled={isSaving} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'حفظ المورد'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedSupplier && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative"
            >
              <button onClick={() => setShowPaymentModal(false)} className="absolute top-6 left-6 text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
              
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
                <Wallet className="text-indigo-400" size={32} />
              </div>

              <h2 className="text-xl font-black text-white mb-2">تسجيل دفعة</h2>
              <p className="text-sm text-slate-400 mb-6">خصم دفعة مالية من رصيد المورد: <span className="text-white font-bold">{selectedSupplier.name}</span></p>
              
              <div className="bg-slate-950 rounded-xl p-4 mb-6 border border-slate-800 text-center">
                <div className="text-xs font-bold text-slate-500 mb-1">الرصيد الحالي للمورد</div>
                <div className="text-xl font-black text-amber-400" dir="ltr">
                  {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(Number(selectedSupplier.current_balance))}
                </div>
              </div>

              <form onSubmit={handleProcessPayment} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ المدفوع (SAR)</label>
                  <input 
                    type="number" 
                    step="any" 
                    min="0"
                    dir="ltr" 
                    required
                    value={paymentAmount} 
                    onChange={e => setPaymentAmount(e.target.value)} 
                    className="w-full bg-slate-950 border-2 border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-4 text-white text-center outline-none font-black text-2xl placeholder:text-slate-700" 
                    placeholder="0.00"
                  />
                </div>

                <button type="submit" disabled={isSaving} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'تأكيد الدفع وخصم الرصيد'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
