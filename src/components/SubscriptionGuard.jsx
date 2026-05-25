import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SubscriptionGuard({ children, isCore = false }) {
  const { tenantProfile } = useApp();
  const { t } = useTranslation();

  // If loading or no profile, let it render (or we could show a loader)
  if (!tenantProfile) return children;

  const expiryDate = new Date(tenantProfile.subscription_expiry_date);
  const isExpired = new Date() > expiryDate;

  // Lifetime plan is '2099-12-31', which will never be expired currently, 
  // but this check handles any expired plan.
  if (isExpired && !isCore) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[60vh] p-4 text-center">
        <div className="w-20 h-20 rounded-3xl mb-6 flex items-center justify-center bg-rose-500/10 border border-rose-500/20 shadow-lg shadow-rose-500/10">
          <AlertTriangle size={36} className="text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-100 mb-3 drop-shadow-md">الاشتراك منتهي</h2>
        <p className="text-slate-400 mb-6 max-w-md leading-relaxed font-medium">
          عذراً، لقد انتهت صلاحية اشتراكك. الوظائف الأساسية فقط (المخزون، الرواتب، القيود اليومية، الطباعة) متاحة حالياً. يرجى تجديد الاشتراك للوصول إلى كافة ميزات النظام.
        </p>
      </div>
    );
  }

  return children;
}
