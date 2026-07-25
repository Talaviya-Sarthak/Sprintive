import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppLayout from '../../layouts/AppLayout';
import { useMeetings } from '../../hooks/useMeetings';
import { useCreateMeeting } from '../../hooks/useCreateMeeting';
import { useUpdateMeeting } from '../../hooks/useUpdateMeeting';
import { useDeleteMeeting } from '../../hooks/useDeleteMeeting';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import MeetingHeader from '../../components/meeting/MeetingHeader';
import MeetingList from '../../components/meeting/MeetingList';
import UpcomingMeetingCard from '../../components/meeting/UpcomingMeetingCard';
import PastMeetingCard from '../../components/meeting/PastMeetingCard';
import CreateMeetingModal from '../../components/meeting/CreateMeetingModal';
import EditMeetingModal from '../../components/meeting/EditMeetingModal';
import DeleteMeetingDialog from '../../components/meeting/DeleteMeetingDialog';
import { MeetingCardSkeleton } from '../../components/ui/Skeleton';
import type { Meeting } from '../../types';
import type { CreateMeetingPayload } from '../../types';

export default function MeetingsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: grouped, isLoading, isError, refetch } = useMeetings(teamId, { search, status: statusFilter, meeting_type: typeFilter });
  const createMutation = useCreateMeeting(teamId);
  const updateMutation = useUpdateMeeting(teamId);
  const deleteMutation = useDeleteMeeting(teamId);
  const { data: teamMembers = [] } = useTeamMembers(teamId);

  const meetings = grouped?.all || [];
  const upcoming = grouped?.upcoming || [];
  const ongoing = grouped?.ongoing || [];
  const completed = grouped?.completed || [];

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const [deleteMeetingData, setDeleteMeetingData] = useState<Meeting | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');

  const handleCreate = async (data: Partial<Meeting>) => {
    try {
      const payload: CreateMeetingPayload = {
        team_id: teamId!,
        title: data.title || '',
        description: data.description,
        meeting_type: data.meeting_type,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        timezone: data.timezone,
        agenda: data.agenda,
      };
      await createMutation.mutateAsync(payload);
      showToast('Meeting created successfully', 'success');
    } catch {
      showToast('Failed to create meeting', 'error');
    }
  };

  const handleUpdate = async (data: Partial<Meeting>) => {
    if (!editMeeting) return;
    try {
      await updateMutation.mutateAsync({ id: editMeeting.id, data });
      setEditMeeting(null);
      showToast('Meeting updated successfully', 'success');
    } catch {
      showToast('Failed to update meeting', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteMeetingData) return;
    try {
      await deleteMutation.mutateAsync(deleteMeetingData.id);
      setDeleteMeetingData(null);
      showToast('Meeting deleted successfully', 'success');
    } catch {
      showToast('Failed to delete meeting', 'error');
    }
  };

  const tabs = [
    { key: 'all', label: 'All', count: meetings.length },
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'ongoing', label: 'Live', count: ongoing.length },
    { key: 'completed', label: 'Completed', count: completed.length },
  ] as const;

  const filteredByTab = activeTab === 'all' ? meetings
    : activeTab === 'upcoming' ? upcoming
    : activeTab === 'ongoing' ? ongoing
    : completed;

  return (
    <AppLayout teamId={teamId}>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <MeetingHeader
          title="Meetings"
          description="Manage and join your team meetings"
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter as any}
          onStatusFilterChange={setStatusFilter as any}
          typeFilter={typeFilter as any}
          onTypeFilterChange={setTypeFilter as any}
          onCreateClick={() => setShowCreateModal(true)}
        />

        <div className="flex gap-1 p-1 rounded-xl bg-[#0d1117] border border-white/6 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'text-white/70' : 'text-[#475569]'}`}>
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <MeetingCardSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[#94A3B8] text-sm mb-3">Failed to load meetings</p>
            <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-sm font-semibold">
              Try Again
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {activeTab === 'upcoming' && upcoming.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {upcoming.map((m: Meeting) => <UpcomingMeetingCard key={m.id} meeting={m} />)}
              </div>
            )}
            {activeTab === 'completed' && completed.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {completed.map((m: Meeting) => <PastMeetingCard key={m.id} meeting={m} />)}
              </div>
            )}
            <MeetingList
              meetings={filteredByTab}
              currentUserId={user?.id || ''}
              onEdit={setEditMeeting}
              onDelete={setDeleteMeetingData}
            />
          </motion.div>
        )}

        <CreateMeetingModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          teamMembers={teamMembers}
        />

        <EditMeetingModal
          open={!!editMeeting}
          onClose={() => setEditMeeting(null)}
          onUpdate={handleUpdate}
          meeting={editMeeting}
          teamMembers={teamMembers}
        />

        <DeleteMeetingDialog
          open={!!deleteMeetingData}
          onClose={() => setDeleteMeetingData(null)}
          onConfirm={handleDelete}
          meetingTitle={deleteMeetingData?.title ?? ''}
          loading={deleteMutation.isPending}
        />
      </div>
    </AppLayout>
  );
}
