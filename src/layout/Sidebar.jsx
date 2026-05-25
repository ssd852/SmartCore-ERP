import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, FileText,
  Users, BookOpen, Building, UserCheck,
  DollarSign, BarChart3, ChevronDown, ChevronUp, Landmark, CreditCard, Terminal, HardDrive, Cpu
} from 'lucide-react';

const menuGroups = [
  {
    key: 'dashboard',
    icon: LayoutDashboard,
    items: [
      { key: 'home', icon: LayoutDashboard, path: '/' },
    ],
  },
  {
    key: 'supply_inventory',
    icon: Package,
    items: [
      { key: 'inventory',         icon: Package,       path: '/inventory' },
      { key: 'purchase_invoices', icon: ShoppingCart,  path: '/purchases' },
      { key: 'suppliers',         icon: Truck,         path: '/suppliers' },
    ],
  },
  {
    key: 'finance_sales',
    icon: DollarSign,
    items: [
      { key: 'sales_invoices',    icon: FileText,      path: '/invoices' },
      { key: 'customers',         icon: Users,         path: '/customers' },
      { key: 'checks',            icon: CreditCard,    path: '/checks' },
      { key: 'chart_of_accounts', icon: Landmark,      path: '/accounts' },
      { key: 'journal_entries',   icon: BookOpen,      path: '/journal' },
    ],
  },
  {
    key: 'hr_assets',
    icon: UserCheck,
    items: [
      { key: 'fixed_assets', icon: Building,   path: '/assets' },
      { key: 'employees',    icon: UserCheck,  path: '/employees' },
      { key: 'payroll',      icon: DollarSign, path: '/payroll' },
    ],
  },
  {
    key: 'reports',
    icon: BarChart3,
    items: [
      { key: 'reports', icon: BarChart3, path: '/reports' },
    ],
  },
  {
    key: 'system_tools',
    icon: Terminal,
    items: [
      { key: 'sql_engine',     icon: Terminal,   path: '/sql' },
      { key: 'data_management', icon: HardDrive,  path: '/data-mgmt' },
    ],
  },
];

/* ── Group accent colors ── */
const groupColors = {
  dashboard:        'text-indigo-400',
  supply_inventory: 'text-emerald-400',
  finance_sales:    'text-amber-400',
  hr_assets:        'text-sky-400',
  reports:          'text-purple-400',
  system_tools:     'text-cyan-400',
};

const groupBg = {
  dashboard:        'rgba(99,102,241,0.1)',
  supply_inventory: 'rgba(16,185,129,0.1)',
  finance_sales:    'rgba(245,158,11,0.1)',
  hr_assets:        'rgba(14,165,233,0.1)',
  reports:          'rgba(168,85,247,0.1)',
  system_tools:     'rgba(34,211,238,0.1)',
};

