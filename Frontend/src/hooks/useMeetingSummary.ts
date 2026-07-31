import { useQuery } from '@tanstack/react-query';
import { meetingService } from '../services/meeting.service';

export function useMeetingSummary(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meeting-summary', meetingId],
    queryFn: () => {
      if (!meetingId) throw new Error('meetingId is required');
      return meetingService.getSummary(meetingId);
    },
    enabled: !!meetingId,
  });
}
