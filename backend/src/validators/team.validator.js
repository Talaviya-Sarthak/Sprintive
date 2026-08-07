import { z } from 'zod';

const jsonArray = z.union([
  z.array(z.unknown()),
  z.string().transform((s) => { try { return JSON.parse(s); } catch { return []; } }),
]).pipe(z.array(z.unknown()));

export const createTeamSchema = z.object({
  name:             z.string().trim().min(3, 'Team name must be at least 3 characters').max(50, 'Team name must be at most 50 characters'),
  description:      z.string().max(500).optional(),
  color:            z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  timezone:         z.string().default('UTC'),
  working_days:     jsonArray.pipe(z.array(z.coerce.number().int().min(0).max(6))).default([1,2,3,4,5]),
  daily_scrum_time: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
  invite_emails:    jsonArray.pipe(z.array(z.string().email())).default([]),
});

export const updateTeamSchema = z.object({
  name:             z.string().trim().min(3).max(50).optional(),
  description:      z.string().max(500).optional().nullable(),
  color:            z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  timezone:         z.string().optional(),
  working_days:     jsonArray.pipe(z.array(z.coerce.number().int().min(0).max(6))).optional(),
  daily_scrum_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export const inviteMembersSchema = z.object({
  team_id: z.string().uuid(),
  emails:  z.array(z.string().email()).min(1).max(20),
});

export const inviteUsersSchema = z.object({
  team_id: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1).max(50),
});

export const joinTeamSchema = z.object({
  token: z.string().min(1),
});
