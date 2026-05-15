// Central mock data store for all ERP modules
// Used as initial data when Supabase tables are empty

export const MOCK_SUPPLIERS = [
  { id: 1, supplier_id: 'SUP-001', company_name: 'شركة الخليج للتوريدات', contact_person: 'أحمد السالم', email: 'info@gulf-supply.com', category: 'إلكترونيات' },
  { id: 2, supplier_id: 'SUP-002', company_name: 'مؤسسة النخبة التجارية', contact_person: 'محمد العمري', email: 'sales@elite.com', category: 'مواد بناء' },
  { id: 3, supplier_id: 'SUP-003', company_name: 'شركة الأمين للمستلزمات', contact_person: 'فاطمة الزهراء', email: 'contact@ameen.co', category: 'مواد غذائية' },
  { id: 4, supplier_id: 'SUP-004', company_name: 'الشركة العربية للتقنية', contact_person: 'خالد البكر', email: 'tech@arabitech.com', category: 'تقنية' },
  { id: 5, supplier_id: 'SUP-005', company_name: 'مصنع الجودة الأولى', contact_person: 'سارة المطيري', email: 'factory@quality1.com', category: 'تصنيع' },
];

export const MOCK_PURCHASE_INVOICES = [
  { id: 1, invoice_id: 'PUR-2024-001', supplier_id: 'SUP-001', invoice_date: '2024-01-15', total_amount: 45000, status: 'مدفوع' },
  { id: 2, invoice_id: 'PUR-2024-002', supplier_id: 'SUP-002', invoice_date: '2024-01-22', total_amount: 28500, status: 'غير مدفوع' },
  { id: 3, invoice_id: 'PUR-2024-003', supplier_id: 'SUP-003', invoice_date: '2024-02-05', total_amount: 15750, status: 'جزئي' },
  { id: 4, invoice_id: 'PUR-2024-004', supplier_id: 'SUP-001', invoice_date: '2024-02-18', total_amount: 67200, status: 'مدفوع' },
  { id: 5, invoice_id: 'PUR-2024-005', supplier_id: 'SUP-004', invoice_date: '2024-03-01', total_amount: 33100, status: 'غير مدفوع' },
  { id: 6, invoice_id: 'PUR-2024-006', supplier_id: 'SUP-005', invoice_date: '2024-03-14', total_amount: 89400, status: 'مدفوع' },
];

export const MOCK_INVENTORY = [
  { id: 1, item_id: 'ITM-001', item_name: 'لابتوب Dell XPS 15', category: 'إلكترونيات', unit_price: 4500, quantity: 25 },
  { id: 2, item_id: 'ITM-002', item_name: 'طابعة HP LaserJet', category: 'إلكترونيات', unit_price: 850, quantity: 40 },
  { id: 3, item_id: 'ITM-003', item_name: 'كرسي مكتبي فاخر', category: 'أثاث', unit_price: 1200, quantity: 60 },
  { id: 4, item_id: 'ITM-004', item_name: 'ورق A4 (رزمة 500)', category: 'مستلزمات', unit_price: 25, quantity: 500 },
  { id: 5, item_id: 'ITM-005', item_name: 'شاشة Samsung 27"', category: 'إلكترونيات', unit_price: 1800, quantity: 18 },
  { id: 6, item_id: 'ITM-006', item_name: 'هاتف iPhone 15', category: 'إلكترونيات', unit_price: 5200, quantity: 12 },
  { id: 7, item_id: 'ITM-007', item_name: 'طاولة مكتب خشبية', category: 'أثاث', unit_price: 2100, quantity: 30 },
];

