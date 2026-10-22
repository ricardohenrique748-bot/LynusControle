import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../../app/auth-context.tsx';
import { isSupabaseConnected } from '../../lib/supabase.ts';
import { Button } from '../../components/ui/button.tsx';
import { LynusLogo } from '../../components/ui/lynus-logo.tsx';
import { FloatingPathsBackground } from '../../components/ui/floating-paths.tsx';
import { getRememberedEmail, getSavedCredential, rememberLogin } from './remembered-login.ts';

export function LoginPage() {
  const { signIn, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [email, setEmail] = useState(() => getRememberedEmail() ?? '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => getRememberedEmail() !== null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill the password the browser saved for this site (Chrome/Edge)
  useEffect(() => {
    if (!remember) return;
    let active = true;
    getSavedCredential().then((cred) => {
      if (!active || !cred) return;
      setEmail((current) => current || cred.email);
      setPassword((current) => current || cred.password);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      await rememberLogin(remember, email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    'w-full h-11 rounded-md bg-slate-900 border border-slate-700 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500';

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans flex items-center justify-center px-4 py-10">
      {/* Animated background in the logo colors */}
      <FloatingPathsBackground position={1} className="absolute inset-0" pathsClassName="text-[#6B8AFF]" />
      <FloatingPathsBackground position={-1} className="absolute inset-0" pathsClassName="text-[#36D0E8] opacity-70" />

      <div className="relative z-10 w-full max-w-sm isolate [will-change:transform]">
        <div className="flex flex-col items-center text-center mb-8">
          <h1>
            <LynusLogo title="Lynus Control" className="h-16 w-auto" />
          </h1>
          <p className="mt-5 text-sm text-slate-400">Entre com sua conta para acessar o painel</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-xl bg-slate-900/95 border border-slate-800 p-6 space-y-4 shadow-2xl shadow-black/40"
        >
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md bg-rose-500/10 border border-rose-500/30 px-3 py-2.5 text-sm text-rose-300"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-slate-300 mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="login-email"
                name="username"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-slate-300 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${fieldClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-500 hover:text-slate-200 cursor-pointer"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-900 accent-cyan-500 cursor-pointer"
            />
            Lembrar e-mail e senha neste computador
          </label>

          <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        {!isSupabaseConnected && (
          <div className="mt-4 flex items-start gap-2 rounded-md bg-amber-950/95 border border-amber-500/30 px-3 py-2.5 text-xs text-amber-200">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Modo demonstração: o Supabase ainda não está configurado no <code className="font-mono">.env</code>.
              O acesso é verificado só neste navegador — use apenas para testes.
            </span>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Lynus Control
        </p>
      </div>
    </div>
  );
}
