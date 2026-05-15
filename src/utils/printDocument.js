/**
 * printDocument.js — SmartCore ERP  ·  Premium Print Engine
 * Renders inside a hidden <iframe> so the dark ERP shell never appears.
 */

const BRAND     = 'SmartCore ERP';
const BRAND_SUB = 'النظام المحاسبي المتكامل';
const SUPERVISOR = 'إشراف: محمد ناصر الدين';
const SUBTITLE   = 'مشروع المادة — قاعدة البيانات وإدارتها';

const C = {
  navy   : '#1e293b',
  navyLt : '#334155',
  emerald: '#10b981',
  emeraldDk:'#065f46',
  rose   : '#e11d48',
  roseLt : '#fff1f2',
  emeraldLt:'#ecfdf5',
  stripe : '#f8fafc',
  border : '#e2e8f0',
  muted  : '#64748b',
  text   : '#1e293b',
  white  : '#ffffff',
};

/* ── Helpers ── */
const money = n =>
  (Number(n)||0).toLocaleString('ar-SA',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' ₪';

const dt = () => {
  const d = new Date();
  return {
    date: d.toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'}),
    time: d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}),
  };
};

const pill = (txt, color='#1e40af', bg='#dbeafe') =>
  `<span style="display:inline-block;padding:2px 12px;border-radius:20px;font-size:10px;font-weight:700;color:${color};background:${bg};">${txt}</span>`;

const statusPill = s => ({
  'مدفوع'    : pill(s,'#065f46','#d1fae5'),
  'غير مدفوع': pill(s,'#9f1239','#fee2e2'),
  'جزئي'     : pill(s,'#78350f','#fef3c7'),
  'وارد'     : pill(s,'#1e40af','#dbeafe'),
  'صادر'     : pill(s,'#6d28d9','#ede9fe'),
}[s] ?? pill(s,'#374151','#f3f4f6'));

