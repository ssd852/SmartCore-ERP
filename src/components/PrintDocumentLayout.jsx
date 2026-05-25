import React from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currencyFormatter';

import { X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function PrintDocumentLayout() {
  const { printDoc, tenantProfile } = useApp();

  const handleClosePrintFallback = () => {
    document.body.classList.remove('print-single-mode');
    // We cannot access setPrintDocState directly from AppContext if it's not exported,
    // but the `afterprint` event should technically fire when window is closed.
    // Let's force a reload or simply trigger a custom event that AppContext listens to?
    // Wait, let's just dispatch an 'afterprint' event manually:
    window.dispatchEvent(new Event('afterprint'));
  };

  if (!printDoc) return null;

  const { type, data } = printDoc;
  const companyName = tenantProfile?.company_name || '';
  const companyAddress = tenantProfile?.company_address || '';
  const companyLogo = tenantProfile?.company_logo_url || null;

  // 1. Dynamic Labels and schema logic
  let docTitle = '';
  let gridItems = [];
  let amountField = '';
  let amountValue = '';

  // Parse according to type
  switch (type) {
    case 'employees':
      docTitle = 'قسيمة راتب شهرية تفصيلية';
      gridItems = [
        { label: 'رقم الموظف', value: data.emp_id },
        { label: 'الاسم', value: data.name },
        { label: 'المسمى الوظيفي', value: data.position },
        { label: 'القسم', value: data.department },
      ];
      amountField = 'الراتب الأساسي';
      amountValue = data.salary;
      break;
    case 'checks':
      docTitle = data.type === 'صادر' ? 'سند صرف شيك بنكي' : 'سند قبض شيك بنكي';
      gridItems = [
        { label: 'رقم الشيك', value: data.check_number },
        { label: 'اسم البنك', value: data.bank_name },
        { label: 'تاريخ الاستحقاق', value: data.due_date },
        { label: 'نوع الشيك', value: data.type },
      ];
      amountField = 'مبلغ الشيك';
      amountValue = data.amount;
      break;
    case 'customers':
      docTitle = 'بطاقة بيانات وكشف حساب عميل';
      gridItems = [
        { label: 'رقم العميل', value: data.customer_id },
        { label: 'اسم العميل', value: data.name },
        { label: 'رقم الهاتف', value: data.phone || '—' },
        { label: 'العنوان', value: data.address || '—' },
      ];
      amountField = 'الرصيد المستحق';
      amountValue = data.balance || 0;
      break;
    case 'suppliers':
      docTitle = 'بطاقة بيانات وكشف حساب مورد';
      gridItems = [
        { label: 'رقم المورد', value: data.supplier_id },
        { label: 'اسم المورد', value: data.name },
        { label: 'جهة الاتصال', value: data.contact || '—' },
      ];
      amountField = 'الرصيد الدائن';
      amountValue = data.balance || 0;
      break;
    case 'journal_entries':
      docTitle = 'مستند قيد يومي';
      gridItems = [
        { label: 'رقم القيد', value: data.entry_id },
        { label: 'التاريخ', value: data.date },
        { label: 'الحساب المدين', value: data.debit_account },
        { label: 'الحساب الدائن', value: data.credit_account },
        { label: 'الوصف', value: data.description },
      ];
      amountField = 'المبلغ';
      amountValue = data.amount;
      break;
    case 'fixed_assets':
      docTitle = 'بطاقة أصل ثابت';
      gridItems = [
        { label: 'رقم الأصل', value: data.asset_id },
        { label: 'اسم الأصل', value: data.name },
        { label: 'تاريخ الشراء', value: data.purchase_date },
        { label: 'نسبة الإهلاك', value: data.depreciation_rate ? `${data.depreciation_rate}%` : '—' },
      ];
      amountField = 'القيمة الحالية';
      amountValue = data.value;
      break;
    case 'chart_of_accounts':
      docTitle = 'بطاقة حساب';
      gridItems = [
        { label: 'رقم الحساب', value: data.account_id },
        { label: 'اسم الحساب', value: data.name },
        { label: 'نوع الحساب', value: data.account_type },
      ];
      amountField = 'الرصيد الحالي';
      amountValue = data.balance;
      break;
    case 'sales_invoices':
      docTitle = 'فاتورة مبيعات';
      gridItems = [
        { label: 'رقم الفاتورة', value: data.invoice_id },
        { label: 'التاريخ', value: data.date },
        { label: 'العميل', value: data.customer_id },
        { label: 'الحالة', value: data.status },
      ];
      amountField = 'الإجمالي';
      amountValue = data.total_amount;
      break;
    case 'purchase_invoices':
      docTitle = 'فاتورة مشتريات';
      gridItems = [
        { label: 'رقم الفاتورة', value: data.invoice_id },
        { label: 'التاريخ', value: data.date },
        { label: 'المورد', value: data.supplier_id },
        { label: 'الحالة', value: data.status },
      ];
      amountField = 'الإجمالي';
      amountValue = data.total_amount;
      break;
    case 'payroll':
      docTitle = 'كشف رواتب تفصيلي';
      gridItems = [
        { label: 'الرقم المرجعي', value: data.payroll_id },
        { label: 'رقم الموظف', value: data.emp_id },
        { label: 'تاريخ الصرف', value: data.payment_date },
      ];
      amountField = 'صافي الراتب';
      amountValue = data.net_salary;
      break;
    case 'inventory':
      docTitle = 'بطاقة صنف مخزني';
      gridItems = [
        { label: 'رقم الصنف', value: data.item_id },
        { label: 'اسم الصنف', value: data.name || data.item_name },
        { label: 'الكمية', value: data.quantity },
      ];
      amountField = 'سعر الوحدة';
      amountValue = data.unit_price;
      break;
    case 'barcode':
      return (
        <div className="print-document-layout" dir="ltr" style={{ padding: '20px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
          <div style={{ display: 'inline-block', border: '2px solid #000', padding: '16px', borderRadius: '8px', background: '#fff' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>{data.item_name}</h3>
            <img 
               src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(data.barcode)}&code=Code128&translate-esc=on`} 
               alt="Barcode" 
               style={{ height: '60px', width: 'auto', display: 'block', margin: '0 auto' }}
            />
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', letterSpacing: '2px', fontWeight: 'bold' }}>{data.barcode}</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: 'bold' }}>{formatCurrency(data.unit_price)}</p>
          </div>
        </div>
      );
    case 'qr_attendance':
      return (
        <div className="print-document-layout" dir="rtl" style={{ padding: '40px', textAlign: 'center', fontFamily: "'Tajawal', sans-serif", background: '#fff', color: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ marginBottom: '40px' }}>
            {companyLogo && <img src={companyLogo} alt="Logo" style={{ height: '80px', margin: '0 auto 16px auto', display: 'block' }} />}
            <h1 style={{ fontSize: '36px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#000' }}>{companyName}</h1>
            <p style={{ fontSize: '18px', margin: '0', color: '#333' }}>{companyAddress}</p>
          </div>
          
          <div style={{ border: '4px solid #000', padding: '32px', borderRadius: '16px', background: '#fff', marginBottom: '40px' }}>
             <QRCodeSVG value={data.url} size={400} fgColor="#000" />
          </div>
          
          <div>
             <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 16px 0', color: '#000' }}>نظام تسجيل الدوام الذكي</h2>
             <p style={{ fontSize: '20px', margin: '0', color: '#333' }}>يرجى مسح الكود عبر الهاتف لتسجيل الحضور والانصراف</p>
          </div>
        </div>
      );
    case 'attendance_report':
      return (
        <div className="print-document-layout" dir="rtl" style={{ padding: '40px', fontFamily: "'Tajawal', sans-serif", background: '#fff', color: '#000', minHeight: '100vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{companyName}</h1>
              <p style={{ fontSize: '14px', margin: 0 }}>{companyAddress}</p>
            </div>
            {companyLogo && <img src={companyLogo} alt="Logo" style={{ height: '70px', objectFit: 'contain' }} />}
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px 0' }}>تقرير الحضور والانصراف</h2>
              <p style={{ fontSize: '14px', margin: 0 }}>تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #000' }}>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>الرقم الوظيفي</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>اسم الموظف</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>وقت الحركة</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log, idx) => {
                const emp = data.employees.find(e => e.emp_id === log.employee_id);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', border: '1px solid #cbd5e1' }}>{log.employee_id}</td>
                    <td style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>{emp ? emp.name : '—'}</td>
                    <td style={{ padding: '12px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }} dir="ltr">{new Date(log.clock_in_time).toLocaleString('en-US')}</td>
                    <td style={{ padding: '12px', border: '1px solid #cbd5e1' }}>{log.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    default:
      docTitle = 'مستند طباعة تفصيلي';
      gridItems = Object.entries(data).map(([k, v]) => ({ label: k, value: v }));
      break;
  }

  // 2. Ensure currency is formatted consistently with (₪) via formatCurrency
  const formattedAmount = amountField ? formatCurrency(amountValue) : null;

  return (
    <div className="print-document-layout" dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif" }}>
      {/* Fallback close button for mobile WebKit if afterprint fails */}
      <button 
        onClick={handleClosePrintFallback}
        className="no-print fixed top-4 right-4 z-[9999] bg-rose-600 text-white p-3 rounded-full shadow-2xl flex items-center gap-2 hover:bg-rose-700 transition-colors"
      >
        <X size={20} />
        <span className="font-bold">إغلاق الطباعة</span>
      </button>

      {/* Header */}
      <div style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Company Details */}
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{companyName}</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>{companyAddress}</p>
        </div>
        
        {/* Logo Placeholder or Image */}
        <div style={{ width: '64px', height: '64px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' }}>LOGO</span>
          )}
        </div>

        <div style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#0f172a' }}>{docTitle}</h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {gridItems.map((item, idx) => (
          <div key={idx} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>{item.label}</div>
            <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>{item.value || '—'}</div>
          </div>
        ))}
      </div>

      {/* Amount Card */}
      {formattedAmount && (
        <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155' }}>{amountField}:</span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }} dir="ltr">{formattedAmount}</span>
        </div>
      )}

      {/* Signatures Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '64px', paddingTop: '32px', borderTop: '1px dashed #cbd5e1' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '48px', color: '#334155' }}>توقيع المستلم</p>
          <div style={{ borderBottom: '1px solid #cbd5e1', width: '60%', margin: '0 auto' }}></div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '48px', color: '#334155' }}>توقيع المحاسب</p>
          <div style={{ borderBottom: '1px solid #cbd5e1', width: '60%', margin: '0 auto' }}></div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '48px', color: '#334155' }}>ختم الإدارة</p>
          <div style={{ borderBottom: '1px solid #cbd5e1', width: '60%', margin: '0 auto' }}></div>
        </div>
      </div>
    </div>
  );
}
