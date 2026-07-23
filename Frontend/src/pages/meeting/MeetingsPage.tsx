import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppLayout from '../../layouts/AppLayout';
import { useMeetingMockData } from '../../hooks/useMeetingMockData';
import MeetingHeader from '../../components/meeting/MeetingHeader';
import MeetingList from '../../components/meeting/MeetingList';
import UpcomingMeetingCard from '../../components/meeting/UpcomingMeetingCard';
import PastMeetingCard from '../../components/meeting/PastMeetingCard';
import CreateMeetingModal from '../../components/meeting/CreateMeetingModal';
import EditMeetingModal from '../../components/meeting/EditMeetingModal';
import DeleteMeetingDialog from '../../components/meeting/DeleteMeetingDialog';
import { MeetingCardSkeleton } from '../../components/ui/Skeleton';
import type { Meeting } from '../../types';

const currentUserId = 'u1';

export default function MeetingsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const {
    meetings, upcoming, ongoing, completed,
    search, setSearch, statusFilter, setStatusFilter,
    typeFilter, setTypeFilter,
    getTeamMembers, createMeeting, updateMeeting, deleteMeeting,
  } = useMeetingMockData(teamId);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const [deleteMeetingData, setDeleteMeetingData] = useState<Meeting | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');
  const [loading] = useState(false);

  const teamMembers = getTeamMembers();

  const handleCreate = (data: Partial<Meeting>) => createMeeting(data);
  const handleUpdate = (data: Partial<Meeting>) => {
    if (editMeeting) updateMeeting(editMeeting.id, data);
  };
  const handleDelete = () => {
    if (deleteMeetingData) {
      deleteMeeting(deleteMeetingData.id);
      setDeleteMeetingData(null);
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
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
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

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <MeetingCardSkeleton key={i} />)}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {activeTab === 'upcoming' && upcoming.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {upcoming.map(m => <UpcomingMeetingCard key={m.id} meeting={m} />)}
              </div>
            )}
            {activeTab === 'completed' && completed.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {completed.map(m => <PastMeetingCard key={m.id} meeting={m} />)}
              </div>
            )}
            <MeetingList
              meetings={filteredByTab}
              currentUserId={currentUserId}
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
        />
      </div>
    </AppLayout>
  );
}