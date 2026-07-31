import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock } from 'lucide-react';
import { useMeeting } from '../../hooks/useMeeting';
import { useUpdateMeeting } from '../../hooks/useUpdateMeeting';
import { useDeleteMeeting } from '../../hooks/useDeleteMeeting';
import { useMeetingParticipants } from '../../hooks/useMeetingParticipants';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useToast } from '../../context/ToastContext';
import { MeetingStatusBadge, MeetingTypeBadge } from '../../components/ui/Badge';
import MeetingInfo, { getMeetingInfoItems } from '../../components/meeting/MeetingInfo';
import MeetingTimeline from '../../components/meeting/MeetingTimeline';
import MeetingParticipants from '../../components/meeting/MeetingParticipants';
import EditMeetingModal from '../../components/meeting/EditMeetingModal';
import DeleteMeetingDialog from '../../components/meeting/DeleteMeetingDialog';
import { MeetingDetailSkeleton } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import type { Meeting } from '../../types';

function formatDateFromNow(targetDate: string, targetTime: string) {
  if (!targetDate || !targetTime) return null;
  const [y, m, d] = targetDate.split('-').map(Number);
  const [h, min] = targetTime.split(':').map(Number);
  if ([y, m, d, h, min].some(Number.isNaN)) return null;
  const meetingTime = new Date(y, m - 1, d, h, min);
  const now = new Date();
  const diff = meetingTime.getTime() - now.getTime();

  if (diff <= 0) return null;

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return `${days}d ${hours}h until start`;
  if (hours > 0) return `${hours}h ${minutes}m until start`;
  return `${minutes}m until start`;
}

export default function MeetingDetailsPage() {
  const { meetingId, teamId } = useParams<{ meetingId: string; teamId?: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { data: meeting, isLoading, isError } = useMeeting(meetingId);
  const { data: participants = [] } = useMeetingParticipants(meetingId);
  const updateMutation = useUpdateMeeting(teamId);
  const deleteMutation = useDeleteMeeting(teamId);
  const { data: teamMembers = [] } = useTeamMembers(teamId);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!meeting || meeting.status !== 'scheduled') return;
    const update = () => setCountdown(formatDateFromNow(meeting.date, meeting.start_time));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [meeting]);

  const handleUpdate = async (data: Partial<Meeting>) => {
    if (!meeting) return;
    try {
      await updateMutation.mutateAsync({ id: meeting.id, data });
      setShowEditModal(false);
      showToast('Meeting updated successfully', 'success');
    } catch {
      showToast('Failed to update meeting', 'error');
    }
  };

  const handleDelete = async () => {
    if (!meeting) return;
    try {
      await deleteMutation.mutateAsync(meeting.id);
      setShowDeleteDialog(false);
      navigate(-1);
      showToast('Meeting deleted successfully', 'success');
    } catch {
      showToast('Failed to delete meeting', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1220] p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <MeetingDetailSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !meeting) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[#94A3B8] text-lg mb-4">Meeting not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const infoItems = getMeetingInfoItems(meeting);

  return (
    <div className="min-h-screen bg-[#0B1220]">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MeetingStatusBadge status={meeting.status} size="md" />
                <MeetingTypeBadge type={meeting.meeting_type} size="md" />
                {meeting.sprint_name && (
                  <span className="text-xs text-[#475569] font-medium">({meeting.sprint_name})</span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC]">{meeting.title}</h1>
              {meeting.description && <p className="text-[#94A3B8]">{meeting.description}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {meeting.status === 'active' && (
                <Button variant="gradient" size="md" onClick={() => navigate(`/meetings/${meeting.id}/live`)}>
                  Join
                </Button>
              )}
              {meeting.status === 'ended' && (
                <Button variant="primary" size="md" onClick={() => navigate(`/meetings/${meeting.id}/summary`)}>
                  View Summary
                </Button>
              )}
              <Button variant="secondary" size="md" onClick={() => setShowEditModal(true)}>Edit</Button>
              <Button variant="danger" size="md" onClick={() => setShowDeleteDialog(true)}>Delete</Button>
            </div>
          </div>

          {meeting.status === 'scheduled' && countdown && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20"
            >
              <Clock size={18} className="text-[#3B82F6]" />
              <div>
                <p className="text-sm font-medium text-[#3B82F6]">Meeting starts soon</p>
                <p className="text-xs text-[#94A3B8]">{countdown}</p>
              </div>
            </motion.div>
          )}

          <MeetingInfo items={infoItems} />

          {meeting.agenda && meeting.agenda.length > 0 && (
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
              <h3 className="text-base font-bold text-[#F8FAFC] mb-4">Agenda</h3>
              <MeetingTimeline
                agenda={meeting.agenda}
                status={meeting.status}
              />
            </div>
          )}

          <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
            <h3 className="text-base font-bold text-[#F8FAFC] mb-4">Participants ({participants.length})</h3>
            <MeetingParticipants participants={participants} />
          </div>
        </motion.div>

        <EditMeetingModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdate}
          meeting={meeting}
          teamMembers={teamMembers}
        />

        <DeleteMeetingDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          meetingTitle={meeting.title}
          loading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}
