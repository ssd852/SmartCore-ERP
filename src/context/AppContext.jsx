import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, supabaseReady } from '../config/supabaseClient';
import i18n from '../i18n/index';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('erp-lang') || 'ar');
  const [viewMode, setViewModeState] = useState(() => localStorage.getItem('erp-view') || 'desktop');
  const [theme, setThemeState] = useState(() => localStorage.getItem('erp-theme') || 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Developer Mode state
  const [isDevMode, setIsDevModeState] = useState(() => localStorage.getItem('erp-dev-mode') === 'true');
  
  // Auth User state
  const [authUser, setAuthUser] = useState(null);
  
  // Calculate dynamic user role based on metadata and whitelist
  const userRole = useMemo(() => {
    if (!authUser) return null;
    const email = authUser.email?.toLowerCase() || '';
    const whitelist = ['mohammadnaseraldeen26@gmail.com', 'mohammadnaseraldeen25@gmail.com'];
    if (whitelist.includes(email)) return 'Superadmin';
    return authUser.user_metadata?.role || 'Admin'; // fallback to Admin
  }, [authUser]);

  // SaaS Tenant Profile state
  const [tenantProfile, setTenantProfile] = useState(null);
  
  // Printing state for individual document layout
  const [printDoc, setPrintDocState] = useState(null);

  const printDocument = useCallback((type, data) => {
    setPrintDocState({ type, data });
    document.body.classList.add('print-single-mode');
    setTimeout(() => {
      window.print();
    }, 200);
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintDocState(null);
      document.body.classList.remove('print-single-mode');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Apply lang to document
  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    localStorage.setItem('erp-lang', newLang);
    i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.body.className = newLang === 'en' ? 'lang-en' : '';
  }, []);

  // Apply view mode
  const setViewMode = useCallback((mode) => {
    setViewModeState(mode);
    localStorage.setItem('erp-view', mode);
  }, []);

  // Apply theme
  const setTheme = useCallback((t) => {
    setThemeState(t);
    localStorage.setItem('erp-theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Apply dev mode
  const setIsDevMode = useCallback((val) => {
    setIsDevModeState(val);
    localStorage.setItem('erp-dev-mode', val);
  }, []);

  // Apply initial values on mount and fetch tenant profile
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.className = lang === 'en' ? 'lang-en' : '';
    if (theme === 'dark') document.documentElement.classList.add('dark');

    // Tracks the last known tenant so we can detect mid-session changes
    let lastKnownTenantId = null;

    const fetchTenant = async (userId) => {
      if (!supabaseReady) return;
      // ── SECURITY: if the tenant changed (e.g. account switch), purge old profile first
      if (lastKnownTenantId && lastKnownTenantId !== userId) {
        console.warn('[AppContext] Tenant ID changed — purging previous tenant profile from memory.');
        setTenantProfile(null);
      }
      lastKnownTenantId = userId;

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('tenant_id', userId)
        .single();
      if (data && !error) {
        setTenantProfile(data);
      } else {
        setTenantProfile(null);
      }
    };

    const bootstrap = async () => {
      if (!supabaseReady) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAuthUser(session.user);
        await fetchTenant(session.user.id);
      }
    };
    bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AppContext] Auth event:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          setAuthUser(session.user);
          await fetchTenant(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        // ── SECURITY: Fully purge all tenant-scoped state from memory on sign-out ──
        lastKnownTenantId = null;
        setAuthUser(null);
        setTenantProfile(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <AppContext.Provider value={{
      lang, setLang,
      viewMode, setViewMode,
      theme, setTheme, toggleTheme,
      sidebarOpen, setSidebarOpen,
      sidebarCollapsed, setSidebarCollapsed,
      isDevMode, setIsDevMode,
      authUser, setAuthUser,
      userRole,
      printDoc, printDocument,
      tenantProfile, setTenantProfile,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
