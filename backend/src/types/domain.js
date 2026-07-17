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

export const RecordingStatus = {
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
};
