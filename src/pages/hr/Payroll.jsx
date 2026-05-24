import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { FileDown, Loader2 } from 'lucide-react';
import CrudTable from '../../components/CrudTable';
import { useToast } from '../../context/ToastContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { getAuthUserId } from '../../utils/getAuthUserId';
import { printPayrollSlip } from '../../utils/printDocument';
import { formatCurrency } from '../../utils/currencyFormatter';

function PayrollForm({ row, onClose, onSave, isSaving }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    emp_id: row?.emp_id || '',
    month_year: row?.month_year || new Date().toISOString().slice(0, 7),
    basic_salary: row?.basic_salary ?? '',
    deductions: row?.deductions ?? '',
  });
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    async function fetchEmployees() {
      try {
        if (!supabaseReady) return;
        const { data, error } = await supabase.from('employees').select('emp_id, name').order('name');
        if (!error && data) {
          setEmployees(data);
          if (!form.emp_id && data.length > 0) {
            set('emp_id', data[0].emp_id);
          }
        }
      } catch (err) {
        console.error('Fetch Employees Error:', err);
      } finally {
        setLoadingEmployees(false);
      }
    }
    fetchEmployees();
  }, []);

  const net_salary = (Number(form.basic_salary) || 0) - (Number(form.deductions) || 0);

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, net_salary }); }} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('emp_id')}</label>
          <select className="erp-select" value={form.emp_id} onChange={e => set('emp_id', e.target.value)} required disabled={isSaving || loadingEmployees}>
            {loadingEmployees ? <option value="">{t('loading')}...</option> : null}
            {employees.map(emp => (
              <option key={emp.emp_id} value={emp.emp_id}>{emp.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('month_year')}</label>
          <input className="erp-input text-left" dir="ltr" type="month" value={form.month_year} onChange={e => set('month_year', e.target.value)} required disabled={isSaving} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('basic_salary')}</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.basic_salary} onChange={e => set('basic_salary', e.target.value)} required disabled={isSaving} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('deductions')}</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.deductions} onChange={e => set('deductions', e.target.value)} required disabled={isSaving} />
        </div>
      </div>
      <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between" dir="ltr">
        <span className="font-mono text-lg font-black text-emerald-400 text-left">{formatCurrency(net_salary)}</span>
        <span className="text-sm font-bold text-emerald-400 text-right">صافي الراتب:</span>
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

export default function Payroll() {
  const { printDocument } = useApp();
  const { t } = useTranslation();
  const addToast = useToast();
  
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const columns = [
    { key: 'payroll_id',   label: t('payroll_id') },
    { key: 'emp_id',       label: t('emp_id') },
    { key: 'month_year',   label: t('month_year') },
    { key: 'basic_salary', label: t('basic_salary') },
    { key: 'deductions',   label: t('deductions') },
    { key: 'net_salary',   label: t('net_salary') },
  ];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { data: rows, error } = await supabase.from('payroll').select('*').order('payroll_id', { ascending: false });
      if (error) throw error;
      setData(rows || []);
    } catch (err) {
      console.error('Fetch Payroll Error:', err);
      addToast(err.message || 'Failed to load payroll', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (form, row, onClose) => {
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      if (row?.payroll_id) {
        const { error } = await supabase.from('payroll').update(form).eq('payroll_id', row.payroll_id);
        if (error) throw error;
        setData(p => p.map(r => r.payroll_id === row.payroll_id ? { ...r, ...form } : r));
        addToast(t('edit') + ' ✓', 'info');
      } else {
        const user_id = await getAuthUserId();
        const payload = { ...form, user_id };
        const { data: newRecords, error } = await supabase.from('payroll').insert([payload]).select();
        if (error) throw error;
        if (newRecords && newRecords.length > 0) setData(p => [newRecords[0], ...p]);
        else await fetchData();
        addToast(t('save') + ' ✓', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save Payroll Error:', err);
      addToast(err.message || 'Failed to save data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { error } = await supabase.from('payroll').delete().eq('payroll_id', row.payroll_id);
      if (error) throw error;
      setData(p => p.filter(r => r.payroll_id !== row.payroll_id));
      addToast(t('delete') + ' ✓', 'warning');
    } catch (err) {
      console.error('Delete Payroll Error:', err);
      addToast(err.message || 'Failed to delete data', 'error');
    }
  };

  const form = ({ row, onClose }) => (
    <PayrollForm row={row} onClose={onClose} isSaving={isSaving} onSave={(f) => handleSave(f, row, onClose)} />
  );

  return (
    <div className="relative min-h-screen">
      <CrudTable 
        title={t('payroll')} 
        icon={FileDown} 
        columns={columns} 
        data={data} 
        isLoading={isLoading}
        onDelete={handleDelete} 
        onPrint={printPayrollSlip}
        addForm={form} 
        addTitle={t('payroll') + ' — ' + t('add')} 
        editTitle={t('payroll') + ' — ' + t('edit')} 
        accentColor="#6366f1" 
      />
    </div>
  );
}
