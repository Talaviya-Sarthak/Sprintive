import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Clock, Users, CheckCircle2, Download, LayoutDashboard,
  Sparkles, AlertCircle, RefreshCw, Loader2, FileText, Check,
  ChevronDown, ChevronUp, Tag, UserCheck, Calendar, ListChecks,
  ArrowRight,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { meetingService } from '../../services/meeting.service';
import { useMeeting } from '../../hooks/useMeeting';
import { useMeetingParticipants } from '../../hooks/useMeetingParticipants';
import AppLayout from '../../layouts/AppLayout';
import { MeetingStatusBadge, MeetingTypeBadge, RoleBadge } from '../../components/ui/Badge';
import { AppButton, AppCard } from '../../components/app-ui';
import AIProcessingStepper from '../../components/meeting/AIProcessingStepper';
import type { MeetingParticipant, GeneratedTicket } from '../../types';

function formatDateLong(dateStr?: string) {
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
  return `${hour}:${(m ?? 0).toString().padStart(2, '0')} ${ampm}`;
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getPriorityBadgeClass(priority?: string) {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'high':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'medium':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'low':
    default:
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
  }
}

function getTypeBadgeClass(type?: string) {
  switch (type?.toLowerCase()) {
    case 'bug':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    case 'feature':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    case 'improvement':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'task':
    default:
      return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
  }
}