export default function Sidebar() {
  const { t } = useTranslation();
  const { lang, sidebarCollapsed, isDevMode, setIsDevMode, authUser } = useApp();
  const location = useLocation();
  
  const userRole = localStorage.getItem('userRole') || 'Admin';
  
  const whitelistedEmails = [
    'mohammadnaseraldeen26@gmail.com',
    'mohammadnaseraldeen25@gmail.com'
  ];
  const isSuperAdmin = authUser?.email && whitelistedEmails.includes(authUser.email.toLowerCase());

  const visibleGroups = menuGroups.filter(g => {
    if (g.key === 'system_tools') return isSuperAdmin;
    return true;
  });

  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(visibleGroups.map(g => [g.key, true]))
  );

  const toggle = (key) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{
        background: 'rgba(2,6,23,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderInlineEnd: '1px solid rgba(255,255,255,0.06)',
        width: sidebarCollapsed ? 64 : 260,
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}
    >
      {/* ── Brand ── */}
      <div
        className="flex items-center gap-3 px-4 py-5 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
          style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}
        >
          <Landmark size={18} color="white" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <div
              className="text-sm font-black tracking-tight"
              style={{
                background: 'linear-gradient(to right, #a5b4fc, #34d399)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {lang === 'ar' ? 'المحاسب الذكي' : 'SmartCore ERP'}
            </div>
            <div className="text-[10px] text-slate-600 font-semibold tracking-widest uppercase">
              Enterprise v2.0
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleGroups.map(group => {
          const GroupIcon = group.icon;
          const isOpen = openGroups[group.key];
          const hasActive = group.items.some(item =>
            item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
          );

          return (
            <div key={group.key} className="mb-1">
              {/* Group header */}
              <button
                onClick={() => !sidebarCollapsed && toggle(group.key)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl mb-0.5 transition-all duration-200 group
                  ${hasActive ? 'bg-white/5' : 'hover:bg-white/4'}
                `}
              >
                <GroupIcon
                  size={16}
                  className={`shrink-0 ${groupColors[group.key]} transition-transform duration-200 ${hasActive ? 'scale-110' : ''}`}
                />
                {!sidebarCollapsed && (
                  <>
                    <span className={`flex-1 text-left text-[11px] font-bold tracking-wider uppercase ${hasActive ? 'text-slate-300' : 'text-slate-500'} transition-colors`}>
                      {t(group.key)}
                    </span>
                    <span className={`text-slate-600 transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`}>
                      {isOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    </span>
                  </>
                )}
              </button>

              {/* Group items */}
              <div
                style={{
                  maxHeight: isOpen && !sidebarCollapsed ? '500px' : (sidebarCollapsed ? '500px' : '0px'),
                  overflow: 'hidden',
                  transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                <ul className="flex flex-col gap-0.5 ps-1">
                  {group.items.map(item => {
                    const ItemIcon = item.icon;
                    const isActive = item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.path);

                    return (
                      <li key={item.key}>
                        <NavLink
                          to={item.path}
                          className={() => `nav-item ${isActive ? 'active' : ''}`}
                          style={isActive ? { background: groupBg[group.key] } : {}}
                        >
                          <ItemIcon
                            size={15}
                            className={`shrink-0 ${isActive ? groupColors[group.key] : 'text-slate-600'} transition-colors`}
                          />
                          {!sidebarCollapsed && (
                            <span>{t(item.key)}</span>
                          )}
                          {/* Active indicator */}
                          {isActive && !sidebarCollapsed && (
                            <span
                              className="ms-auto w-1.5 h-1.5 rounded-full"
                              style={{ background: groupColors[group.key].replace('text-', '').includes('indigo') ? '#6366f1'
                                : groupColors[group.key].includes('emerald') ? '#10b981'
                                : groupColors[group.key].includes('amber') ? '#f59e0b'
                                : groupColors[group.key].includes('sky') ? '#0ea5e9'
                                : '#a855f7'
                              }}
                            />
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      {!sidebarCollapsed && (
        <div
          className="px-4 py-3 shrink-0 flex flex-col gap-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          {isSuperAdmin && (
            <button 
              onClick={() => setIsDevMode(!isDevMode)}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
              title="وضع المطور / الفحص البرمجي"
            >
              <div className="flex items-center gap-1.5">
                <Cpu size={12} className={isDevMode ? 'text-indigo-400' : 'text-slate-500'} />
                <span className={`text-[10px] font-bold ${isDevMode ? 'text-indigo-400' : 'text-slate-500'}`}>وضع المطور</span>
              </div>
              <div className={`w-6 h-3 rounded-full flex items-center p-0.5 transition-colors ${isDevMode ? 'bg-indigo-500/30' : 'bg-white/10'}`}>
                <div className={`w-2 h-2 rounded-full transition-transform ${isDevMode ? 'bg-indigo-400 translate-x-[12px]' : 'bg-slate-400 translate-x-0'}`} />
              </div>
            </button>
          )}
          <p className="text-[10px] text-slate-700 font-medium text-center mt-1">© 2026 SmartCore ERP</p>
        </div>
      )}
    </div>
  );
}
