import { z } from 'zod';

export const createTeamSchema = z.object({
  name:             z.string().min(2).max(100),
  description:      z.string().max(500).optional(),
  color:            z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  timezone:         z.string().default('UTC'),
  working_days:     z.array(z.number().int().min(0).max(6)).default([1,2,3,4,5]),
  daily_scrum_time: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
  invite_emails:    z.array(z.string().email()).default([]),
});

export const inviteMembersSchema = z.object({
  team_id: z.string().uuid(),
  emails:  z.array(z.string().email()).min(1).max(20),
});

export const joinTeamSchema = z.object({
  token: z.string().min(1),
});
