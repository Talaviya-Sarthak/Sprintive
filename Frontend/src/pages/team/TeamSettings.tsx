import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, ArrowLeft } from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import type { Team } from '../../types';

const TIMEZONES = ['UTC','America/New_York','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Dubai','Asia/Karachi','Asia/Kolkata','Asia/Tokyo','Australia/Sydney'];
const COLORS    = ['#3B82F6','#8B5CF6','#EC4899','#10B981','#F59E0B','#EF4444','#06B6D4','#F97316'];
const DAYS      = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function TeamSettings() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [team, setTeam]           = useState<Team | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [avatarPreview, setPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', description: '', color: '#3B82F6', timezone: 'UTC',
    working_days: [1,2,3,4,5] as number[], daily_scrum_time: '09:00',
    avatar: undefined as File | undefined,
  });

  useEffect(() => {
    if (!id) return;
    teamService.getTeam(id).then(t => {
      if (t.created_by !== user?.id) { navigate(`/teams/${id}`); return; }
      setTeam(t);
      setForm({
        name: t.name, description: t.description ?? '',
        color: t.color, timezone: t.timezone,
        working_days: t.working_days as number[],
        daily_scrum_time: t.daily_scrum_time,
        avatar: undefined,
      });
    }).catch(() => setError('Team not found.')).finally(() => setLoading(false));
  }, [id]);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleDay = (d: number) => {
    const days = form.working_days.includes(d)
      ? form.working_days.filter(x => x !== d)
      : [...form.working_days, d].sort();
    set('working_days', days);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Team name is required'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await teamService.updateTeam(id!, form);
      await refreshUser();
      setSuccess('Team settings saved.');
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save settings');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <AppLayout teamId={id}>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout teamId={id}>
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/teams/${id}`)} className="text-[#475569] hover:text-[#94A3B8] transition-colors"><ArrowLeft size={18} /></button>
          <h1 className="text-xl font-bold text-[#F8FAFC]">Team Settings</h1>
        </div>

        <div className="bg-[#111827] border border-white/8 rounded-2xl p-6 space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button onClick={() => fileRef.current?.click()} className="relative group">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold overflow-hidden border-2 border-dashed border-white/20 group-hover:border-[#3B82F6] transition-colors"
                style={{ background: avatarPreview ? 'transparent' : form.color }}>
                {avatarPreview
                  ? <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
                  : (team?.avatar_url ? <img src={team.avatar_url} className="w-full h-full object-cover" alt="" /> : form.name[0]?.toUpperCase() ?? '?')}
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              set('avatar', f); setPreview(URL.createObjectURL(f));
            }} />
            <div><p className="text-sm text-[#F8FAFC] font-medium">Team Avatar</p><p className="text-xs text-[#475569] mt-0.5">PNG, JPG up to 2MB</p></div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Team Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-[#F8FAFC] text-sm outline-none focus:border-[#3B82F6] transition-colors" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-[#F8FAFC] text-sm outline-none focus:border-[#3B82F6] transition-colors resize-none" />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-3">Team Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111827] scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Timezone</label>
            <select value={form.timezone} onChange={e => set('timezone', e.target.value)}
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-[#F8FAFC] text-sm outline-none focus:border-[#3B82F6] transition-colors">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          {/* Working Days */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-3">Working Days</label>
            <div className="flex gap-2">
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => toggleDay(i)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${form.working_days.includes(i) ? 'bg-[#3B82F6] text-white' : 'bg-white/6 text-[#475569] hover:bg-white/10'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Daily Scrum Time */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Daily Scrum Time</label>
            <input type="time" value={form.daily_scrum_time} onChange={e => set('daily_scrum_time', e.target.value)}
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-[#F8FAFC] text-sm outline-none focus:border-[#3B82F6] transition-colors" />
          </div>

          {error   && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-60 text-white font-semibold text-sm transition-colors">
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