/* ── CSS ── */
const CSS = `
@page { size:A4 portrait; margin:0; }
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{
  font-family:'Segoe UI','Tahoma','Arial',sans-serif;
  font-size:12px; line-height:1.65;
  color:${C.text}; background:#fff;
  direction:rtl; text-align:right;
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
.page{
  width:210mm; min-height:297mm;
  margin:0 auto;
  display:flex; flex-direction:column;
}

/* ── Banner header ── */
.banner{
  background:${C.navy};
  padding:20px 24px 18px;
  display:flex; align-items:center; justify-content:space-between;
  color:${C.white};
}
.banner-right{display:flex;align-items:center;gap:12px;}
.logo-box{
  width:50px;height:50px;
  background:linear-gradient(135deg,#4f46e5,#7c3aed);
  border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  font-size:26px;font-weight:900;color:#fff;flex-shrink:0;
  box-shadow:0 4px 12px rgba(0,0,0,0.3);
}
.brand-name{font-size:20px;font-weight:800;color:#fff;letter-spacing:.3px;}
.brand-sub {font-size:10px;color:#94a3b8;margin-top:2px;}
.banner-left{text-align:left;}
.doc-type{font-size:16px;font-weight:800;color:${C.emerald};letter-spacing:.5px;}
.supervisor{font-size:10px;color:#94a3b8;margin-top:4px;}

/* ── Green accent bar ── */
.accent-bar{height:4px;background:linear-gradient(90deg,${C.emerald},#059669,#10b981);}

/* ── Body padding ── */
.body{padding:24px 24px 20px;flex:1;display:flex;flex-direction:column;gap:0;}

/* ── Meta 3-col ── */
.meta-grid{
  display:grid;grid-template-columns:repeat(3,1fr);gap:10px;
  margin-bottom:22px;
}
.meta-card{
  border:1px solid ${C.border};border-radius:8px;
  padding:10px 12px;background:${C.stripe};
}
.meta-label{font-size:8.5px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;}
.meta-value{font-size:13px;font-weight:700;color:${C.text};}
.meta-sub  {font-size:10px;color:${C.muted};margin-top:1px;}

/* ── Entity box ── */
.entity-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px;}
.entity-box{
  border:1px solid ${C.border};border-radius:8px;
  padding:12px 14px;background:${C.stripe};
}
.entity-label{
  font-size:8.5px;font-weight:700;color:${C.muted};
  text-transform:uppercase;letter-spacing:.8px;
  border-bottom:1px solid ${C.border};padding-bottom:6px;margin-bottom:8px;
}
.entity-row{display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;}
.entity-row .er-k{color:${C.muted};}
.entity-row .er-v{font-weight:600;text-align:left;}

/* ── Table ── */
.tbl-wrap{border-radius:8px;overflow:hidden;border:1px solid ${C.border};margin-bottom:22px;}
table{width:100%;border-collapse:collapse;font-size:11.5px;}
thead tr{background:${C.navy};}
thead th{
  padding:10px 12px;text-align:right;
  font-weight:700;font-size:10.5px;color:${C.white};
  white-space:nowrap;letter-spacing:.3px;
}
thead th:last-child{text-align:left;}
tbody tr:nth-child(even){background:${C.stripe};}
tbody tr{border-bottom:1px solid ${C.border};}
tbody td{padding:9px 12px;color:${C.text};vertical-align:middle;}
tbody td.num{text-align:left;font-weight:700;font-variant-numeric:tabular-nums;color:${C.navy};}
tbody td.center{text-align:center;}
.earn td{color:${C.emeraldDk}!important;}
.deduct td{color:#9f1239!important;}

/* ── Totals ── */
.totals-wrap{display:flex;justify-content:flex-start;margin-bottom:24px;}
.totals-box{
  min-width:260px;
  border:1px solid ${C.border};border-radius:8px;overflow:hidden;
}
.tot-row{
  display:flex;justify-content:space-between;align-items:center;
  padding:7px 14px;border-bottom:1px solid ${C.border};gap:32px;
  font-size:11.5px;
}
.tot-row:last-child{border-bottom:none;}
.tot-row .tot-l{color:${C.muted};}
.tot-row .tot-v{font-weight:700;text-align:left;white-space:nowrap;}
.tot-earn  {background:${C.emeraldLt};}
.tot-earn .tot-v{color:${C.emeraldDk};}
.tot-deduct{background:${C.roseLt};}
.tot-deduct .tot-v{color:#9f1239;}
.tot-grand {
  background:${C.navy};
  border-top:3px solid ${C.emerald}!important;
}
.tot-grand .tot-l,.tot-grand .tot-v{
  color:#fff!important;font-size:13.5px;font-weight:800;
}

/* ── Metrics row (inventory) ── */
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px;}
.metric{
  border:1px solid ${C.border};border-radius:8px;
  padding:12px;background:${C.stripe};text-align:center;
}
.metric .m-lbl{font-size:8.5px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px;}
.metric .m-val{font-size:20px;font-weight:900;color:${C.navy};}
.metric .m-sub{font-size:9px;color:${C.muted};margin-top:4px;}

/* ── Signatures ── */
.sigs{
  display:grid;grid-template-columns:repeat(3,1fr);
  gap:24px;margin-top:30px;margin-bottom:16px;
}
.sig{text-align:center;}
.sig-space{height:40px;}
.sig-line{
  border-top:1px dashed #94a3b8;padding-top:7px;
  font-size:10px;font-weight:700;color:${C.muted};
}

/* ── Footer ── */
.footer{
  background:${C.stripe};
  border-top:1px solid ${C.border};
  padding:8px 24px;
  display:flex;justify-content:space-between;align-items:center;
  font-size:9px;color:${C.muted};
  margin-top:auto;
}
.footer .wm{font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#cbd5e1;}
@media print{body{background:#fff!important;}}
`;

