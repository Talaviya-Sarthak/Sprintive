import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Save, ArrowLeft, Sun, Moon } from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  const { theme, toggleTheme } = useTheme();

  const [team, setTeam] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#F97316');
  const [timezone, setTimezone] = useState('UTC');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const getDefaultScrumTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const [dailyScrumTime, setDailyScrumTime] = useState(getDefaultScrumTime());
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
        setDailyScrumTime(t.daily_scrum_time ?? getDefaultScrumTime());
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
          <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--app-border)', borderTopColor: 'var(--app-text-primary)' }} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout teamId={id}>
      <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
        <button
          onClick={() => navigate(`/teams/${id}`)}
          className="flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
          style={{ color: 'var(--app-text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--app-text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--app-text-secondary)'}
        >
          <ArrowLeft size={14} /> Back to Team
        </button>

        <div className="pb-6 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
            Workspace Settings {team ? `— ${team.name}` : ''}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--app-text-secondary)' }}>
            Configure team avatar, daily scrum schedules, and workspace parameters.
          </p>
        </div>

        {/* Appearance Section */}
        <div className="border rounded-2xl p-6" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--app-text-primary)' }}>Appearance</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--app-text-secondary)' }}>
            Choose how Sprintive looks.
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--app-surface-hover)' }}>
                {theme === 'dark' ? (
                  <Moon size={20} style={{ color: 'var(--app-text-primary)' }} />
                ) : (
                  <Sun size={20} style={{ color: 'var(--app-text-primary)' }} />
                )}
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>Theme</p>
                <p className="text-[10px]" style={{ color: 'var(--app-text-muted)' }}>
                  {theme === 'dark' ? 'Dark mode is active' : 'Light mode is active'}
                </p>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="relative w-12 h-6 rounded-full transition-colors cursor-pointer"
              style={{ backgroundColor: theme === 'dark' ? 'var(--app-border)' : 'var(--app-accent-orange)' }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full transition-transform shadow-sm"
                style={{
                  backgroundColor: 'var(--app-text-primary)',
                  transform: theme === 'dark' ? 'translateX(2px)' : 'translateX(26px)'
                }}
              />
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all border cursor-pointer"
              style={{
                backgroundColor: theme === 'dark' ? 'var(--app-surface-hover)' : 'transparent',
                borderColor: theme === 'dark' ? 'var(--app-border)' : 'transparent',
                color: theme === 'dark' ? 'var(--app-text-primary)' : 'var(--app-text-muted)'
              }}
            >
              <Moon size={14} className="inline mr-1.5" />
              Dark
            </button>
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all border cursor-pointer"
              style={{
                backgroundColor: theme === 'light' ? 'var(--app-surface-hover)' : 'transparent',
                borderColor: theme === 'light' ? 'var(--app-border)' : 'transparent',
                color: theme === 'light' ? 'var(--app-text-primary)' : 'var(--app-text-muted)'
              }}
            >
              <Sun size={14} className="inline mr-1.5" />
              Light
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="border rounded-2xl p-6 space-y-6" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}>
          <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
            <div className="relative group shrink-0">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold border overflow-hidden"
                style={{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  name[0]?.toUpperCase() ?? 'T'
                )}
              </div>
              <label className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
                <Camera size={16} style={{ color: 'var(--app-text-primary)' }} />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--app-text-primary)' }}>Team Avatar</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--app-text-muted)' }}>
                {uploading ? 'Uploading avatar...' : 'Hover avatar box to upload custom image.'}
              </p>
            </div>
          </div>

          <AppInput label="Team Name *" value={name} onChange={e => setName(e.target.value)} />
          <AppInput label="Description" value={description} onChange={e => setDescription(e.target.value)} />

          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider font-mono" style={{ color: 'var(--app-text-muted)' }}>
              Badge Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-lg transition-transform"
                  style={{
                    background: c,
                    transform: color === c ? 'scale(1.1)' : undefined,
                    boxShadow: color === c ? `0 0 0 2px var(--app-text-primary), 0 0 0 4px var(--app-surface-card)` : undefined
                  }}
                />
              ))}
            </div>
          </div>

          <AppInput label="Daily Scrum Time" type="time" value={dailyScrumTime} onChange={e => setDailyScrumTime(e.target.value)} />

          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider font-mono" style={{ color: 'var(--app-text-muted)' }}>
              Working Days
            </label>
            <div className="flex gap-2">
              {DAYS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all border"
                  style={{
                    backgroundColor: workingDays.includes(d.id) ? 'var(--app-surface-hover)' : 'transparent',
                    borderColor: workingDays.includes(d.id) ? 'var(--app-border)' : 'transparent',
                    color: workingDays.includes(d.id) ? 'var(--app-text-primary)' : 'var(--app-text-muted)'
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
          {success && <p className="text-xs text-emerald-400 font-medium">{success}</p>}

          <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--app-border-subtle)' }}>
            <AppButton variant="mono" size="sm" type="submit" loading={saving}>
              <Save size={14} className="mr-1.5" /> Save Settings
            </AppButton>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
