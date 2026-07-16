import { useState, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Check, X, Zap, AlertCircle, Loader } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import AuthLayout from '../components/AuthLayout';
import type { LucideIcon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

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
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-h)', marginBottom: 7, letterSpacing: '-0.01em' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused ? 'var(--primary)' : 'var(--text-muted)', transition: 'color 0.2s', pointerEvents: 'none' }}>
          <Icon size={15} strokeWidth={1.8} />
        </div>
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '11px 40px 11px 38px',
            background: 'var(--surface2)', border: `1px solid ${error ? '#EF4444' : focused ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 10, fontSize: 14, color: 'var(--text-h)', fontFamily: 'var(--font)',
            outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: focused ? (error ? '0 0 0 3px rgba(239,68,68,0.12)' : '0 0 0 3px rgba(59,130,246,0.12)') : 'none',
          }}
        />
        {right && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>{right}</div>}
      </div>
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -4, height: 0 }} transition={{ duration: 0.2 }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12, color: '#EF4444', fontWeight: 500 }}>
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
    <motion.button whileHover={{ y: -1, boxShadow: 'var(--shadow-md)' }} whileTap={{ scale: 0.98 }} onClick={onClick}
      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'var(--text-h)', fontFamily: 'var(--font)', transition: 'all 0.2s ease' }}>
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

const GithubLogo = () => <FaGithub size={16} style={{ color: 'var(--text-h)' }} />;

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
      const res = await fetch(`${API_URL}/api/auth/signup`, {
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
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Check size={28} color="#10B981" strokeWidth={2.5} />
          </motion.div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-h)', marginBottom: 10, letterSpacing: '-0.02em' }}>Account created!</h2>
          <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 28 }}>Welcome to ScrumMind. Your workspace is ready.</p>
          <button onClick={() => navigate('/login')} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            Continue to Login
          </button>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-h)', letterSpacing: '-0.025em', marginBottom: 8 }}>
          Create your ScrumMind account
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
          Start managing your team's work smarter with AI.
        </p>
      </div>

      <AnimatePresence>
        {apiError && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, marginBottom: 18, fontSize: 13, color: '#EF4444', fontWeight: 500 }}>
            <AlertCircle size={14} /> {apiError}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} noValidate>
        <Field icon={User} label="Full Name" value={form.name} onChange={set('name')} placeholder="Alex Johnson" error={errors.name} />
        <Field icon={Mail} label="Work Email" type="email" value={form.email} onChange={set('email')} placeholder="alex@company.com" error={errors.email} />

        <Field icon={Lock} label="Password" type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Create a strong password" error={errors.password}
          right={
            <button type="button" onClick={() => setShowPw(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />

        {form.password && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: -8, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= score ? strengthColor[score] : 'var(--border)', transition: 'background 0.3s' }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: strengthColor[score], fontWeight: 600 }}>{strengthLabel[score]}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {rules.map(r => {
                const ok = r.test(form.password);
                return (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: ok ? '#10B981' : 'var(--text-muted)' }}>
                    {ok ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={2.5} />}
                    {r.label}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <Field icon={Lock} label="Confirm Password" type={showConfirm ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} placeholder="Repeat your password" error={errors.confirm}
          right={
            <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <div onClick={() => setAgreed(v => !v)} style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${errors.agreed ? '#EF4444' : agreed ? 'var(--primary)' : 'var(--border2)'}`, background: agreed ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.2s', cursor: 'pointer' }}>
              {agreed && <Check size={11} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
              I agree to the{' '}
              <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</a>
              {' '}and{' '}
              <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
            </span>
          </label>
          <AnimatePresence>
            {errors.agreed && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12, color: '#EF4444', fontWeight: 500 }}>
                <AlertCircle size={12} /> {errors.agreed}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button type="submit" whileHover={!loading ? { scale: 1.01 } : {}} whileTap={!loading ? { scale: 0.99 } : {}}
          disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', letterSpacing: '-0.01em', boxShadow: '0 4px 16px rgba(59,130,246,0.35)', transition: 'all 0.2s', opacity: loading ? 0.8 : 1 }}>
          {loading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating account…</> : <><Zap size={15} /> Create Account</>}
        </motion.button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>or continue with</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <OAuthBtn logo={<GoogleLogo />} label="Google" onClick={() => { window.location.href = `${API_URL}/api/auth/google`; }} />
        <OAuthBtn logo={<GithubLogo />} label="GitHub" onClick={() => { window.location.href = `${API_URL}/api/auth/github`; }} />
      </div>

      <p style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 700, fontSize: 13.5, fontFamily: 'var(--font)', padding: 0 }}>
          Login
        </button>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthLayout>
  );
}
