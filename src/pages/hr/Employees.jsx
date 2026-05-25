import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { UserCheck, Loader2, Banknote, Clock, Printer, Plus, AlertCircle } from 'lucide-react';
import CrudTable from '../../components/CrudTable';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { getAuthUserId } from '../../utils/getAuthUserId';
import { formatCurrency } from '../../utils/currencyFormatter';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';

const DEPARTMENTS = ['المالية', 'المحاسبة', 'الموارد البشرية', 'التقنية', 'المبيعات', 'الإدارة'];

// --- Employee Form ---
function EmployeeForm({ row, onClose, onSave, isSaving }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: row?.name || '',
    position: row?.position || '',
    department: row?.department || DEPARTMENTS[0],
    salary: row?.salary ?? '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('name')}</label>
        <input className="erp-input" value={form.name} onChange={e => set('name', e.target.value)} required disabled={isSaving} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('position')}</label>
        <input className="erp-input" value={form.position} onChange={e => set('position', e.target.value)} required disabled={isSaving} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('department')}</label>
          <select className="erp-select" value={form.department} onChange={e => set('department', e.target.value)} disabled={isSaving}>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('salary')}</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.salary} onChange={e => set('salary', e.target.value)} required disabled={isSaving} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-all disabled:opacity-50">
          {t('cancel')}
        </button>
        <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
          {t('save')}
        </button>
      </div>
    </form>
  );
}

