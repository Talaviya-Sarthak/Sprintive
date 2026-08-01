import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader, ArrowRight, Check } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import type { LucideIcon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

interface LoginForm { email: string; password: string; }
interface FieldErrors { [key: string]: string | undefined; }
interface ApiErrorItem { field: string; message: string; }
interface ApiResponse {
  message?: string;
  errors?: ApiErrorItem[];
  data?: { accessToken: string; refreshToken: string; };
}

interface FieldProps {
  icon: LucideIcon; label: string; type?: string; value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string; placeholder?: string; right?: React.ReactNode;
  id: string;
}

function Field({ icon: Icon, label, type = 'text', value, onChange, error, placeholder, right, id }: FieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-[11px] font-mono font-bold text-[#FFFFFF] uppercase tracking-wider mb-1.5">
        {label} <span className="text-[#F97316]">*</span>
      </label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#A1A1AA]">
          <Icon size={15} strokeWidth={2} />
        </div>
        <input
          id={id}
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          className={`w-full bg-[#050505] text-[#FFFFFF] placeholder-[#52525B] pl-10 pr-10 py-2.5 border ${
            error ? 'border-red-500' : 'border-[#262626]'
          } focus:outline-none focus:border-[#F97316] transition-colors text-xs font-medium`}
        />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -4, height: 0 }} transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 mt-1 text-[11px] text-red-500 font-mono">
            <AlertCircle size={12} /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Login() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const { login, user, teams, loading: authLoading } = useAuth();

  const [form, setForm]       = useState<LoginForm>({ email: '', password: '' });
  const [errors, setErrors]   = useState<FieldErrors>({});
  const [showPw, setShowPw]   = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  // Redirect already-logged-in users
  useEffect(() => {
    if (authLoading || !user) return;
    const redirect = params.get('redirect');
    if (redirect) { navigate(redirect, { replace: true }); return; }
    redirectAfterLogin(teams);
  }, [user, authLoading]);

  const redirectAfterLogin = (userTeams: typeof teams) => {
    const redirect = params.get('redirect');
    if (redirect) { navigate(redirect, { replace: true }); return; }
    if (userTeams.length === 1) { navigate(`/teams/${userTeams[0].id}`, { replace: true }); return; }
    navigate('/dashboard', { replace: true });
  };

  useEffect(() => {
    if (!success) return;
  }, [success]);

  const set = (k: keyof LoginForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!form.email.includes('@')) e.email    = 'Enter a valid email address';
    if (form.password.length < 1)  e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setApiError(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), password: form.password }),
      });
      const data: ApiResponse = await res.json();
      if (!res.ok) {
        if (data.errors?.length) {
          const fe: FieldErrors = {};
          data.errors.forEach(({ field, message }) => { fe[field] = message; });
          setErrors(fe);
        } else { setApiError(data.message ?? 'Login failed.'); }
        return;
      }
      if (remember) localStorage.setItem('remember_email', form.email.trim().toLowerCase());
      setSuccess(true);
      await login(data.data!.accessToken, data.data!.refreshToken);
    } catch {
      setApiError('Unable to reach the server. Please check your connection.');
    } finally { setLoading(false); }
  };

  if (success && !authLoading) {
    return (
      <AuthLayout>
        <div className="bg-[#111111] border-2 border-black shadow-[6px_6px_0px_#FFFFFF] p-6 text-center">
          <div className="w-12 h-12 bg-[#1A1A1A] border border-[#262626] flex items-center justify-center mx-auto mb-4 text-[#F97316]">
            <Check size={24} strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-extrabold text-[#FFFFFF] mb-2 tracking-tight">Welcome back!</h2>
          <p className="text-xs text-[#A1A1AA] mb-6">You're signed in. Redirecting...</p>
          <div className="w-full h-1 bg-[#050505] overflow-hidden border border-[#262626]">
            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="h-full bg-[#F97316]" />
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="bg-[#111111] border-2 border-black shadow-[6px_6px_0px_#FFFFFF] p-6 sm:p-7">
        <div className="mb-5 pb-3 border-b border-[#262626] text-center">
          <h2 className="text-xl font-extrabold text-[#FFFFFF] tracking-tight mb-1">
            Welcome Back
          </h2>
          <p className="text-xs text-[#A1A1AA]">
            Sign in to continue to your workspace.
          </p>
        </div>

        <AnimatePresence>
          {apiError && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 p-3 bg-[#050505] border border-red-500 text-xs text-red-500 mb-4 font-mono">
              <AlertCircle size={15} className="shrink-0" /> {apiError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Social Logins */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => { window.location.href = `${API_URL}/auth/google`; }}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#050505] border border-[#262626] hover:border-[#F97316] text-xs font-bold text-[#FFFFFF] transition-colors cursor-pointer w-full"
          >
            <svg width="15" height="15" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={() => { window.location.href = `${API_URL}/auth/github`; }}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#050505] border border-[#262626] hover:border-[#F97316] text-xs font-bold text-[#FFFFFF] transition-colors cursor-pointer w-full"
          >
            <FaGithub size={15} />
            <span>GitHub</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[#262626]" />
          <span className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-wider">OR CONTINUE WITH</span>
          <div className="flex-1 h-px bg-[#262626]" />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <Field id="login-email" icon={Mail} label="Email Address" type="email" value={form.email} onChange={set('email')} placeholder="alex@company.com" error={errors.email} />
          
          <Field id="login-password" icon={Lock} label="Password" type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="••••••••" error={errors.password}
            right={<button type="button" onClick={() => setShowPw(v => !v)} className="bg-transparent border-none cursor-pointer text-[#A1A1AA] hover:text-[#FFFFFF] flex p-0">{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>} />

          <div className="flex items-center justify-between mb-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(v => !v)}
                className="accent-[#F97316] w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-[#A1A1AA]">Remember me</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="orange"
            size="default"
            disabled={loading}
            className="w-full justify-center gap-2 py-3"
          >
            {loading ? (
              <><Loader size={15} className="animate-spin" /> <span>Signing In...</span></>
            ) : (
              <><span>Sign In</span> <ArrowRight size={15} /></>
            )}
          </Button>
        </form>

        <div className="mt-5 pt-4 border-t border-[#262626] text-center text-xs text-[#A1A1AA]">
          Don't have an account?{' '}
          <button onClick={() => navigate('/signup')} className="bg-transparent border-none cursor-pointer text-[#F97316] font-bold hover:underline p-0">
            Create one
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
