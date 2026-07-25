import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Users, CheckCircle, Circle, Download, LayoutDashboard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { meetingService } from '../../services/meeting.service';
import { useMeeting } from '../../hooks/useMeeting';
import { useMeetingSummary } from '../../hooks/useMeetingSummary';
import { useMeetingParticipants } from '../../hooks/useMeetingParticipants';
import { MeetingStatusBadge, MeetingTypeBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import type { MeetingSummary, MeetingParticipant } from '../../types';

function formatDateLong(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime12h(time: string) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function MeetingSummaryPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();

  const { data: meeting, isLoading: meetingLoading } = useMeeting(meetingId);
  const { data: summary, isLoading: summaryLoading } = useMeetingSummary(meetingId);
  const { data: participants = [] } = useMeetingParticipants(meetingId);
  const { data: transcriptData } = useQuery({
    queryKey: ['transcript', meetingId],
    queryFn: () => meetingService.getTranscript(meetingId!),
    enabled: !!meetingId,
  });

  const loading = meetingLoading || summaryLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
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

  const summaryData: MeetingSummary = summary || {
    id: '',
    meeting_id: meetingId || '',
    duration_minutes: meeting.duration_minutes || 0,
    attendance_count: participants.length,
    total_participants: participants.length,
    transcript: '',
    ai_summary: 'No summary available yet.',
    action_items: [],
    tickets_generated: [],
    created_at: '',
  };

  return (
    <div className="min-h-screen bg-[#0B1220]">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(ellipse, #3B82F6, transparent 70%)' }} />
      </div>

      <div className="relative max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <MeetingStatusBadge status={meeting.status} size="md" />
              <MeetingTypeBadge type={meeting.meeting_type} size="md" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC]">{meeting.title}</h1>
            <p className="text-[#94A3B8] mt-1">
              {formatDateLong(meeting.date)} · {formatTime12h(meeting.start_time)} - {formatTime12h(meeting.end_time)}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#111827] border border-white/8 rounded-xl p-4 text-center">
              <Clock size={18} className="text-[#3B82F6] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#F8FAFC]">{summaryData.duration_minutes}</p>
              <p className="text-xs text-[#475569]">Minutes</p>
            </div>
            <div className="bg-[#111827] border border-white/8 rounded-xl p-4 text-center">
              <Users size={18} className="text-[#3B82F6] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#F8FAFC]">{summaryData.attendance_count}/{summaryData.total_participants}</p>
              <p className="text-xs text-[#475569]">Attendance</p>
            </div>
            <div className="bg-[#111827] border border-white/8 rounded-xl p-4 text-center">
              <CheckCircle size={18} className="text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#F8FAFC]">{summaryData.action_items.filter(a => a.status === 'done').length}/{summaryData.action_items.length}</p>
              <p className="text-xs text-[#475569]">Action Items</p>
            </div>
            <div className="bg-[#111827] border border-white/8 rounded-xl p-4 text-center">
              <LayoutDashboard size={18} className="text-[#8B5CF6] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#F8FAFC]">{summaryData.tickets_generated.length}</p>
              <p className="text-xs text-[#475569]">Tickets</p>
            </div>
          </div>

          <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
            <h3 className="text-base font-bold text-[#F8FAFC] mb-3">Participants ({participants.length})</h3>
            <div className="flex flex-wrap gap-3">
              {participants.map((p: MeetingParticipant) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0d1117] border border-white/6">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center text-white text-[10px] font-bold">
                    {getInitials(p.full_name)}
                  </div>
                  <span className="text-sm text-[#CBD5E1]">{p.full_name}</span>
                  {p.role === 'host' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3B82F6]/20 text-[#3B82F6] font-semibold">Host</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
            <h3 className="text-base font-bold text-[#F8FAFC] mb-3">AI Summary</h3>
            <div className="flex items-start gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center text-[#8B5CF6] shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
              </div>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">{summaryData.ai_summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
              <h3 className="text-base font-bold text-[#F8FAFC] mb-3">Action Items</h3>
              {summaryData.action_items.length === 0 ? (
                <p className="text-sm text-[#475569]">No action items</p>
              ) : (
                <div className="space-y-2">
                  {summaryData.action_items.map((item: any) => (
                    <div key={item.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#0d1117] border border-white/6">
                      {item.status === 'done'
                        ? <CheckCircle size={16} className="text-green-400 mt-0.5 shrink-0" />
                        : <Circle size={16} className="text-[#475569] mt-0.5 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${item.status === 'done' ? 'text-[#475569] line-through' : 'text-[#CBD5E1]'}`}>
                          {item.text}
                        </p>
                        {item.assignee && (
                          <p className="text-xs text-[#475569] mt-0.5">— {item.assignee}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
              <h3 className="text-base font-bold text-[#F8FAFC] mb-3">Tickets Generated</h3>
              {summaryData.tickets_generated.length === 0 ? (
                <p className="text-sm text-[#475569]">No tickets generated</p>
              ) : (
                <div className="space-y-2">
                  {summaryData.tickets_generated.map((ticket: any) => (
                    <div key={ticket.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0d1117] border border-white/6">
                      <div className={`w-2 h-2 rounded-full ${
                        ticket.status === 'open' ? 'bg-[#3B82F6]' :
                        ticket.status === 'in_progress' ? 'bg-[#F59E0B]' : 'bg-green-400'
                      }`} />
                      <span className="text-sm text-[#CBD5E1]">{ticket.title}</span>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-[#94A3B8] font-medium capitalize">{ticket.status.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {transcriptData?.content && (
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
              <h3 className="text-base font-bold text-[#F8FAFC] mb-3">Transcript</h3>
              <div className="bg-[#0d1117] border border-white/6 rounded-xl p-4 max-h-64 overflow-y-auto">
                <pre className="text-sm text-[#CBD5E1] whitespace-pre-wrap font-sans leading-relaxed">{transcriptData.content}</pre>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button variant="secondary" onClick={() => navigate(`/teams/${meeting.team_id}/meetings`)}>
              Back to Meetings
            </Button>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => {}}>
                <Download size={14} /> Download Transcript
              </Button>
              <Button variant="secondary" onClick={() => {}}>
                <LayoutDashboard size={14} /> View Kanban
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
