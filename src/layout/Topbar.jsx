import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { supabase } from '../config/supabaseClient';
import {
  Sun, Moon, Globe, PanelLeftClose, PanelLeftOpen, Bell, Menu,
  ChevronDown, LogOut, User, Settings, Monitor, Smartphone,
  X, FileText, AlertTriangle, CheckCircle, Info, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Route → breadcrumb label map ── */
const BREADCRUMBS = {
  '/':           ['home'],
  '/inventory':  ['supply_inventory', 'inventory'],
  '/purchases':  ['supply_inventory', 'purchase_invoices'],
  '/suppliers':  ['supply_inventory', 'suppliers'],
  '/invoices':   ['finance_sales', 'sales_invoices'],
  '/customers':  ['finance_sales', 'customers'],
  '/checks':     ['finance_sales', 'checks'],
  '/accounts':   ['finance_sales', 'chart_of_accounts'],
  '/journal':    ['finance_sales', 'journal_entries'],
  '/assets':     ['hr_assets', 'fixed_assets'],
  '/employees':  ['hr_assets', 'employees'],
  '/payroll':    ['hr_assets', 'payroll'],
  '/reports':    ['reports'],
};

const NOTIFICATION_TYPE_MAP = {
  hr: 'الموارد البشرية 👤',
  invoice: 'فاتورة مبيعات 📑',
  purchase: 'فاتورة مشتريات 📥',
  stock: 'إدارة المخازن 📦',
  payroll: 'مسير الرواتب 💵',
  finance: 'حركة شيكات / مالية 🎫',
  assets: 'الأصول الثابتة 🏢'
};

export default function Topbar({ onMenuClick }) {
  const { t } = useTranslation();
  const { lang, setLang, viewMode, setViewMode, theme, toggleTheme, sidebarCollapsed, setSidebarCollapsed, authUser, userRole } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const getDynamicRole = () => {
    const activeUserEmail = authUser?.email || '';
    const activeUserRole = authUser?.user_metadata?.role || userRole || '';
    
    if (activeUserEmail.toLowerCase().includes('accountant') || activeUserRole.toLowerCase().includes('accountant')) {
      return "المحاسب";
    }
    if (activeUserEmail.toLowerCase().includes('admin') || activeUserRole.toLowerCase().includes('admin')) {
      return "مدير النظام";
    }
    if (activeUserEmail === 'mohammadnaseraldeen26@gmail.com') {
      return activeUserRole.toLowerCase().includes('accountant') ? "المحاسب" : "مدير النظام";
    }
    return "مدير النظام";
  };
  const currentRoleAr = getDynamicRole();
  const userTitle = currentRoleAr === 'المحاسب' ? 'المحاسب المالي' : 'مدير النظام';
  const userSubtext = currentRoleAr === 'المحاسب' ? 'القسم المالي' : 'إدارة النظام';
  const userInitials = userTitle.charAt(0);
  const displayEmail = authUser?.email || 'user@company.com';

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  const breadcrumbs = BREADCRUMBS[location.pathname] || ['home'];

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    // ── SECURITY: Multi-step session purge ──
    // Step 1: Revoke the JWT on Supabase's server and clear the persisted session
    try { await supabase?.auth?.signOut({ scope: 'local' }); } catch (_) {}
    // Step 2: Purge all tenant-scoped and role-scoped keys from localStorage
    // to prevent stale data leaking into the next login session.
    const TENANT_KEYS = [
      'userRole',            // legacy role key written by older code paths
      'sb-access-token',     // belt-and-suspenders: Supabase SDK own keys
      'sb-refresh-token',
    ];
    TENANT_KEYS.forEach(key => localStorage.removeItem(key));
    // Step 3: Navigate to login — React Router will unmount all data-fetching components
    navigate('/login');
  };

  const cycleLang = () => setLang(lang === 'ar' ? 'en' : 'ar');
  const cycleView = () => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop');

  const [notifications, setNotifications] = useState([]);

  // Fetch existing notifications and subscribe to real-time inserts
  // SECURITY: gated on authUser so this never runs for an unauthenticated/signed-out user
  useEffect(() => {
    if (!authUser?.id) {
      setNotifications([]);
      return;
    }
    const tenantId = authUser.id;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) {
        // Map database fields to UI state strictly
        setNotifications(data.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type || 'system',
          time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          raw_date: n.created_at,
          unread: !n.is_read
        })));
      }
    };

    fetchNotifications();

    // Subscribe to new notifications using Supabase Realtime
    const channel = supabase
      .channel(`notifications-${tenantId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `tenant_id=eq.${tenantId}` }, (payload) => {
        const newNotif = {
          id: payload.new.id,
          title: payload.new.title,
          message: payload.new.message,
          type: payload.new.type || 'system',
          time: new Date(payload.new.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          raw_date: payload.new.created_at,
          unread: !payload.new.is_read
        };
        // Append new notification to the top
        setNotifications(prev => [newNotif, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser?.id]);

  const handleMarkAsRead = async (id) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    // Update DB
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const handleNotificationClick = (n) => {
    if (n.unread) handleMarkAsRead(n.id);
    setSelectedNotification(n);
    setNotifOpen(false);
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <>
      <header
        className="flex items-center justify-between h-14 md:h-16 px-3 md:px-5"
      style={{
        background: 'rgba(11,17,32,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        zIndex: 50,
      }}
    >
      {/* ── Left/Start: Sidebar toggle + Breadcrumb ── */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Hamburger — only on real mobile (hidden on md+) */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/8 transition-all duration-200 shrink-0"
            title="Menu"
          >
            <Menu size={18} />
          </button>
        )}
        {/* Collapse toggle — only on desktop */}
        <button
          onClick={() => setSidebarCollapsed(v => !v)}
          className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/8 transition-all duration-200"
          title={sidebarCollapsed ? t('home') : 'Collapse'}
        >
          {sidebarCollapsed
            ? <PanelLeftOpen size={17} />
            : <PanelLeftClose size={17} />
          }
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 md:gap-1.5 text-xs md:text-sm min-w-0 overflow-hidden">
          {breadcrumbs.map((key, i) => (
            <React.Fragment key={key}>
              {i > 0 && <span className="text-slate-700 text-xs shrink-0">{lang === 'ar' ? '←' : '→'}</span>}
              <span className={`${i === breadcrumbs.length - 1 ? 'text-slate-200 font-semibold truncate' : 'text-slate-500 hidden sm:inline'}`}>
                {t(key)}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* ── Right/End: Controls ── */}
      <div className="flex items-center gap-1.5">

        {/* View Mode Toggle */}
        <button
          onClick={cycleView}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all duration-200"
          title={t('view_mode')}
        >
          {viewMode === 'desktop' ? <Monitor size={16} /> : <Smartphone size={16} />}
        </button>

        {/* Language Toggle */}
        <button
          onClick={cycleLang}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all duration-200 text-xs font-bold"
          title={t('language')}
        >
          <Globe size={14} />
          <span>{lang === 'ar' ? 'EN' : 'ع'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200"
          title={theme === 'dark' ? t('light_mode') : t('dark_mode')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(v => !v)}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/8 transition-all duration-200"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 end-1 w-2 h-2 rounded-full bg-rose-500 border-2 border-[#0b1120]" />
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div
              className="absolute top-10 end-0 w-[calc(100vw-2rem)] max-w-xs sm:w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
              style={{
                background: 'rgba(15,23,42,0.95)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200">{t('notifications')}</span>
                {unreadCount > 0 && (
                  <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full px-2 py-0.5 font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-4 py-3 flex items-start gap-3 hover:bg-white/4 transition-colors cursor-pointer border-b border-white/4 last:border-0 ${n.unread ? 'bg-indigo-500/4' : ''}`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.unread ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                    <div className="flex-1 min-w-0">
                      {n.title && <p className="text-xs font-bold text-slate-200 mb-0.5">{n.title}</p>}
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-slate-600 mt-1 font-medium">{n.time} {lang === 'ar' ? 'منذ' : 'ago'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-white/8 mx-1" />

        {/* User Avatar + Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="flex items-center gap-2 h-9 px-2 rounded-xl hover:bg-white/6 transition-all duration-200 group"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              {userInitials}
            </div>
            <div className="hidden sm:block text-start">
              <div className="text-xs font-bold text-slate-300 leading-tight">{userTitle}</div>
              <div className="text-[10px] text-slate-600 leading-tight">{userSubtext}</div>
            </div>
            <ChevronDown size={12} className={`text-slate-600 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <div
              className="absolute top-11 end-0 w-48 rounded-2xl overflow-hidden shadow-2xl z-50"
              style={{
                background: 'rgba(15,23,42,0.95)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="px-4 py-3 border-b border-white/6">
                <p className="text-xs font-bold text-slate-200">{userTitle}</p>
                <p className="text-[11px] text-slate-500 truncate block max-w-full" title={displayEmail}>{displayEmail}</p>
              </div>
              <div className="py-1">
                {[
                  { icon: User, label: t('profile'), path: '/profile' },
                  { icon: Settings, label: lang === 'ar' ? 'الإعدادات' : 'Settings', path: '/settings' },
                ].map(({ icon: Icon, label, path }) => (
                  <button
                    key={label}
                    onClick={() => {
                      if (path) navigate(path);
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/6 transition-all duration-150"
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
              <div className="py-1 border-t border-white/6">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-150"
                >
                  <LogOut size={14} />
                  {t('logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </header>

      {/* Notification Details Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900/90 backdrop-blur-md border border-indigo-500/30 rounded-3xl p-8 pt-10 max-w-md w-full shadow-[0_0_40px_rgba(79,70,229,0.15)] relative max-h-[85vh] overflow-y-auto overflow-x-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] pointer-events-none" />
              
              <button 
                onClick={() => setSelectedNotification(null)} 
                className="absolute top-6 left-6 text-slate-500 hover:text-white transition-colors z-20"
              >
                <X size={24} />
              </button>
              
              <div className="flex items-center gap-4 mb-8 mt-2 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  {selectedNotification.type === 'invoice' ? <FileText className="text-indigo-400" size={28} /> : 
                   selectedNotification.type === 'alert' ? <AlertTriangle className="text-amber-400" size={28} /> : 
                   <Info className="text-indigo-400" size={28} />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white leading-tight">
                    {selectedNotification.type === 'invoice' ? 'تفاصيل طلب الموافقة' : 'تفاصيل التنبيه'}
                  </h2>
                  <div className="inline-flex mt-1.5 items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                    <CheckCircle size={10} /> بانتظار الإجراء
                  </div>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1.5 font-bold">نص التنبيه</p>
                  <p className="text-sm text-slate-200 leading-relaxed font-bold">{selectedNotification.title}</p>
                  {selectedNotification.message && (
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{selectedNotification.message}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                    <p className="text-xs text-slate-500 mb-1.5 font-bold">النوع</p>
                    <p className="text-sm text-slate-200 font-bold">{NOTIFICATION_TYPE_MAP[selectedNotification.type] || 'تنبيه النظام ⚙️'}</p>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                    <p className="text-xs text-slate-500 mb-1.5 font-bold">التوقيت</p>
                    <p className="text-[11px] text-slate-200 font-bold mt-1" dir="ltr">
                      {selectedNotification.raw_date ? new Date(selectedNotification.raw_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : selectedNotification.time}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8 relative z-10">
                <button 
                  onClick={() => setSelectedNotification(null)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 text-sm"
                >
                  معاينة المستند كامل <ArrowUpRight size={16} />
                </button>
                <button 
                  onClick={() => setSelectedNotification(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 rounded-xl transition-all text-sm border border-slate-700"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
