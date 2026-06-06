import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { FileText, Loader2 } from 'lucide-react';
import CrudTable from '../../components/CrudTable';
import { useToast } from '../../context/ToastContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { getAuthUserId } from '../../utils/getAuthUserId';
import { printSalesInvoice } from '../../utils/printDocument';

function SalesInvoiceForm({ row, onClose, onSave, isSaving, currentTenantId }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    customer_id: row?.customer_id || '',
    invoice_date: row?.invoice_date || new Date().toISOString().split('T')[0],
    amount: row?.amount ?? '',
    status: row?.status || 'غير مدفوع',
  });
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    async function fetchCustomers() {
      try {
        if (!supabaseReady) return;
        // SECURITY: filter customers to current tenant only
        const { data, error } = await supabase
          .from('customers')
          .select('customer_id, name')
          .eq('tenant_id', currentTenantId)
          .order('name');
        if (!error && data) {
          setCustomers(data);
          if (!form.customer_id && data.length > 0) {
            set('customer_id', data[0].customer_id);
          }
        }
      } catch (err) {
        console.error('Fetch Customers Error:', err);
      } finally {
        setLoadingCustomers(false);
      }
    }
    fetchCustomers();
  }, [currentTenantId]);;

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('customer_id')}</label>
        <select className="erp-select" value={form.customer_id} onChange={e => set('customer_id', e.target.value)} required disabled={isSaving || loadingCustomers}>
          <option value="" disabled>-- اختر العميل --</option>
          {loadingCustomers ? <option value="loading" disabled>{t('loading')}...</option> : null}
          {customers.map(cust => (
            <option key={cust.customer_id} value={cust.customer_id}>{cust.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('date')}</label>
        <input className="erp-input text-left" dir="ltr" type="date" value={form.invoice_date} onChange={e => set('invoice_date', e.target.value)} required disabled={isSaving} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('amount')}</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.amount} onChange={e => set('amount', e.target.value)} required disabled={isSaving} />
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
        <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
          {t('save')}
        </button>
      </div>
    </form>
  );
}

export default function SalesInvoices() {
  const { printDocument, authUser, userRole } = useApp();
  // SECURITY: extract current tenant ID from authenticated user
  const currentTenantId = authUser?.user_metadata?.tenant_id || authUser?.id;
  const getDynamicRole = () => {
    const activeUserEmail = authUser?.email || '';
    const activeUserRole = authUser?.user_metadata?.role || userRole || '';
    if (activeUserEmail.toLowerCase().includes('accountant') || activeUserRole.toLowerCase().includes('accountant')) return "المحاسب";
    if (activeUserEmail.toLowerCase().includes('admin') || activeUserRole.toLowerCase().includes('admin')) return "مدير النظام";
    if (activeUserEmail === 'mohammadnaseraldeen26@gmail.com') return activeUserRole.toLowerCase().includes('accountant') ? "المحاسب" : "مدير النظام";
    return "مدير النظام";
  };
  const currentActor = getDynamicRole();
  const { t } = useTranslation();
  const addToast = useToast();
  
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const columns = [
    { key: 'invoice_id',   label: t('invoice_id') },
    { key: 'customer_id',  label: t('customer_id') },
    { key: 'invoice_date', label: t('date') },
    { key: 'amount',       label: t('amount') },
    { key: 'status',       label: t('status') },
  ];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      // SECURITY: If auth hasn't hydrated yet, silently wait — do NOT throw
      if (!currentTenantId) { setIsLoading(true); return; }
      const { data: rows, error } = await supabase.from('sales').select('*').eq('tenant_id', currentTenantId).order('invoice_id', { ascending: false });
      if (error) throw error;
      setData(rows || []);
    } catch (err) {
      console.error('Fetch Sales Error:', err);
      addToast(err.message || 'Failed to load sales', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [authUser?.id]);

  const handleSave = async (form, row, onClose) => {
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      if (row?.invoice_id) {
        const { error } = await supabase.from('sales').update(form).eq('invoice_id', row.invoice_id);
        if (error) throw error;
        setData(p => p.map(r => r.invoice_id === row.invoice_id ? { ...r, ...form } : r));
        
        await supabase.from('activity_logs').insert([{
          user_name: currentActor,
          action: `تم تعديل بيانات فاتورة مبيعات رقم #${row.invoice_id} في النظام.`,
          module: 'sales',
          tenant_id: currentTenantId,
        }]);
        
        await supabase.from('notifications').insert([{
          title: `تم تعديل فاتورة مبيعات رقم #${row.invoice_id} 📑`,
          type: 'invoice',
          is_read: false,
          tenant_id: currentTenantId,
        }]);

        addToast(t('edit') + ' ✓', 'info');
      } else {
        const user_id = await getAuthUserId();
        const payload = { ...form, user_id, tenant_id: currentTenantId };
        const { data: newRecords, error } = await supabase.from('sales').insert([payload]).select();
        if (error) throw error;

        if (newRecords && newRecords.length > 0) {
          const insertedInvoice = newRecords[0];
          setData(p => [insertedInvoice, ...p]);

          // Trigger real-time notification
          await supabase.from('notifications').insert([{
            title: `تم إضافة فاتورة جديدة رقم #${insertedInvoice.invoice_id || 'تلقائي'} بقيمة ${insertedInvoice.amount} 📑`,
            type: 'invoice',
            is_read: false,
            tenant_id: currentTenantId,
          }]);

          await supabase.from('activity_logs').insert([{ user_name: currentActor, action: `تم تسجيل فاتورة مبيعات جديدة رقم #${insertedInvoice.invoice_id || 'تلقائي'} بنجاح في النظام.`, module: 'sales', tenant_id: currentTenantId }]);
        } else {
          await fetchData();
        }
        
        addToast(t('save') + ' ✓', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save Sales Error:', err);
      addToast(err.message || 'Failed to save data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { error } = await supabase.from('sales').delete().eq('invoice_id', row.invoice_id);
      if (error) throw error;
      setData(p => p.filter(r => r.invoice_id !== row.invoice_id));
      
      await supabase.from('activity_logs').insert([{ 
        user_name: currentActor, 
        action: `تم حذف سجل فاتورة مبيعات رقم #${row.invoice_id || 'تلقائي'} نهائياً بواسطة المستخدم المخول.`, 
        module: 'sales',
        tenant_id: currentTenantId,
      }]);

      addToast(t('delete') + ' ✓', 'warning');
    } catch (err) {
      console.error('Delete Sales Error:', err);
      addToast(err.message || 'Failed to delete data', 'error');
    }
  };


  const form = ({ row, onClose }) => (
    <SalesInvoiceForm row={row} onClose={onClose} isSaving={isSaving} currentTenantId={currentTenantId} onSave={(f) => handleSave(f, row, onClose)} />
  );

  return (
    <div className="relative min-h-screen">
      <CrudTable 
        title={t('sales_invoices')} 
        icon={FileText} 
        columns={columns} 
        data={data} 
        isLoading={isLoading}
        onDelete={handleDelete} 
        onPrint={printSalesInvoice}
        addForm={form} 
        addTitle={t('sales_invoices') + ' — ' + t('add')} 
        editTitle={t('sales_invoices') + ' — ' + t('edit')} 
        accentColor="#6366f1" 
      />
    </div>
  );
}
