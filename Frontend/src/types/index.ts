export interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
  company?: string;
  designation?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  plan?: 'free' | 'pro';
  email_verified?: boolean;
  auth_provider?: string;
  created_at?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  color: string;
  timezone: string;
  working_days: number[];
  daily_scrum_time: string;
  created_by: string;
  creator_name?: string;
  creator_avatar?: string;
  member_count?: number | string;
  my_role?: TeamMemberRole;
  created_at: string;
}

export type TeamMemberRole = 'scrum_master' | 'developer' | 'product_owner' | 'observer';

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  joined_at: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

export interface Invitation {
  id: string;
  team_id: string;
  team_name?: string;
  team_avatar?: string;
  team_color?: string;
  invited_by?: string;
  inviter_name?: string;
  email?: string;
  token: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  member_count?: number | string;
  expires_at: string;
  created_at?: string;
}

export interface DashboardData {
  owned_teams:  Team[];
  joined_teams: Team[];
  plan: 'free' | 'pro';
  limits: { maxOwnedTeams: number; maxJoinedTeams: number };
}


export type MeetingStatus = 'scheduled' | 'active' | 'ended' | 'cancelled';
export type MeetingType = 'daily_scrum' | 'sprint_planning' | 'review' | 'retrospective' | 'custom';

export interface Meeting {
  id: string;
  team_id: string;
  team_name?: string;
  title: string;
  description?: string;
  sprint_name?: string;
  meeting_type: MeetingType;
  host_id: string;
  host_name?: string;
  host_avatar?: string;
  status: MeetingStatus;
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  duration_minutes: number;
  agenda?: string[];
  participant_count: number;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface Participant {
  id: string;
  meeting_id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
  role: 'host' | 'participant' | 'co-host';
  joined_at: string;
  socketId?: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isSpeaking?: boolean;
  stream?: MediaStream;
}

export interface ChatMessage {
  id: string;
  meeting_id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  message: string;
  created_at: string;
}

export interface Recording {
  id: string;
  meeting_id: string;
  recording_url?: string;
  duration?: number;
  status: 'processing' | 'ready' | 'failed';
  started_at: string;
  ended_at?: string;
}

export interface Transcript {
  id: string;
  meeting_id: string;
  content: string;
  created_at: string;
}

export interface CreateTeamPayload {
  name: string;
  description?: string;
  color: string;
  timezone: string;
  working_days: number[];
  daily_scrum_time: string;
  invite_emails: string[];
  avatar?: File;
}

export interface MeetingAgendaItem {
  id: string;
  text: string;
  duration_minutes?: number;
}

export interface MeetingParticipant {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
  role: 'host' | 'co-host' | 'participant';
  joined_at?: string;
  is_muted?: boolean;
  is_camera_off?: boolean;
  is_speaking?: boolean;
}

export interface MeetingSummary {
  id: string;
  meeting_id: string;
  duration_minutes: number;
  attendance_count: number;
  total_participants: number;
  transcript: string;
  ai_summary: string;
  action_items: { id: string; text: string; assignee?: string; status: 'pending' | 'done' }[];
  tickets_generated: { id: string; title: string; status: string }[];
  created_at: string;
}

export interface CreateMeetingPayload {
  team_id: string;
  title: string;
  sprint_name?: string;
  description?: string;
  meeting_type?: MeetingType;
  date?: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
  participant_ids?: string[];
  agenda?: string[];
}
