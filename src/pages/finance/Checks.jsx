import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { FileText, Loader2 } from 'lucide-react';
import CrudTable from '../../components/CrudTable';
import { useToast } from '../../context/ToastContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { getAuthUserId } from '../../utils/getAuthUserId';

function CheckForm({ row, onClose, onSave, isSaving }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    check_number: row?.check_number || '',
    bank_name: row?.bank_name || '',
    due_date: row?.due_date || new Date().toISOString().split('T')[0],
    amount: row?.amount ?? '',
    type: row?.type || 'وارد',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('check_number')}</label>
          <input className="erp-input" value={form.check_number} onChange={e => set('check_number', e.target.value)} required disabled={isSaving} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('bank_name')}</label>
          <input className="erp-input" value={form.bank_name} onChange={e => set('bank_name', e.target.value)} required disabled={isSaving} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('due_date')}</label>
          <input className="erp-input text-left" dir="ltr" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} required disabled={isSaving} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('type')}</label>
          <select className="erp-select" value={form.type} onChange={e => set('type', e.target.value)} disabled={isSaving}>
            <option>وارد</option>
            <option>صادر</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('amount')}</label>
        <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.amount} onChange={e => set('amount', e.target.value)} required disabled={isSaving} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-all disabled:opacity-50">
          {t('cancel')}
        </button>
        <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
          {t('save')}
        </button>
      </div>
    </form>
  );
}

export default function Checks() {
  const { printDocument } = useApp();
  const { t } = useTranslation();
  const addToast = useToast();
  
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const columns = [
    { key: 'check_id',     label: t('check_id') },
    { key: 'check_number', label: t('check_number') },
    { key: 'bank_name',    label: t('bank_name') },
    { key: 'due_date',     label: t('due_date') },
    { key: 'amount',       label: t('amount') },
    { key: 'type',         label: t('type') },
  ];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { data: rows, error } = await supabase.from('checks').select('*').order('check_id', { ascending: false });
      if (error) throw error;
      setData(rows || []);
    } catch (err) {
      console.error('Fetch Checks Error:', err);
      addToast(err.message || 'Failed to load checks', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (form, row, onClose) => {
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      if (row?.check_id) {
        const { error } = await supabase.from('checks').update(form).eq('check_id', row.check_id);
        if (error) throw error;
        setData(p => p.map(r => r.check_id === row.check_id ? { ...r, ...form } : r));
        addToast(t('edit') + ' ✓', 'info');
      } else {
        const user_id = await getAuthUserId();
        const payload = { ...form, user_id };
        const { data: newRecords, error } = await supabase.from('checks').insert([payload]).select();
        if (error) throw error;
        if (newRecords && newRecords.length > 0) setData(p => [newRecords[0], ...p]);
        else await fetchData();
        addToast(t('save') + ' ✓', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save Check Error:', err);
      addToast(err.message || 'Failed to save data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { error } = await supabase.from('checks').delete().eq('check_id', row.check_id);
      if (error) throw error;
      setData(p => p.filter(r => r.check_id !== row.check_id));
      addToast(t('delete') + ' ✓', 'warning');
    } catch (err) {
      console.error('Delete Check Error:', err);
      addToast(err.message || 'Failed to delete data', 'error');
    }
  };

  const form = ({ row, onClose }) => (
    <CheckForm row={row} onClose={onClose} isSaving={isSaving} onSave={(f) => handleSave(f, row, onClose)} />
  );

  return (
    <div className="relative min-h-screen">
      <CrudTable
        onPrint={(row) => printDocument('checks', row)}
        title={t('checks')} 
        icon={FileText} 
        columns={columns} 
        data={data} 
        isLoading={isLoading}
        onDelete={handleDelete} 
        addForm={form} 
        addTitle={t('checks') + ' — ' + t('add')} 
        editTitle={t('checks') + ' — ' + t('edit')} 
        accentColor="#0ea5e9"
      />
    </div>
  );
}
