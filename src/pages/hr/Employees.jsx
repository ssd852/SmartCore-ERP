import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { UserCheck, Loader2, Banknote, Clock, Printer, Plus, AlertCircle, Settings } from 'lucide-react';
import CrudTable from '../../components/CrudTable';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { getAuthUserId } from '../../utils/getAuthUserId';
import { formatCurrency } from '../../utils/currencyFormatter';
import { calculateAttendanceStats } from '../../utils/attendanceCalculator';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

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
  const [advances, setAdvances] = useState([]);
  const [settings, setSettings] = useState({});
  const [selectedCalendarEmp, setSelectedCalendarEmp] = useState('');
  const [selectedDayLog, setSelectedDayLog] = useState(null);
  const [tenantId, setTenantId] = useState('');

  // Policy Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    start_time: '08:00',
    end_time: '16:00',
    regular_hours: 8.0,
    overtime_rate: 1.5,
    grace_period_minutes: 15,
    weekends: ['الجمعة', 'السبت'],
    holidays: []
  });

  // Leave Management State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedEmpForLeave, setSelectedEmpForLeave] = useState(null);
  const [leaveForm, setLeaveForm] = useState({
    type: 'إجازة سنوية',
    days_count: 1,
    start_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Widescreen Mode & Fetch Data
  useEffect(() => {
    setSidebarCollapsed(true);
    fetchData();
    return () => setSidebarCollapsed(false);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      const { data: { session } } = await supabase.auth.getSession();
      let currentTenant = null;
      if (session?.user?.id) {
        currentTenant = session.user.id;
        setTenantId(currentTenant);
      }
      
      if (!currentTenant) throw new Error('يرجى تسجيل الدخول أولاً');
      
      const [empRes, payRes, attRes, advRes, settingsRes] = await Promise.all([
        supabase.from('employees').select('*').eq('tenant_id', currentTenant).order('emp_id', { ascending: false }),
        supabase.from('payroll').select('*').eq('tenant_id', currentTenant).order('payroll_id', { ascending: false }),
        supabase.from('attendance_logs').select('*').eq('tenant_id', currentTenant).order('clock_in_time', { ascending: false }),
        supabase.from('advances_ledger').select('*').eq('tenant_id', currentTenant),
        supabase.from('company_settings').select('*').eq('tenant_id', currentTenant).single()
      ]);
      
      if (empRes.error) throw empRes.error;
      if (payRes.error) throw payRes.error;

      setEmployees(empRes.data?.map(e => ({ ...e, display_id: e.emp_id })) || []);
      setPayroll(payRes.data || []);
      if (!attRes.error) {
        setAttendanceLogs(attRes.data || []);
      }
      if (!advRes.error) {
        setAdvances(advRes.data || []);
      }
      if (!settingsRes.error && settingsRes.data) {
        setSettings(settingsRes.data);
        setSettingsForm({
           start_time: settingsRes.data.start_time || '08:00',
           end_time: settingsRes.data.end_time || '16:00',
           regular_hours: Number(settingsRes.data.regular_hours) || 8.0,
           overtime_rate: Number(settingsRes.data.overtime_rate) || 1.5,
           grace_period_minutes: Number(settingsRes.data.grace_period_minutes) || 15,
           weekends: settingsRes.data.weekends || ['الجمعة', 'السبت'],
           holidays: settingsRes.data.holidays || []
        });
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
      const token = btoa(payload); 
      const attendanceURL = `${window.location.origin}/#/scan-attendance?tenant=${tenantId}&token=${token}`;
      setQrPayload(attendanceURL);
    };

    generatePayload();
    const interval = setInterval(generatePayload, 60000);
    return () => clearInterval(interval);
  }, [activeTab, tenantId]);

  // Supabase Realtime Subscription for 0ms Attendance Updates
  useEffect(() => {
    if (!supabaseReady || !tenantId) return;
    
    const channel = supabase
      .channel('attendance_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'attendance_logs',
        filter: `tenant_id=eq.${tenantId}`
      }, (payload) => {
        setAttendanceLogs(prev => [payload.new, ...prev].slice(0, 20));
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

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
      const currentTenant = await getAuthUserId();
      
      const newLog = {
        tenant_id: currentTenant,
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

  const handleSaveEmployee = async (form, row, onClose) => {
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      if (row?.id) {
        const { error } = await supabase.from('employees').update(form).eq('id', row.id).eq('tenant_id', tenantId);
        if (error) throw error;
        setEmployees(p => p.map(r => r.id === row.id ? { ...r, ...form } : r));
        addToast(t('edit') + ' ✓', 'info');
      } else {
        const currentTenant = await getAuthUserId();
        const maxLocalId = Math.max(0, ...employees.map(e => parseInt(e.emp_id, 10) || 0));
        const payload = { ...form, tenant_id: currentTenant, emp_id: String(maxLocalId + 1) };
        const { data: newRecords, error } = await supabase.from('employees').insert([payload]).select();
        if (error) throw error;
        if (newRecords && newRecords.length > 0) {
           const newEmp = { ...newRecords[0], display_id: newRecords[0].emp_id };
           setEmployees(p => [newEmp, ...p]);
        }
        else await fetchData();
        addToast(t('success_saved'), 'success');
      }
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('قاعدة البيانات غير متصلة');
      const payload = {
        tenant_id: tenantId,
        start_time: settingsForm.start_time,
        end_time: settingsForm.end_time,
        regular_hours: Number(settingsForm.regular_hours),
        overtime_rate: Number(settingsForm.overtime_rate),
        grace_period_minutes: Number(settingsForm.grace_period_minutes),
        weekends: settingsForm.weekends,
        holidays: settingsForm.holidays
      };

      const { error } = await supabase.from('company_settings').upsert([payload]);
      
      if (error) {
         if (error.code === '42P01') throw new Error('جدول company_settings غير موجود في قاعدة البيانات');
         if (error.code === '42703') throw new Error('الأعمدة المضافة غير موجودة في قاعدة البيانات');
         throw error;
      }

      addToast('تم حفظ سياسات الدوام بنجاح', 'success');
      setShowSettingsModal(false);
      fetchData(); // re-fetch settings context
    } catch (err) {
      addToast(err.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Leave Booking Submission
  const submitLeave = async (e) => {
    e.preventDefault();
    if (!selectedEmpForLeave || !leaveForm.days_count) return;
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('قاعدة البيانات غير متصلة');

      const payload = {
        tenant_id: tenantId,
        emp_id: selectedEmpForLeave.emp_id,
        leave_type: leaveForm.type,
        days_count: Number(leaveForm.days_count),
        start_date: leaveForm.start_date,
        notes: leaveForm.notes
      };
      
      const { error: insErr } = await supabase.from('leave_transactions').insert([payload]);
      if (insErr) {
        if (insErr.code === '42P01') throw new Error('جدول leave_transactions غير موجود في قاعدة البيانات');
        throw insErr;
      }

      let currentAnnual = Number(selectedEmpForLeave.annual_leave_balance ?? 21);
      let currentSick = Number(selectedEmpForLeave.sick_leave_balance ?? 14);

      if (leaveForm.type === 'إجازة سنوية') {
        currentAnnual = Math.max(0, currentAnnual - Number(leaveForm.days_count));
      } else if (leaveForm.type === 'إجازة مرضية') {
        currentSick = Math.max(0, currentSick - Number(leaveForm.days_count));
      }

      const { error: updErr } = await supabase.from('employees')
        .update({
          annual_leave_balance: currentAnnual,
          sick_leave_balance: currentSick
        })
        .eq('emp_id', selectedEmpForLeave.emp_id)
        .eq('tenant_id', tenantId);

      if (updErr && updErr.code !== '42703') throw updErr;

      addToast('تم تسجيل الإجازة بنجاح', 'success');
      setShowLeaveModal(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'حدث خطأ أثناء تسجيل الإجازة', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async (row) => {
    try {
      const { error } = await supabase.from('employees').delete().eq('id', row.id).eq('tenant_id', tenantId);
      if (error) throw error;
      setEmployees(p => p.filter(r => r.id !== row.id));
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
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      const newAdvance = {
        emp_id: String(selectedEmpForAdvance.emp_id).trim(),
        tenant_id: tenantId,
        amount: Number(advanceAmount),
        date: new Date().toISOString()
      };
      
      const { data, error } = await supabase.from('advances_ledger').insert([newAdvance]).select();
      
      if (error) {
         if (error.code === '42P01') throw new Error('جدول advances_ledger غير موجود في قاعدة البيانات');
         throw error;
      }
      
      if (data && data.length > 0) {
        setAdvances(p => [...p, data[0]]);
      }
      
      addToast('تم تسجيل السلفة بنجاح', 'success');
      setShowAdvanceModal(false);
      setAdvanceAmount('');
      setAdvanceDesc('');
    } catch (err) {
      addToast(err.message || 'فشلت عملية حفظ السلفة، يرجى التحقق من الاتصال', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Payroll Computed Data for Grid
  const payrollGridData = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return employees.map(emp => {
      const p = payroll.find(r => r.emp_id === emp.emp_id && r.month_year === currentMonth);
      
      const empAdvances = advances.filter(a => a.emp_id === emp.emp_id && (a.date || a.created_at || '').startsWith(currentMonth));
      const totalAdvances = empAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      
      const basic = Number(p?.basic_salary || emp?.salary || 0);
      const manualDed = Number(p?.deductions || 0);
      const totalDeductions = totalAdvances + manualDed;
      const net = basic - totalDeductions;
      
      return {
        emp_id: emp.emp_id,
        display_id: emp.display_id || emp.emp_id,
        name: emp.name,
        basic_salary: basic,
        advances: totalAdvances,
        manual_deductions: manualDed,
        total_deductions: totalDeductions,
        net_salary: net,
        payroll_ref: p || null
      };
    });
  }, [employees, payroll, advances]);

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

        {/* Header Options */}
        <div className="flex items-center gap-4">
           {activeTab === 2 && (
             <button 
                onClick={() => setShowSettingsModal(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-white/5 transition-colors flex items-center gap-2"
             >
               <Settings size={18} /> إعدادات سياسات الدوام
             </button>
           )}
           <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5 overflow-x-auto hide-scrollbar">
              {[
                { id: 0, label: 'سجل الموظفين', icon: UserCheck },
                { id: 1, label: 'مسير الرواتب والسلف', icon: Banknote },
                { id: 2, label: 'نظام الدوام (التقويم)', icon: Clock }
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
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: Profiles */}
        {activeTab === 0 && (
          <motion.div key="tab0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6">
            <CrudTable
              onPrint={(row) => printDocument('employees', row)}
              title={t('employees')} 
              columns={[
                { key: 'display_id', label: t('emp_id') },
                { key: 'name',       label: t('name') },
                { key: 'position',   label: t('position') },
                { key: 'department', label: t('department') },
                { key: 'salary',     label: t('salary') },
                { key: 'actions', label: 'الإجازات', render: (val, row) => (
                    <button 
                      onClick={() => { setSelectedEmpForLeave(row); setShowLeaveModal(true); }}
                      className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg font-bold text-xs hover:bg-indigo-500/40"
                    >
                       إدارة الإجازات
                    </button>
                 )},
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
                        <td className="font-mono text-rose-400">{formatCurrency(row.total_deductions)}</td>
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
                مسح كود الـ QR لتسجيل حضور وانصراف الموظفين عبر الهاتف
              </p>
              
              <div className="mt-2 p-4 bg-white rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                 {qrPayload ? (
                    <QRCodeSVG value={qrPayload} size={180} fgColor="#0f172a" />
                 ) : (
                    <div className="w-[180px] h-[180px] bg-slate-200 animate-pulse flex items-center justify-center text-slate-500">جاري التوليد...</div>
                 )}
              </div>
              <p className="text-xs text-slate-400 mt-4 font-mono tracking-wider break-all max-w-sm">
                URL: {qrPayload ? String(qrPayload).slice(0, 45) + '...' : 'WAITING'}
              </p>
              
              <div className="flex items-center gap-3 mt-8">
                 <button 
                    onClick={simulateQRScan}
                    className="px-6 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 font-bold rounded-xl border border-indigo-500/30 transition-colors"
                 >
                    محاكاة مسح الكود (للاختبار)
                 </button>
                 <button 
                    onClick={() => printDocument('qr_attendance', { 
                       tenant_id: tenantId, 
                       url: window.location.origin + '/#/scan-attendance?tenant=' + tenantId 
                    })}
                    className="px-6 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 font-bold rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-2"
                 >
                    <Printer size={16} /> طباعة كود الـ QR للبرواز
                 </button>
              </div>
            </div>

            {/* Calendar Panel */}
            <div className="glass-strong rounded-3xl p-6 flex-1 flex flex-col gap-4 relative">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock size={18} className="text-indigo-400" />
                  تقويم الحضور والانصراف
                </h3>
                <select 
                   className="erp-select max-w-[200px]"
                   value={selectedCalendarEmp}
                   onChange={(e) => setSelectedCalendarEmp(e.target.value)}
                >
                   <option value="">-- اختر الموظف --</option>
                   {employees.map(e => <option key={e.emp_id} value={e.emp_id}>{e.name}</option>)}
                </select>
              </div>
              
              {!selectedCalendarEmp ? (
                 <div className="flex-1 flex items-center justify-center opacity-50 text-sm font-bold border-2 border-dashed border-slate-700 rounded-2xl">
                    الرجاء اختيار الموظف لعرض التقويم
                 </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'].map(d => (
                    <div key={d} className="text-center text-xs font-bold text-slate-500 mb-2">{d}</div>
                  ))}
                  {Array.from({ length: 30 }).map((_, i) => {
                     const d = new Date();
                     d.setDate(i+1);
                     const dateStr = d.toISOString().split('T')[0];
                     
                     const log = attendanceLogs.find(l => l.employee_id === selectedCalendarEmp && (l.clock_in_time||'').startsWith(dateStr));
                     
                     let bg = 'bg-slate-800/20 border-transparent';
                     let metric = null;
                     
                     if (log || settings?.holidays?.includes(dateStr)) {
                       metric = calculateAttendanceStats(log, settings, dateStr);
                       if (metric.statusColor === 'emerald') bg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'; // Holiday absence
                       else if (metric.statusColor === 'indigo') bg = 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]'; // Worked holiday
                       else if (metric.statusColor === 'green') bg = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
                       else if (metric.statusColor === 'amber') bg = 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
                       else if (metric.statusColor === 'purple') bg = 'bg-purple-500/20 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
                     }
                     
                     return (
                       <motion.div 
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         key={i} 
                         onClick={() => { if(log || metric?.isHoliday) setSelectedDayLog({ log: log || {}, metric, dateStr }) }}
                         className={`aspect-square rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${bg}`}
                       >
                         <span className="text-sm font-bold opacity-90">{i+1}</span>
                         {log && log.clock_in_time && <span className="text-[10px] mt-1 opacity-70">✔</span>}
                         {metric?.isHoliday && !log && <span className="text-[10px] mt-1 opacity-70">🏖️</span>}
                       </motion.div>
                     )
                  })}
                </div>
              )}
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
      {/* Calendar Day Timeline Modal */}
      <Modal isOpen={!!selectedDayLog} onClose={() => setSelectedDayLog(null)} title={`تفاصيل الحركة اليومية`}>
        {selectedDayLog && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
              <span className="text-sm text-slate-400">التاريخ: {selectedDayLog.dateStr}</span>
              <span className="text-sm font-bold text-white">المدة الفعلية: {selectedDayLog.metric.totalMinutes} دقيقة</span>
            </div>
            
            <div className="flex flex-col gap-3 relative before:content-[''] before:absolute before:right-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-indigo-500/30">
               {selectedDayLog.log?.clock_in_time ? (
                 <div className="flex items-center gap-4 relative z-10">
                   <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.5)]"><div className="w-2 h-2 rounded-full bg-white"></div></div>
                   <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/10">
                     <p className="text-xs text-slate-400 mb-1">تسجيل حضور</p>
                     <p className="text-sm font-bold text-white" dir="ltr">{new Date(selectedDayLog.log.clock_in_time).toLocaleTimeString('en-US')}</p>
                   </div>
                 </div>
               ) : (
                 <div className="text-center text-slate-400 py-4 font-bold">لا يوجد حضور هذا اليوم {selectedDayLog.metric.isHoliday ? '(عطلة مدفوعة الأجر)' : ''}</div>
               )}
               {selectedDayLog.log?.leave_out_time && (
                 <div className="flex items-center gap-4 relative z-10">
                   <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white"></div></div>
                   <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/10">
                     <p className="text-xs text-slate-400 mb-1">إذن مغادرة</p>
                     <p className="text-sm font-bold text-white" dir="ltr">{new Date(selectedDayLog.log.leave_out_time).toLocaleTimeString('en-US')}</p>
                   </div>
                 </div>
               )}
               {selectedDayLog.log?.leave_in_time && (
                 <div className="flex items-center gap-4 relative z-10">
                   <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white"></div></div>
                   <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/10">
                     <p className="text-xs text-slate-400 mb-1">عودة من المغادرة</p>
                     <p className="text-sm font-bold text-white" dir="ltr">{new Date(selectedDayLog.log.leave_in_time).toLocaleTimeString('en-US')}</p>
                   </div>
                 </div>
               )}
               {selectedDayLog.log?.clock_out_time && (
                 <div className="flex items-center gap-4 relative z-10">
                   <div className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white"></div></div>
                   <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/10">
                     <p className="text-xs text-slate-400 mb-1">تسجيل انصراف</p>
                     <p className="text-sm font-bold text-white" dir="ltr">{new Date(selectedDayLog.log.clock_out_time).toLocaleTimeString('en-US')}</p>
                   </div>
                 </div>
               )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              {selectedDayLog.metric.overtimeMinutes > 0 && (
                 <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/10 text-center">
                   <p className="text-xs text-purple-400 mb-1">أوفر تايم</p>
                   <p className="text-xl font-black text-purple-300">+{selectedDayLog.metric.overtimeMinutes} دقيقة</p>
                 </div>
              )}
              {selectedDayLog.metric.deficitMinutes > 15 && !selectedDayLog.metric.isHoliday && (
                 <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-center">
                   <p className="text-xs text-amber-400 mb-1">تأخير / نقص</p>
                   <p className="text-xl font-black text-amber-300">-{selectedDayLog.metric.deficitMinutes} دقيقة</p>
                 </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Leave Booking Modal */}
      <Modal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="تسجيل إجازة للموظف">
        {selectedEmpForLeave && (
          <form onSubmit={submitLeave} className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl mb-2 border border-white/5">
              <div>
                <p className="text-sm text-slate-300">الموظف: <strong className="text-white">{selectedEmpForLeave.name}</strong></p>
              </div>
              <div className="flex gap-4">
                 <div className="text-center">
                   <p className="text-[10px] text-slate-400">سنوية</p>
                   <p className="font-bold text-emerald-400">{selectedEmpForLeave.annual_leave_balance ?? 21}</p>
                 </div>
                 <div className="text-center">
                   <p className="text-[10px] text-slate-400">مرضية</p>
                   <p className="font-bold text-amber-400">{selectedEmpForLeave.sick_leave_balance ?? 14}</p>
                 </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">نوع الإجازة</label>
              <select 
                 className="erp-select"
                 value={leaveForm.type} 
                 onChange={e => setLeaveForm(p => ({...p, type: e.target.value}))} 
                 disabled={isSaving}
              >
                 <option>إجازة سنوية</option>
                 <option>إجازة مرضية</option>
                 <option>مغادرة بدون راتب</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">تاريخ البدء</label>
                <input 
                  type="date" 
                  className="erp-input text-left" 
                  dir="ltr" 
                  value={leaveForm.start_date} 
                  onChange={e => setLeaveForm(p => ({...p, start_date: e.target.value}))} 
                  required 
                  disabled={isSaving} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">عدد الأيام</label>
                <input 
                  type="number" 
                  className="erp-input text-left" 
                  dir="ltr" 
                  value={leaveForm.days_count} 
                  onChange={e => setLeaveForm(p => ({...p, days_count: e.target.value}))} 
                  required 
                  disabled={isSaving} 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">ملاحظات / السبب</label>
              <input 
                className="erp-input" 
                value={leaveForm.notes} 
                onChange={e => setLeaveForm(p => ({...p, notes: e.target.value}))} 
                disabled={isSaving} 
                placeholder="توضيح الإجازة..."
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setShowLeaveModal(false)} disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-all">
                إلغاء
              </button>
              <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                تسجيل وخصم الإجازة
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Admin Policy Settings Modal */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="إعدادات قوانين الدوام والسياسات">
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">وقت بدء الدوام الرسمي</label>
              <input type="time" required value={settingsForm.start_time} onChange={e => setSettingsForm(p => ({...p, start_time: e.target.value}))} disabled={isSaving} className="erp-input text-left" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">وقت انتهاء الدوام</label>
              <input type="time" required value={settingsForm.end_time} onChange={e => setSettingsForm(p => ({...p, end_time: e.target.value}))} disabled={isSaving} className="erp-input text-left" dir="ltr" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">عدد الساعات الرسمية المطلوبة</label>
              <input type="number" step="0.5" required value={settingsForm.regular_hours} onChange={e => setSettingsForm(p => ({...p, regular_hours: e.target.value}))} disabled={isSaving} className="erp-input text-left" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">مضاعف الأوفر تايم</label>
              <input type="number" step="0.1" required value={settingsForm.overtime_rate} onChange={e => setSettingsForm(p => ({...p, overtime_rate: e.target.value}))} disabled={isSaving} className="erp-input text-left" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">فترة السماح للتأخير (بالدقائق)</label>
            <input type="number" required value={settingsForm.grace_period_minutes} onChange={e => setSettingsForm(p => ({...p, grace_period_minutes: e.target.value}))} disabled={isSaving} className="erp-input text-left" dir="ltr" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">أيام العطل الأسبوعية الثابتة</label>
            <div className="flex flex-wrap gap-2">
               {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => {
                  const isSelected = settingsForm.weekends.includes(day);
                  return (
                     <button
                        key={day}
                        type="button"
                        onClick={() => {
                           setSettingsForm(p => ({
                             ...p,
                             weekends: isSelected ? p.weekends.filter(d => d !== day) : [...p.weekends, day]
                           }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                     >
                        {day}
                     </button>
                  );
               })}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setShowSettingsModal(false)} disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-all">
              إلغاء
            </button>
            <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              حفظ وتطبيق السياسات
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
