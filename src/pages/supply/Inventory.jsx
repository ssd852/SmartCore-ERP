import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Loader2 } from 'lucide-react';
import CrudTable from '../../components/CrudTable';
import { useToast } from '../../context/ToastContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { getAuthUserId } from '../../utils/getAuthUserId';
import { printInventoryItem } from '../../utils/printDocument';

const CATEGORIES = ['إلكترونيات', 'مستلزمات', 'أثاث', 'قرطاسية', 'أخرى'];

function InventoryForm({ row, onClose, onSave, isSaving }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    item_name: row?.item_name || '',
    category: row?.category || CATEGORIES[0],
    unit_price: row?.unit_price ?? '',
    quantity: row?.quantity ?? '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('item_name')}</label>
        <input className="erp-input" value={form.item_name} onChange={e => set('item_name', e.target.value)} required disabled={isSaving} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('category')}</label>
        <select className="erp-select" value={form.category} onChange={e => set('category', e.target.value)} disabled={isSaving}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('unit_price')}</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.unit_price} onChange={e => set('unit_price', e.target.value)} required disabled={isSaving} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('quantity')}</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.quantity} onChange={e => set('quantity', e.target.value)} required disabled={isSaving} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-all disabled:opacity-50">
          {t('cancel')}
        </button>
        <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
          {t('save')}
        </button>
      </div>
    </form>
  );
}

export default function Inventory() {
  const { t } = useTranslation();
  const addToast = useToast();
  
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const columns = [
    { key: 'item_id',    label: t('item_id') },
    { key: 'item_name',  label: t('item_name') },
    { key: 'category',   label: t('category') },
    { key: 'unit_price', label: t('unit_price') },
    { key: 'quantity',   label: t('quantity') },
  ];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { data: rows, error } = await supabase.from('inventory').select('*').order('item_id', { ascending: false });
      if (error) throw error;
      setData(rows || []);
    } catch (err) {
      console.error('Fetch Inventory Error:', err);
      addToast(err.message || 'Failed to load inventory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (form, row, onClose) => {
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      if (row?.item_id) {
        const { error } = await supabase.from('inventory').update(form).eq('item_id', row.item_id);
        if (error) throw error;
        setData(p => p.map(r => r.item_id === row.item_id ? { ...r, ...form } : r));
        addToast(t('edit') + ' ✓', 'info');
      } else {
        const user_id = await getAuthUserId();
        const payload = { ...form, user_id };
        const { data: newRecords, error } = await supabase.from('inventory').insert([payload]).select();
        if (error) throw error;
        if (newRecords && newRecords.length > 0) setData(p => [newRecords[0], ...p]);
        else await fetchData();
        addToast(t('save') + ' ✓', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save Inventory Error:', err);
      addToast(err.message || 'Failed to save data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { error } = await supabase.from('inventory').delete().eq('item_id', row.item_id);
      if (error) throw error;
      setData(p => p.filter(r => r.item_id !== row.item_id));
      addToast(t('delete') + ' ✓', 'warning');
    } catch (err) {
      console.error('Delete Inventory Error:', err);
      addToast(err.message || 'Failed to delete data', 'error');
    }
  };

  const form = ({ row, onClose }) => (
    <InventoryForm row={row} onClose={onClose} isSaving={isSaving} onSave={(f) => handleSave(f, row, onClose)} />
  );

  return (
    <div className="relative min-h-screen">
      <CrudTable 
        title={t('inventory')} 
        icon={Package} 
        columns={columns} 
        data={data} 
        isLoading={isLoading}
        onDelete={handleDelete} 
        onPrint={printInventoryItem}
        addForm={form} 
        addTitle={t('inventory') + ' — ' + t('add')} 
        editTitle={t('inventory') + ' — ' + t('edit')} 
        accentColor="#f59e0b" 
      />
    </div>
  );
}