export const MOCK_CHART_OF_ACCOUNTS = [
  { id: 1, account_id: 'ACC-1001', account_name: 'الصندوق', type: 'أصل', balance: 85000 },
  { id: 2, account_id: 'ACC-1002', account_name: 'البنك الأهلي', type: 'أصل', balance: 342000 },
  { id: 3, account_id: 'ACC-2001', account_name: 'الموردون الدائنون', type: 'التزام', balance: 125000 },
  { id: 4, account_id: 'ACC-3001', account_name: 'رأس المال', type: 'حقوق ملكية', balance: 1000000 },
  { id: 5, account_id: 'ACC-4001', account_name: 'إيرادات المبيعات', type: 'دخل', balance: 560000 },
  { id: 6, account_id: 'ACC-5001', account_name: 'مصروفات الرواتب', type: 'مصروف', balance: 180000 },
  { id: 7, account_id: 'ACC-5002', account_name: 'مصروفات الإيجار', type: 'مصروف', balance: 48000 },
  { id: 8, account_id: 'ACC-1003', account_name: 'المخزون', type: 'أصل', balance: 275000 },
];

export const MOCK_JOURNAL_ENTRIES = [
  { id: 1, entry_id: 'JRN-001', date: '2024-01-10', description: 'شراء بضاعة من المورد', debit: 45000, credit: 45000 },
  { id: 2, entry_id: 'JRN-002', date: '2024-01-15', description: 'مبيعات نقدية', debit: 28000, credit: 28000 },
  { id: 3, entry_id: 'JRN-003', date: '2024-01-31', description: 'صرف رواتب شهر يناير', debit: 35000, credit: 35000 },
  { id: 4, entry_id: 'JRN-004', date: '2024-02-05', description: 'دفع إيجار المكتب', debit: 8000, credit: 8000 },
  { id: 5, entry_id: 'JRN-005', date: '2024-02-20', description: 'تحصيل من عميل', debit: 52000, credit: 52000 },
];

export const MOCK_SALES_INVOICES = [
  { id: 1, invoice_id: 'SAL-2024-001', customer_id: 'CUST-001', invoice_date: '2024-01-20', amount: 85000, status: 'مدفوع' },
  { id: 2, invoice_id: 'SAL-2024-002', customer_id: 'CUST-002', invoice_date: '2024-01-28', amount: 42000, status: 'غير مدفوع' },
  { id: 3, invoice_id: 'SAL-2024-003', customer_id: 'CUST-003', invoice_date: '2024-02-10', amount: 31500, status: 'مدفوع' },
  { id: 4, invoice_id: 'SAL-2024-004', customer_id: 'CUST-001', invoice_date: '2024-02-25', amount: 120000, status: 'جزئي' },
  { id: 5, invoice_id: 'SAL-2024-005', customer_id: 'CUST-004', invoice_date: '2024-03-08', amount: 67500, status: 'مدفوع' },
  { id: 6, invoice_id: 'SAL-2024-006', customer_id: 'CUST-005', invoice_date: '2024-03-15', amount: 28900, status: 'غير مدفوع' },
];

export const MOCK_CUSTOMERS = [
  { id: 1, customer_id: 'CUST-001', name: 'شركة رواد التقنية', email: 'info@rawad.com', phone: '+966501234567', company: 'رواد للتقنية المحدودة' },
  { id: 2, customer_id: 'CUST-002', name: 'مؤسسة البناء الحديث', email: 'contact@modernbuild.com', phone: '+966502345678', company: 'البناء الحديث' },
  { id: 3, customer_id: 'CUST-003', name: 'شركة الأفق للاستثمار', email: 'invest@ufuq.com', phone: '+966503456789', company: 'الأفق للاستثمار' },
  { id: 4, customer_id: 'CUST-004', name: 'مجموعة النور التجارية', email: 'group@nour.sa', phone: '+966504567890', company: 'مجموعة النور' },
  { id: 5, customer_id: 'CUST-005', name: 'شركة المدينة للخدمات', email: 'services@madina.com', phone: '+966505678901', company: 'المدينة للخدمات' },
];

