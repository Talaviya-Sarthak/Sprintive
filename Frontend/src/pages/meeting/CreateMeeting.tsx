import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, ArrowLeft } from 'lucide-react';
import { meetingService } from '../../services/meeting.service';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { AppButton, AppInput, AppSelect } from '../../components/app-ui';
import type { MeetingType } from '../../types';

const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: 'daily_scrum', label: 'Daily Scrum' },
  { value: 'sprint_planning', label: 'Sprint Planning' },
  { value: 'review', label: 'Sprint Review' },
  { value: 'retrospective', label: 'Retrospective' },
  { value: 'custom', label: 'Custom Meeting' },
];

export default function CreateMeeting() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { teams } = useAuth();
  
  const queryTeamId = params.get('team_id') ?? '';
  const initialTeamId = queryTeamId || (teams.length > 0 ? teams[0].id : '');

  const getDefaultStartTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const getDefaultEndTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const [form, setForm] = useState({
    team_id: initialTeamId,
    title: '',
    description: '',
    meeting_type: 'daily_scrum' as MeetingType,
    date: new Date().toISOString().split('T')[0],
    start_time: getDefaultStartTime(),
    end_time: getDefaultEndTime(),
    sprint_name: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!form.team_id && teams.length > 0) {
      setForm(f => ({ ...f, team_id: teams[0].id }));
    }
  }, [teams]);

  const setField = (key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.team_id) {
      setError('Please select a team workspace');
      return;
    }
    if (!form.title.trim()) {
      setError('Meeting title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const meeting = await meetingService.createMeeting({
        team_id: form.team_id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        meeting_type: form.meeting_type,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        sprint_name: form.sprint_name.trim() || undefined,
      });

      // Smooth navigation to the created meeting details or team meetings page
      if (meeting?.id) {
        navigate(`/meetings/${meeting.id}`);
      } else {
        navigate(`/teams/${form.team_id}/meetings`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to create meeting. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout teamId={form.team_id}>
      <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="border-b border-[#1f1f23] pb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1c1c21] border border-[#27272a] text-[#f4f4f5] text-xs font-mono font-medium mb-3">
              <Video size={13} /> NEW MEETING SESSION
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-[#f4f4f5] tracking-tight">
              Schedule & Start Meeting
            </h1>
            <p className="text-[#a1a1aa] text-xs mt-1">
              Set up your Agile Scrum meeting with AI voice recording, automated transcripts, and task generation.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-[#141417] border border-[#27272a] rounded-2xl p-6 shadow-sm">
            {teams.length > 0 ? (
              <AppSelect
                label="Target Workspace / Team *"
                value={form.team_id}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setField('team_id', e.target.value)}
                options={teams.map(t => ({ value: t.id, label: t.name }))}
              />
            ) : (
              <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 text-center space-y-2">
                <p className="text-xs text-[#a1a1aa]">You need to create a Team first before scheduling meetings.</p>
                <AppButton variant="mono" size="xs" onClick={() => navigate('/teams/create')}>
                  Create Team First
                </AppButton>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AppInput
                label="Meeting Title *"
                placeholder="e.g. Daily Standup — Sprint 14"
                value={form.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField('title', e.target.value)}
              />

              <AppSelect
                label="Meeting Type"
                value={form.meeting_type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setField('meeting_type', e.target.value)}
                options={MEETING_TYPES}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AppInput
                label="Date *"
                type="date"
                value={form.date}
                onChange={e => setField('date', e.target.value)}
              />

              <AppInput
                label="Start Time *"
                type="time"
                value={form.start_time}
                onChange={e => setField('start_time', e.target.value)}
              />

              <AppInput
                label="End Time *"
                type="time"
                value={form.end_time}
                onChange={e => setField('end_time', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AppInput
                label="Sprint Name (Optional)"
                placeholder="e.g. Sprint 14"
                value={form.sprint_name}
                onChange={e => setField('sprint_name', e.target.value)}
              />

              <AppInput
                label="Description / Context (Optional)"
                placeholder="Brief agenda or focus points..."
                value={form.description}
                onChange={e => setField('description', e.target.value)}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1f1f23]">
              <AppButton variant="mono-outline" size="sm" type="button" onClick={() => navigate(-1)}>
                Cancel
              </AppButton>
              <AppButton variant="mono" size="sm" type="submit" loading={loading} disabled={teams.length === 0}>
                Schedule Meeting
              </AppButton>
            </div>
          </form>
        </motion.div>
      </div>
    </AppLayout>
  );
}
