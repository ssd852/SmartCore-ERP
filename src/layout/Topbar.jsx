import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { supabase } from '../config/supabaseClient';
import {
  Sun, Moon, Globe, PanelLeftClose, PanelLeftOpen, Bell,
  ChevronDown, LogOut, User, Settings, Monitor, Smartphone
} from 'lucide-react';

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

export default function Topbar() {
  const { t } = useTranslation();
  const { lang, setLang, viewMode, setViewMode, theme, toggleTheme, sidebarCollapsed, setSidebarCollapsed } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
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
    try { await supabase?.auth?.signOut(); } catch (_) {}
    navigate('/login');
  };

  const cycleLang = () => setLang(lang === 'ar' ? 'en' : 'ar');
  const cycleView = () => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop');

  // Mock notifications
  const notifications = [
    { id: 1, text: lang === 'ar' ? 'فاتورة جديدة #1042 بانتظار الموافقة' : 'New invoice #1042 awaiting approval', time: '2m', unread: true },
    { id: 2, text: lang === 'ar' ? 'رصيد المخزون منخفض: صنف #205' : 'Low stock alert: Item #205', time: '18m', unread: true },
    { id: 3, text: lang === 'ar' ? 'تم إتمام مسير رواتب مايو' : 'May payroll processing complete', time: '1h', unread: false },
  ];
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header
      className="flex items-center justify-between h-16 px-5"
      style={{
        background: 'rgba(11,17,32,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        zIndex: 50,
      }}
    >
      {/* ── Left/Start: Sidebar toggle + Breadcrumb ── */}
      <div className="flex items-center gap-3">
        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(v => !v)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/8 transition-all duration-200"
          title={sidebarCollapsed ? t('home') : 'Collapse'}
        >
          {sidebarCollapsed
            ? <PanelLeftOpen size={17} />
            : <PanelLeftClose size={17} />
          }
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((key, i) => (
            <React.Fragment key={key}>
              {i > 0 && <span className="text-slate-700 text-xs">{lang === 'ar' ? '←' : '→'}</span>}
              <span className={i === breadcrumbs.length - 1 ? 'text-slate-200 font-semibold' : 'text-slate-500'}>
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
              className="absolute top-10 end-0 w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
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
                    className={`px-4 py-3 flex items-start gap-3 hover:bg-white/4 transition-colors cursor-pointer border-b border-white/4 last:border-0 ${n.unread ? 'bg-indigo-500/4' : ''}`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.unread ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 leading-relaxed">{n.text}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5 font-medium">{n.time} {lang === 'ar' ? 'منذ' : 'ago'}</p>
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
              A
            </div>
            <div className="hidden sm:block text-start">
              <div className="text-xs font-bold text-slate-300 leading-tight">Admin</div>
              <div className="text-[10px] text-slate-600 leading-tight">ERP Manager</div>
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
                <p className="text-xs font-bold text-slate-200">Admin</p>
                <p className="text-[11px] text-slate-500">admin@company.com</p>
              </div>
              <div className="py-1">
                {[
                  { icon: User, label: t('profile') },
                  { icon: Settings, label: lang === 'ar' ? 'الإعدادات' : 'Settings' },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
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
  );
}
