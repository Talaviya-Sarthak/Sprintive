import { z } from 'zod';

export const createMeetingSchema = z.object({
  team_id:     z.string().uuid(),
  title:       z.string().min(2).max(200),
  sprint_name: z.string().max(100).optional(),
});

export const joinMeetingSchema = z.object({
  meeting_id: z.string().uuid(),
});
