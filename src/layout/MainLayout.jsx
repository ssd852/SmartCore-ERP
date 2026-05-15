import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';

export default function MainLayout() {
  const { viewMode } = useApp();
  const location = useLocation();
  const isMobile = viewMode === 'mobile';

  return (
    <div
      className="min-h-screen w-full flex items-start justify-center"
      style={{ background: '#0b1120' }}
    >
      {/* ── Mobile frame wrapper ── */}
      <div
        style={isMobile ? {
          width: 390,
          minHeight: '100vh',
          maxHeight: '100vh',
          border: '2px solid rgba(99,102,241,0.25)',
          borderRadius: 40,
          overflow: 'hidden',
          boxShadow: '0 0 80px rgba(99,102,241,0.15), 0 40px 100px rgba(0,0,0,0.6)',
          position: 'relative',
          background: '#0b1120',
          display: 'flex',
          flexDirection: 'column',
          margin: '1rem 0',
        } : {
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Desktop layout: side-by-side ── */}
        {!isMobile ? (
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <Sidebar />

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <Topbar />
              <main
                key={location.pathname}
                className="flex-1 overflow-y-auto page-enter"
                style={{ background: '#0b1120', padding: '1.5rem' }}
              >
                <Outlet />
              </main>
            </div>
          </div>
        ) : (
          /* ── Mobile layout: topbar + content + bottom nav ── */
          <div className="flex flex-col h-full overflow-hidden" style={{ maxHeight: '100vh' }}>
            <Topbar />
            <main
              key={location.pathname}
              className="flex-1 overflow-y-auto page-enter"
              style={{ background: '#0b1120', padding: '1rem', paddingBottom: '5rem' }}
            >
              <Outlet />
            </main>
            <BottomNav />
          </div>
        )}
      </div>

      {/* Mobile hint — only shown when in mobile mode on larger screens */}
      {isMobile && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-xs text-slate-500 pointer-events-none"
          style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span>📱 Mobile View Mode Active</span>
        </div>
      )}
    </div>
  );
}
