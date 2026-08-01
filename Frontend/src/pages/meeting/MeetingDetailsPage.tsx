import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Users, Play, Edit3, Trash2, Tag } from 'lucide-react';
import { meetingService } from '../../services/meeting.service';
import { useAuth } from '../../context/AuthContext';
import { useMeetingMockData } from '../../hooks/useMeetingMockData';
import AppLayout from '../../layouts/AppLayout';
import { MeetingStatusBadge, MeetingTypeBadge, RoleBadge } from '../../components/ui/Badge';
import MeetingInfo from '../../components/meeting/MeetingInfo';
import EditMeetingModal from '../../components/meeting/EditMeetingModal';
import DeleteMeetingDialog from '../../components/meeting/DeleteMeetingDialog';
import { AppButton, AppCard } from '../../components/app-ui';
import type { Meeting } from '../../types';

function formatDateLong(dateStr: string) {
  if (!dateStr) return 'Date TBD';
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Date TBD';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime12h(time?: string) {
  if (!time) return 'TBD';
  if (time.includes('T')) {
    const d = new Date(time);
    if (Number.isNaN(d.getTime())) return 'TBD';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const [h, m = 0] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 'TBD';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatDateFromNow(targetDate: string, targetTime: string) {
  if (!targetDate || !targetTime) return null;
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
  const { user } = useAuth();
  const { getMeeting, getTeamMembers, updateMeeting: updateMockMeeting, deleteMeeting: deleteMockMeeting } = useMeetingMockData(teamId);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  const fetchMeetingDetails = async () => {
    if (!meetingId) return;
    try {
      const m = await meetingService.getMeeting(meetingId);
      setMeeting(m);
    } catch {
      const mock = getMeeting(meetingId);
      if (mock) {
        setMeeting(mock);
      } else {
        setError('Meeting details not found');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingDetails();
  }, [meetingId]);

  useEffect(() => {
    if (!meeting || meeting.status !== 'scheduled' || !meeting.date || !meeting.start_time) return;
    const update = () => setCountdown(formatDateFromNow(meeting.date, meeting.start_time));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [meeting]);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else if (meeting?.team_id || teamId) {
      navigate(`/teams/${meeting?.team_id || teamId}/meetings`);
    } else {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <AppLayout teamId={teamId || meeting?.team_id}>
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-[#27272a] border-t-[#f4f4f5] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error || !meeting) {
    return (
      <AppLayout teamId={teamId}>
        <div className="p-8 text-center space-y-4">
          <p className="text-[#a1a1aa] text-sm">{error || 'Meeting not found'}</p>
          <AppButton variant="mono" size="sm" onClick={handleBack}>
            Go Back
          </AppButton>
        </div>
      </AppLayout>
    );
  }

  const isOwner = meeting.host_id === user?.id || meeting.host_id === 'u1';
  const activeTeamId = teamId || meeting.team_id;
  const teamMembers = getTeamMembers();

  const infoItems = [
    { label: 'Date', value: formatDateLong(meeting.date ?? meeting.started_at ?? ''), icon: <Clock size={15} /> },
    { label: 'Time', value: `${formatTime12h(meeting.start_time)} - ${formatTime12h(meeting.end_time)}`, icon: <Clock size={15} /> },
    { label: 'Timezone', value: meeting.timezone ?? 'UTC', icon: <Clock size={15} /> },
    { label: 'Duration', value: `${meeting.duration_minutes ?? 30} minutes`, icon: <Clock size={15} /> },
    { label: 'Participants', value: `${meeting.participant_count ?? 1} members`, icon: <Users size={15} /> },
    { label: 'Meeting ID', value: meeting.id, icon: <Tag size={15} /> },
  ];

  return (
    <AppLayout teamId={activeTeamId}>
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Main Title & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#1f1f23]">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <MeetingStatusBadge status={meeting.status} size="md" />
                <MeetingTypeBadge type={meeting.meeting_type ?? 'daily_scrum'} size="md" />
                {meeting.sprint_name && (
                  <span className="text-xs text-[#71717a] font-mono">({meeting.sprint_name})</span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold text-[#f4f4f5] tracking-tight">{meeting.title}</h1>
              {meeting.description && <p className="text-xs text-[#a1a1aa] leading-relaxed max-w-2xl">{meeting.description}</p>}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {meeting.status === 'active' || meeting.status === 'scheduled' ? (
                <AppButton
                  variant="mono"
                  size="sm"
                  onClick={() => navigate(`/meetings/${meeting.id}/lobby`)}
                >
                  <Play size={14} className="mr-1.5" /> Join Meeting
                </AppButton>
              ) : null}

              {meeting.status === 'ended' && (
                <AppButton
                  variant="mono"
                  size="sm"
                  onClick={() => navigate(`/meetings/${meeting.id}/summary`)}
                >
                  View AI Summary
                </AppButton>
              )}

              {isOwner && (
                <>
                  <AppButton variant="mono-outline" size="sm" onClick={() => setShowEditModal(true)}>
                    <Edit3 size={13} className="mr-1" /> Edit
                  </AppButton>
                  <AppButton variant="danger" size="sm" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 size={13} className="mr-1" /> Delete
                  </AppButton>
                </>
              )}
            </div>
          </div>

          {/* Countdown Banner */}
          {meeting.status === 'scheduled' && countdown && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-[#1c1c21] border border-[#27272a]"
            >
              <Clock size={18} className="text-[#f4f4f5]" />
              <div>
                <p className="text-xs font-semibold text-[#f4f4f5]">Upcoming Session</p>
                <p className="text-[11px] text-[#a1a1aa] mt-0.5">{countdown}</p>
              </div>
            </motion.div>
          )}

          {/* Meeting Info Grid */}
          <MeetingInfo items={infoItems} />

          {/* Host & Participant Info */}
          <AppCard
            variant="dashboard"
            title={
              <div className="flex items-center gap-2">
                <Users size={15} className="text-[#a1a1aa]" />
                <span className="text-xs font-semibold text-[#f4f4f5]">Host & Workspace Details</span>
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1c1c21] border border-[#27272a]">
                <div className="w-9 h-9 rounded-full bg-[#141417] border border-[#27272a] flex items-center justify-center text-[#f4f4f5] text-xs font-bold shrink-0">
                  {meeting.host_name?.[0]?.toUpperCase() ?? 'H'}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#f4f4f5]">{meeting.host_name ?? 'Host'}</p>
                  <p className="text-[10px] text-[#71717a]">Meeting Host</p>
                </div>
                <div className="ml-auto">
                  <RoleBadge role="host" size="sm" />
                </div>
              </div>

              {meeting.team_name && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1c1c21] border border-[#27272a]">
                  <div className="w-9 h-9 rounded-xl bg-[#141417] border border-[#27272a] flex items-center justify-center text-[#f4f4f5] text-xs font-bold shrink-0">
                    {meeting.team_name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#f4f4f5]">{meeting.team_name}</p>
                    <p className="text-[10px] text-[#71717a]">Target Workspace</p>
                  </div>
                </div>
              )}
            </div>
          </AppCard>
        </motion.div>

        <EditMeetingModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={async (data) => {
            try {
              await meetingService.updateMeeting(meeting.id, data);
            } catch {
              updateMockMeeting(meeting.id, data);
            }
            setShowEditModal(false);
            fetchMeetingDetails();
          }}
          meeting={meeting}
          teamMembers={teamMembers}
        />

        <DeleteMeetingDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={async () => {
            try {
              await meetingService.deleteMeeting(meeting.id);
            } catch {
              deleteMockMeeting(meeting.id);
            }
            setShowDeleteDialog(false);
            handleBack();
          }}
          meetingTitle={meeting.title}
        />
      </div>
    </AppLayout>
  );
}
