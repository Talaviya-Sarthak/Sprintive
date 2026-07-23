import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Users, Play } from 'lucide-react';
import { useMeetingMockData } from '../../hooks/useMeetingMockData';
import { MeetingStatusBadge, MeetingTypeBadge } from '../../components/ui/Badge';
import MeetingInfo, { getMeetingInfoItems } from '../../components/meeting/MeetingInfo';
import MeetingTimeline from '../../components/meeting/MeetingTimeline';
import MeetingParticipants from '../../components/meeting/MeetingParticipants';
import EditMeetingModal from '../../components/meeting/EditMeetingModal';
import DeleteMeetingDialog from '../../components/meeting/DeleteMeetingDialog';
import { MeetingDetailSkeleton } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import type { Meeting } from '../../types';

const currentUserId = 'u1';

function formatDateFromNow(targetDate: string, targetTime: string) {
  const [y, m, d] = targetDate.split('-').map(Number);
  const [h, min] = targetTime.split(':').map(Number);
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
  const { getMeeting, getParticipants, getTeamMembers, updateMeeting, deleteMeeting } = useMeetingMockData(teamId);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState(getParticipants(meetingId ?? ''));
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingId) return;
    const m = getMeeting(meetingId);
    setMeeting(m);
    setParticipants(getParticipants(meetingId));
    setLoading(false);
  }, [meetingId]);

  useEffect(() => {
    if (!meeting || meeting.status !== 'scheduled') return;
    const update = () => setCountdown(formatDateFromNow(meeting.date, meeting.start_time));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [meeting]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1220] p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <MeetingDetailSkeleton />
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[#94A3B8] text-lg mb-4">Meeting not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const isOwner = meeting.host_id === currentUserId;
  const infoItems = getMeetingInfoItems(meeting);
  const teamMembers = getTeamMembers();

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
                  <Play size={14} /> Join
                </Button>
              )}
              {meeting.status === 'ended' && (
                <Button variant="primary" size="md" onClick={() => navigate(`/meetings/${meeting.id}/summary`)}>
                  View Summary
                </Button>
              )}
              {isOwner && (
                <>
                  <Button variant="secondary" size="md" onClick={() => setShowEditModal(true)}>Edit</Button>
                  <Button variant="danger" size="md" onClick={() => setShowDeleteDialog(true)}>Delete</Button>
                </>
              )}
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
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-[#94A3B8]" />
              <h3 className="text-base font-bold text-[#F8FAFC]">Participants ({participants.length})</h3>
            </div>
            <MeetingParticipants participants={participants} currentUserId={currentUserId} />
          </div>
        </motion.div>

        <EditMeetingModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={(data) => { updateMeeting(meeting.id, data); setShowEditModal(false); }}
          meeting={meeting}
          teamMembers={teamMembers}
        />

        <DeleteMeetingDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={() => { deleteMeeting(meeting.id); navigate(-1); }}
          meetingTitle={meeting.title}
        />
      </div>
    </div>
  );
}