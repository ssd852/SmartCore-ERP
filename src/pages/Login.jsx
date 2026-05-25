import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { supabase, supabaseReady } from '../config/supabaseClient';
import {
  Eye, EyeOff, LogIn, UserPlus, Globe, Monitor, Smartphone,
  AlertCircle, CheckCircle, Loader2, Lock, Mail, Building2, Sparkles
} from 'lucide-react';

/* ── Animated particle field ── */
function ParticleField() {
  const particles = useRef(
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'][i % 5],
      delay: Math.random() * 6,
      duration: Math.random() * 8 + 6,
      opacity: Math.random() * 0.5 + 0.15,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: p.color,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            filter: `blur(${p.size > 2 ? 0.5 : 0}px)`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Glow orbs ── */
function GlowOrbs() {
  return (
    <>
      <div
        className="absolute animate-pulse-orb pointer-events-none"
        style={{
          top: '-10%', left: '-10%',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute animate-pulse-orb pointer-events-none"
        style={{
          bottom: '-10%', right: '-10%',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(60px)',
          animationDelay: '3s',
        }}
      />
      <div
        className="absolute animate-pulse-orb pointer-events-none"
        style={{
          top: '40%', right: '30%',
          width: 350, height: 350,
          background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(50px)',
          animationDelay: '6s',
        }}
      />
    </>
  );
}

/* ── Toggle Switch Component ── */
function ToggleSwitch({ value, onChange, options, icon: Icon, label }) {
  return (
    <div className="flex items-center gap-3">
      {Icon && <Icon size={15} className="text-slate-400 shrink-0" />}
      <span className="text-xs text-slate-400 font-medium shrink-0">{label}</span>
      <div
        className="relative flex rounded-lg p-0.5 ms-auto"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${
              value === opt.value
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {opt.icon && <opt.icon size={12} />}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main Login Component ── */
export default function Login() {
  const { t } = useTranslation();
  const { lang, setLang, viewMode, setViewMode } = useApp();
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [role, setRole] = useState('Admin');
  const [rolePassword, setRolePassword] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    setError('');
  };

  const mapError = (err) => {
    const msg = err?.message || '';
    if (!supabaseReady) return '⚙️ ' + (lang === 'ar' ? 'مفاتيح Supabase غير مُعدَّة بعد.' : 'Supabase keys not configured.');
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
      return lang === 'ar' ? 'بيانات الدخول غير صحيحة.' : 'Invalid login credentials.';
    if (msg.includes('already registered'))
      return lang === 'ar' ? 'هذا البريد مسجل مسبقاً.' : 'Email already registered.';
    if (msg.includes('Password should be at least'))
      return lang === 'ar' ? 'كلمة المرور قصيرة جداً (6 أحرف على الأقل).' : 'Password too short (min 6 chars).';
    if (msg.includes('Email not confirmed'))
      return lang === 'ar' ? 'يرجى تأكيد بريدك الإلكتروني.' : 'Please confirm your email.';
    if (msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('network'))
      return lang === 'ar' ? 'تعذّر الوصول للخادم — تحقق من اتصالك.' : 'Cannot reach server — check your connection.';
    return (lang === 'ar' ? 'خطأ: ' : 'Error: ') + msg;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (!supabaseReady) throw new Error('ENV_NOT_CONFIGURED');

      if (role === 'Admin' && rolePassword !== 'Mns@22.5.2005') {
        setError(lang === 'ar' ? 'كلمة مرور الصلاحية غير صحيحة' : 'Invalid Role Password');
        setIsLoading(false);
        return;
      }
      if (role === 'Accountant' && rolePassword !== '22.5.2005') {
        setError(lang === 'ar' ? 'كلمة مرور الصلاحية غير صحيحة' : 'Invalid Role Password');
        setIsLoading(false);
        return;
      }

      if (isRegistering) {
        const { error: signUpErr } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { role: role }
          }
        });
        if (signUpErr) throw signUpErr;
        setSuccessMsg(lang === 'ar' ? 'تم إنشاء الحساب! جاري التوجيه...' : 'Account created! Redirecting...');
        setTimeout(() => navigate('/'), 1400);
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        if (data?.user) {
          navigate('/');
        }
      }
    } catch (err) {
      setError(mapError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const langOptions = [
    { value: 'ar', label: 'العربية', icon: Globe },
    { value: 'en', label: 'English', icon: Globe },
  ];
  const viewOptions = [
    { value: 'desktop', label: t('desktop'), icon: Monitor },
    { value: 'mobile', label: t('mobile'), icon: Smartphone },
  ];

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 20% 50%, #0d1b40 0%, #0B1120 50%, #040d1a 100%)' }}
    >
      {/* Background layers */}
      <ParticleField />
      <GlowOrbs />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(148,163,184,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* ── Main Card ── */}
      <div
        className="relative z-10 w-full mx-4"
        style={{ maxWidth: 460 }}
      >
        {/* Card with glassmorphism */}
        <div
          className="glass-strong rounded-3xl p-8 shadow-2xl"
          style={{
            boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.07)',
            transform: mounted ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.97)',
            opacity: mounted ? 1 : 0,
            transition: 'transform 0.65s cubic-bezier(0.16,1,0.3,1), opacity 0.65s ease',
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 rounded-t-3xl"
            style={{
              left: '12%', right: '12%', height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.8), rgba(139,92,246,0.8), rgba(16,185,129,0.6), transparent)',
            }}
          />

          {/* ── Language + View toggles ── */}
          <div className="glass rounded-2xl p-3 mb-6 flex flex-col gap-2.5">
            <ToggleSwitch
              value={lang}
              onChange={handleLangChange}
              options={langOptions}
              icon={Globe}
              label={t('language')}
            />
            <div className="border-t border-white/5" />
            <ToggleSwitch
              value={viewMode}
              onChange={setViewMode}
              options={viewOptions}
              icon={Monitor}
              label={t('view_mode')}
            />
          </div>

          {/* ── Logo / Brand ── */}
          <div className="text-center mb-8">
            <div className="relative inline-flex">
              <div className="w-18 h-18 rounded-2xl flex items-center justify-center shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #0ea5e9 100%)',
                  boxShadow: '0 8px 32px rgba(99,102,241,0.45), 0 0 0 1px rgba(255,255,255,0.1)',
                  width: 76, height: 76,
                }}
              >
                <Building2 size={36} color="white" />
              </div>
              {/* ring */}
              <div
                className="absolute animate-ring rounded-2xl"
                style={{ inset: -5, border: '1px solid rgba(99,102,241,0.35)' }}
              />
              {/* sparkle badge */}
              <div className="absolute -top-1 -end-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                <Sparkles size={12} color="white" />
              </div>
            </div>

            <h1 className="mt-4 text-2xl font-black text-slate-100 tracking-tight leading-tight">
              {isRegistering
                ? (lang === 'ar' ? 'إنشاء حساب جديد' : 'Create New Account')
                : <>{lang === 'ar' ? 'المحاسب الذكي ' : 'SmartCore '}<span className="text-indigo-400">ERP</span></>
              }
            </h1>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              {isRegistering
                ? (lang === 'ar' ? 'أدخل بياناتك لإنشاء حسابك' : 'Enter your details to register')
                : t('app_subtitle')
              }
            </p>
          </div>

          {/* ── Supabase warning ── */}
          {!supabaseReady && (
            <div className="mb-5 rounded-xl p-3 flex items-start gap-3 border border-amber-500/30 bg-amber-500/8">
              <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300/90 leading-relaxed">
                {lang === 'ar'
                  ? 'أضف مفاتيح Supabase في ملف .env.local ثم أعد تشغيل الخادم.'
                  : 'Add Supabase keys to .env.local then restart the dev server.'
                }
              </p>
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 ms-0.5">
                {lang === 'ar' ? 'صلاحية الدخول' : 'User Role'}
              </label>
              <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
                {[
                  { value: 'Admin', label: lang === 'ar' ? 'مدير النظام' : 'Admin' },
                  { value: 'Accountant', label: lang === 'ar' ? 'محاسب' : 'Accountant' }
                ].map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => { setRole(r.value); setRolePassword(''); setError(''); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      role === r.value 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Password */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 ms-0.5">
                  {lang === 'ar' ? 'كلمة مرور الصلاحية' : 'Role Password'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 end-3.5 flex items-center pointer-events-none text-slate-600">
                    <Lock size={16} />
                  </span>
                  <input
                    className="erp-input pe-10"
                    type="password"
                    value={rolePassword}
                    onChange={e => { setRolePassword(e.target.value); setError(''); }}
                    placeholder={lang === 'ar' ? 'أدخل كلمة مرور الصلاحية...' : 'Enter role PIN...'}
                    required
                  />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 ms-0.5">
                {t('email')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 end-3.5 flex items-center pointer-events-none text-slate-600">
                  <Mail size={16} />
                </span>
                <input
                  className="erp-input pe-10"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder={t('email_placeholder')}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 ms-0.5">
                {t('password')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 end-3.5 flex items-center pointer-events-none text-slate-600">
                  <Lock size={16} />
                </span>
                <input
                  className="erp-input pe-10 ps-10"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); setSuccessMsg(''); }}
                  placeholder={t('password_placeholder')}
                  minLength={6}
                  required
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 start-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot (login only) */}
            {!isRegistering && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-300 transition-colors">
                  <input type="checkbox" className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer" />
                  {t('remember_me')}
                </label>
                <button type="button" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors duration-200">
                  {t('forgot_password')}
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="animate-shake rounded-xl px-3.5 py-3 flex items-center gap-2.5 border border-rose-500/35 bg-rose-500/8 text-rose-300 text-sm">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div className="rounded-xl px-3.5 py-3 flex items-center gap-2.5 border border-emerald-500/35 bg-emerald-500/8 text-emerald-300 text-sm">
                <CheckCircle size={15} className="shrink-0" />
                {successMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full py-3.5 rounded-2xl font-bold text-white text-sm overflow-hidden transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              style={{
                backgroundImage: isLoading
                  ? 'linear-gradient(135deg, #334155, #1e293b)'
                  : 'linear-gradient(135deg, #4338ca 0%, #6d28d9 40%, #0369a1 100%)',
                backgroundSize: '200% 200%',
                boxShadow: isLoading ? 'none' : '0 6px 24px rgba(99,102,241,0.4)',
                animation: isLoading ? 'none' : 'gradient-x 3s ease infinite',
              }}
            >
              {/* Shine effect */}
              {!isLoading && (
                <div
                  className="absolute inset-0 opacity-30 animate-shine"
                  style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)' }}
                />
              )}
              <span className="relative flex items-center justify-center gap-2.5">
                {isLoading
                  ? <><Loader2 size={17} className="animate-spin-slow" />{t('logging_in')}</>
                  : isRegistering
                    ? <><UserPlus size={17} />{t('register')}</>
                    : <><LogIn size={17} />{t('login')}</>
                }
              </span>
            </button>
          </form>

          {/* ── Toggle login/register ── */}
          <div className="mt-5 text-center">
            <button
              onClick={() => { setIsRegistering(v => !v); setError(''); setSuccessMsg(''); }}
              className="text-xs text-slate-500 hover:text-slate-200 transition-colors duration-200 font-semibold underline underline-offset-4 decoration-slate-700 hover:decoration-slate-400"
            >
              {isRegistering ? t('have_account') : t('no_account')}
            </button>
          </div>

          {/* ── Footer ── */}
          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-600 font-semibold tracking-wide">
                {lang === 'ar' ? 'مشروع المادة — قاعدة البيانات وإدارتها' : 'Database Systems Course Project'}
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-700">
              {lang === 'ar'
                ? 'إعداد: محمد ناصر الدين'
                : 'By: Mohammed Nasser Al-Din'
              }
            </p>
          </div>
        </div>

        {/* Glow under card */}
        <div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-4/5 h-16 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.2), transparent 70%)', filter: 'blur(20px)' }}
        />
      </div>
    </div>
  );
}
