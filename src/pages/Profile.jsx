import React, { useState, useEffect } from 'react';
import { supabase, supabaseReady } from '../config/supabaseClient';
import { useApp } from '../context/AppContext';
import { motion } from 'framer-motion';
import { Shield, User, Mail } from 'lucide-react';

export default function Profile() {
  const { lang } = useApp();
  
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      if (!supabaseReady) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSessionUser(session.user);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto font-['Tajawal']" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">الملف الشخصي والإعدادات</h1>
        <p className="text-slate-400 font-medium">إدارة تفضيلات حسابك وإعدادات الأمان والمصادقة</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* User Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="col-span-1 md:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none" />
          
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mb-4">
              <User size={40} />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">مسؤول النظام</h2>
            <p className="text-sm text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-full mb-4">Super Admin</p>
            
            <div className="w-full space-y-3 mt-4 text-start">
              <div className="flex items-center gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <Mail size={16} className="text-slate-400 shrink-0" />
                <span className="text-sm font-medium break-all">{sessionUser?.email || 'جاري التحميل...'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <Shield size={16} className="text-slate-400" />
                <span className="text-sm font-medium">حساب مؤمن ومفعل</span>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
