import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, Camera, MapPin, Building2, Briefcase, MessageSquare, Globe, Clock, AlertCircle, CheckCircle } from 'lucide-react';
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

  const [profile, setProfile] = useState<User & { owned_teams: Team[]; joined_teams: Team[]; stats: any } | null>(null);
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="p-6 md:p-8">
          <div className="text-center text-[#F8FAFC]">Profile not found</div>
        </div>
      </AppLayout>
    );
  }

  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U';
  const ownedTeamCount = profile.owned_teams?.length ?? 0;
  const joinedTeamCount = profile.joined_teams?.length ?? 0;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#F8FAFC]">Profile</h1>
              <p className="text-[#94A3B8] text-sm mt-1">Manage your personal information</p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-semibold transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]">
              <CheckCircle size={18} />
              {success}
            </div>
          )}

          {/* Avatar Section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#111827] border border-white/8 rounded-2xl p-6"
          >
            <div className="flex items-center gap-6">
              <div className="relative">
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white overflow-hidden"
                  style={{ background: avatarPreview ? 'transparent' : '#3B82F6' }}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                {isEditing && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white transition-colors"
                  >
                    <Camera size={16} />
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-[#F8FAFC]">{profile.full_name}</h2>
                <p className="text-[#94A3B8]">{profile.email}</p>
                <p className="text-xs text-[#475569] mt-2">
                  Member since {new Date(profile.created_at || '').toLocaleDateString()}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Personal Information */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#111827] border border-white/8 rounded-2xl p-6 space-y-6"
          >
            <div>
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-2">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={form.full_name || ''}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-white/10 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]/50"
                    />
                  ) : (
                    <p className="text-[#F8FAFC]">{profile.full_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-2">Email</label>
                  <p className="text-[#F8FAFC]">{profile.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-2 flex items-center gap-2">
                    <Briefcase size={14} /> Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={form.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter phone number"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-white/10 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]/50"
                    />
                  ) : (
                    <p className="text-[#F8FAFC]">{profile.phone || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-2 flex items-center gap-2">
                    <Building2 size={14} /> Company
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={form.company || ''}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      placeholder="Enter company name"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-white/10 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]/50"
                    />
                  ) : (
                    <p className="text-[#F8FAFC]">{profile.company || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-2 flex items-center gap-2">
                    <Briefcase size={14} /> Designation
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={form.designation || ''}
                      onChange={(e) => handleInputChange('designation', e.target.value)}
                      placeholder="Enter designation"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-white/10 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]/50"
                    />
                  ) : (
                    <p className="text-[#F8FAFC]">{profile.designation || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-2 flex items-center gap-2">
                    <MapPin size={14} /> Country
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={form.country || ''}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="Enter country"
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-white/10 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]/50"
                    />
                  ) : (
                    <p className="text-[#F8FAFC]">{profile.country || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94A3B8] mb-2 flex items-center gap-2">
                    <Clock size={14} /> Timezone
                  </label>
                  {isEditing ? (
                    <select
                      value={form.timezone || ''}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-white/10 text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6]/50"
                    >
                      <option value="">Select timezone</option>
                      {['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'].map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[#F8FAFC]">{profile.timezone || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-white/8 pt-6">
              <label className="block text-sm font-medium text-[#94A3B8] mb-2 flex items-center gap-2">
                <MessageSquare size={14} /> Bio
              </label>
              {isEditing ? (
                <textarea
                  value={form.bio || ''}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself"
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B1220] border border-white/10 text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]/50"
                />
              ) : (
                <p className="text-[#F8FAFC]">{profile.bio || '-'}</p>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4 border-t border-white/8">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold disabled:opacity-50 transition-colors"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </motion.div>

          {/* Team Information */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#111827] border border-white/8 rounded-2xl p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold text-[#F8FAFC]">Team Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0B1220] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#3B82F6]">{ownedTeamCount}</div>
                <p className="text-xs text-[#94A3B8] mt-1">Teams Owned</p>
              </div>
              <div className="bg-[#0B1220] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#10B981]">{joinedTeamCount}</div>
                <p className="text-xs text-[#94A3B8] mt-1">Teams Joined</p>
              </div>
              <div className="bg-[#0B1220] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#8B5CF6]">{profile.plan === 'pro' ? 'Pro' : 'Free'}</div>
                <p className="text-xs text-[#94A3B8] mt-1">Plan</p>
              </div>
              <div className="bg-[#0B1220] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#F59E0B]">{ownedTeamCount}/2</div>
                <p className="text-xs text-[#94A3B8] mt-1">Owned Limit</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
