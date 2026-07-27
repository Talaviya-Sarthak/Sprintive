import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { teamService } from '../../services/team.service';

const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];
const COLORS    = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316'];
const DAYS      = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CreateTeam() {
  const navigate = useNavigate();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [step, setStep]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [avatarPreview, setPreview] = useState<string | null>(null);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [inviteInput, setInviteInput] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied]       = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    timezone: 'UTC',
    working_days: [1, 2, 3, 4, 5] as number[],
    daily_scrum_time: '09:00',
    invite_emails: [] as string[],
    avatar: undefined as File | undefined,
  });

  const set = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set('avatar', file);
    setPreview(URL.createObjectURL(file));
  };

  const addEmail = () => {
    const email = inviteInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (form.invite_emails.includes(email)) return;
    set('invite_emails', [...form.invite_emails, email]);
    setInviteInput('');
  };

  const removeEmail = (email: string) => set('invite_emails', form.invite_emails.filter((e) => e !== email));

  const toggleDay = (d: number) => {
    const days = form.working_days.includes(d)
      ? form.working_days.filter((x) => x !== d)
      : [...form.working_days, d].sort();
    set('working_days', days);
  };

  const handleSubmit = async () => {
    const trimmed = form.name.trim();
    if (!trimmed) { setError('Team name is required'); return; }
    if (trimmed.length < 3) { setError('Team name must be at least 3 characters'); return; }
    if (trimmed.length > 50) { setError('Team name must be at most 50 characters'); return; }
    setLoading(true);
    setError('');
    try {
      // If team was already created (e.g. user generated invite link first), just navigate
      if (createdTeamId) { navigate(`/teams/${createdTeamId}`); return; }
      const { team } = await teamService.createTeam({ ...form, name: trimmed });
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
      // Create the team first if it hasn't been created yet
      if (!teamId) {
        const trimmed = form.name.trim();
        if (!trimmed) { setError('Team name is required'); return; }
        if (trimmed.length < 3) { setError('Team name must be at least 3 characters'); return; }
        if (trimmed.length > 50) { setError('Team name must be at most 50 characters'); return; }
        setLoading(true);
        const { team } = await teamService.createTeam({ ...form, name: trimmed });
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
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[#3B82F6] text-xs font-semibold mb-4">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            New Team
          </div>
          <h1 className="text-3xl font-bold text-[#F8FAFC] tracking-tight">Create your Scrum team</h1>
          <p className="text-[#94A3B8] mt-2 text-sm">Set up your workspace and invite your team members</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => s < step && setStep(s)}
                className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                  s === step ? 'bg-[#3B82F6] text-white' : s < step ? 'bg-[#3B82F6]/30 text-[#3B82F6] cursor-pointer' : 'bg-white/6 text-[#475569]'
                }`}
              >{s}</button>
              {s < 3 && <div className={`w-12 h-px ${s < step ? 'bg-[#3B82F6]/40' : 'bg-white/8'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-[#111827] border border-white/8 rounded-2xl p-8">
          <AnimatePresence mode="wait">
            {/* ── Step 1: Basic Info ── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-lg font-semibold text-[#F8FAFC]">Team Details</h2>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <button onClick={() => fileRef.current?.click()} className="relative group">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold overflow-hidden border-2 border-dashed border-white/20 group-hover:border-[#3B82F6] transition-colors"
                      style={{ background: avatarPreview ? 'transparent' : form.color }}
                    >
                      {avatarPreview
                        ? <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
                        : form.name ? form.name[0].toUpperCase() : '?'}
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3"/></svg>
                    </div>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <div>
                    <p className="text-sm text-[#F8FAFC] font-medium">Team Avatar</p>
                    <p className="text-xs text-[#475569] mt-0.5">Optional · PNG, JPG up to 2MB</p>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Team Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="e.g. Phoenix Squad"
                    className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] text-sm outline-none focus:border-[#3B82F6] transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="What does this team work on?"
                    rows={3}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] text-sm outline-none focus:border-[#3B82F6] transition-colors resize-none"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-3">Team Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => set('color', c)}
                        className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111827] scale-110' : ''}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>

                <button onClick={() => { const t = form.name.trim(); if (!t) { setError('Team name is required'); return; } if (t.length < 3) { setError('Team name must be at least 3 characters'); return; } setError(''); setStep(2); }} className="w-full py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm transition-colors">
                  Continue →
                </button>
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              </motion.div>
            )}

            {/* ── Step 2: Settings ── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-lg font-semibold text-[#F8FAFC]">Team Settings</h2>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Timezone</label>
                  <select
                    value={form.timezone}
                    onChange={(e) => set('timezone', e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-[#F8FAFC] text-sm outline-none focus:border-[#3B82F6] transition-colors"
                  >
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>

                {/* Working Days */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-3">Working Days</label>
                  <div className="flex gap-2">
                    {DAYS.map((d, i) => (
                      <button
                        key={d}
                        onClick={() => toggleDay(i)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                          form.working_days.includes(i)
                            ? 'bg-[#3B82F6] text-white'
                            : 'bg-white/6 text-[#475569] hover:bg-white/10'
                        }`}
                      >{d}</button>
                    ))}
                  </div>
                </div>

                {/* Daily Scrum Time */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Default Daily Scrum Time</label>
                  <input
                    type="time"
                    value={form.daily_scrum_time}
                    onChange={(e) => set('daily_scrum_time', e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-[#F8FAFC] text-sm outline-none focus:border-[#3B82F6] transition-colors"
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl bg-white/6 hover:bg-white/10 text-[#CBD5E1] font-semibold text-sm transition-colors">← Back</button>
                  <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm transition-colors">Continue →</button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Invite ── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-lg font-semibold text-[#F8FAFC]">Invite Members</h2>

                {/* Email invite */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Invite by Email</label>
                  <div className="flex gap-2">
                    <input
                      value={inviteInput}
                      onChange={(e) => setInviteInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                      placeholder="colleague@company.com"
                      className="flex-1 bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] text-sm outline-none focus:border-[#3B82F6] transition-colors"
                    />
                    <button onClick={addEmail} className="px-4 py-3 rounded-xl bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 text-[#3B82F6] text-sm font-semibold transition-colors">Add</button>
                  </div>
                  {form.invite_emails.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {form.invite_emails.map((email) => (
                        <span key={email} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[#3B82F6] text-xs">
                          {email}
                          <button onClick={() => removeEmail(email)} className="hover:text-white transition-colors">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invite link */}
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Invitation Link</label>
                  {generatedLink ? (
                    <div className="flex gap-2">
                      <input readOnly value={generatedLink} className="flex-1 bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-[#94A3B8] text-xs outline-none" />
                      <button onClick={copyLink} className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${copied ? 'bg-green-500/15 text-green-400' : 'bg-white/6 hover:bg-white/10 text-[#CBD5E1]'}`}>
                        {copied ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleGenerateLink} className="w-full py-3 rounded-xl bg-white/6 hover:bg-white/10 text-[#CBD5E1] text-sm font-semibold transition-colors border border-dashed border-white/15">
                      Generate Invitation Link
                    </button>
                  )}
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl bg-white/6 hover:bg-white/10 text-[#CBD5E1] font-semibold text-sm transition-colors">← Back</button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</> : 'Create Team 🚀'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
