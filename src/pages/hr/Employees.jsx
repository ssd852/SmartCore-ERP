import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCheck, Loader2 } from 'lucide-react';
import CrudTable from '../../components/CrudTable';
import { useToast } from '../../context/ToastContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { getAuthUserId } from '../../utils/getAuthUserId';

const DEPARTMENTS = ['المالية', 'المحاسبة', 'الموارد البشرية', 'التقنية', 'المبيعات', 'الإدارة'];

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

export default function Employees() {
  const { t } = useTranslation();
  const addToast = useToast();
  
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const columns = [
    { key: 'emp_id',     label: t('emp_id') },
    { key: 'name',       label: t('name') },
    { key: 'position',   label: t('position') },
    { key: 'department', label: t('department') },
    { key: 'salary',     label: t('salary') },
  ];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { data: rows, error } = await supabase.from('employees').select('*').order('emp_id', { ascending: false });
      if (error) throw error;
      setData(rows || []);
    } catch (err) {
      console.error('Fetch Employees Error:', err);
      addToast(err.message || 'Failed to load employees', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (form, row, onClose) => {
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      if (row?.emp_id) {
        const { error } = await supabase.from('employees').update(form).eq('emp_id', row.emp_id);
        if (error) throw error;
        setData(p => p.map(r => r.emp_id === row.emp_id ? { ...r, ...form } : r));
        addToast(t('edit') + ' ✓', 'info');
      } else {
        const user_id = await getAuthUserId();
        const payload = { ...form, user_id };
        const { data: newRecords, error } = await supabase.from('employees').insert([payload]).select();
        if (error) throw error;
        if (newRecords && newRecords.length > 0) setData(p => [newRecords[0], ...p]);
        else await fetchData();
        addToast(t('save') + ' ✓', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save Employee Error:', err);
      addToast(err.message || 'Failed to save data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { error } = await supabase.from('employees').delete().eq('emp_id', row.emp_id);
      if (error) throw error;
      setData(p => p.filter(r => r.emp_id !== row.emp_id));
      addToast(t('delete') + ' ✓', 'warning');
    } catch (err) {
      console.error('Delete Employee Error:', err);
      addToast(err.message || 'Failed to delete data', 'error');
    }
  };

  const form = ({ row, onClose }) => (
    <EmployeeForm row={row} onClose={onClose} isSaving={isSaving} onSave={(f) => handleSave(f, row, onClose)} />
  );

  return (
    <div className="relative min-h-screen">
      <CrudTable 
        title={t('employees')} 
        icon={UserCheck} 
        columns={columns} 
        data={data} 
        isLoading={isLoading}
        onDelete={handleDelete} 
        addForm={form} 
        addTitle={t('employees') + ' — ' + t('add')} 
        editTitle={t('employees') + ' — ' + t('edit')} 
        accentColor="#4f46e5" 
      />
    </div>
  );
}
