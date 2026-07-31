import { useQuery } from '@tanstack/react-query';
import { meetingService } from '../services/meeting.service';

export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: () => {
      if (!teamId) throw new Error('teamId is required');
      return meetingService.getTeamMembers(teamId);
    },
    enabled: !!teamId,
    select: (data) => (data || []).map((m: any) => ({ user_id: m.user_id || m.id, full_name: m.full_name })),
  });
}
