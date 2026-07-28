import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Check, Clock, Globe, Save } from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import type { Team } from '../../types';

const DAYS = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

const PRESET_COLORS = [
  '#F97316',
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#06B6D4',
  '#6366F1',
];

export default function TeamSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#F97316');
  const [timezone, setTimezone] = useState('UTC');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dailyScrumTime, setDailyScrumTime] = useState('09:00');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!id) return;
    teamService
      .getTeam(id)
      .then(t => {
        if (t.created_by !== user?.id) {
          navigate(`/teams/${id}`);
          return;
        }
        setTeam(t);
        setName(t.name);
        setDescription(t.description ?? '');
        setColor(t.color ?? '#F97316');
        setTimezone(t.timezone ?? 'UTC');
        setWorkingDays((t.working_days as number[]) ?? [1, 2, 3, 4, 5]);
        setDailyScrumTime(t.daily_scrum_time ?? '09:00');
        setAvatarUrl(t.avatar_url ?? '');
      })
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const url = await teamService.uploadAvatar(id, file);
      setAvatarUrl(url);
      await refreshUser();
    } catch {
      setError('Avatar upload failed');
    } finally {
      setUploading(false);
    }
  };

  const toggleDay = (dayId: number) => {
    setWorkingDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId].sort()
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !id) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await teamService.updateTeam(id, {
        name: name.trim(),
        description: description.trim(),
        color,
        timezone,
        working_days: workingDays,
        daily_scrum_time: dailyScrumTime,
      });
      setTeam(updated);
      await refreshUser();
      setSuccess('Team settings updated successfully!');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update settings'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <AppLayout teamId={id}>
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-[#F97316]/30 border-t-[#F97316] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );

  return (
    <AppLayout teamId={id}>
      <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
        <div className="pb-4 border-b border-[#1E202C]">
          <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Team Settings</h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Configure workspace brand color, avatar, daily scrum time, and timezone.
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            {error}
          </p>
        )}
        {success && (
          <p className="text-emerald-400 text-xs bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
            <Check size={14} /> {success}
          </p>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Upload */}
          <div className="bg-[#12141D] border border-[#232636] rounded-xl p-5 flex items-center gap-5">
            <div className="relative group shrink-0">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-sm"
                style={{ background: avatarUrl ? 'transparent' : color }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  (name[0] ?? 'T').toUpperCase()
                )}
              </div>
              <label className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera size={18} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#F8FAFC]">Team Avatar</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Upload a square logo for your Scrum workspace. PNG or JPG up to 5MB.
              </p>
              {uploading && <p className="text-[#F97316] text-[11px] mt-1 font-medium">Uploading avatar…</p>}
            </div>
          </div>

          {/* Name & Description */}
          <div className="bg-[#12141D] border border-[#232636] rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">Team Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-[#090A0F] border border-[#232636] rounded-lg px-3.5 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#F97316] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="What does this team build?"
                className="w-full bg-[#090A0F] border border-[#232636] rounded-lg px-3.5 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#F97316] transition-colors resize-none"
              />
            </div>

            {/* Brand Color */}
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-2">Accent Brand Color</label>
              <div className="flex items-center gap-2.5">
                {PRESET_COLORS.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-xs"
                    style={{ background: c }}
                  >
                    {color === c && <Check size={14} className="text-white drop-shadow-sm" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scrum Settings */}
          <div className="bg-[#12141D] border border-[#232636] rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-mono font-semibold text-[#F8FAFC] uppercase tracking-wider mb-2">
              Agile Scrum Schedule
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5 flex items-center gap-1.5">
                  <Globe size={13} className="text-[#F97316]" /> Timezone
                </label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full bg-[#090A0F] border border-[#232636] rounded-lg px-3 py-2 text-xs text-[#CBD5E1] outline-none focus:border-[#F97316] transition-colors cursor-pointer"
                >
                  {[
                    'UTC',
                    'America/New_York',
                    'America/Chicago',
                    'America/Los_Angeles',
                    'Europe/London',
                    'Asia/Kolkata',
                    'Asia/Tokyo',
                  ].map(tz => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5 flex items-center gap-1.5">
                  <Clock size={13} className="text-[#F97316]" /> Daily Scrum Time
                </label>
                <input
                  type="time"
                  value={dailyScrumTime}
                  onChange={e => setDailyScrumTime(e.target.value)}
                  className="w-full bg-[#090A0F] border border-[#232636] rounded-lg px-3 py-1.5 text-xs text-[#F8FAFC] outline-none focus:border-[#F97316] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-2">Working Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => {
                  const active = workingDays.includes(day.id);
                  return (
                    <button
                      type="button"
                      key={day.id}
                      onClick={() => toggleDay(day.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-[#F97316] text-white shadow-xs'
                          : 'bg-[#090A0F] border border-[#232636] text-[#64748B] hover:text-[#CBD5E1]'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 text-white font-semibold text-xs transition-all shadow-sm shadow-[#F97316]/20 cursor-pointer"
            >
              {saving ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
