import api from './api';
import type { User } from '../types';

export interface ProfileData extends User {
  owned_teams: import('../types').Team[];
  joined_teams: import('../types').Team[];
  stats: { ownedCount: number; joinedCount: number };
}

export const profileService = {
  async getProfile(): Promise<ProfileData> {
    const { data } = await api.get('/profile');
    return data.data;
  },

  async updateProfile(payload: Partial<User> & { avatar?: File; remove_avatar?: boolean }): Promise<User> {
    const form = new FormData();
    const fields: (keyof User)[] = ['full_name','phone','company','designation','bio','country','timezone'];
    fields.forEach((k) => {
      if (payload[k] != null) form.append(k, String(payload[k]));
    });
    if (payload.avatar) form.append('avatar', payload.avatar);
    if (payload.remove_avatar) form.append('remove_avatar', 'true');
    const { data } = await api.patch('/profile', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.data;
  },
};
