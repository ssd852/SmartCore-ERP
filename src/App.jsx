import React, { Component } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/index';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layout/MainLayout';
import PrintDocumentLayout from './components/PrintDocumentLayout';
import SubscriptionGuard from './components/SubscriptionGuard';
import SuperAdminGuard from './components/SuperAdminGuard';
import RoleGuard from './components/RoleGuard';

// Pages
import Login            from './pages/Login';
import Dashboard        from './pages/Dashboard';
import Reports          from './pages/Reports';
import DataManagement   from './pages/DataManagement';
import UltraSqlTerminal from './pages/UltraSqlTerminal';

// Supply
import Suppliers        from './pages/supply/Suppliers';
import PurchaseInvoices from './pages/supply/PurchaseInvoices';
import Inventory        from './pages/supply/Inventory';

// Finance
import ChartOfAccounts  from './pages/finance/ChartOfAccounts';
import JournalEntries   from './pages/finance/JournalEntries';
import SalesInvoices    from './pages/finance/SalesInvoices';
import Customers        from './pages/finance/Customers';
import Checks           from './pages/finance/Checks';

// HR
import FixedAssets      from './pages/hr/FixedAssets';
import Employees        from './pages/hr/Employees';
import Payroll          from './pages/hr/Payroll';
import ScanAttendance   from './pages/hr/ScanAttendance';

// Profile
import Profile          from './pages/Profile';

// Error Boundary
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#030712' }}>
        <div className="text-center p-8">
          <div className="text-rose-400 text-5xl mb-4">⚠</div>
          <h1 className="text-rose-400 font-bold text-xl mb-2">System Error</h1>
          <p className="text-slate-500 text-sm mb-4">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-500 transition-colors">Reload</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <AppProvider>
          <PrintDocumentLayout />
          <ToastProvider>
            <Router>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/scan-attendance" element={<ScanAttendance />} />

                {/* Protected — uses MainLayout with sidebar/topbar */}
                <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route path="/"           element={<Dashboard />} />
                  <Route path="/profile"    element={<Profile />} />
                  
                  {/* Supply & Inventory */}
                  <Route path="/inventory"  element={<RoleGuard allowedRoles={['Superadmin', 'Admin']}><SubscriptionGuard isCore={true}><Inventory /></SubscriptionGuard></RoleGuard>} />
                  <Route path="/purchases"  element={<RoleGuard allowedRoles={['Superadmin', 'Admin']}><SubscriptionGuard><PurchaseInvoices /></SubscriptionGuard></RoleGuard>} />
                  <Route path="/suppliers"  element={<RoleGuard allowedRoles={['Superadmin', 'Admin']}><SubscriptionGuard><Suppliers /></SubscriptionGuard></RoleGuard>} />
                  
                  {/* Finance & Sales */}
                  <Route path="/invoices"   element={<SubscriptionGuard><SalesInvoices /></SubscriptionGuard>} />
                  <Route path="/customers"  element={<SubscriptionGuard><Customers /></SubscriptionGuard>} />
                  <Route path="/checks"     element={<SubscriptionGuard><Checks /></SubscriptionGuard>} />
                  <Route path="/accounts"   element={<SubscriptionGuard><ChartOfAccounts /></SubscriptionGuard>} />
                  <Route path="/journal"    element={<SubscriptionGuard isCore={true}><JournalEntries /></SubscriptionGuard>} />
                  
                  {/* HR & Assets */}
                  <Route path="/assets"     element={<RoleGuard allowedRoles={['Superadmin', 'Admin']}><SubscriptionGuard><FixedAssets /></SubscriptionGuard></RoleGuard>} />
                  <Route path="/employees"  element={<RoleGuard allowedRoles={['Superadmin', 'Admin']}><SubscriptionGuard><Employees /></SubscriptionGuard></RoleGuard>} />
                  <Route path="/payroll"    element={<RoleGuard allowedRoles={['Superadmin', 'Admin']}><SubscriptionGuard isCore={true}><Payroll /></SubscriptionGuard></RoleGuard>} />
                  
                  {/* Reports & Tools */}
                  <Route path="/reports"    element={<SubscriptionGuard><Reports /></SubscriptionGuard>} />
                  <Route path="/sql"        element={<SuperAdminGuard><SubscriptionGuard><UltraSqlTerminal /></SubscriptionGuard></SuperAdminGuard>} />
                  <Route path="/data-mgmt"  element={<SuperAdminGuard><SubscriptionGuard><DataManagement /></SubscriptionGuard></SuperAdminGuard>} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

            </Router>
          </ToastProvider>
        </AppProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}
