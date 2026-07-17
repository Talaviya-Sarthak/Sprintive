export interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
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
  member_count?: number;
  created_at: string;
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
  member_count?: number;
  expires_at: string;
}

export interface Meeting {
  id: string;
  team_id: string;
  team_name?: string;
  title: string;
  sprint_name?: string;
  host_id: string;
  host_name?: string;
  host_avatar?: string;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
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
  role: 'host' | 'participant';
  joined_at: string;
  socketId?: string;
  // live state
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

export interface CreateMeetingPayload {
  team_id: string;
  title: string;
  sprint_name?: string;
}
