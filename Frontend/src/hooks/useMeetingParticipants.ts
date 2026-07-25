import { useQuery } from '@tanstack/react-query';
import { meetingService } from '../services/meeting.service';

export function useMeetingParticipants(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meeting-participants', meetingId],
    queryFn: () => {
      if (!meetingId) throw new Error('meetingId is required');
      return meetingService.getParticipants(meetingId);
    },
    enabled: !!meetingId,
  });
}