/* ── Engine ── */
function print(body) {
  let f = document.getElementById('__erp_pf__');
  if (!f) {
    f = document.createElement('iframe');
    f.id = '__erp_pf__';
    f.style.cssText='position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(f);
  }
  const doc = f.contentDocument || f.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
<meta charset="UTF-8"><title>${BRAND}</title>
<style>${CSS}</style></head><body>${body}</body></html>`);
  doc.close();
  f.contentWindow.onload = () => setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); }, 380);
}

/* ── Shared blocks ── */
const banner = (docType, id, idLabel) => `
<div class="banner">
  <div class="banner-right">
    <div class="logo-box">S</div>
    <div>
      <div class="brand-name">${BRAND}</div>
      <div class="brand-sub">${BRAND_SUB}</div>
    </div>
  </div>
  <div class="banner-left">
    <div class="doc-type">${docType}</div>
    <div class="supervisor">${idLabel}: <strong style="color:#e2e8f0;">${id}</strong></div>
    <div class="supervisor">${SUPERVISOR}</div>
  </div>
</div>
<div class="accent-bar"></div>`;

const footer = (d, t) => `
<div class="sigs">
  <div class="sig"><div class="sig-space"></div><div class="sig-line">توقيع المستلم</div></div>
  <div class="sig"><div class="sig-space"></div><div class="sig-line">توقيع المحاسب</div></div>
  <div class="sig"><div class="sig-space"></div><div class="sig-line">ختم الإدارة</div></div>
</div>
<div class="footer">
  <span>طُبع: ${d} — ${t}</span>
  <span class="wm">Generated by ${BRAND}</span>
  <span>${SUBTITLE}</span>
</div>`;

/* ══════════════════════════════════════════════
   1. SALES INVOICE
══════════════════════════════════════════════ */
export function printSalesInvoice(row) {
  const {date,time}=dt();
  print(`
<div class="page">
${banner('فاتورة مبيعات', row.invoice_id??'—', 'رقم الفاتورة')}
<div class="body">
  <div class="meta-grid">
    <div class="meta-card">
      <div class="meta-label">رقم الفاتورة</div>
      <div class="meta-value">${row.invoice_id??'—'}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">تاريخ الإصدار</div>
      <div class="meta-value">${row.invoice_date??date}</div>
      <div class="meta-sub">طُبع: ${time}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">الحالة</div>
      <div class="meta-value">${statusPill(row.status??'—')}</div>
    </div>
  </div>

  <div class="entity-grid">
    <div class="entity-box">
      <div class="entity-label">بيانات العميل</div>
      <div class="entity-row"><span class="er-k">رقم العميل</span><span class="er-v">${row.customer_id??'—'}</span></div>
    </div>
    <div class="entity-box">
      <div class="entity-label">بيانات الفاتورة</div>
      <div class="entity-row"><span class="er-k">تاريخ الاستحقاق</span><span class="er-v">${row.invoice_date??'—'}</span></div>
      <div class="entity-row"><span class="er-k">الحالة</span><span class="er-v">${statusPill(row.status??'—')}</span></div>
    </div>
  </div>

  <div class="tbl-wrap">
    <table>
      <thead><tr>
        <th>رقم الفاتورة</th><th>رقم العميل</th>
        <th>تاريخ الإصدار</th><th>الحالة</th><th>المبلغ الإجمالي</th>
      </tr></thead>
      <tbody><tr>
        <td>${row.invoice_id??'—'}</td>
        <td>${row.customer_id??'—'}</td>
        <td>${row.invoice_date??'—'}</td>
        <td class="center">${statusPill(row.status??'—')}</td>
        <td class="num">${money(row.amount)}</td>
      </tr></tbody>
    </table>
  </div>

  <div class="totals-wrap">
    <div class="totals-box">
      <div class="tot-row tot-earn">
        <span class="tot-l">إجمالي الفاتورة</span><span class="tot-v">${money(row.amount)}</span>
      </div>
      <div class="tot-row tot-grand">
        <span class="tot-l">المبلغ المستحق</span><span class="tot-v">${money(row.amount)}</span>
      </div>
    </div>
  </div>

  ${footer(date,time)}
</div></div>`);
}

/* ══════════════════════════════════════════════
   2. PURCHASE INVOICE
══════════════════════════════════════════════ */
export function printPurchaseInvoice(row) {
  const {date,time}=dt();
  print(`
<div class="page">
${banner('فاتورة مشتريات', row.invoice_id??'—', 'رقم الفاتورة')}
<div class="body">
  <div class="meta-grid">
    <div class="meta-card">
      <div class="meta-label">رقم الفاتورة</div>
      <div class="meta-value">${row.invoice_id??'—'}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">تاريخ الفاتورة</div>
      <div class="meta-value">${row.invoice_date??date}</div>
      <div class="meta-sub">طُبع: ${time}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">الحالة</div>
      <div class="meta-value">${statusPill(row.status??'—')}</div>
    </div>
  </div>

  <div class="entity-grid">
    <div class="entity-box">
      <div class="entity-label">بيانات المورد</div>
      <div class="entity-row"><span class="er-k">رقم المورد</span><span class="er-v">${row.supplier_id??'—'}</span></div>
    </div>
    <div class="entity-box">
      <div class="entity-label">تفاصيل الفاتورة</div>
      <div class="entity-row"><span class="er-k">تاريخ الاستحقاق</span><span class="er-v">${row.invoice_date??'—'}</span></div>
      <div class="entity-row"><span class="er-k">الحالة</span><span class="er-v">${statusPill(row.status??'—')}</span></div>
    </div>
  </div>

  <div class="tbl-wrap">
    <table>
      <thead><tr>
        <th>رقم الفاتورة</th><th>رقم المورد</th>
        <th>تاريخ الفاتورة</th><th>الحالة</th><th>إجمالي الفاتورة</th>
      </tr></thead>
      <tbody><tr>
        <td>${row.invoice_id??'—'}</td>
        <td>${row.supplier_id??'—'}</td>
        <td>${row.invoice_date??'—'}</td>
        <td class="center">${statusPill(row.status??'—')}</td>
        <td class="num">${money(row.total_amount)}</td>
      </tr></tbody>
    </table>
  </div>

  <div class="totals-wrap">
    <div class="totals-box">
      <div class="tot-row tot-deduct">
        <span class="tot-l">إجمالي المشتريات</span><span class="tot-v">${money(row.total_amount)}</span>
      </div>
      <div class="tot-row tot-grand">
        <span class="tot-l">المبلغ المستحق للمورد</span><span class="tot-v">${money(row.total_amount)}</span>
      </div>
    </div>
  </div>

  ${footer(date,time)}
</div></div>`);
}

/* ══════════════════════════════════════════════
   3. PAYROLL SLIP
══════════════════════════════════════════════ */
export function printPayrollSlip(row) {
  const {date,time}=dt();
  const basic  = Number(row.basic_salary)||0;
  const deduct = Number(row.deductions)||0;
  const net    = Number(row.net_salary)||(basic-deduct);
  print(`
<div class="page">
${banner('قسيمة راتب', row.payroll_id??'—', 'رقم السجل')}
<div class="body">
  <div class="meta-grid">
    <div class="meta-card">
      <div class="meta-label">رقم الموظف</div>
      <div class="meta-value">${row.emp_id??'—'}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">فترة الراتب</div>
      <div class="meta-value">${row.month_year??'—'}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">تاريخ الطباعة</div>
      <div class="meta-value" style="font-size:11px;">${date}</div>
      <div class="meta-sub">${time}</div>
    </div>
  </div>

  <div class="entity-grid">
    <div class="entity-box">
      <div class="entity-label">بيانات الموظف</div>
      <div class="entity-row"><span class="er-k">رقم الموظف</span><span class="er-v">${row.emp_id??'—'}</span></div>
    </div>
    <div class="entity-box">
      <div class="entity-label">فترة الاستحقاق</div>
      <div class="entity-row"><span class="er-k">الشهر</span><span class="er-v">${row.month_year??'—'}</span></div>
    </div>
  </div>

  <div class="tbl-wrap">
    <table>
      <thead><tr><th>البيان</th><th>التصنيف</th><th>المبلغ</th></tr></thead>
      <tbody>
        <tr class="earn">
          <td>الراتب الأساسي</td>
          <td class="center">${pill('استحقاق','#065f46','#d1fae5')}</td>
          <td class="num">${money(basic)}</td>
        </tr>
        <tr class="deduct">
          <td>الخصومات</td>
          <td class="center">${pill('خصم','#9f1239','#fee2e2')}</td>
          <td class="num">(${money(deduct)})</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="totals-wrap">
    <div class="totals-box">
      <div class="tot-row tot-earn">
        <span class="tot-l">إجمالي الاستحقاقات</span><span class="tot-v">${money(basic)}</span>
      </div>
      <div class="tot-row tot-deduct">
        <span class="tot-l">إجمالي الخصومات</span><span class="tot-v">(${money(deduct)})</span>
      </div>
      <div class="tot-row tot-grand">
        <span class="tot-l">صافي الراتب المستحق</span><span class="tot-v">${money(net)}</span>
      </div>
    </div>
  </div>

  ${footer(date,time)}
</div></div>`);
}

/* ══════════════════════════════════════════════
   4. INVENTORY REPORT
══════════════════════════════════════════════ */
export function printInventoryItem(row) {
  const {date,time}=dt();
  const qty   = Number(row.quantity)||0;
  const price = Number(row.unit_price)||0;
  const total = qty*price;
  const low   = qty<20;
  const stockBadge = low ? pill('مخزون منخفض','#9f1239','#fee2e2') : pill('مخزون كافٍ','#065f46','#d1fae5');
  print(`
<div class="page">
${banner('تقرير حالة المخزون', row.item_id??'—', 'رقم الصنف')}
<div class="body">
  <div class="metrics">
    <div class="metric">
      <div class="m-lbl">الكمية المتاحة</div>
      <div class="m-val" style="color:${low?'#9f1239':'#065f46'};">${qty}</div>
      <div class="m-sub">وحدة ${low?'⚠ أقل من الحد الأدنى':''}</div>
    </div>
    <div class="metric">
      <div class="m-lbl">سعر الوحدة</div>
      <div class="m-val" style="font-size:15px;">${money(price)}</div>
      <div class="m-sub">للوحدة الواحدة</div>
    </div>
    <div class="metric">
      <div class="m-lbl">إجمالي قيمة المخزون</div>
      <div class="m-val" style="font-size:15px;">${money(total)}</div>
      <div class="m-sub">${stockBadge}</div>
    </div>
  </div>

  <div class="entity-grid">
    <div class="entity-box">
      <div class="entity-label">بيانات الصنف</div>
      <div class="entity-row"><span class="er-k">اسم الصنف</span><span class="er-v">${row.item_name??'—'}</span></div>
      <div class="entity-row"><span class="er-k">الفئة</span><span class="er-v">${row.category??'—'}</span></div>
    </div>
    <div class="entity-box">
      <div class="entity-label">حالة المخزون</div>
      <div class="entity-row"><span class="er-k">حالة الكمية</span><span class="er-v">${stockBadge}</span></div>
      <div class="entity-row"><span class="er-k">تنبيه</span>
        <span class="er-v" style="color:${low?'#9f1239':'#065f46'};font-size:10px;">
          ${low?'⚠ أقل من الحد الأدنى (20)':'✓ ضمن الحد المقبول'}
        </span>
      </div>
    </div>
  </div>

  <div class="tbl-wrap">
    <table>
      <thead><tr>
        <th>رقم الصنف</th><th>اسم الصنف</th>
        <th>الفئة</th><th>الكمية</th>
        <th>سعر الوحدة</th><th>إجمالي القيمة</th>
      </tr></thead>
      <tbody><tr>
        <td>${row.item_id??'—'}</td>
        <td><strong>${row.item_name??'—'}</strong></td>
        <td>${row.category??'—'}</td>
        <td class="num" style="color:${low?'#9f1239':'#065f46'};">${qty}</td>
        <td class="num">${money(price)}</td>
        <td class="num">${money(total)}</td>
      </tr></tbody>
    </table>
  </div>

  <div class="totals-wrap">
    <div class="totals-box">
      <div class="tot-row">
        <span class="tot-l">الكمية × سعر الوحدة</span>
        <span class="tot-v">${qty} × ${money(price)}</span>
      </div>
      <div class="tot-row tot-grand">
        <span class="tot-l">إجمالي قيمة الصنف</span>
        <span class="tot-v">${money(total)}</span>
      </div>
    </div>
  </div>

  ${footer(date,time)}
</div></div>`);
}
