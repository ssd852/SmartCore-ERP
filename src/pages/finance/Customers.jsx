import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Loader2 } from 'lucide-react';
import CrudTable from '../../components/CrudTable';
import { useToast } from '../../context/ToastContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { getAuthUserId } from '../../utils/getAuthUserId';

function CustomerForm({ row, onClose, onSave, isSaving }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: row?.name || '',
    email: row?.email || '',
    phone: row?.phone || '',
    company: row?.company || '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('name')}</label>
        <input className="erp-input" value={form.name} onChange={e => set('name', e.target.value)} required disabled={isSaving} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('phone')}</label>
          <input className="erp-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+966..." disabled={isSaving} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('email_field')}</label>
          <input className="erp-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required disabled={isSaving} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('company')}</label>
        <input className="erp-input" value={form.company} onChange={e => set('company', e.target.value)} disabled={isSaving} />
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

export default function Customers() {
  const { t } = useTranslation();
  const addToast = useToast();
  
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const columns = [
    { key: 'customer_id', label: t('customer_id') },
    { key: 'name',        label: t('name') },
    { key: 'email',       label: t('email_field') },
    { key: 'phone',       label: t('phone') },
    { key: 'company',     label: t('company') },
  ];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { data: rows, error } = await supabase.from('customers').select('*').order('customer_id', { ascending: false });
      if (error) throw error;
      setData(rows || []);
    } catch (err) {
      console.error('Fetch Customers Error:', err);
      addToast(err.message || 'Failed to load customers', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (form, row, onClose) => {
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      if (row?.customer_id) {
        const { error } = await supabase.from('customers').update(form).eq('customer_id', row.customer_id);
        if (error) throw error;
        setData(p => p.map(r => r.customer_id === row.customer_id ? { ...r, ...form } : r));
        addToast(t('edit') + ' ✓', 'info');
      } else {
        const user_id = await getAuthUserId();
        const payload = { ...form, user_id };
        const { data: newRecords, error } = await supabase.from('customers').insert([payload]).select();
        if (error) throw error;
        if (newRecords && newRecords.length > 0) setData(p => [newRecords[0], ...p]);
        else await fetchData();
        addToast(t('save') + ' ✓', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save Customer Error:', err);
      addToast(err.message || 'Failed to save data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { error } = await supabase.from('customers').delete().eq('customer_id', row.customer_id);
      if (error) throw error;
      setData(p => p.filter(r => r.customer_id !== row.customer_id));
      addToast(t('delete') + ' ✓', 'warning');
    } catch (err) {
      console.error('Delete Customer Error:', err);
      addToast(err.message || 'Failed to delete data', 'error');
    }
  };

  const form = ({ row, onClose }) => (
    <CustomerForm row={row} onClose={onClose} isSaving={isSaving} onSave={(f) => handleSave(f, row, onClose)} />
  );

  return (
    <div className="relative min-h-screen">
      <CrudTable 
        title={t('customers')} 
        icon={Users} 
        columns={columns} 
        data={data} 
        isLoading={isLoading}
        onDelete={handleDelete} 
        addForm={form} 
        addTitle={t('customers') + ' — ' + t('add')} 
        editTitle={t('customers') + ' — ' + t('edit')} 
        accentColor="#0ea5e9" 
      />
    </div>
  );
}
