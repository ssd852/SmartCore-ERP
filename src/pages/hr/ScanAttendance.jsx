import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { Clock, CheckCircle2, AlertCircle, Loader2, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScanAttendance() {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant');
  const encodedToken = searchParams.get('token');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [empId, setEmpId] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  // Live Digital Clock & Auto-Focus
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    if (inputRef.current) inputRef.current.focus();
    return () => clearInterval(timer);
  }, []);

  // Keep focus locked on the input for barcode scanners
  const handleBlur = () => {
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeScan();
    }
  };

  const handleBarcodeScan = async () => {
    if (!encodedToken) {
      setStatus('error');
      setMessage('الرمز مفقود! يرجى مسح رمز الـ QR من الشاشة مجدداً');
      return;
    }

    try {
      const payloadStr = atob(encodedToken);
      const parsedToken = JSON.parse(payloadStr);

      const timeDiffInSeconds = (Date.now() - parsedToken.timestamp) / 1000;
      if (timeDiffInSeconds > 300 || parsedToken.tenant_id !== tenantId) {
         setStatus('error');
         setMessage('الرمز منتهي الصلاحية! يرجى تحديث الشاشة الرئيسية');
         return;
      }
    } catch (e) {
      setStatus('error');
      setMessage('الرمز غير صالح أو تم التلاعب به');
      return;
    }

    if (!empId || empId.trim() === '') return;

    if (!tenantId) {
      setStatus('error');
      setMessage('عذراً، الرابط غير صالح (Tenant ID مفقود)');
      return;
    }

    setStatus('loading');
    setMessage('');
    const scannedId = empId.trim();

    try {
      if (!supabaseReady) throw new Error('قاعدة البيانات غير متصلة');

      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('emp_id, name')
        .eq('tenant_id', tenantId)
        .eq('emp_id', scannedId)
        .single();

      if (empError || !employee) {
        throw new Error('الرقم الوظيفي غير موجود في نظام شركتك');
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
      let isInsert = false;
      let updateData = {};

      if (!existingLog || !existingLog.clock_in_time) {
        // Clock In
        isInsert = true;
        updateData = {
          tenant_id: tenantId,
          employee_id: targetGlobalEmpId,
          status: '🟢 حضور',
          clock_in_time: new Date().toISOString()
        };
        actionName = 'الحضور';
      } else if (!existingLog.clock_out_time) {
        // Clock Out
        updateData = {
          clock_out_time: new Date().toISOString(),
          status: '🔴 انصراف'
        };
        actionName = 'الانصراف';
      } else {
        throw new Error('لقد تم تسجيل الحضور والانصراف مسبقاً لهذا اليوم');
      }

      if (isInsert) {
        const { error } = await supabase.from('attendance_logs').insert([updateData]);
        if (error) {
          if (error.code === '42P01') throw new Error('جدول attendance_logs غير موجود في قاعدة البيانات');
          throw error;
        }
      } else {
        const { error } = await supabase.from('attendance_logs').update(updateData).eq('id', existingLog.id);
        if (error) throw error;
      }

      setStatus('success');
      setMessage(`تم تسجيل ${actionName} بنجاح عبر الباركود! (${employee.name})`);
      setEmpId('');
      
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
        if (inputRef.current) inputRef.current.focus();
      }, 3000);

    } catch (err) {
      console.error('Punch Error:', err);
      setStatus('error');
      setMessage(err.message || 'حدث خطأ أثناء تسجيل الحركة');
      setEmpId(''); // Clear on error too for next scan
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
        if (inputRef.current) inputRef.current.focus();
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-['Tajawal'] text-white selection:bg-indigo-500/30">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-indigo-500/20 blur-[100px] pointer-events-none" />

        <div className="text-center z-10 relative">
          <ScanLine size={48} className="text-indigo-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">تسجيل الدوام بالباركود</h1>
          <p className="text-slate-400 text-sm font-medium mb-8">يرجى مسح بطاقة الموظف أو إدخال الرقم الوظيفي</p>

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

            {(status === 'idle' || status === 'loading') && (
              <motion.div 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                <div className="relative">
                  {status === 'loading' && (
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                  )}
                  <input 
                    ref={inputRef}
                    type="text"
                    dir="ltr"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder="الرقم الوظيفي أو مسح الباركود..."
                    disabled={status === 'loading'}
                    autoFocus
                    className="w-full bg-slate-950 border-2 border-slate-800 focus:border-indigo-500 rounded-2xl px-6 py-5 text-2xl font-black text-center text-white outline-none transition-all placeholder:text-slate-700 disabled:opacity-50"
                  />
                  <div className="absolute -bottom-6 left-0 right-0 text-center">
                    <span className="text-[10px] font-bold tracking-widest text-slate-600">BARCODE SCANNER READY</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
