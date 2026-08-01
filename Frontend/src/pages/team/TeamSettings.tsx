import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Save, ArrowLeft } from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { AppButton, AppInput } from '../../components/app-ui';
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
  '#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4', '#6366F1'
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
      setSuccess('Workspace settings saved successfully');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout teamId={id}>
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-[#27272a] border-t-[#f4f4f5] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout teamId={id}>
      <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
        <button
          onClick={() => navigate(`/teams/${id}`)}
          className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Team
        </button>

        <div className="pb-6 border-b border-[#1f1f23]">
          <h1 className="text-xl md:text-2xl font-semibold text-[#f4f4f5] tracking-tight">
            Workspace Settings {team ? `— ${team.name}` : ''}
          </h1>
          <p className="text-[#a1a1aa] text-xs mt-1">
            Configure team avatar, daily scrum schedules, and workspace parameters.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-[#141417] border border-[#27272a] rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-[#1f1f23]">
            <div className="relative group shrink-0">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-[#f4f4f5] text-xl font-bold border border-[#27272a] overflow-hidden bg-[#1c1c21]"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  name[0]?.toUpperCase() ?? 'T'
                )}
              </div>
              <label className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera size={16} className="text-[#f4f4f5]" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#f4f4f5]">Team Avatar</p>
              <p className="text-[10px] text-[#71717a] mt-0.5">
                {uploading ? 'Uploading avatar...' : 'Hover avatar box to upload custom image.'}
              </p>
            </div>
          </div>

          <AppInput label="Team Name *" value={name} onChange={e => setName(e.target.value)} />
          <AppInput label="Description" value={description} onChange={e => setDescription(e.target.value)} />

          <div>
            <label className="block text-xs font-semibold text-[#71717a] mb-2 uppercase tracking-wider font-mono">
              Badge Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg transition-transform ${
                    color === c ? 'ring-2 ring-[#f4f4f5] ring-offset-2 ring-offset-[#141417] scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <AppInput label="Daily Scrum Time" type="time" value={dailyScrumTime} onChange={e => setDailyScrumTime(e.target.value)} />

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
                    workingDays.includes(d.id)
                      ? 'bg-[#1c1c21] text-[#f4f4f5] border border-[#27272a]'
                      : 'bg-[#18181b] text-[#71717a] border border-transparent'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
          {success && <p className="text-xs text-emerald-400 font-medium">{success}</p>}

          <div className="flex justify-end pt-4 border-t border-[#1f1f23]">
            <AppButton variant="mono" size="sm" type="submit" loading={saving}>
              <Save size={14} className="mr-1.5" /> Save Settings
            </AppButton>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
