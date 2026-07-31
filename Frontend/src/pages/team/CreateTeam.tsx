import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Copy, Check, ArrowRight, Plus } from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { AppButton, AppInput, AppSelect } from '../../components/app-ui';

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
  'Europe/Paris', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'
];

const COLORS = [
  '#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4', '#6366F1'
];

const DAYS = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

export default function CreateTeam() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { refreshUser } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatarPreview, setPreview] = useState<string | null>(null);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [inviteInput, setInviteInput] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#F97316',
    timezone: 'UTC',
    working_days: [1, 2, 3, 4, 5] as number[],
    daily_scrum_time: '09:00',
    invite_emails: [] as string[],
    avatar: undefined as File | undefined,
  });

  const setField = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setField('avatar', file);
    setPreview(URL.createObjectURL(file));
  };

  const addEmail = () => {
    const email = inviteInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (form.invite_emails.includes(email)) return;
    setField('invite_emails', [...form.invite_emails, email]);
    setInviteInput('');
  };

  const removeEmail = (email: string) =>
    setField('invite_emails', form.invite_emails.filter(e => e !== email));

  const toggleDay = (d: number) => {
    const days = form.working_days.includes(d)
      ? form.working_days.filter(x => x !== d)
      : [...form.working_days, d].sort();
    setField('working_days', days);
  };

  const handleSubmit = async () => {
    const trimmed = form.name.trim();
    if (!trimmed) {
      setError('Team name is required');
      return;
    }
    if (trimmed.length < 3) {
      setError('Team name must be at least 3 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (createdTeamId) {
        await refreshUser();
        navigate(`/teams/${createdTeamId}`);
        return;
      }
      const { team } = await teamService.createTeam({ ...form, name: trimmed });
      await refreshUser();
      setCreatedTeamId(team.id);
      navigate(`/teams/${team.id}`);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setError(errData?.message ?? 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setError('');
    try {
      let teamId = createdTeamId;
      if (!teamId) {
        const trimmed = form.name.trim();
        if (!trimmed) {
          setError('Team name is required');
          return;
        }
        setLoading(true);
        const { team } = await teamService.createTeam({ ...form, name: trimmed });
        await refreshUser();
        teamId = team.id;
        setCreatedTeamId(teamId);
        setLoading(false);
      }
      const { link } = await teamService.generateInviteLink(teamId);
      setGeneratedLink(link);
    } catch (err: unknown) {
      setLoading(false);
      const errData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setError(errData?.message ?? 'Failed to generate invite link');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1c1c21] border border-[#27272a] text-[#f4f4f5] text-xs font-mono font-medium">
            <Users size={13} /> WORKSPACE ONBOARDING
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#f4f4f5] tracking-tight">
            Create Agile Scrum Team
          </h1>
          <p className="text-[#a1a1aa] text-xs max-w-md mx-auto">
            Setup your workspace, configure daily standup preferences, and invite engineers.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 py-2">
          {[
            { num: 1, label: 'Team Details' },
            { num: 2, label: 'Sprint Settings' },
            { num: 3, label: 'Invite Members' },
          ].map(s => (
            <div key={s.num} className="flex items-center gap-2">
              <button
                onClick={() => s.num < step && setStep(s.num)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  s.num === step
                    ? 'bg-[#1c1c21] text-[#f4f4f5] border border-[#27272a] shadow-xs'
                    : s.num < step
                    ? 'bg-[#141417] text-[#a1a1aa] border border-[#27272a] cursor-pointer'
                    : 'bg-[#141417] text-[#71717a] border border-[#1f1f23]'
                }`}
              >
                <span>{s.num}.</span>
                <span>{s.label}</span>
              </button>
              {s.num < 3 && <div className="w-4 h-px bg-[#27272a]" />}
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-[#141417] border border-[#27272a] rounded-2xl p-6 shadow-sm">
          <AnimatePresence mode="wait">
            {/* Step 1: Details */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-4 pb-4 border-b border-[#1f1f23]">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="relative group shrink-0"
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-[#f4f4f5] text-xl font-bold border border-dashed border-[#27272a] group-hover:border-[#3f3f46] transition-colors overflow-hidden bg-[#1c1c21]"
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        form.name ? form.name[0].toUpperCase() : 'T'
                      )}
                    </div>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <div>
                    <h2 className="text-sm font-semibold text-[#f4f4f5]">Team Avatar & Identity</h2>
                    <p className="text-xs text-[#71717a] mt-0.5">Click box to upload PNG/JPG avatar.</p>
                  </div>
                </div>

                <AppInput
                  label="Team Name *"
                  placeholder="e.g. Core Platform Team"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                />

                <AppInput
                  label="Description"
                  placeholder="e.g. Responsible for backend APIs and auth microservices"
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                />

                <div>
                  <label className="block text-xs font-semibold text-[#71717a] mb-2 uppercase tracking-wider font-mono">
                    Workspace Color Badge
                  </label>
                  <div className="flex gap-2.5 flex-wrap">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setField('color', c)}
                        className={`w-7 h-7 rounded-lg transition-transform ${
                          form.color === c ? 'ring-2 ring-[#f4f4f5] ring-offset-2 ring-offset-[#141417] scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>

                {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

                <AppButton
                  variant="mono"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => {
                    const t = form.name.trim();
                    if (!t) {
                      setError('Team name is required');
                      return;
                    }
                    if (t.length < 3) {
                      setError('Team name must be at least 3 characters');
                      return;
                    }
                    setError('');
                    setStep(2);
                  }}
                >
                  <span>Continue to Settings</span>
                  <ArrowRight size={14} className="ml-1.5" />
                </AppButton>
              </motion.div>
            )}

            {/* Step 2: Settings */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-5"
              >
                <AppSelect
                  label="Default Timezone"
                  value={form.timezone}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setField('timezone', e.target.value)}
                  options={TIMEZONES.map(tz => ({ value: tz, label: tz }))}
                />

                <div>
                  <label className="block text-xs font-semibold text-[#71717a] mb-2 uppercase tracking-wider font-mono">
                    Working Days
                  </label>
                  <div className="flex gap-2">
                    {DAYS.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDay(d.id)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                          form.working_days.includes(d.id)
                            ? 'bg-[#1c1c21] text-[#f4f4f5] border border-[#27272a]'
                            : 'bg-[#18181b] text-[#71717a] hover:text-[#f4f4f5]'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <AppInput
                  label="Daily Scrum Time"
                  type="time"
                  value={form.daily_scrum_time}
                  onChange={e => setField('daily_scrum_time', e.target.value)}
                />

                <div className="flex gap-3 pt-2">
                  <AppButton variant="mono-outline" size="sm" className="flex-1 justify-center" onClick={() => setStep(1)}>
                    Back
                  </AppButton>
                  <AppButton variant="mono" size="sm" className="flex-1 justify-center" onClick={() => setStep(3)}>
                    <span>Continue to Invites</span>
                    <ArrowRight size={14} className="ml-1.5" />
                  </AppButton>
                </div>
              </motion.div>
            )}

            {/* Step 3: Invites */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-semibold text-[#71717a] mb-2 uppercase tracking-wider font-mono">
                    Invite Teammates by Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={inviteInput}
                      onChange={e => setInviteInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                      placeholder="engineer@company.com"
                      className="flex-1 bg-[#141417] border border-[#27272a] rounded-lg px-3.5 py-2 text-xs text-[#f4f4f5] placeholder-[#71717a] outline-none focus:border-[#3f3f46]"
                    />
                    <AppButton variant="mono-outline" size="xs" onClick={addEmail}>
                      <Plus size={13} className="mr-1" /> Add
                    </AppButton>
                  </div>
                  {form.invite_emails.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {form.invite_emails.map(email => (
                        <span
                          key={email}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c1c21] border border-[#27272a] text-[#f4f4f5] text-xs font-mono"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => removeEmail(email)}
                            className="hover:text-white transition-colors ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#1f1f23]">
                  <label className="block text-xs font-semibold text-[#71717a] mb-2 uppercase tracking-wider font-mono">
                    Shareable Invitation Link
                  </label>
                  {generatedLink ? (
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={generatedLink}
                        className="flex-1 bg-[#141417] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-[#a1a1aa] outline-none font-mono"
                      />
                      <AppButton variant="mono-outline" size="xs" onClick={copyLink}>
                        {copied ? <Check size={13} className="mr-1 text-emerald-400" /> : <Copy size={13} className="mr-1" />}
                        {copied ? 'Copied' : 'Copy'}
                      </AppButton>
                    </div>
                  ) : (
                    <AppButton variant="mono-ghost" size="xs" className="w-full border border-dashed border-[#27272a] justify-center" onClick={handleGenerateLink}>
                      Generate Workspace Invitation Link
                    </AppButton>
                  )}
                </div>

                {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <AppButton variant="mono-outline" size="sm" className="flex-1 justify-center" onClick={() => setStep(2)}>
                    Back
                  </AppButton>
                  <AppButton variant="mono" size="sm" className="flex-1 justify-center" loading={loading} onClick={handleSubmit}>
                    Complete Workspace Setup 🚀
                  </AppButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}
