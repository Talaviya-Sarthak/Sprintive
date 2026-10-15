import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Camera,
  Save,
  ArrowLeft,
  Sun,
  Moon,
  Copy,
  Check,
  Sparkles,
  Bell,
  Sliders,
  Layers,
} from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AppLayout from '../../layouts/AppLayout';
import { AppButton, AppInput, AppSelect, AppPageLoader } from '../../components/app-ui';
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
  '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4', '#6366F1', '#14B8A6'
];

const TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const CADENCES = [
  { value: '1', label: '1 Week', desc: 'Fast cadence' },
  { value: '2', label: '2 Weeks', desc: 'Standard Scrum' },
  { value: '3', label: '3 Weeks', desc: 'Medium scope' },
  { value: '4', label: '4 Weeks', desc: 'Monthly sprint' },
];

export default function TeamSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [team, setTeam] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [timezone, setTimezone] = useState('UTC');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const getDefaultScrumTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const [dailyScrumTime, setDailyScrumTime] = useState(getDefaultScrumTime());
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Cadence & AI Workspace Preferences
  const [sprintCadence, setSprintCadence] = useState('2');
  const [autoGenTasks, setAutoGenTasks] = useState(true);
  const [autoSummarize, setAutoSummarize] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [liveCaptions, setLiveCaptions] = useState(true);

  // Notifications
  const [scrumReminder, setScrumReminder] = useState(true);
  const [summaryReadyAlert, setSummaryReadyAlert] = useState(true);
  const [taskAssignmentAlert, setTaskAssignmentAlert] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!id) return;

    // Load local workspace preferences if present
    const savedPrefs = localStorage.getItem(`sprintive_team_prefs_${id}`);
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.sprintCadence) setSprintCadence(parsed.sprintCadence);
        if (typeof parsed.autoGenTasks === 'boolean') setAutoGenTasks(parsed.autoGenTasks);
        if (typeof parsed.autoSummarize === 'boolean') setAutoSummarize(parsed.autoSummarize);
        if (typeof parsed.noiseSuppression === 'boolean') setNoiseSuppression(parsed.noiseSuppression);
        if (typeof parsed.liveCaptions === 'boolean') setLiveCaptions(parsed.liveCaptions);
        if (typeof parsed.scrumReminder === 'boolean') setScrumReminder(parsed.scrumReminder);
        if (typeof parsed.summaryReadyAlert === 'boolean') setSummaryReadyAlert(parsed.summaryReadyAlert);
        if (typeof parsed.taskAssignmentAlert === 'boolean') setTaskAssignmentAlert(parsed.taskAssignmentAlert);
      } catch {
        // ignore
      }
    }

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
        setColor(t.color ?? '#3B82F6');
        setTimezone(t.timezone ?? 'UTC');
        setWorkingDays((t.working_days as number[]) ?? [1, 2, 3, 4, 5]);
        setDailyScrumTime(t.daily_scrum_time ?? getDefaultScrumTime());
        setAvatarUrl(t.avatar_url ?? '');
      })
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

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

      // Save workspace intelligence preferences locally
      localStorage.setItem(
        `sprintive_team_prefs_${id}`,
        JSON.stringify({
          sprintCadence,
          autoGenTasks,
          autoSummarize,
          noiseSuppression,
          liveCaptions,
          scrumReminder,
          summaryReadyAlert,
          taskAssignmentAlert,
        })
      );

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
        <AppPageLoader label="Loading workspace settings..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout teamId={id}>
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
        <button
          onClick={() => navigate(`/teams/${id}`)}
          className="flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
          style={{ color: 'var(--app-text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--app-text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--app-text-secondary)'}
        >
          <ArrowLeft size={14} /> Back to Workspace
        </button>

        <div className="pb-6 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
            Workspace Settings {team ? `— ${team.name}` : ''}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--app-text-secondary)' }}>
            Configure team avatar, daily scrum schedules, AI intelligence parameters, and notifications.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: General Workspace Profile */}
          <div className="border rounded-2xl p-6 space-y-5" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}>
            <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
              <Layers size={16} className="text-blue-400" />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--app-text-primary)' }}>General Information</h2>
            </div>

            <div className="flex items-center gap-4">
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
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: 'var(--app-text-primary)' }}>Workspace Avatar</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text-muted)' }}>
                  {uploading ? 'Uploading avatar...' : 'Hover over avatar to upload a PNG or JPG logo.'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-mono" style={{ color: 'var(--app-text-muted)' }}>
                    ID: {id?.slice(0, 8)}...
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border cursor-pointer transition-colors"
                    style={{
                      backgroundColor: 'var(--app-surface-hover)',
                      borderColor: 'var(--app-border)',
                      color: copiedId ? '#10B981' : 'var(--app-text-secondary)',
                    }}
                  >
                    {copiedId ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AppInput label="Workspace Name *" value={name} onChange={e => setName(e.target.value)} />
              <AppInput label="Description" value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider font-mono" style={{ color: 'var(--app-text-muted)' }}>
                Workspace Accent Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-lg transition-transform cursor-pointer"
                    style={{
                      background: c,
                      transform: color === c ? 'scale(1.15)' : undefined,
                      boxShadow: color === c ? `0 0 0 2px var(--app-text-primary), 0 0 0 4px var(--app-surface-card)` : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Scrum & Sprint Cadence */}
          <div className="border rounded-2xl p-6 space-y-5" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}>
            <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
              <Sliders size={16} className="text-amber-400" />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--app-text-primary)' }}>Scrum & Cadence Schedule</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AppInput
                label="Daily Scrum Time"
                type="time"
                value={dailyScrumTime}
                onChange={e => setDailyScrumTime(e.target.value)}
              />
              <AppSelect
                label="Workspace Timezone"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                options={TIMEZONES.map(tz => ({ value: tz, label: tz }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider font-mono" style={{ color: 'var(--app-text-muted)' }}>
                Active Working Days
              </label>
              <div className="flex gap-2">
                {DAYS.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all border cursor-pointer"
                    style={{
                      backgroundColor: workingDays.includes(d.id) ? 'var(--app-surface-hover)' : 'transparent',
                      borderColor: workingDays.includes(d.id) ? 'var(--app-border-focus)' : 'var(--app-border)',
                      color: workingDays.includes(d.id) ? 'var(--app-text-primary)' : 'var(--app-text-muted)',
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider font-mono" style={{ color: 'var(--app-text-muted)' }}>
                Sprint Iteration Length
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {CADENCES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSprintCadence(c.value)}
                    className="p-3 rounded-xl border text-left transition-all cursor-pointer"
                    style={{
                      backgroundColor: sprintCadence === c.value ? 'var(--app-surface-hover)' : 'transparent',
                      borderColor: sprintCadence === c.value ? 'var(--app-border-focus)' : 'var(--app-border)',
                    }}
                  >
                    <p className="text-xs font-semibold" style={{ color: 'var(--app-text-primary)' }}>{c.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--app-text-muted)' }}>{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: AI Intelligence & Meeting Automations */}
          <div className="border rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}>
            <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
              <Sparkles size={16} className="text-sky-400" />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--app-text-primary)' }}>AI & Meeting Intelligence</h2>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>
                    Auto-generate Kanban Cards
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--app-text-muted)' }}>
                    Automatically extract action items and populate Kanban board after meetings.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoGenTasks}
                  onChange={e => setAutoGenTasks(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>
                    Instant AI Executive Summary
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--app-text-muted)' }}>
                    Generate structured key takeaways, decisions, and sprint risks upon session end.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSummarize}
                  onChange={e => setAutoSummarize(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>
                    Audio Noise Suppression
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--app-text-muted)' }}>
                    Filter background room noise for crystal clear speech-to-text recognition.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={noiseSuppression}
                  onChange={e => setNoiseSuppression(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>
                    Live Captions & Stream Sync
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--app-text-muted)' }}>
                    Display live speech captions in meeting rooms in real-time.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={liveCaptions}
                  onChange={e => setLiveCaptions(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Notifications & Alerts */}
          <div className="border rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}>
            <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
              <Bell size={16} className="text-emerald-400" />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--app-text-primary)' }}>Notifications & Alerts</h2>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>
                    Daily Scrum Email Alert
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--app-text-muted)' }}>
                    Receive a calendar notification 10 minutes prior to the scheduled daily standup.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={scrumReminder}
                  onChange={e => setScrumReminder(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>
                    Meeting Intelligence Ready
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--app-text-muted)' }}>
                    Alert teammates when the AI summary and transcript processing complete.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={summaryReadyAlert}
                  onChange={e => setSummaryReadyAlert(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>
                    Task Assignment Notifications
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--app-text-muted)' }}>
                    Notify assignees when new Kanban tickets are assigned to them.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={taskAssignmentAlert}
                  onChange={e => setTaskAssignmentAlert(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Appearance / Theme */}
          <div className="border rounded-2xl p-6" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--app-text-primary)' }}>Appearance</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--app-text-secondary)' }}>
              Choose your preferred visual theme for Sprintive.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => theme !== 'dark' && toggleTheme()}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-medium transition-all border cursor-pointer flex items-center justify-center gap-2"
                style={{
                  backgroundColor: theme === 'dark' ? 'var(--app-surface-hover)' : 'transparent',
                  borderColor: theme === 'dark' ? 'var(--app-border-focus)' : 'var(--app-border)',
                  color: theme === 'dark' ? 'var(--app-text-primary)' : 'var(--app-text-muted)',
                }}
              >
                <Moon size={16} />
                <span>Dark Mode</span>
              </button>
              <button
                type="button"
                onClick={() => theme !== 'light' && toggleTheme()}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-medium transition-all border cursor-pointer flex items-center justify-center gap-2"
                style={{
                  backgroundColor: theme === 'light' ? 'var(--app-surface-hover)' : 'transparent',
                  borderColor: theme === 'light' ? 'var(--app-border-focus)' : 'var(--app-border)',
                  color: theme === 'light' ? 'var(--app-text-primary)' : 'var(--app-text-muted)',
                }}
              >
                <Sun size={16} />
                <span>Light Mode</span>
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
          {success && <p className="text-xs text-emerald-400 font-medium">{success}</p>}

          <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--app-border-subtle)' }}>
            <AppButton variant="mono" size="sm" type="submit" loading={saving}>
              <Save size={14} className="mr-1.5" /> Save Workspace Settings
            </AppButton>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
