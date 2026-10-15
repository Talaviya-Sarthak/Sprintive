import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  Camera,
  MapPin,
  Building2,
  Briefcase,
  Globe,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Users,
} from 'lucide-react';
import { profileService } from '../services/profile.service';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../layouts/AppLayout';
import { AppPageLoader } from '../components/app-ui';
import { getAvatarUrl } from '../lib/utils';
import type { Team, User } from '../types';

interface ProfileFormData extends Partial<User> {
  avatar?: File;
  remove_avatar?: boolean;
}

export default function Profile() {
  const { refreshUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [profile, setProfile] = useState<
    (User & { owned_teams: Team[]; joined_teams: Team[]; stats: any }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    phone: '',
    company: '',
    designation: '',
    bio: '',
    country: '',
    timezone: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await profileService.getProfile();
        setProfile(data);
        setForm({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || '',
          company: data.company || '',
          designation: data.designation || '',
          bio: data.bio || '',
          country: data.country || '',
          timezone: data.timezone || '',
        });
        if (data.avatar_url) setAvatarPreview(getAvatarUrl(data.avatar_url));
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm(f => ({ ...f, avatar: file }));
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await profileService.updateProfile(form);
      await refreshUser();
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update profile'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <AppPageLoader label="Loading engineer profile..." />
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="p-8 text-center" style={{ color: 'var(--app-text-primary)' }}>Profile data unavailable</div>
      </AppLayout>
    );
  }

  const initials =
    profile.full_name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U';
  const ownedTeamCount = profile.owned_teams?.length ?? 0;
  const joinedTeamCount = profile.joined_teams?.length ?? 0;

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between pb-6 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight" style={{ color: 'var(--app-text-primary)' }}>Account Profile</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--app-text-secondary)' }}>
              Personal credentials and workspace preferences
            </p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--app-text-primary)', color: 'var(--app-bg)' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Edit Profile
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--app-surface-card)'}
            >
              Cancel
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <CheckCircle size={14} />
            {success}
          </div>
        )}

        {/* Identity Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="border rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 shadow-sm"
          style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}
        >
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden shadow-md" style={{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}>
              {avatarPreview ? (
                <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
              ) : (
                initials
              )}
            </div>
            {isEditing && (
              <label
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer transition-opacity"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
              >
                <Camera size={18} style={{ color: 'var(--app-text-primary)' }} />
              </label>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            {isEditing && avatarPreview && (
              <button
                type="button"
                onClick={() => {
                  setAvatarPreview(null);
                  setForm(f => ({ ...f, avatar: undefined, remove_avatar: true }));
                }}
                className="mt-1 text-[10px] text-rose-500 hover:text-rose-400 font-medium block text-center w-full underline cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--app-text-primary)' }}>{profile.full_name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold" style={{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}>
                MEMBER
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--app-text-secondary)' }}>{profile.email}</p>

            <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--app-border-subtle)', color: 'var(--app-text-secondary)' }}>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} style={{ color: 'var(--app-text-primary)' }} /> Authenticated
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={13} /> {ownedTeamCount + joinedTeamCount} Workspaces
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} /> Joined{' '}
                {new Date(profile.created_at || Date.now()).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="border rounded-2xl p-6 space-y-5 shadow-sm"
          style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}
        >
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--app-text-muted)' }}>
            Profile Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-mono font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={form.full_name || ''}
                  onChange={e => handleInputChange('full_name', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--app-border-focus)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--app-border)'}
                />
              ) : (
                <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>{profile.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>Email</label>
              <p className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>{profile.email}</p>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium mb-1.5 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                <Briefcase size={12} /> Company
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={form.company || ''}
                  onChange={e => handleInputChange('company', e.target.value)}
                  placeholder="Company name"
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--app-border-focus)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--app-border)'}
                />
              ) : (
                <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>{profile.company || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono font-medium mb-1.5 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                <Building2 size={12} /> Role / Designation
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={form.designation || ''}
                  onChange={e => handleInputChange('designation', e.target.value)}
                  placeholder="e.g. Lead Engineer"
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--app-border-focus)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--app-border)'}
                />
              ) : (
                <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>{profile.designation || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono font-medium mb-1.5 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                <MapPin size={12} /> Country
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={form.country || ''}
                  onChange={e => handleInputChange('country', e.target.value)}
                  placeholder="Country"
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--app-border-focus)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--app-border)'}
                />
              ) : (
                <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>{profile.country || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono font-medium mb-1.5 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                <Globe size={12} /> Timezone
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={form.timezone || ''}
                  onChange={e => handleInputChange('timezone', e.target.value)}
                  placeholder="e.g. UTC"
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--app-border-focus)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--app-border)'}
                />
              ) : (
                <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>{profile.timezone || '-'}</p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t" style={{ borderColor: 'var(--app-border-subtle)' }}>
            <label className="block text-xs font-mono font-medium mb-1.5 uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>Bio</label>
            {isEditing ? (
              <textarea
                value={form.bio || ''}
                onChange={e => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about your background"
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-xs outline-none resize-none"
                style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--app-border-focus)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--app-border)'}
              />
            ) : (
              <p className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>{profile.bio || 'No bio provided.'}</p>
            )}
          </div>

          {isEditing && (
            <div className="flex justify-end pt-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--app-text-primary)', color: 'var(--app-bg)' }}
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--app-bg)', borderTopColor: 'var(--app-text-primary)' }} />
                ) : (
                  <Save size={14} />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}

