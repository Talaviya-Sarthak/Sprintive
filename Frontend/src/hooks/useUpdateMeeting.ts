import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingService } from '../services/meeting.service';
import type { CreateMeetingPayload } from '../types';

export function useUpdateMeeting(teamId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateMeetingPayload> }) =>
      meetingService.updateMeeting(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', teamId] });
      queryClient.invalidateQueries({ queryKey: ['meeting', variables.id] });
    },
  });
}