export default function MeetingSummaryPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  // Queries
  const { data: meeting, isLoading: meetingLoading } = useMeeting(meetingId);
  const { data: participants = [] } = useMeetingParticipants(meetingId);

  // Polling processing status
  const { data: procStatus } = useQuery({
    queryKey: ['processing-status', meetingId],
    queryFn: () => meetingService.getProcessingStatus(meetingId!),
    enabled: !!meetingId,
    refetchInterval: (query) => {
      const isProc = query.state.data?.is_processing;
      return isProc ? 2000 : false;
    },
  });

  // Summary query
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['summary', meetingId],
    queryFn: () => meetingService.getSummary(meetingId!),
    enabled: !!meetingId,
    refetchInterval: () => (procStatus?.is_processing ? 2000 : false),
  });

  // Transcript query
  const { data: transcriptData, isLoading: transcriptLoading } = useQuery({
    queryKey: ['transcript', meetingId],
    queryFn: () => meetingService.getTranscript(meetingId!),
    enabled: !!meetingId,
    refetchInterval: (query) => {
      // Poll every 3 seconds while raw_stored or processing
      const status = query.state.data?.status;
      return (status === 'processing' || status === 'raw_stored') ? 3000 : false;
    },
  });

  const handleRetry = async () => {
    if (!meetingId) return;
    setIsRetrying(true);
    setRetryError(null);
    try {
      await meetingService.retryProcessing(meetingId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['processing-status', meetingId] }),
        queryClient.invalidateQueries({ queryKey: ['summary', meetingId] }),
        queryClient.invalidateQueries({ queryKey: ['transcript', meetingId] }),
      ]);
    } catch (err: any) {
      setRetryError(err.response?.data?.message || err.message || 'Retry failed');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownloadTranscript = () => {
    const text = transcriptData?.content;
    if (!text || !meeting) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meeting-${meeting.id}-transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (meetingLoading || summaryLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div
            className="w-7 h-7 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--app-border)', borderTopColor: 'var(--app-text-primary)' }}
          />
        </div>
      </AppLayout>
    );
  }

  if (!meeting) {
    return (
      <AppLayout>
        <div className="p-8 text-center space-y-4">
          <p className="text-xs font-mono" style={{ color: 'var(--app-text-secondary)' }}>
            Meeting details not found
          </p>
          <AppButton variant="mono" size="sm" onClick={() => navigate(-1)}>
            Go Back
          </AppButton>
        </div>
      </AppLayout>
    );
  }

  const isProcessing = Boolean(procStatus?.is_processing);
  const isFailed = procStatus?.transcript_status === 'failed' || procStatus?.ai_status === 'failed';
  const errorMessage = procStatus?.error || transcriptData?.error;

  const tickets: GeneratedTicket[] = Array.isArray(summary?.tickets_generated)
    ? summary.tickets_generated
    : [];

  const rawActionItems = Array.isArray(summary?.action_items) ? summary.action_items : [];

  const aiSummaryText =
    summary?.ai_summary &&
    !summary.ai_summary.includes('once AI processing is complete') &&
    !summary.ai_summary.includes('No summary available yet') &&
    !summary.ai_summary.includes('No speech was detected')
      ? summary.ai_summary
      : null;

  // Processing stage indicators
  const currentStage = procStatus?.current_stage || 'pending';
  const stageIndex = (() => {
    switch (currentStage) {
      case 'finalizing_transcript': return 1;
      case 'saving_transcript': return 2;
      case 'cleaning_transcript': return 3;
      case 'analyzing_meeting': return 4;
      case 'generating_tasks': return 5;
      case 'resolving_tasks': return 6;
      case 'completed': return 7;
      default: return isProcessing ? 3 : 0;
    }
  })();

  return (
    <AppLayout teamId={meeting.team_id}>
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/teams/${meeting.team_id}/meetings`)}
            className="flex items-center gap-1.5 text-xs transition-colors cursor-pointer text-[#9ca3af] hover:text-[#f4f4f5]"
          >
            <ArrowLeft size={14} /> Back to Meetings
          </button>

          <AppButton
            variant="mono"
            size="sm"
            onClick={() => navigate(`/teams/${meeting.team_id}/kanban?meeting_id=${meeting.id}`)}
            className="gap-1.5"
          >
            <LayoutDashboard size={14} />
            <span>Open Kanban Board</span>
          </AppButton>
        </div>

        {/* Meeting Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="pb-5 border-b border-[#242636] space-y-2">
            <div className="flex items-center gap-2">
              <MeetingStatusBadge status={meeting.status} size="md" />
              <MeetingTypeBadge type={meeting.meeting_type} size="md" />
              {meeting.sprint_name && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#1c1d27] border border-[#2c2f42] text-zinc-300">
                  {meeting.sprint_name}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#f4f4f5]">
              {meeting.title}
            </h1>
            <p className="text-xs font-mono text-[#71717a]">
              {formatDateLong(meeting.date)} · {formatTime12h(meeting.start_time)} - {formatTime12h(meeting.end_time)} ({meeting.timezone || 'UTC'})
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AppCard variant="dashboard" className="text-center p-4">
              <Clock size={16} className="mx-auto mb-2 text-[#9ca3af]" />
              <p className="text-xl font-bold text-[#f4f4f5]">{meeting.duration_minutes || summary?.duration_minutes || 0}</p>
              <p className="text-[10px] font-mono uppercase mt-0.5 text-[#71717a]">Minutes</p>
            </AppCard>
            <AppCard variant="dashboard" className="text-center p-4">
              <Users size={16} className="mx-auto mb-2 text-[#9ca3af]" />
              <p className="text-xl font-bold text-[#f4f4f5]">{participants.length}</p>
              <p className="text-[10px] font-mono uppercase mt-0.5 text-[#71717a]">Participants</p>
            </AppCard>
            <AppCard variant="dashboard" className="text-center p-4">
              <ListChecks size={16} className="mx-auto mb-2 text-indigo-400" />
              <p className="text-xl font-bold text-[#f4f4f5]">{tickets.length}</p>
              <p className="text-[10px] font-mono uppercase mt-0.5 text-[#71717a]">Generated Tasks</p>
            </AppCard>
            <AppCard variant="dashboard" className="text-center p-4">
              <Sparkles size={16} className="mx-auto mb-2 text-blue-400" />
              <p className="text-xs font-semibold mt-1 text-[#f4f4f5]">
                {isProcessing ? 'Processing' : isFailed ? 'Failed' : 'Completed'}
              </p>
              <p className="text-[10px] font-mono uppercase mt-0.5 text-[#71717a]">AI Lifecycle</p>
            </AppCard>
          </div>

          {/* ══════════════════════════════════════════════════════ */}
          {/* STATE 1: PROCESSING STATE                             */}
          {/* ══════════════════════════════════════════════════════ */}
          {isProcessing && (
            <AIProcessingStepper
              currentStage={currentStage}
              meetingTitle={meeting.title}
              className="my-2"
            />
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* STATE 2: FAILED STATE                                 */}
          {/* ══════════════════════════════════════════════════════ */}
          {isFailed && !isProcessing && (
            <AppCard variant="dashboard" className="p-6 border-rose-500/30 bg-rose-500/[0.04]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                    <AlertCircle size={20} />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-[#f4f4f5]">AI Transcript Processing Failed</h2>
                    <p className="text-xs text-[#9ca3af] leading-relaxed">
                      {errorMessage?.includes('Failed to reach transcript service') || errorMessage?.includes('fetch failed')
                        ? 'The transcript processing service (port 8001) could not be reached. Ensure transcript-processing-service is running and click Retry.'
                        : errorMessage?.includes('No speech detected')
                        ? 'No speech audio was detected during this meeting. You can speak next time or upload a transcript.'
                        : 'Your meeting was saved, but AI processing could not complete.'}
                    </p>
                    {errorMessage && (
                      <p className="text-[11px] font-mono text-[#71717a] pt-1">
                        Reason: {errorMessage}
                      </p>
                    )}
                  </div>
                </div>

                <AppButton
                  variant="mono"
                  size="sm"
                  disabled={isRetrying || Boolean(errorMessage && errorMessage.includes('No speech detected'))}
                  onClick={handleRetry}
                  className="shrink-0 gap-1.5"
                >
                  {isRetrying ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Retrying...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={13} />
                      <span>Retry processing</span>
                    </>
                  )}
                </AppButton>
              </div>

              {retryError && (
                <p className="text-xs text-rose-400 mt-3 pt-3 border-t border-rose-500/20">
                  {retryError}
                </p>
              )}
            </AppCard>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* STATE 3: COMPLETED STATE (AI Summary & Work Items)    */}
          {/* ══════════════════════════════════════════════════════ */}
          {aiSummaryText && (
            <AppCard
              variant="dashboard"
              title={
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-400" />
                  <span className="text-sm font-semibold text-[#f4f4f5]">AI Executive Summary</span>
                </div>
              }
              className="p-6"
            >
              <div className="prose prose-invert max-w-none text-xs leading-relaxed text-[#d4d4d8] whitespace-pre-wrap">
                {aiSummaryText}
              </div>
            </AppCard>
          )}

          {/* Action Items */}
          {rawActionItems.length > 0 && (
            <AppCard
              variant="dashboard"
              title={
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-sm font-semibold text-[#f4f4f5]">
                    Action Items ({rawActionItems.length})
                  </span>
                </div>
              }
              className="p-6"
            >
              <div className="space-y-2">
                {rawActionItems.map((item: any, idx: number) => {
                  const text = typeof item === 'string' ? item : item.text || item.description || item.title;
                  const assignee = typeof item === 'object' ? item.assignee : null;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg border border-[#242636] bg-[#14151e]"
                    >
                      <div className="w-5 h-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                        <Check size={12} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#f4f4f5] leading-relaxed">{text}</p>
                        {assignee && (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#9ca3af]">
                            <UserCheck size={11} className="text-blue-400" />
                            <span>Assignee: {assignee}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </AppCard>
          )}

          {/* Generated Tasks (Tickets) */}
          <AppCard
            variant="dashboard"
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={16} className="text-indigo-400" />
                  <span className="text-sm font-semibold text-[#f4f4f5]">
                    Generated Tasks ({tickets.length})
                  </span>
                </div>
                {tickets.length > 0 && (
                  <button
                    onClick={() => navigate(`/teams/${meeting.team_id}/kanban?meeting_id=${meeting.id}`)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
                  >
                    <span>View all on Kanban</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            }
            className="p-6"
          >
            {tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((t, idx) => {
                  const taskId = t.ticket_id || t.id;
                  return (
                    <div
                      key={taskId || idx}
                      className="p-4 rounded-xl border border-[#242636] bg-[#14151e] hover:border-[#383b54] transition-all space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#1c1d27] border border-[#2c2f42] text-zinc-300">
                            {taskId.slice(0, 8)}
                          </span>
                          <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${getTypeBadgeClass(t.type)}`}>
                            {t.type || 'task'}
                          </span>
                          <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${getPriorityBadgeClass(t.priority)}`}>
                            {t.priority || 'medium'}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#1c1d27] text-zinc-300 border border-[#2c2f42]">
                            {t.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#9ca3af]">
                          {t.assignee && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold">
                                {getInitials(t.assignee)}
                              </div>
                              <span className="text-[#f4f4f5]">{t.assignee}</span>
                            </div>
                          )}
                          {(t.resolved_due_date || t.due_date) && (
                            <div className="flex items-center gap-1 text-[11px] text-[#71717a]">
                              <Calendar size={12} />
                              <span>{t.resolved_due_date || t.due_date}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <h3 className="text-sm font-semibold text-[#f4f4f5]">{t.title}</h3>

                      {t.description && (
                        <p className="text-xs text-[#9ca3af] leading-relaxed line-clamp-2">
                          {t.description}
                        </p>
                      )}

                      {/* Source Action Item Provenance */}
                      {t.source_action_item && (
                        <div className="flex items-start gap-1.5 text-[11px] text-[#71717a] pt-1">
                          <Tag size={12} className="shrink-0 mt-0.5 text-blue-400/70" />
                          <span>Source action: <span className="text-zinc-400 italic">"{t.source_action_item}"</span></span>
                        </div>
                      )}

                      {/* Acceptance Criteria */}
                      {Array.isArray(t.acceptance_criteria) && t.acceptance_criteria.length > 0 && (
                        <div className="pt-2 border-t border-[#202230] space-y-1">
                          <span className="text-[10.5px] uppercase font-mono text-[#71717a]">Acceptance Criteria:</span>
                          <ul className="space-y-0.5">
                            {t.acceptance_criteria.map((ac, acIdx) => (
                              <li key={acIdx} className="text-xs text-[#a1a1aa] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                                <span>{ac}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <Sparkles size={20} className="mx-auto text-[#71717a]" />
                <p className="text-xs text-[#9ca3af]">
                  {isProcessing
                    ? 'AI is generating tasks from meeting dialogue...'
                    : isFailed
                    ? 'Processing failed; tasks could not be extracted.'
                    : 'No actionable work items were extracted from this meeting.'}
                </p>
              </div>
            )}
          </AppCard>

          {/* Participants Card */}
          <AppCard
            variant="dashboard"
            title={
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#9ca3af]" />
                <span className="text-sm font-semibold text-[#f4f4f5]">Participants ({participants.length})</span>
              </div>
            }
            className="p-6"
          >
            <div className="flex flex-wrap gap-2">
              {participants.map((p: MeetingParticipant) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#242636] bg-[#14151e]"
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold bg-[#1d1f2b] border border-[#2c2f42] text-[#f4f4f5]">
                    {getInitials(p.full_name)}
                  </div>
                  <span className="text-xs font-medium text-[#f4f4f5]">{p.full_name}</span>
                  {p.role === 'host' && <RoleBadge role="host" size="sm" />}
                </div>
              ))}
            </div>
          </AppCard>

          {/* Transcript Viewer Accordion */}
          <div className="border border-[#242636] rounded-xl bg-[#111217] overflow-hidden">
            <button
              onClick={() => setShowTranscript(prev => !prev)}
              className="w-full flex items-center justify-between p-4 text-xs font-semibold text-[#f4f4f5] hover:bg-[#161822] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-[#9ca3af]" />
                <span>Meeting Transcript</span>
                {transcriptData?.cleaned_transcript_path && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    14-Stage Preprocessed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {transcriptData?.content && (
                  <span className="text-[11px] font-mono text-[#71717a]">
                    {transcriptData.content.length} chars
                  </span>
                )}
                {showTranscript ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>
            </button>

            <AnimatePresence>
              {showTranscript && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-[#242636] p-4 bg-[#0d0e13] space-y-3"
                >
                  {transcriptData?.content ? (
                    <>
                      <div className="border border-[#202230] rounded-lg p-3 max-h-80 overflow-y-auto bg-[#0a0a0f]">
                        <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed text-[#a1a1aa]">
                          {transcriptData.content}
                        </pre>
                      </div>
                      <div className="flex justify-end">
                        <AppButton variant="mono-outline" size="sm" onClick={handleDownloadTranscript} className="gap-1.5">
                          <Download size={13} />
                          <span>Download Transcript (.txt)</span>
                        </AppButton>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-center py-4 text-[#71717a]">
                      {transcriptLoading ? 'Loading transcript...' : 'No transcript recorded for this meeting.'}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
