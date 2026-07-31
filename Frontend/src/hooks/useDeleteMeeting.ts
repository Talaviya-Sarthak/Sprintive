import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingService } from '../services/meeting.service';

export function useDeleteMeeting(teamId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => meetingService.deleteMeeting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', teamId] });
    },
  });
}