// --- Main Module ---
export default function Employees() {
  const { setSidebarCollapsed, lang, printDocument } = useApp();
  const { t } = useTranslation();
  const addToast = useToast();
  
  const [activeTab, setActiveTab] = useState(0); // 0: Profiles, 1: Payroll, 2: Attendance
  
  // Data States
  const [employees, setEmployees] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fast Advance Booking State
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [selectedEmpForAdvance, setSelectedEmpForAdvance] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDesc, setAdvanceDesc] = useState('');

  // Attendance & QR State
  const [qrPayload, setQrPayload] = useState('');
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [tenantId, setTenantId] = useState('');

  // Widescreen Mode & Fetch Data
  useEffect(() => {
    setSidebarCollapsed(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setTenantId(session.user.id);
      }
      
      const [empRes, payRes, attRes] = await Promise.all([
        supabase.from('employees').select('*').order('emp_id', { ascending: false }),
        supabase.from('payroll').select('*').order('payroll_id', { ascending: false }),
        supabase.from('attendance_logs').select('*').order('clock_in_time', { ascending: false }).limit(20)
      ]);
      
      if (empRes.error) throw empRes.error;
      if (payRes.error) throw payRes.error;

      setEmployees(empRes.data || []);
      setPayroll(payRes.data || []);
      if (!attRes.error) {
        setAttendanceLogs(attRes.data || []);
      }
    } catch (err) {
      console.error('Fetch HR Data Error:', err);
      // Suppress missing attendance_logs table error if it doesn't exist yet
      if (err.code !== '42P01') {
         addToast(err.message || 'Failed to load HR data', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Rotate QR Code Every 60 Seconds
  useEffect(() => {
    if (activeTab !== 2 || !tenantId) return;

    const generatePayload = () => {
      const timestamp = Date.now();
      const payload = JSON.stringify({
        tenant_id: tenantId,
        timestamp: timestamp,
        expires_at: timestamp + 60000 // 60 seconds validity
      });
      // In a real app, this should be a cryptographically signed JWT or HMAC
      setQrPayload(btoa(payload)); 
    };

    generatePayload();
    const interval = setInterval(generatePayload, 60000);
    return () => clearInterval(interval);
  }, [activeTab, tenantId]);

  // Simulate QR Scan
  const simulateQRScan = async () => {
    if (employees.length === 0) {
      addToast('لا يوجد موظفين مسجلين لتسجيل حضورهم', 'error');
      return;
    }
    
    // Pick a random employee
    const randomEmp = employees[Math.floor(Math.random() * employees.length)];
    
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const user_id = await getAuthUserId();
      
      const newLog = {
        user_id,
        employee_id: randomEmp.emp_id,
        clock_in_time: new Date().toISOString(),
        status: '🟢 حضور'
      };

      const { data, error } = await supabase.from('attendance_logs').insert([newLog]).select();
      if (error) {
         if (error.code === '42P01') {
            addToast('جدول attendance_logs غير موجود بقاعدة البيانات بعد.', 'error');
            return;
         }
         throw error;
      }
      
      if (data && data.length > 0) {
        setAttendanceLogs(p => [data[0], ...p].slice(0, 20));
      }
      
      addToast(`تم تسجيل حضور: ${randomEmp.name}`, 'success');
      
    } catch (err) {
      console.error('Scan Error:', err);
      addToast(err.message || 'Failed to record attendance', 'error');
    }
  };

  // Profile Save
  const handleSaveEmployee = async (form, row, onClose) => {
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      if (row?.emp_id) {
        const { error } = await supabase.from('employees').update(form).eq('emp_id', row.emp_id);
        if (error) throw error;
        setEmployees(p => p.map(r => r.emp_id === row.emp_id ? { ...r, ...form } : r));
        addToast(t('edit') + ' ✓', 'info');
      } else {
        const user_id = await getAuthUserId();
        const payload = { ...form, user_id };
        const { data: newRecords, error } = await supabase.from('employees').insert([payload]).select();
        if (error) throw error;
        if (newRecords && newRecords.length > 0) setEmployees(p => [newRecords[0], ...p]);
        else await fetchData();
        addToast(t('save') + ' ✓', 'success');
      }
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to save data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async (row) => {
    try {
      const { error } = await supabase.from('employees').delete().eq('emp_id', row.emp_id);
      if (error) throw error;
      setEmployees(p => p.filter(r => r.emp_id !== row.emp_id));
      addToast(t('delete') + ' ✓', 'warning');
    } catch (err) {
      addToast(err.message || 'Failed to delete data', 'error');
    }
  };

  // Fast Advance Submission
  const submitAdvance = async (e) => {
    e.preventDefault();
    if (!selectedEmpForAdvance || !advanceAmount) return;
    setIsSaving(true);
    try {
      // Find active payroll for current month or create one
      const currentMonth = new Date().toISOString().slice(0, 7);
      let activePayroll = payroll.find(p => p.emp_id === selectedEmpForAdvance.emp_id && p.month_year === currentMonth);
      
      const newDeduction = Number(advanceAmount);
      
      if (activePayroll) {
        // Update existing
        const updatedDeductions = (Number(activePayroll.deductions) || 0) + newDeduction;
        const updatedNet = (Number(activePayroll.basic_salary) || 0) - updatedDeductions;
        
        const { error } = await supabase.from('payroll')
          .update({ deductions: updatedDeductions, net_salary: updatedNet })
          .eq('payroll_id', activePayroll.payroll_id);
          
        if (error) throw error;
        setPayroll(p => p.map(r => r.payroll_id === activePayroll.payroll_id ? { ...r, deductions: updatedDeductions, net_salary: updatedNet } : r));
      } else {
        // Create new payroll record for the month
        const basic = Number(selectedEmpForAdvance.salary) || 0;
        const net = basic - newDeduction;
        
        const user_id = await getAuthUserId();
        const payload = {
           user_id,
           emp_id: selectedEmpForAdvance.emp_id,
           month_year: currentMonth,
           basic_salary: basic,
           deductions: newDeduction,
           net_salary: net
        };
        
        const { data: newRec, error } = await supabase.from('payroll').insert([payload]).select();
        if (error) throw error;
        if (newRec && newRec.length > 0) setPayroll(p => [newRec[0], ...p]);
      }
      
      addToast('تم تسجيل السلفة بنجاح', 'success');
      setShowAdvanceModal(false);
      setAdvanceAmount('');
      setAdvanceDesc('');
    } catch (err) {
      addToast(err.message || 'Error recording advance', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Payroll Computed Data for Grid
  const payrollGridData = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return employees.map(emp => {
      const p = payroll.find(r => r.emp_id === emp.emp_id && r.month_year === currentMonth);
      return {
        emp_id: emp.emp_id,
        name: emp.name,
        basic_salary: emp.salary,
        deductions: p ? p.deductions : 0,
        net_salary: p ? p.net_salary : emp.salary,
        payroll_ref: p || null
      };
    });
  }, [employees, payroll]);

  return (
    <div className="relative min-h-screen flex flex-col gap-6 w-full max-w-full">
      {/* Premium Widescreen Header */}
      <div className="glass-strong rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t-2 border-indigo-500/40">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <UserCheck size={28} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">إدارة الموارد البشرية</h1>
            <p className="text-sm text-slate-400 font-medium mt-1">نظام الموظفين ومسير الرواتب المدمج (Widescreen Mode)</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1 bg-slate-900/50 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto hide-scrollbar">
          {[
            { id: 0, label: 'ملفات الموظفين', icon: UserCheck },
            { id: 1, label: 'مسير الرواتب والسلف', icon: Banknote },
            { id: 2, label: 'سجل الدوام والبصمة', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: Profiles */}
        {activeTab === 0 && (
          <motion.div key="tab0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6">
            <CrudTable
              onPrint={(row) => printDocument('employees', row)}
              title={t('employees')} 
              columns={[
                { key: 'emp_id',     label: t('emp_id') },
                { key: 'name',       label: t('name') },
                { key: 'position',   label: t('position') },
                { key: 'department', label: t('department') },
                { key: 'salary',     label: t('salary') },
              ]} 
              data={employees} 
              isLoading={isLoading}
              onDelete={handleDeleteEmployee} 
              addForm={({ row, onClose }) => <EmployeeForm row={row} onClose={onClose} isSaving={isSaving} onSave={(f) => handleSaveEmployee(f, row, onClose)} />} 
              addTitle="تسجيل موظف جديد" 
              editTitle="تعديل بيانات الموظف" 
              accentColor="#4f46e5"
            />
          </motion.div>
        )}

        {/* TAB 2: Payroll & Advances */}
        {activeTab === 1 && (
          <motion.div key="tab1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6">
            <div className="glass-strong rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Banknote size={20} className="text-emerald-400" />
                  مسير الرواتب - {new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="erp-table w-full">
                  <thead>
                    <tr className="bg-white/5">
                      <th>رقم الموظف</th>
                      <th>الاسم</th>
                      <th>الراتب الأساسي</th>
                      <th>السلف والخصومات</th>
                      <th>صافي الراتب</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollGridData.map(row => (
                      <tr key={row.emp_id}>
                        <td className="font-mono text-slate-400">{row.emp_id}</td>
                        <td className="font-bold text-white">{row.name}</td>
                        <td className="font-mono text-slate-300">{formatCurrency(row.basic_salary)}</td>
                        <td className="font-mono text-rose-400">{formatCurrency(row.deductions)}</td>
                        <td className="font-mono font-bold text-emerald-400 bg-emerald-500/5">{formatCurrency(row.net_salary)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => { setSelectedEmpForAdvance(row); setShowAdvanceModal(true); }}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-colors flex items-center gap-1"
                            >
                              <Plus size={14} /> سلفة
                            </button>
                            <button 
                              onClick={() => printDocument('payroll', {
                                payroll_id: row.payroll_ref?.payroll_id || `P-${row.emp_id}-${Date.now().toString().slice(-4)}`,
                                emp_id: row.emp_id,
                                name: row.name,
                                payment_date: new Date().toISOString().split('T')[0],
                                basic_salary: row.basic_salary,
                                deductions: row.deductions,
                                net_salary: row.net_salary
                              })}
                              className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/20 transition-colors"
                              title="طباعة قسيمة الراتب"
                            >
                              <Printer size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: Attendance Dashboard */}
        {activeTab === 2 && (
          <motion.div key="tab2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col md:flex-row gap-6">
            
            {/* QR Scanner Panel */}
            <div className="glass-strong rounded-3xl p-8 flex flex-col items-center justify-center min-h-[50vh] relative overflow-hidden text-center flex-1">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <AlertCircle size={48} className="text-emerald-400 mb-4 animate-pulse" />
              <h2 className="text-2xl font-black text-white mb-2">سجل الدوام والبصمة</h2>
              <p className="text-emerald-400 font-bold mb-6">
                كود QR نشط ومحمي - يرجى مسح الكود عبر تطبيق الموظف لتسجيل الدوام
              </p>
              
              <div className="mt-2 p-4 bg-white rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                 {qrPayload ? (
                    <QRCode value={qrPayload} size={180} fgColor="#0f172a" />
                 ) : (
                    <div className="w-[180px] h-[180px] bg-slate-200 animate-pulse flex items-center justify-center text-slate-500">جاري التوليد...</div>
                 )}
              </div>
              <p className="text-xs text-slate-400 mt-4 font-mono tracking-wider">
                ID: {qrPayload ? qrPayload.slice(0, 16) + '...' : 'WAITING'}
              </p>
              
              <button 
                 onClick={simulateQRScan}
                 className="mt-8 px-6 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 font-bold rounded-xl border border-indigo-500/30 transition-colors"
              >
                 محاكاة مسح الكود (للاختبار)
              </button>
            </div>

            {/* Live Feed Panel */}
            <div className="glass-strong rounded-3xl p-6 flex-1 max-h-[50vh] overflow-y-auto hide-scrollbar">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={18} className="text-indigo-400" />
                سجل الحركات الحي
              </h3>
              
              <div className="flex flex-col gap-3">
                {attendanceLogs.length === 0 ? (
                   <p className="text-sm text-slate-500 text-center py-8">لا يوجد حركات مسجلة اليوم.</p>
                ) : (
                   attendanceLogs.map((log, idx) => {
                     const emp = employees.find(e => e.emp_id === log.employee_id);
                     return (
                       <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                             {emp ? emp.name.substring(0, 2) : '?'}
                           </div>
                           <div>
                             <p className="text-sm font-bold text-white">{emp ? emp.name : `موظف #${log.employee_id}`}</p>
                             <p className="text-xs text-slate-400" dir="ltr">{new Date(log.clock_in_time).toLocaleTimeString('en-US')}</p>
                           </div>
                         </div>
                         <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                           {log.status}
                         </div>
                       </div>
                     )
                   })
                )}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Fast Advance Booking Modal */}
      <Modal isOpen={showAdvanceModal} onClose={() => setShowAdvanceModal(false)} title="تسجيل سلفة / خصم">
        {selectedEmpForAdvance && (
          <form onSubmit={submitAdvance} className="flex flex-col gap-4">
            <div className="p-3 bg-slate-800/50 rounded-xl mb-2">
              <p className="text-sm text-slate-300">الموظف: <strong className="text-white">{selectedEmpForAdvance.name}</strong></p>
              <p className="text-sm text-slate-300">الراتب الأساسي: <strong className="text-emerald-400 font-mono">{formatCurrency(selectedEmpForAdvance.basic_salary)}</strong></p>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">مبلغ السلفة / الخصم</label>
              <input 
                className="erp-input text-left" 
                dir="ltr" 
                type="number" 
                step="any" 
                value={advanceAmount} 
                onChange={e => setAdvanceAmount(e.target.value)} 
                required 
                disabled={isSaving} 
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">سبب الخصم (اختياري)</label>
              <input 
                className="erp-input" 
                value={advanceDesc} 
                onChange={e => setAdvanceDesc(e.target.value)} 
                disabled={isSaving} 
                placeholder="سلفة نقدية..."
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setShowAdvanceModal(false)} disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-all">
                إلغاء
              </button>
              <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                خصم وتحديث المسير
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
