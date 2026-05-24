const fs = require('fs');
const path = require('path');

const pages = [
  { file: 'src/pages/finance/ChartOfAccounts.jsx', type: 'chart_of_accounts' },
  { file: 'src/pages/finance/Checks.jsx', type: 'checks' },
  { file: 'src/pages/finance/Customers.jsx', type: 'customers' },
  { file: 'src/pages/finance/JournalEntries.jsx', type: 'journal_entries' },
  { file: 'src/pages/finance/SalesInvoices.jsx', type: 'sales_invoices' },
  { file: 'src/pages/hr/Employees.jsx', type: 'employees' },
  { file: 'src/pages/hr/FixedAssets.jsx', type: 'fixed_assets' },
  { file: 'src/pages/hr/Payroll.jsx', type: 'payroll' },
  { file: 'src/pages/supply/Inventory.jsx', type: 'inventory' },
  { file: 'src/pages/supply/PurchaseInvoices.jsx', type: 'purchase_invoices' },
  { file: 'src/pages/supply/Suppliers.jsx', type: 'suppliers' },
];

for (const p of pages) {
  const fullPath = path.join(__dirname, p.file);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${p.file}, not found.`);
    continue;
  }
  let content = fs.readFileSync(fullPath, 'utf8');

  // 1. Add import if not present
  if (!content.includes(`import { useApp }`)) {
    content = content.replace(/(import React.*?;\n)/, `$1import { useApp } from '../../context/AppContext';\n`);
  }

  // 2. Add printDocument inside component
  // Find component definition: `export default function Name() {`
  const compMatch = content.match(/export default function\s+\w+\(\)\s*\{/);
  if (compMatch && !content.includes('const { printDocument } = useApp();')) {
    const insertPos = compMatch.index + compMatch[0].length;
    content = content.slice(0, insertPos) + '\n  const { printDocument } = useApp();' + content.slice(insertPos);
  }

  // 3. Add onPrint to CrudTable
  if (!content.includes('onPrint={(row)')) {
    content = content.replace(/<CrudTable\s+([\s\S]*?)\/>/m, (match, props) => {
      // make sure it doesn't already have onPrint prop, just in case
      if (props.includes('onPrint=')) return match;
      return `<CrudTable\n        onPrint={(row) => printDocument('${p.type}', row)}\n        ${props.trim()}\n      />`;
    });
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Patched ${p.file}`);
}
console.log("Done patching.");
