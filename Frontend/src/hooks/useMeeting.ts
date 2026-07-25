import { useQuery } from '@tanstack/react-query';
import { meetingService } from '../services/meeting.service';

export function useMeeting(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => {
      if (!meetingId) throw new Error('meetingId is required');
      return meetingService.getMeeting(meetingId);
    },
    enabled: !!meetingId,
  });
}
