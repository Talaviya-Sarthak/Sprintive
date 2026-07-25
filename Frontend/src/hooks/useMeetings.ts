import { useQuery } from '@tanstack/react-query';
import { meetingService, type MeetingFilters } from '../services/meeting.service';

export function useMeetings(teamId: string | undefined, filters: MeetingFilters = {}) {
  return useQuery({
    queryKey: ['meetings', teamId, filters],
    queryFn: () => {
      if (!teamId) throw new Error('teamId is required');
      return meetingService.getTeamMeetings(teamId, filters);
    },
    enabled: !!teamId,
    select: (data) => {
      const all = data || [];
      return {
        all,
        upcoming: all.filter((m: any) => m.status === 'scheduled'),
        ongoing: all.filter((m: any) => m.status === 'active'),
        completed: all.filter((m: any) => m.status === 'ended' || m.status === 'cancelled'),
      };
    },
  });
}
