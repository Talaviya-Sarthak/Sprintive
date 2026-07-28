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
import type { Team, User } from '../types';

interface ProfileFormData extends Partial<User> {
  avatar?: File;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
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
        if (data.avatar_url) setAvatarPreview(data.avatar_url);
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
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-[#F97316]/30 border-t-[#F97316] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-[#F8FAFC]">Profile data unavailable</div>
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
      <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#1E202C]">
          <div>
            <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Account Profile</h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Personal credentials and workspace preferences
            </p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-sm shadow-[#F97316]/20 transition-all cursor-pointer"
            >
              Edit Profile
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="px-3.5 py-1.5 rounded-lg bg-[#181B28] hover:bg-[#1E2232] border border-[#232636] text-[#CBD5E1] text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <CheckCircle size={14} />
            {success}
          </div>
        )}

        {/* Identity Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#12141D] border border-[#232636] rounded-xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 shadow-sm"
        >
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-md">
              {avatarPreview ? (
                <img src={avatarPreview} className="w-full h-full object-cover" alt="" />
              ) : (
                initials
              )}
            </div>
            {isEditing && (
              <label
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center cursor-pointer transition-opacity"
              >
                <Camera size={18} className="text-white" />
              </label>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg font-bold text-[#F8FAFC]">{profile.full_name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#F97316]/10 border border-[#F97316]/25 text-[#F97316] text-[10px] font-mono font-semibold">
                MEMBER
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">{profile.email}</p>

            <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-[#1C1F2E] text-xs text-[#94A3B8]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-[#F97316]" /> Authenticated
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
          className="bg-[#12141D] border border-[#232636] rounded-xl p-5 space-y-4 shadow-sm"
        >
          <h3 className="text-xs font-mono font-semibold text-[#F8FAFC] uppercase tracking-wider mb-2">
            Profile Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={form.full_name || ''}
                  onChange={e => handleInputChange('full_name', e.target.value)}
                  className="w-full bg-[#090A0F] border border-[#232636] rounded-lg px-3 py-1.5 text-xs text-[#F8FAFC] outline-none focus:border-[#F97316]"
                />
              ) : (
                <p className="text-xs text-[#F8FAFC] font-medium">{profile.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">Email</label>
              <p className="text-xs text-[#64748B]">{profile.email}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1 flex items-center gap-1">
                <Briefcase size={12} /> Company
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={form.company || ''}
                  onChange={e => handleInputChange('company', e.target.value)}
                  placeholder="Company name"
                  className="w-full bg-[#090A0F] border border-[#232636] rounded-lg px-3 py-1.5 text-xs text-[#F8FAFC] outline-none focus:border-[#F97316]"
                />
              ) : (
                <p className="text-xs text-[#F8FAFC] font-medium">{profile.company || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1 flex items-center gap-1">
                <Building2 size={12} /> Role / Designation
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={form.designation || ''}
                  onChange={e => handleInputChange('designation', e.target.value)}
                  placeholder="e.g. Lead Engineer"
                  className="w-full bg-[#090A0F] border border-[#232636] rounded-lg px-3 py-1.5 text-xs text-[#F8FAFC] outline-none focus:border-[#F97316]"
                />
              ) : (
                <p className="text-xs text-[#F8FAFC] font-medium">{profile.designation || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1 flex items-center gap-1">
                <MapPin size={12} /> Country
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={form.country || ''}
                  onChange={e => handleInputChange('country', e.target.value)}
                  placeholder="Country"
                  className="w-full bg-[#090A0F] border border-[#232636] rounded-lg px-3 py-1.5 text-xs text-[#F8FAFC] outline-none focus:border-[#F97316]"
                />
              ) : (
                <p className="text-xs text-[#F8FAFC] font-medium">{profile.country || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1 flex items-center gap-1">
                <Globe size={12} /> Timezone
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={form.timezone || ''}
                  onChange={e => handleInputChange('timezone', e.target.value)}
                  placeholder="e.g. UTC"
                  className="w-full bg-[#090A0F] border border-[#232636] rounded-lg px-3 py-1.5 text-xs text-[#F8FAFC] outline-none focus:border-[#F97316]"
                />
              ) : (
                <p className="text-xs text-[#F8FAFC] font-medium">{profile.timezone || '-'}</p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[#1C1F2E]">
            <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">Bio</label>
            {isEditing ? (
              <textarea
                value={form.bio || ''}
                onChange={e => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about your background"
                rows={3}
                className="w-full bg-[#090A0F] border border-[#232636] rounded-lg px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-[#F97316] resize-none"
              />
            ) : (
              <p className="text-xs text-[#94A3B8]">{profile.bio || 'No bio provided.'}</p>
            )}
          </div>

          {isEditing && (
            <div className="flex justify-end pt-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold transition-all shadow-sm shadow-[#F97316]/20 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

