import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Users, CheckCircle, Download, LayoutDashboard, Sparkles } from 'lucide-react';
import { useMeetingMockData } from '../../hooks/useMeetingMockData';
import AppLayout from '../../layouts/AppLayout';
import { MeetingStatusBadge, MeetingTypeBadge, RoleBadge } from '../../components/ui/Badge';
import { AppButton, AppCard } from '../../components/app-ui';
import type { Meeting, MeetingSummary, MeetingParticipant } from '../../types';

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

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function MeetingSummaryPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { getMeeting, getMeetingSummary, getParticipants } = useMeetingMockData();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetingId) return;
    const m = getMeeting(meetingId);
    const s = getMeetingSummary(meetingId);
    const p = getParticipants(meetingId);
    setMeeting(m);
    setSummary(s);
    setParticipants(p);
    setLoading(false);
  }, [meetingId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-[#27272a] border-t-[#f4f4f5] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!meeting || !summary) {
    return (
      <AppLayout>
        <div className="p-8 text-center space-y-4">
          <p className="text-[#a1a1aa] text-xs font-mono">Summary details not found</p>
          <AppButton variant="mono" size="sm" onClick={() => navigate(-1)}>
            Go Back
          </AppButton>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout teamId={meeting.team_id}>
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="pb-4 border-b border-[#1f1f23] space-y-2">
            <div className="flex items-center gap-2">
              <MeetingStatusBadge status={meeting.status} size="md" />
              <MeetingTypeBadge type={meeting.meeting_type} size="md" />
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[#f4f4f5] tracking-tight">{meeting.title}</h1>
            <p className="text-xs font-mono text-[#71717a]">
              {formatDateLong(meeting.date)} · {formatTime12h(meeting.start_time)} - {formatTime12h(meeting.end_time)}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AppCard variant="dashboard" className="text-center p-4">
              <Clock size={16} className="text-[#a1a1aa] mx-auto mb-2" />
              <p className="text-xl font-bold text-[#f4f4f5]">{summary.duration_minutes}</p>
              <p className="text-[10px] font-mono text-[#71717a] uppercase mt-0.5">Minutes</p>
            </AppCard>
            <AppCard variant="dashboard" className="text-center p-4">
              <Users size={16} className="text-[#a1a1aa] mx-auto mb-2" />
              <p className="text-xl font-bold text-[#f4f4f5]">{summary.attendance_count}/{summary.total_participants}</p>
              <p className="text-[10px] font-mono text-[#71717a] uppercase mt-0.5">Attendance</p>
            </AppCard>
            <AppCard variant="dashboard" className="text-center p-4">
              <CheckCircle size={16} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-[#f4f4f5]">{summary.action_items.filter(a => a.status === 'done').length}/{summary.action_items.length}</p>
              <p className="text-[10px] font-mono text-[#71717a] uppercase mt-0.5">Action Items</p>
            </AppCard>
            <AppCard variant="dashboard" className="text-center p-4">
              <LayoutDashboard size={16} className="text-[#a1a1aa] mx-auto mb-2" />
              <p className="text-xl font-bold text-[#f4f4f5]">{summary.tickets_generated.length}</p>
              <p className="text-[10px] font-mono text-[#71717a] uppercase mt-0.5">Tickets</p>
            </AppCard>
          </div>

          <AppCard
            variant="dashboard"
            title={
              <div className="flex items-center gap-2">
                <Users size={15} className="text-[#a1a1aa]" />
                <span className="text-xs font-semibold text-[#f4f4f5]">Participants ({participants.length})</span>
              </div>
            }
          >
            <div className="flex flex-wrap gap-2">
              {participants.map(p => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1c1c21] border border-[#27272a]">
                  <div className="w-6 h-6 rounded-full bg-[#141417] border border-[#27272a] flex items-center justify-center text-[#f4f4f5] text-[10px] font-semibold">
                    {getInitials(p.full_name)}
                  </div>
                  <span className="text-xs text-[#f4f4f5] font-medium">{p.full_name}</span>
                  {p.role === 'host' && <RoleBadge role="host" size="sm" />}
                </div>
              ))}
            </div>
          </AppCard>

          <AppCard
            variant="dashboard"
            title={
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-[#f4f4f5]" />
                <span className="text-xs font-semibold text-[#f4f4f5]">AI Executive Summary</span>
              </div>
            }
          >
            <p className="text-xs text-[#a1a1aa] leading-relaxed">{summary.ai_summary}</p>
          </AppCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppCard
              variant="dashboard"
              title={<span className="text-xs font-semibold text-[#f4f4f5]">Action Items</span>}
            >
              {summary.action_items.length === 0 ? (
                <p className="text-xs text-[#71717a]">No action items recorded</p>
              ) : (
                <div className="space-y-2">
                  {summary.action_items.map(item => (
                    <div key={item.id} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#1c1c21] border border-[#27272a]">
                      <CheckCircle size={15} className={`mt-0.5 shrink-0 ${item.status === 'done' ? 'text-emerald-400' : 'text-[#71717a]'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${item.status === 'done' ? 'text-[#71717a] line-through' : 'text-[#f4f4f5]'}`}>
                          {item.text}
                        </p>
                        {item.assignee && (
                          <p className="text-[10px] text-[#71717a] mt-0.5">— {item.assignee}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AppCard>

            <AppCard
              variant="dashboard"
              title={<span className="text-xs font-semibold text-[#f4f4f5]">Tickets Generated</span>}
            >
              {summary.tickets_generated.length === 0 ? (
                <p className="text-xs text-[#71717a]">No tickets generated</p>
              ) : (
                <div className="space-y-2">
                  {summary.tickets_generated.map(ticket => (
                    <div key={ticket.id} className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1c1c21] border border-[#27272a]">
                      <div className={`w-2 h-2 rounded-full ${
                        ticket.status === 'open' ? 'bg-[#f4f4f5]' :
                        ticket.status === 'in_progress' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} />
                      <span className="text-xs text-[#f4f4f5] font-medium">{ticket.title}</span>
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#141417] border border-[#27272a] text-[#a1a1aa] font-mono capitalize">
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </AppCard>
          </div>

          <AppCard
            variant="dashboard"
            title={<span className="text-xs font-semibold text-[#f4f4f5]">Full Transcript</span>}
          >
            <div className="bg-[#1c1c21] border border-[#27272a] rounded-xl p-4 max-h-64 overflow-y-auto">
              <pre className="text-xs text-[#a1a1aa] whitespace-pre-wrap font-sans leading-relaxed">{summary.transcript}</pre>
            </div>
          </AppCard>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <AppButton variant="mono-outline" size="sm" onClick={() => navigate(`/teams/${meeting.team_id}/meetings`)}>
              Back to Meetings
            </AppButton>
            <div className="flex gap-3 ml-auto">
              <AppButton variant="mono-outline" size="sm" onClick={() => {}}>
                <Download size={14} className="mr-1" /> Download Transcript
              </AppButton>
              <AppButton variant="mono" size="sm" onClick={() => {}}>
                <LayoutDashboard size={14} className="mr-1" /> View Board
              </AppButton>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}