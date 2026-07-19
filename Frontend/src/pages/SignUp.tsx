import { useState, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Check, X, Zap, AlertCircle, Loader } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import AuthLayout from '../components/AuthLayout';
import type { LucideIcon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

interface SignUpForm {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

interface FieldErrors {
  [key: string]: string | undefined;
}

interface ApiErrorItem {
  field: string;
  message: string;
}

interface ApiResponse {
  message?: string;
  errors?: ApiErrorItem[];
  data?: {
    accessToken: string;
    refreshToken: string;
  };
}

interface PasswordRule {
  label: string;
  test: (v: string) => boolean;
}

const rules: PasswordRule[] = [
  { label: 'Minimum 8 characters', test: v => v.length >= 8 },
  { label: 'Uppercase letter',     test: v => /[A-Z]/.test(v) },
  { label: 'Lowercase letter',     test: v => /[a-z]/.test(v) },
  { label: 'Number',               test: v => /\d/.test(v) },
  { label: 'Special character',    test: v => /[^A-Za-z0-9]/.test(v) },
];

function strengthScore(pw: string): number { return rules.filter(r => r.test(pw)).length; }
const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const strengthColor = ['', '#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'];

interface FieldProps {
  icon: LucideIcon;
  label: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  right?: React.ReactNode;
}

function Field({ icon: Icon, label, type = 'text', value, onChange, error, placeholder, right }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="mb-4">
      <label className="block text-[13px] font-semibold text-[var(--color-text-h)] mb-[7px] tracking-[-0.01em]">{label}</label>
      <div className="relative">
        <div className={`absolute left-[13px] top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${focused ? 'text-[#3B82F6]' : 'text-[var(--color-text-muted)]'}`}>
          <Icon size={15} strokeWidth={1.8} />
        </div>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={[
            'w-full py-[11px] pl-[38px] pr-10 bg-[var(--color-surface2)] rounded-[10px] text-sm text-[var(--color-text-h)] outline-none transition-all duration-200',
            error
              ? 'border border-[#EF4444] shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
              : focused
              ? 'border border-[#3B82F6] shadow-[0_0_0_3px_rgba(59,130,246,0.12)]'
              : 'border border-[var(--color-border)]',
          ].join(' ')}
        />
        {right && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-[5px] mt-1.5 text-xs text-[#EF4444] font-medium"
          >
            <AlertCircle size={12} /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface OAuthBtnProps {
  logo: React.ReactNode;
  label: string;
  onClick: () => void;
}

function OAuthBtn({ logo, label, onClick }: OAuthBtnProps) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-[9px] py-2.5 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] cursor-pointer text-[13.5px] font-semibold text-[var(--color-text-h)] transition-all duration-200 hover:border-[var(--color-border2)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
    >
      {logo}
      {label}
    </motion.button>
  );
}

const GoogleLogo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const GithubLogo = () => <FaGithub size={16} className="text-[var(--color-text-h)]" />;

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignUpForm>({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const score = strengthScore(form.password);
  const set = (k: keyof SignUpForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!form.name.trim())                e.name     = 'Full name is required';
    if (!form.email.includes('@'))        e.email    = 'Enter a valid work email';
    if (score < 3)                        e.password = 'Password is too weak';
    if (form.password !== form.confirm)   e.confirm  = 'Passwords do not match';
    if (!agreed)                          e.agreed   = 'You must agree to continue';
    return e;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setApiError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:        form.name.trim(),
          email:            form.email.trim().toLowerCase(),
          password:         form.password,
          confirm_password: form.confirm,
        }),
      });

      const data: ApiResponse = await res.json();

      if (!res.ok) {
        if (data.errors?.length) {
          const fieldErrs: FieldErrors = {};
          data.errors.forEach(({ field, message }) => { fieldErrs[field] = message; });
          setErrors(fieldErrs);
        } else {
          setApiError(data.message ?? 'Signup failed. Please try again.');
        }
        return;
      }

      localStorage.setItem('access_token',  data.data!.accessToken);
      localStorage.setItem('refresh_token', data.data!.refreshToken);
      setSuccess(true);
    } catch {
      setApiError('Unable to reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.3)] flex items-center justify-center mx-auto mb-6"
          >
            <Check size={28} color="#10B981" strokeWidth={2.5} />
          </motion.div>
          <h2 className="text-2xl font-extrabold text-[var(--color-text-h)] mb-2.5 tracking-[-0.02em]">Account created!</h2>
          <p className="text-sm text-[var(--color-text-body)] mb-7">Welcome to ScrumMind. Your workspace is ready.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#3B82F6] text-white font-bold text-[15px] rounded-[10px] border-none cursor-pointer hover:bg-[#2563EB] transition-colors"
          >
            Continue to Login
          </button>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-7">
        <h1 className="text-[26px] font-extrabold text-[var(--color-text-h)] tracking-[-0.025em] mb-2">
          Create your ScrumMind account
        </h1>
        <p className="text-sm text-[var(--color-text-body)] leading-[1.6]">
          Start managing your team's work smarter with AI.
        </p>
      </div>

      <AnimatePresence>
        {apiError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-[10px] mb-[18px] text-[13px] text-[#EF4444] font-medium"
          >
            <AlertCircle size={14} /> {apiError}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} noValidate>
        <Field icon={User} label="Full Name" value={form.name} onChange={set('name')} placeholder="Alex Johnson" error={errors.name} />
        <Field icon={Mail} label="Work Email" type="email" value={form.email} onChange={set('email')} placeholder="alex@company.com" error={errors.email} />

        <Field
          icon={Lock}
          label="Password"
          type={showPw ? 'text' : 'password'}
          value={form.password}
          onChange={set('password')}
          placeholder="Create a strong password"
          error={errors.password}
          right={
            <button type="button" onClick={() => setShowPw(v => !v)} className="bg-transparent border-none cursor-pointer text-[var(--color-text-muted)] flex p-0">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />

        {form.password && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="-mt-2 mb-3.5">
            <div className="flex gap-1 mb-1.5">
              {[1,2,3,4,5].map(i => (
                <div
                  key={i}
                  className="flex-1 h-[3px] rounded-full transition-all duration-300"
                  style={{ background: i <= score ? strengthColor[score] : 'var(--color-border)' }}
                />
              ))}
            </div>
            <div className="text-[11px] font-semibold" style={{ color: strengthColor[score] }}>{strengthLabel[score]}</div>
            <div className="flex flex-col gap-1 mt-2">
              {rules.map(r => {
                const ok = r.test(form.password);
                return (
                  <div key={r.label} className={`flex items-center gap-1.5 text-[11px] ${ok ? 'text-[#10B981]' : 'text-[var(--color-text-muted)]'}`}>
                    {ok ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={2.5} />}
                    {r.label}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <Field
          icon={Lock}
          label="Confirm Password"
          type={showConfirm ? 'text' : 'password'}
          value={form.confirm}
          onChange={set('confirm')}
          placeholder="Repeat your password"
          error={errors.confirm}
          right={
            <button type="button" onClick={() => setShowConfirm(v => !v)} className="bg-transparent border-none cursor-pointer text-[var(--color-text-muted)] flex p-0">
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />

        <div className="mb-5">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <div
              onClick={() => setAgreed(v => !v)}
              className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0 mt-px transition-all duration-200 cursor-pointer ${
                errors.agreed ? 'border-[1.5px] border-[#EF4444]' :
                agreed ? 'bg-[#3B82F6] border-[1.5px] border-[#3B82F6]' :
                'bg-transparent border-[1.5px] border-[var(--color-border2)]'
              }`}
            >
              {agreed && <Check size={11} color="#fff" strokeWidth={3} />}
            </div>
            <span className="text-[13px] text-[var(--color-text-body)] leading-[1.5]">
              I agree to the{' '}
              <a href="#" className="text-[#3B82F6] no-underline font-semibold">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-[#3B82F6] no-underline font-semibold">Privacy Policy</a>
            </span>
          </label>
          <AnimatePresence>
            {errors.agreed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-[5px] mt-1.5 text-xs text-[#EF4444] font-medium"
              >
                <AlertCircle size={12} /> {errors.agreed}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          type="submit"
          whileHover={!loading ? { scale: 1.01 } : {}}
          whileTap={!loading ? { scale: 0.99 } : {}}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 py-3 bg-[#3B82F6] text-white border-none rounded-[10px] text-[15px] font-bold cursor-pointer tracking-[-0.01em] shadow-[0_4px_16px_rgba(59,130,246,0.35)] transition-all duration-200 ${loading ? 'opacity-80 cursor-not-allowed' : 'hover:bg-[#2563EB]'}`}
        >
          {loading ? <><Loader size={16} className="animate-spin" /> Creating account…</> : <><Zap size={15} /> Create Account</>}
        </motion.button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-[11px] text-[var(--color-text-muted)] font-semibold tracking-[0.06em] uppercase">or continue with</span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      <div className="flex gap-2.5 mb-6">
        <OAuthBtn logo={<GoogleLogo />} label="Google" onClick={() => { window.location.href = `${API_URL}/auth/google`; }} />
        <OAuthBtn logo={<GithubLogo />} label="GitHub" onClick={() => { window.location.href = `${API_URL}/auth/github`; }} />
      </div>

      <p className="text-center text-[13.5px] text-[var(--color-text-muted)]">
        Already have an account?{' '}
        <button
          onClick={() => navigate('/login')}
          className="bg-transparent border-none cursor-pointer text-[#3B82F6] font-bold text-[13.5px] p-0"
        >
          Login
        </button>
      </p>
    </AuthLayout>
  );
}
