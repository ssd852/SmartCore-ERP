import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScanAttendance() {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [empId, setEmpId] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePunch = async (punchType) => {
    if (!empId) {
      setStatus('error');
      setMessage('الرجاء إدخال الرقم الوظيفي أولاً');
      return;
    }
    
    if (!tenantId) {
      setStatus('error');
      setMessage('عذراً، الرابط غير صالح (Tenant ID مفقود)');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      if (!supabaseReady) throw new Error('قاعدة البيانات غير متصلة');

      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('emp_id')
        .eq('emp_id', String(empId).trim())
        .single();

      if (empError || !employee) {
        setStatus('error');
        setMessage('الرقم الوظيفي غير موجود في نظام شركتك');
        return;
      }
      
      const targetGlobalEmpId = employee.emp_id;

      const payload = {
        user_id: tenantId,
        tenant_id: tenantId,
        employee_id: targetGlobalEmpId,
        status: punchType === 'in' ? '🟢 حضور' : '🔴 انصراف',
        clock_in_time: new Date().toISOString()
      };

      const { error } = await supabase.from('attendance_logs').insert([payload]);
      
      if (error) {
         // Suppress missing table error gracefully
         if (error.code === '42P01') throw new Error('جدول attendance_logs غير موجود في قاعدة البيانات');
         throw error;
      }

      setStatus('success');
      setMessage(`تم تسجيل ${punchType === 'in' ? 'الحضور' : 'الانصراف'} بنجاح للموظف #${empId}`);
      setEmpId('');
      
      // Reset success screen after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);

    } catch (err) {
      console.error('Punch Error:', err);
      setStatus('error');
      setMessage(err.message || 'حدث خطأ أثناء تسجيل الحركة');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-['Tajawal'] text-white selection:bg-indigo-500/30">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-indigo-500/20 blur-[100px] pointer-events-none" />

        <div className="text-center z-10 relative">
          <Clock size={40} className="text-indigo-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">نظام تسجيل الدوام</h1>
          <p className="text-slate-400 text-sm font-medium mb-8">تسجيل الدوام الذكي للموظفين</p>

          {/* Digital Clock */}
          <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 font-mono tracking-wider mb-2" dir="ltr">
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          <div className="text-slate-500 text-sm font-medium mb-8">
            {currentTime.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          <AnimatePresence mode="wait">
            {status === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl mb-8 flex flex-col items-center gap-3"
              >
                <CheckCircle2 size={48} className="text-emerald-400" />
                <p className="text-emerald-400 font-bold text-lg">{message}</p>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl mb-6 flex items-center gap-3 text-right"
              >
                <AlertCircle size={24} className="text-rose-400 shrink-0" />
                <p className="text-rose-400 font-bold text-sm">{message}</p>
              </motion.div>
            )}

            {(status === 'idle' || status === 'loading' || status === 'error') && (
              <motion.div 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2 text-right">الرقم الوظيفي (ID)</label>
                  <input 
                    type="number"
                    dir="ltr"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    placeholder="مثال: 20"
                    disabled={status === 'loading'}
                    className="w-full bg-slate-950 border-2 border-slate-800 focus:border-indigo-500 rounded-2xl px-6 py-4 text-2xl font-black text-center text-white outline-none transition-all placeholder:text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handlePunch('in')}
                    disabled={status === 'loading'}
                    className="flex flex-col items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white p-6 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    {status === 'loading' ? <Loader2 className="animate-spin" /> : '🟢 حضور'}
                  </button>
                  <button 
                    onClick={() => handlePunch('out')}
                    disabled={status === 'loading'}
                    className="flex flex-col items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white p-6 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    {status === 'loading' ? <Loader2 className="animate-spin" /> : '🔴 انصراف'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
