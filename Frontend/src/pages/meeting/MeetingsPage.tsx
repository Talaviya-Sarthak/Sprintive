import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teamService } from '../../services/team.service';
import { meetingService } from '../../services/meeting.service';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import MeetingCard from '../../components/meeting/MeetingCard';
import MeetingHeader from '../../components/meeting/MeetingHeader';
import CreateMeetingModal from '../../components/meeting/CreateMeetingModal';
import EditMeetingModal from '../../components/meeting/EditMeetingModal';
import DeleteMeetingDialog from '../../components/meeting/DeleteMeetingDialog';
import { AppTabs } from '../../components/app-ui';
import type { Meeting, MeetingStatus, MeetingType } from '../../types';

export default function MeetingsPage() {
  const { id: teamId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MeetingType | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'live' | 'completed'>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const [deleteMeeting, setDeleteMeeting] = useState<Meeting | null>(null);

  const fetchMeetings = async () => {
    if (!teamId) return;
    try {
      const data = await teamService.getTeamMeetings(teamId);
      setMeetings(data);
    } catch {
      setError('Failed to load meetings');
    }
  };

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    Promise.all([teamService.getTeam(teamId), teamService.getTeamMeetings(teamId)])
      .then(([t, m]) => {
        setTeamName(t.name);
        setMeetings(m);
      })
      .catch(() => setError('Failed to load page data'))
      .finally(() => setLoading(false));
  }, [teamId]);

  // Tab filtering logic
  const now = new Date();
  const filteredByTab = meetings.filter(m => {
    if (activeTab === 'live') return m.status === 'active';
    if (activeTab === 'completed') return m.status === 'ended';
    if (activeTab === 'upcoming') {
      return m.status === 'scheduled' && new Date(`${m.date}T${m.start_time}`) >= now;
    }
    return true;
  });

  // Header controls filtering
  const finalFiltered = filteredByTab.filter(m => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (typeFilter !== 'all' && m.meeting_type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchSprint = m.sprint_name?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchSprint) return false;
    }
    return true;
  });

  const tabItems = [
    { id: 'all', label: 'All', count: meetings.length },
    {
      id: 'upcoming',
      label: 'Upcoming',
      count: meetings.filter(
        m => m.status === 'scheduled' && new Date(`${m.date}T${m.start_time}`) >= now
      ).length,
    },
    { id: 'live', label: 'Live', count: meetings.filter(m => m.status === 'active').length },
    { id: 'completed', label: 'Completed', count: meetings.filter(m => m.status === 'ended').length },
  ];

  if (loading) {
    return (
      <AppLayout teamId={teamId}>
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-[#F97316]/30 border-t-[#F97316] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout teamId={teamId}>
      <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-5">
        <MeetingHeader
          title={`${teamName} Meetings`}
          description="Schedule, join live scrum sessions, and view AI meeting logs."
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          onCreateClick={() => setShowCreateModal(true)}
        />

        <div className="flex items-center justify-between">
          <AppTabs
            items={tabItems}
            activeId={activeTab}
            onChange={id => setActiveTab(id as any)}
          />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        {finalFiltered.length === 0 ? (
          <div className="bg-[#11131C] border border-[#1E2232] rounded-xl p-10 text-center">
            <p className="text-xs text-[#64748B]">No meetings match your filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {finalFiltered.map(meeting => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                currentUserId={user?.id ?? ''}
                onEdit={m => setEditMeeting(m)}
                onDelete={m => setDeleteMeeting(m)}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        {showCreateModal && (
          <CreateMeetingModal
            teamId={teamId!}
            onClose={() => setShowCreateModal(false)}
            onCreated={fetchMeetings}
          />
        )}
        {editMeeting && (
          <EditMeetingModal
            meeting={editMeeting}
            onClose={() => setEditMeeting(null)}
            onUpdated={fetchMeetings}
          />
        )}
        {deleteMeeting && (
          <DeleteMeetingDialog
            open={!!deleteMeeting}
            onClose={() => setDeleteMeeting(null)}
            onConfirm={async () => {
              if (deleteMeeting) {
                await meetingService.deleteMeeting(deleteMeeting.id);
                setDeleteMeeting(null);
                fetchMeetings();
              }
            }}
            meetingTitle={deleteMeeting.title}
          />
        )}

      </div>
    </AppLayout>
  );
}