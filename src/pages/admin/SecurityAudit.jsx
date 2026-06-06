import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { ShieldAlert, Shield, Loader2, Filter, Search, Activity, DollarSign, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function SecurityAudit() {
  const { t } = useTranslation();
  const { userRole, lang, authUser } = useApp();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // SECURITY: resolve tenant ID from live AppContext (backed by active JWT session)
  const currentTenantId = authUser?.id;

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

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        if (!supabaseReady) return;
        // SECURITY: resolve tenant from live session as the authoritative ground-truth
        const { data: { session } } = await supabase.auth.getSession();
        const tenantId = session?.user?.id;
        if (!tenantId) {
          console.warn('[SecurityAudit] No authenticated tenant — aborting activity_logs fetch to prevent cross-tenant leak.');
          setLogs([]);
          return;
        }
        // Strictly query activity_logs filtered by the current tenant only
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error('Audit Fetch Error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [currentTenantId]);


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
    sales: 'فاتورة مبيعات',
    inventory: 'المخزون',
    hr: 'الموارد البشرية',
    payroll: 'مسير الرواتب',
    finance: 'حركة مالية',
    assets: 'الأصول الثابتة',
    purchase: 'فاتورة مشتريات'
  };

  // Client-side filtering
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchModule = filterModule === 'all' || log.module === filterModule;
      const matchSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (log.user_name && log.user_name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchModule && matchSearch;
    });
  }, [logs, filterModule, searchQuery]);

  // Dynamic Statistics
  const totalLogsCount = logs.length;
  const salesLogsCount = logs.filter(l => l.module === 'sales').length;
  const hrLogsCount = logs.filter(l => l.module === 'hr' || l.module === 'payroll').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header section */}
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
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 backdrop-blur-md border border-blue-500/30 rounded-2xl p-5 flex flex-col gap-2 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-bold">إجمالي العمليات الأمنيّة</span>
            <Activity className="text-blue-400" size={20} />
          </div>
          <span className="text-3xl font-black text-white">{totalLogsCount}</span>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5 flex flex-col gap-2 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-bold">حركات المبيعات المالية</span>
            <DollarSign className="text-emerald-400" size={20} />
          </div>
          <span className="text-3xl font-black text-white">{salesLogsCount}</span>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md border border-violet-500/30 rounded-2xl p-5 flex flex-col gap-2 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-bold">تحديثات الكادر البشري</span>
            <Users className="text-violet-400" size={20} />
          </div>
          <span className="text-3xl font-black text-white">{hrLogsCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 bg-slate-900/60 p-1.5 rounded-xl border border-white/5 w-full md:w-auto shrink-0">
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
        
        <div className="relative flex-1 md:max-w-md">
          <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
            <Search size={16} className="text-slate-500" />
          </div>
          <input 
            type="text" 
            placeholder="بحث سريع في نص الإجراء المستهدف..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl ps-10 pe-4 py-2.5 text-sm backdrop-blur-md outline-none transition-all"
          />
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-slate-950/20 border border-indigo-500/10 rounded-3xl p-4 md:p-6 overflow-hidden">
        
        {/* Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 items-center mb-4 px-4 w-full">
          <div className="col-span-2 text-right text-xs font-black text-slate-500 uppercase tracking-wider">التوقيت</div>
          <div className="col-span-3 text-right text-xs font-black text-slate-500 uppercase tracking-wider">المستخدم</div>
          <div className="col-span-2 flex justify-center text-center text-xs font-black text-slate-500 uppercase tracking-wider">القسم</div>
          <div className="col-span-5 text-right text-xs font-black text-slate-500 uppercase tracking-wider pr-2">الإجراء المتخذ</div>
        </div>

        {/* Body */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-bold">
              لا يوجد سجلات متطابقة.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const userNameStr = log.user_name || 'Admin';
              const lowerUser = userNameStr.toLowerCase();
              
              let cleanRole = 'موظف نظام';
              if (lowerUser.includes('admin') || lowerUser.includes('superadmin') || lowerUser.includes('mohammadnaseraldeen26@gmail.com')) {
                cleanRole = 'مدير النظام';
              } else if (lowerUser.includes('accountant') || lowerUser.includes('acc@')) {
                cleanRole = 'المحاسب';
              } else if (userNameStr.includes('@')) {
                const parts = userNameStr.split('@')[0];
                cleanRole = parts.charAt(0).toUpperCase() + parts.slice(1);
              } else if (userNameStr !== 'مستعمل النظام') {
                cleanRole = userNameStr;
              }
              
              const displayAction = log.action ? log.action.replace(userNameStr, cleanRole) : '';
              const initial = cleanRole.replace(/[^a-zA-Zأ-ي]/g, '').charAt(0) || 'U';

              return (
                <div 
                  key={log.id || Math.random()} 
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-900/30 backdrop-blur-md border border-slate-800/50 hover:bg-slate-800/40 hover:border-violet-500/40 hover:shadow-[0_0_15px_rgba(139,92,246,0.08)] transition-all duration-300 rounded-xl p-4 cursor-pointer overflow-hidden w-full"
                >
                  <div className="col-span-1 md:col-span-2 text-right">
                    <span className="text-[11px] font-bold text-slate-400" dir="ltr">
                      {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="col-span-1 md:col-span-3 text-right flex items-center gap-2 overflow-hidden">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-white font-bold">{initial}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-200 truncate block max-w-full" title={cleanRole}>
                      {cleanRole}
                    </span>
                  </div>
                  <div className="col-span-1 md:col-span-2 flex justify-center text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black border whitespace-nowrap ${moduleColors[log.module] || moduleColors.default}`}>
                      {moduleNames[log.module] || log.module}
                    </span>
                  </div>
                  <div className="col-span-1 md:col-span-5 text-right font-medium pr-2 overflow-hidden">
                    <span className="text-sm text-slate-300 leading-relaxed truncate block max-w-full" title={displayAction}>
                      {displayAction}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
