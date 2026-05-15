import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Loader2 } from 'lucide-react';
import CrudTable from '../../components/CrudTable';
import { useToast } from '../../context/ToastContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { getAuthUserId } from '../../utils/getAuthUserId';

function JournalEntryForm({ row, onClose, onSave, isSaving }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    date: row?.date || new Date().toISOString().split('T')[0],
    description: row?.description || '',
    debit: row?.debit ?? '',
    credit: row?.credit ?? '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('date')}</label>
        <input className="erp-input text-left" dir="ltr" type="date" value={form.date} onChange={e => set('date', e.target.value)} required disabled={isSaving} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('description')}</label>
        <input className="erp-input" value={form.description} onChange={e => set('description', e.target.value)} required disabled={isSaving} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('debit')}</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.debit} onChange={e => set('debit', e.target.value)} required disabled={isSaving} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('credit')}</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.credit} onChange={e => set('credit', e.target.value)} required disabled={isSaving} />
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

export default function JournalEntries() {
  const { t } = useTranslation();
  const addToast = useToast();
  
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const columns = [
    { key: 'entry_id',    label: t('entry_id') },
    { key: 'date',        label: t('date') },
    { key: 'description', label: t('description') },
    { key: 'debit',       label: t('debit') },
    { key: 'credit',      label: t('credit') },
  ];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { data: rows, error } = await supabase.from('journals').select('*').order('entry_id', { ascending: false });
      if (error) throw error;
      setData(rows || []);
    } catch (err) {
      console.error('Fetch Journal Entries Error:', err);
      addToast(err.message || 'Failed to load journal entries', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (form, row, onClose) => {
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      if (row?.entry_id) {
        const { error } = await supabase.from('journals').update(form).eq('entry_id', row.entry_id);
        if (error) throw error;
        setData(p => p.map(r => r.entry_id === row.entry_id ? { ...r, ...form } : r));
        addToast(t('edit') + ' ✓', 'info');
      } else {
        const user_id = await getAuthUserId();
        const payload = { ...form, user_id };
        const { data: newRecords, error } = await supabase.from('journals').insert([payload]).select();
        if (error) throw error;
        if (newRecords && newRecords.length > 0) setData(p => [newRecords[0], ...p]);
        else await fetchData();
        addToast(t('save') + ' ✓', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save Journal Entry Error:', err);
      addToast(err.message || 'Failed to save data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { error } = await supabase.from('journals').delete().eq('entry_id', row.entry_id);
      if (error) throw error;
      setData(p => p.filter(r => r.entry_id !== row.entry_id));
      addToast(t('delete') + ' ✓', 'warning');
    } catch (err) {
      console.error('Delete Journal Entry Error:', err);
      addToast(err.message || 'Failed to delete data', 'error');
    }
  };

  const form = ({ row, onClose }) => (
    <JournalEntryForm row={row} onClose={onClose} isSaving={isSaving} onSave={(f) => handleSave(f, row, onClose)} />
  );

  return (
    <div className="relative min-h-screen">
      <CrudTable 
        title={t('journal_entries')} 
        icon={FileText} 
        columns={columns} 
        data={data} 
        isLoading={isLoading}
        onDelete={handleDelete} 
        addForm={form} 
        addTitle={t('journal_entries') + ' — ' + t('add')} 
        editTitle={t('journal_entries') + ' — ' + t('edit')} 
        accentColor="#6366f1" 
      />
    </div>
  );
}
