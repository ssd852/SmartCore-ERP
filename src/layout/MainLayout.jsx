import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import { Menu, X } from 'lucide-react';

export default function MainLayout() {
  const { viewMode } = useApp();
  const location = useLocation();
  const isMobileView = viewMode === 'mobile';

  // Drawer state for real mobile devices
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div
      className="min-h-screen w-full flex items-start justify-center"
      style={{ background: '#0b1120' }}
    >
      {/* ── Mobile preview frame (explicit toggle in app) ── */}
      <div
        style={isMobileView ? {
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
        {isMobileView ? (
          /* ── Mobile preview layout ── */
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
        ) : (
          /* ── Real responsive layout ── */
          <div className="flex h-screen overflow-hidden">

            {/* ── Desktop sidebar (hidden on mobile via CSS) ── */}
            <div className="hidden md:flex h-full flex-shrink-0">
              <Sidebar />
            </div>

            {/* ── Mobile drawer overlay ── */}
            {drawerOpen && (
              <div
                className="fixed inset-0 z-[300] flex md:hidden"
                onClick={() => setDrawerOpen(false)}
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              >
                <div
                  className="h-full flex-shrink-0"
                  onClick={e => e.stopPropagation()}
                  style={{ width: 260 }}
                >
                  <Sidebar />
                </div>
                <button
                  className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  onClick={() => setDrawerOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* ── Main content ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Topbar — pass drawer toggle for mobile hamburger */}
              <Topbar onMenuClick={() => setDrawerOpen(o => !o)} />

              <main
                key={location.pathname}
                className="flex-1 overflow-y-auto page-enter"
                style={{ background: '#0b1120', padding: 'clamp(0.75rem, 3vw, 1.5rem)' }}
              >
                <Outlet />
              </main>

              {/* Bottom nav visible only on real mobile (< md) */}
              <div className="md:hidden">
                <BottomNav />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile preview hint */}
      {isMobileView && (
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
