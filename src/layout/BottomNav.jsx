import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Package, DollarSign, UserCheck, BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'home',            icon: LayoutDashboard, path: '/' },
  { key: 'supply_inventory',icon: Package,          path: '/inventory' },
  { key: 'finance_sales',   icon: DollarSign,       path: '/invoices' },
  { key: 'hr_assets',       icon: UserCheck,        path: '/employees' },
  { key: 'reports',         icon: BarChart3,        path: '/reports' },
];

export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav
      className="shrink-0 flex items-center justify-around h-16 px-2"
      style={{
        background: 'rgba(2,6,23,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {NAV_ITEMS.map(({ key, icon: Icon, path }) => {
        const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
        return (
          <NavLink
            key={key}
            to={path}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-200"
          >
            <Icon
              size={20}
              className={isActive ? 'text-indigo-400' : 'text-slate-600'}
              strokeWidth={isActive ? 2.5 : 1.5}
            />
            <span className={`text-[9px] font-bold ${isActive ? 'text-indigo-400' : 'text-slate-600'}`}>
              {t(key)}
            </span>
            {isActive && (
              <div className="absolute top-0 w-8 h-0.5 rounded-full bg-indigo-500" />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
