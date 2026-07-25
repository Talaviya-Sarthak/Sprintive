import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingService } from '../services/meeting.service';

export function useMeetingMessages(meetingId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['meeting-messages', meetingId],
    queryFn: () => {
      if (!meetingId) throw new Error('meetingId is required');
      return meetingService.getChats(meetingId);
    },
    enabled: !!meetingId,
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) => {
      if (!meetingId) throw new Error('meetingId is required');
      return meetingService.sendMessage(meetingId, message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-messages', meetingId] });
    },
  });

  return { ...query, sendMessage: sendMutation.mutate, isSending: sendMutation.isPending };
}
