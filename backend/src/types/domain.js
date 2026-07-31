// Shared domain types

export const TeamMemberRole = {
  SCRUM_MASTER: 'scrum_master',
  DEVELOPER: 'developer',
  PRODUCT_OWNER: 'product_owner',
  OBSERVER: 'observer',
};

export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

export const MeetingStatus = {
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
};

export const MeetingType = {
  DAILY_SCRUM: 'daily_scrum',
  SPRINT_PLANNING: 'sprint_planning',
  REVIEW: 'review',
  RETROSPECTIVE: 'retrospective',
  CUSTOM: 'custom',
};

export const ParticipantRole = {
  HOST: 'host',
  PARTICIPANT: 'participant',
  CO_HOST: 'co-host',
};

export const AttendanceStatus = {
  PENDING: 'pending',
  JOINED: 'joined',
  ABSENT: 'absent',
  EXCUSED: 'excused',
};

export const RecordingStatus = {
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
};
