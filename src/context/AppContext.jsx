import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18n from '../i18n/index';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('erp-lang') || 'ar');
  const [viewMode, setViewModeState] = useState(() => localStorage.getItem('erp-view') || 'desktop');
  const [theme, setThemeState] = useState(() => localStorage.getItem('erp-theme') || 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
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

  // Apply initial values on mount
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.className = lang === 'en' ? 'lang-en' : '';
    if (theme === 'dark') document.documentElement.classList.add('dark');
  }, []);

  return (
    <AppContext.Provider value={{
      lang, setLang,
      viewMode, setViewMode,
      theme, setTheme, toggleTheme,
      sidebarOpen, setSidebarOpen,
      sidebarCollapsed, setSidebarCollapsed,
      printDoc, printDocument,
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
