import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../config/supabaseClient';
import { useToast } from '../context/ToastContext';
import Swal from 'sweetalert2';

export function useConsumption() {
  const { tenantProfile, setTenantProfile } = useApp();
  const addToast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const executeAITask = useCallback(async (cost, taskFn) => {
    if (!tenantProfile) {
      addToast('لا يمكن التحقق من حزمة النقاط', 'error');
      return null;
    }

    if (tenantProfile.ai_credits_remaining < cost) {
      Swal.fire({
        icon: 'warning',
        title: 'رصيد النقاط غير كافٍ',
        text: 'لقد نفدت حزمة النقاط المجانية الخاصة بالذكاء الاصطناعي والواتساب. يرجى شراء بطاقة شحن لتجديد الخدمة، مع العلم أن وظائف النظام الأساسية ستبقى متاحة لك مدى الحياة.',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#4f46e5',
        background: '#0f172a',
        color: '#f1f5f9'
      });
      return null;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('consume_ai_credits', { p_cost: cost });
      
      if (error || !data?.success) {
        throw new Error(error?.message || data?.message || 'Failed to consume credits');
      }

      // Optimistically update local profile state
      setTenantProfile(prev => ({
        ...prev,
        ai_credits_remaining: prev.ai_credits_remaining - cost
      }));

      // Execute the actual AI/WhatsApp logic
      return await taskFn();

    } catch (err) {
      console.error('Consumption Error:', err);
      addToast(err.message, 'error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [tenantProfile, setTenantProfile, addToast]);

  return { executeAITask, isProcessing };
}
