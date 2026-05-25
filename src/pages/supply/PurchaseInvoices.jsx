import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { FileDown, Loader2 } from 'lucide-react';
import CrudTable from '../../components/CrudTable';
import { useToast } from '../../context/ToastContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { getAuthUserId } from '../../utils/getAuthUserId';
import { printPurchaseInvoice } from '../../utils/printDocument';

function PurchaseInvoiceForm({ row, onClose, onSave, isSaving }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    supplier_id: row?.supplier_id || '',
    invoice_date: row?.invoice_date || new Date().toISOString().split('T')[0],
    total_amount: row?.total_amount ?? '',
    status: row?.status || 'غير مدفوع',
  });
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        if (!supabaseReady) return;
        // Fetch new suppliers schema: id and name
        const { data, error } = await supabase.from('suppliers').select('id, name, company_name').order('name');
        if (!error && data) {
          setSuppliers(data);
          if (!form.supplier_id && data.length > 0) {
            set('supplier_id', data[0].id);
          }
        }
      } catch (err) {
        console.error('Fetch Suppliers Error:', err);
      } finally {
        setLoadingSuppliers(false);
      }
    }
    fetchSuppliers();
  }, []);

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">المورد</label>
        <select className="erp-select" value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)} required disabled={isSaving || loadingSuppliers}>
          <option value="" disabled>-- اختر المورد --</option>
          {loadingSuppliers ? <option value="loading" disabled>{t('loading')}...</option> : null}
          {suppliers.map(sup => (
            <option key={sup.id} value={sup.id}>{sup.name} {sup.company_name ? `(${sup.company_name})` : ''}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('date')}</label>
        <input className="erp-input text-left" dir="ltr" type="date" value={form.invoice_date} onChange={e => set('invoice_date', e.target.value)} required disabled={isSaving} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">إجمالي الفاتورة</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} required disabled={isSaving} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('status')}</label>
          <select className="erp-select" value={form.status} onChange={e => set('status', e.target.value)} disabled={isSaving}>
            <option>مدفوع</option>
            <option>غير مدفوع</option>
            <option>جزئي</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-all disabled:opacity-50">
          {t('cancel')}
        </button>
        <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
          {t('save')}
        </button>
      </div>
    </form>
  );
}

export default function PurchaseInvoices() {
  const { printDocument } = useApp();
  const { t } = useTranslation();
  const addToast = useToast();
  
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const columns = [
    { key: 'invoice_id',   label: t('invoice_id') },
    { key: 'supplier_id',  label: 'رقم المورد' },
    { key: 'invoice_date', label: t('date') },
    { key: 'total_amount', label: t('total_amount') },
    { key: 'status',       label: t('status') },
  ];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { data: rows, error } = await supabase.from('purchases').select('*').order('invoice_id', { ascending: false });
      if (error) throw error;
      setData(rows || []);
    } catch (err) {
      console.error('Fetch Purchases Error:', err);
      addToast(err.message || 'Failed to load purchases', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (form, row, onClose) => {
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      if (row?.invoice_id) {
        // If editing an existing invoice, we skip balance sync for now (complex refund logic)
        const { error } = await supabase.from('purchases').update(form).eq('invoice_id', row.invoice_id);
        if (error) throw error;
        setData(p => p.map(r => r.invoice_id === row.invoice_id ? { ...r, ...form } : r));
        addToast(t('edit') + ' ✓', 'info');
      } else {
        const user_id = await getAuthUserId();
        const payload = { ...form, user_id };
        const { data: newRecords, error } = await supabase.from('purchases').insert([payload]).select();
        if (error) throw error;

        // Automatically sync the supplier ledger balance
        if (form.supplier_id && form.total_amount && form.status !== 'مدفوع') {
           const { error: ledgerError } = await supabase.rpc('increment_supplier_balance', { 
             p_supplier_id: form.supplier_id, 
             p_amount: Number(form.total_amount) 
           });
           if (ledgerError) console.error("Ledger sync error:", ledgerError);
        }

        if (newRecords && newRecords.length > 0) setData(p => [newRecords[0], ...p]);
        else await fetchData();
        addToast(t('save') + ' ✓', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save Purchase Error:', err);
      addToast(err.message || 'Failed to save data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { error } = await supabase.from('purchases').delete().eq('invoice_id', row.invoice_id);
      if (error) throw error;
      setData(p => p.filter(r => r.invoice_id !== row.invoice_id));
      addToast(t('delete') + ' ✓', 'warning');
    } catch (err) {
      console.error('Delete Purchase Error:', err);
      addToast(err.message || 'Failed to delete data', 'error');
    }
  };

  const form = ({ row, onClose }) => (
    <PurchaseInvoiceForm row={row} onClose={onClose} isSaving={isSaving} onSave={(f) => handleSave(f, row, onClose)} />
  );

  return (
    <div className="relative min-h-screen">
      <CrudTable 
        title={t('purchase_invoices')} 
        icon={FileDown} 
        columns={columns} 
        data={data} 
        isLoading={isLoading}
        onDelete={handleDelete} 
        onPrint={printPurchaseInvoice}
        addForm={form} 
        addTitle={t('purchase_invoices') + ' — ' + t('add')} 
        editTitle={t('purchase_invoices') + ' — ' + t('edit')} 
        accentColor="#f43f5e" 
      />
    </div>
  );
}
