import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { ShieldAlert, Shield, Loader2, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function SecurityAudit() {
  const { t } = useTranslation();
  const { userRole, lang } = useApp();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('all');

  // Strict Client-side Auth
  if (userRole !== 'Admin' && userRole !== 'Superadmin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-rose-500/10 border border-rose-500/30 p-12 rounded-3xl flex flex-col items-center max-w-md text-center shadow-[0_0_40px_rgba(244,63,94,0.15)]">
          <ShieldAlert className="text-rose-500 mb-6" size={64} />
          <h1 className="text-2xl font-black text-white mb-2">🚫 منطقة أمنية محظورة</h1>
          <p className="text-slate-400 font-bold leading-relaxed">غير مصرح لك بالدخول إلى هذه الصفحة. هذه الصفحة مخصصة لمدير النظام فقط.</p>
        </motion.div>
      </div>
    );
  }

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) return;
      let query = supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (filterModule !== 'all') {
        query = query.eq('module', filterModule);
      }
      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Audit Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterModule]);

  const moduleColors = {
    sales: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
    inventory: 'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
    hr: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.2)]',
    payroll: 'bg-violet-500/20 text-violet-400 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.2)]',
    finance: 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
    assets: 'bg-sky-500/20 text-sky-400 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.2)]',
    default: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  };

  const moduleNames = {
    sales: 'المبيعات 📑',
    inventory: 'المستودع 📦',
    hr: 'الموارد البشرية 👤',
    payroll: 'الرواتب 💵',
    finance: 'المالية 🎫',
    assets: 'الأصول 🏢'
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.2)]">
            <Shield className="text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">غرفة التحكم والرقابة الأمنية</h1>
            <p className="text-sm font-bold text-slate-400 mt-1">سجل النظام الأمني (Activity Logs)</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/60 p-1.5 rounded-xl border border-white/5">
          <Filter size={18} className="text-slate-500 ms-2" />
          <select 
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer pe-4 border-none"
          >
            <option value="all" className="bg-slate-900">جميع الأقسام</option>
            <option value="sales" className="bg-slate-900">المبيعات</option>
            <option value="inventory" className="bg-slate-900">المستودع</option>
            <option value="hr" className="bg-slate-900">الموارد البشرية</option>
            <option value="payroll" className="bg-slate-900">الرواتب</option>
            <option value="finance" className="bg-slate-900">المالية</option>
            <option value="assets" className="bg-slate-900">الأصول الثابتة</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-indigo-500/20 overflow-hidden shadow-[0_0_30px_rgba(79,70,229,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">التوقيت</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">المستخدم</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">القسم</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider w-1/2">الإجراء المتخذ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500 font-bold">
                    لا يوجد سجلات حالياً لهذا القسم.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id || Math.random()} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[11px] font-bold text-slate-300" dir="ltr">
                        {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold">{log.user_name?.charAt(0) || 'A'}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-200">{log.user_name || 'Admin'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${moduleColors[log.module] || moduleColors.default}`}>
                        {moduleNames[log.module] || log.module}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-300">{log.action}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
