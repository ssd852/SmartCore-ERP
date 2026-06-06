import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import { Building, Loader2 } from 'lucide-react';
import CrudTable from '../../components/CrudTable';
import { useToast } from '../../context/ToastContext';
import { supabase, supabaseReady } from '../../config/supabaseClient';
import { getAuthUserId } from '../../utils/getAuthUserId';

function FixedAssetForm({ row, onClose, onSave, isSaving }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    asset_name: row?.asset_name || '',
    purchase_date: row?.purchase_date || new Date().toISOString().split('T')[0],
    value: row?.value ?? '',
    depreciation: row?.depreciation ?? '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('asset_name')}</label>
        <input className="erp-input" value={form.asset_name} onChange={e => set('asset_name', e.target.value)} required disabled={isSaving} />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('purchase_date')}</label>
        <input className="erp-input text-left" dir="ltr" type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} required disabled={isSaving} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('value')}</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.value} onChange={e => set('value', e.target.value)} required disabled={isSaving} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">{t('depreciation')}</label>
          <input className="erp-input text-left" dir="ltr" type="number" step="any" value={form.depreciation} onChange={e => set('depreciation', e.target.value)} required disabled={isSaving} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-all disabled:opacity-50">
          {t('cancel')}
        </button>
        <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
          {t('save')}
        </button>
      </div>
    </form>
  );
}

export default function FixedAssets() {
  const { printDocument, authUser, userRole } = useApp();
  // SECURITY: extract current tenant ID from authenticated user
  const currentTenantId = authUser?.id;
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
    { key: 'asset_id',      label: t('asset_id') },
    { key: 'asset_name',    label: t('asset_name') },
    { key: 'purchase_date', label: t('purchase_date') },
    { key: 'value',         label: t('value') },
    { key: 'depreciation',  label: t('depreciation') },
  ];

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      // SECURITY: enforce tenant isolation
      if (!currentTenantId) { setIsLoading(true); return; }
      const { data: rows, error } = await supabase.from('assets').select('*').eq('tenant_id', currentTenantId).order('asset_id', { ascending: false });
      if (error) throw error;
      setData(rows || []);
    } catch (err) {
      console.error('Fetch Assets Error:', err);
      addToast(err.message || 'Failed to load assets', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [authUser?.id]);

  const handleSave = async (form, row, onClose) => {
    setIsSaving(true);
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      
      if (row?.asset_id) {
        const { error } = await supabase.from('assets').update(form).eq('asset_id', row.asset_id);
        if (error) throw error;
        setData(p => p.map(r => r.asset_id === row.asset_id ? { ...r, ...form } : r));
        
        await supabase.from('activity_logs').insert([{ 
          user_name: currentActor, 
          action: `تم تعديل بيانات الأصل الثابت (${form.asset_name || row.asset_name}) في النظام.`, 
          module: 'assets',
          tenant_id: currentTenantId,
        }]);

        addToast(t('edit') + ' ✓', 'info');
      } else {
        const user_id = await getAuthUserId();
        const payload = { ...form, user_id, tenant_id: currentTenantId };
        const { data: newRecords, error } = await supabase.from('assets').insert([payload]).select();
        if (error) throw error;
        if (newRecords && newRecords.length > 0) {
          const insertedRecord = newRecords[0];
          setData(p => [insertedRecord, ...p]);
          await supabase.from('notifications').insert([{
            title: `🏢 الأصول الثابتة: تم قيد أصل مالي جديد بنجاح`,
            type: 'assets',
            is_read: false,
            tenant_id: currentTenantId,
          }]);

          await supabase.from('activity_logs').insert([{ user_name: currentActor, action: `تم تسجيل أصل ثابت جديد بنجاح في النظام.`, module: 'assets', tenant_id: currentTenantId }]);
        } else {
          await fetchData();
        }
        addToast(t('save') + ' ✓', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save Asset Error:', err);
      addToast(err.message || 'Failed to save data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    try {
      if (!supabaseReady) throw new Error('Supabase is not configured.');
      const { error } = await supabase.from('assets').delete().eq('asset_id', row.asset_id);
      if (error) throw error;
      setData(p => p.filter(r => r.asset_id !== row.asset_id));
      
      await supabase.from('activity_logs').insert([{ 
        user_name: currentActor, 
        action: `تم حذف سجل الأصل الثابت نهائياً بواسطة المستخدم المخول.`, 
        module: 'assets',
        tenant_id: currentTenantId,
      }]);

      addToast(t('delete') + ' ✓', 'warning');

    } catch (err) {
      console.error('Delete Asset Error:', err);
      addToast(err.message || 'Failed to delete data', 'error');
    }
  };

  const form = ({ row, onClose }) => (
    <FixedAssetForm row={row} onClose={onClose} isSaving={isSaving} onSave={(f) => handleSave(f, row, onClose)} />
  );

  return (
    <div className="relative min-h-screen">
      <CrudTable
        onPrint={(row) => printDocument('fixed_assets', row)}
        title={t('fixed_assets')} 
        icon={Building} 
        columns={columns} 
        data={data} 
        isLoading={isLoading}
        onDelete={handleDelete} 
        addForm={form} 
        addTitle={t('fixed_assets') + ' — ' + t('add')} 
        editTitle={t('fixed_assets') + ' — ' + t('edit')} 
        accentColor="#9333ea"
      />
    </div>
  );
}
