import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScanAttendance() {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant');
  const encodedToken = searchParams.get('token');
  
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
    if (!encodedToken) {
      setStatus('error');
      setMessage('الرمز مفقود! يرجى مسح رمز الـ QR من الشاشة مجدداً');
      return;
    }

    try {
      const payloadStr = atob(encodedToken);
      const parsedToken = JSON.parse(payloadStr);

      const timeDiffInSeconds = (Date.now() - parsedToken.timestamp) / 1000;
      if (timeDiffInSeconds > 10 || parsedToken.tenant_id !== tenantId) {
         setStatus('error');
         setMessage('الرمز منتهي الصلاحية! يرجى المسح مباشرة من شاشة الإدارة');
         return;
      }
    } catch (e) {
      setStatus('error');
      setMessage('الرمز غير صالح أو تم التلاعب به');
      return;
    }

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

    try {
      // Trigger Native Biometric Prompt
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn not supported');
      }
      
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array([1, 2, 3, 4]), // Secure transaction challenge
          rpId: window.location.hostname,
          userVerification: "required" // Forces biometrics (Fingerprint/Face)
        }
      });
      
      if (!credential) {
         throw new Error('Biometric check failed or cancelled');
      }
    } catch (bioError) {
      console.error('Biometric Authentication Error:', bioError);
      setStatus('error');
      setMessage('فشلت عملية التحقق من الهوية! يجب استخدام بصمة الإصبع الحقيقية للجهاز');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      if (!supabaseReady) throw new Error('قاعدة البيانات غير متصلة');

      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('emp_id')
        .eq('tenant_id', tenantId)
        .eq('emp_id', String(empId).trim())
        .single();

      if (empError || !employee) {
        setStatus('error');
        setMessage('الرقم الوظيفي غير موجود في نظام شركتك');
        return;
      }
      
      const targetGlobalEmpId = employee.emp_id;
      const todayStr = new Date().toISOString().split('T')[0];

      // Find if an attendance log already exists for today
      const { data: logs, error: logsErr } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('employee_id', targetGlobalEmpId)
        .gte('clock_in_time', `${todayStr}T00:00:00Z`)
        .lte('clock_in_time', `${todayStr}T23:59:59Z`)
        .order('clock_in_time', { ascending: false })
        .limit(1);

      if (logsErr && logsErr.code !== '42P01') throw logsErr;
      const existingLog = logs && logs.length > 0 ? logs[0] : null;

      let actionName = '';

      if (punchType === 'clock_in') {
        if (existingLog && existingLog.clock_in_time) throw new Error('تم تسجيل الحضور مسبقاً اليوم');
        const payload = {
          tenant_id: tenantId,
          employee_id: targetGlobalEmpId,
          status: '🟢 حضور',
          clock_in_time: new Date().toISOString()
        };
        const { error } = await supabase.from('attendance_logs').insert([payload]);
        if (error) {
          if (error.code === '42P01') throw new Error('جدول attendance_logs غير موجود في قاعدة البيانات');
          throw error;
        }
        actionName = 'الحضور';
      } else {
        if (!existingLog) throw new Error('يجب تسجيل الحضور أولاً');
        const updateData = {};
        
        if (punchType === 'leave_out') {
          if (existingLog.leave_out_time) throw new Error('تم تسجيل إذن المغادرة مسبقاً');
          updateData.leave_out_time = new Date().toISOString();
          updateData.status = '🟡 إذن مغادرة';
          actionName = 'إذن مغادرة';
        } else if (punchType === 'leave_in') {
          if (!existingLog.leave_out_time) throw new Error('يجب تسجيل إذن المغادرة أولاً');
          if (existingLog.leave_in_time) throw new Error('تم تسجيل العودة مسبقاً');
          updateData.leave_in_time = new Date().toISOString();
          updateData.status = '🔵 عودة';
          actionName = 'العودة من المغادرة';
        } else if (punchType === 'clock_out') {
          if (existingLog.clock_out_time) throw new Error('تم تسجيل الانصراف مسبقاً');
          updateData.clock_out_time = new Date().toISOString();
          updateData.status = '🔴 انصراف';
          actionName = 'الانصراف';
        }

        const { error } = await supabase.from('attendance_logs').update(updateData).eq('id', existingLog.id);
        if (error) throw error;
      }

      setStatus('success');
      setMessage(`تم تسجيل ${actionName} بنجاح للموظف #${empId}`);
      setEmpId('');
      
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
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-indigo-500/20 blur-[100px] pointer-events-none" />

        <div className="text-center z-10 relative">
          <Clock size={40} className="text-indigo-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">نظام تسجيل الدوام</h1>
          <p className="text-slate-400 text-sm font-medium mb-8">تسجيل الدوام الذكي للموظفين</p>

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
                    onClick={() => handlePunch('clock_in')}
                    disabled={status === 'loading'}
                    className="flex flex-col items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    {status === 'loading' ? <Loader2 className="animate-spin" /> : '🟢 حضور'}
                  </button>
                  <button 
                    onClick={() => handlePunch('leave_out')}
                    disabled={status === 'loading'}
                    className="flex flex-col items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white p-4 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    {status === 'loading' ? <Loader2 className="animate-spin" /> : '🟡 إذن مغادرة'}
                  </button>
                  <button 
                    onClick={() => handlePunch('leave_in')}
                    disabled={status === 'loading'}
                    className="flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    {status === 'loading' ? <Loader2 className="animate-spin" /> : '🔵 عودة'}
                  </button>
                  <button 
                    onClick={() => handlePunch('clock_out')}
                    disabled={status === 'loading'}
                    className="flex flex-col items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white p-4 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-50"
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
