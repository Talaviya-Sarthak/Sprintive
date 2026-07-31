import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingService } from '../services/meeting.service';
import type { CreateMeetingPayload } from '../types';

export function useCreateMeeting(teamId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMeetingPayload) => meetingService.createMeeting(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', teamId] });
    },
  });
}
