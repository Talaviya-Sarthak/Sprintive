import { z } from 'zod';

const isValidIANATimezone = (tz) => {
  if (!tz) return true;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const timezoneSchema = z
  .string()
  .max(60)
  .refine(isValidIANATimezone, {
    message: 'Invalid IANA timezone identifier (e.g. Asia/Kolkata, America/New_York, UTC)',
  })
  .optional();

export const createMeetingSchema = z.object({
  team_id:          z.string().uuid(),
  title:            z.string().min(2).max(200),
  description:      z.string().max(1000).optional(),
  sprint_name:      z.string().max(100).optional(),
  meeting_type:     z.enum(['daily_scrum', 'sprint_planning', 'review', 'retrospective', 'custom']).optional().default('daily_scrum'),
  date:             z.string().optional(),
  start_time:       z.string().optional(),
  end_time:         z.string().optional(),
  timezone:         timezoneSchema,
  duration_minutes: z.number().int().positive().optional(),
  agenda:           z.array(z.string()).optional(),
  participant_ids:  z.array(z.string().uuid()).optional(),
});

export const updateMeetingSchema = z.object({
  title:            z.string().min(2).max(200).optional(),
  description:      z.string().max(1000).optional(),
  sprint_name:      z.string().max(100).optional(),
  meeting_type:     z.enum(['daily_scrum', 'sprint_planning', 'review', 'retrospective', 'custom']).optional(),
  date:             z.string().optional(),
  start_time:       z.string().optional(),
  end_time:         z.string().optional(),
  timezone:         timezoneSchema,
  duration_minutes: z.number().int().positive().optional(),
  agenda:           z.array(z.string()).optional(),
});

export const joinMeetingSchema = z.object({
  meeting_id: z.string().uuid(),
});

export const sendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
});