export const MOCK_CHECKS = [
  { id: 1, check_id: 'CHK-001', check_number: '100245', bank_name: 'البنك الأهلي', due_date: '2024-02-01', amount: 35000, type: 'وارد' },
  { id: 2, check_id: 'CHK-002', check_number: '200187', bank_name: 'بنك الراجحي', due_date: '2024-02-15', amount: 28000, type: 'صادر' },
  { id: 3, check_id: 'CHK-003', check_number: '300456', bank_name: 'بنك الإنماء', due_date: '2024-03-01', amount: 55000, type: 'وارد' },
  { id: 4, check_id: 'CHK-004', check_number: '400123', bank_name: 'البنك الأهلي', due_date: '2024-03-20', amount: 18500, type: 'صادر' },
  { id: 5, check_id: 'CHK-005', check_number: '500789', bank_name: 'بنك الجزيرة', due_date: '2024-04-10', amount: 72000, type: 'وارد' },
];

export const MOCK_FIXED_ASSETS = [
  { id: 1, asset_id: 'AST-001', asset_name: 'سيارة تويوتا لاندكروزر 2023', purchase_date: '2023-03-15', value: 220000, depreciation: 44000 },
  { id: 2, asset_id: 'AST-002', asset_name: 'مبنى المكتب الرئيسي', purchase_date: '2020-01-01', value: 2500000, depreciation: 125000 },
  { id: 3, asset_id: 'AST-003', asset_name: 'خط إنتاج آلي', purchase_date: '2022-06-20', value: 850000, depreciation: 170000 },
  { id: 4, asset_id: 'AST-004', asset_name: 'أجهزة حاسوب (20 جهاز)', purchase_date: '2023-09-01', value: 90000, depreciation: 18000 },
  { id: 5, asset_id: 'AST-005', asset_name: 'معدات مختبر', purchase_date: '2021-11-12', value: 320000, depreciation: 64000 },
];

export const MOCK_EMPLOYEES = [
  { id: 1, emp_id: 'EMP-001', name: 'محمد أنور الشريف', position: 'مدير مالي', department: 'المالية', salary: 22000 },
  { id: 2, emp_id: 'EMP-002', name: 'فاطمة حسن العمري', position: 'محاسبة أولى', department: 'المحاسبة', salary: 15000 },
  { id: 3, emp_id: 'EMP-003', name: 'خالد محمد البكر', position: 'مهندس تقنية المعلومات', department: 'التقنية', salary: 18000 },
  { id: 4, emp_id: 'EMP-004', name: 'سارة أحمد المطيري', position: 'مديرة موارد بشرية', department: 'الموارد البشرية', salary: 20000 },
  { id: 5, emp_id: 'EMP-005', name: 'عبدالله سالم القحطاني', position: 'مندوب مبيعات', department: 'المبيعات', salary: 12000 },
  { id: 6, emp_id: 'EMP-006', name: 'نورة عبدالرحمن السالم', position: 'مساعدة إدارية', department: 'الإدارة', salary: 9500 },
];

export const MOCK_PAYROLL = [
  { id: 1, payroll_id: 'PAY-2024-01', emp_id: 'EMP-001', month_year: '2024-01', basic_salary: 22000, deductions: 2200, net_salary: 19800 },
  { id: 2, payroll_id: 'PAY-2024-02', emp_id: 'EMP-002', month_year: '2024-01', basic_salary: 15000, deductions: 1500, net_salary: 13500 },
  { id: 3, payroll_id: 'PAY-2024-03', emp_id: 'EMP-003', month_year: '2024-01', basic_salary: 18000, deductions: 1800, net_salary: 16200 },
  { id: 4, payroll_id: 'PAY-2024-04', emp_id: 'EMP-004', month_year: '2024-01', basic_salary: 20000, deductions: 2000, net_salary: 18000 },
  { id: 5, payroll_id: 'PAY-2024-05', emp_id: 'EMP-005', month_year: '2024-01', basic_salary: 12000, deductions: 1200, net_salary: 10800 },
  { id: 6, payroll_id: 'PAY-2024-06', emp_id: 'EMP-006', month_year: '2024-01', basic_salary: 9500, deductions: 950, net_salary: 8550 },
];
