import React from 'react';
import { Navigate } from 'react-router-dom';
import { supabase, supabaseReady } from '../config/supabaseClient';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!supabaseReady) {
      setChecking(false);
      setAuthed(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data?.session?.user);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session?.user);
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b1120' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={36} className="text-indigo-500 animate-spin-slow" />
          <p className="text-sm text-slate-500 font-medium">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }

  return authed ? children : <Navigate to="/login" replace />;
}
