import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, Users, CheckCircle, Download, LayoutDashboard,
  Sparkles, AlertCircle, RefreshCw, Loader2, FileText,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { meetingService } from '../../services/meeting.service';
import { useMeeting } from '../../hooks/useMeeting';
import { useMeetingParticipants } from '../../hooks/useMeetingParticipants';
import AppLayout from '../../layouts/AppLayout';
import { MeetingStatusBadge, MeetingTypeBadge, RoleBadge } from '../../components/ui/Badge';
import { AppButton, AppCard } from '../../components/app-ui';
import type { MeetingParticipant } from '../../types';

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
  return `${hour}:${(m ?? 0).toString().padStart(2, '0')} ${ampm}`;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function MeetingSummaryPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const { data: meeting, isLoading: meetingLoading } = useMeeting(meetingId);
  const { data: participants = [] } = useMeetingParticipants(meetingId);
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

  const loading = meetingLoading;

  const handleRetry = async () => {
    if (!meetingId) return;
    setIsRetrying(true);
    setRetryError(null);
    try {
      await meetingService.retryTranscript(meetingId);
      await queryClient.invalidateQueries({ queryKey: ['transcript', meetingId] });
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--app-border)', borderTopColor: 'var(--app-text-primary)' }} />
        </div>
      </AppLayout>
    );
  }

  if (!meeting) {
    return (
      <AppLayout>
        <div className="p-8 text-center space-y-4">
          <p className="text-xs font-mono" style={{ color: 'var(--app-text-secondary)' }}>Summary details not found</p>
          <AppButton variant="mono" size="sm" onClick={() => navigate(-1)}>
            Go Back
          </AppButton>
        </div>
      </AppLayout>
    );
  }

  const transcriptStatus: 'raw_stored' | 'processing' | 'ready_for_ai' | 'failed' | undefined = transcriptData?.status;
  const transcriptContent = transcriptData?.content || '';

  return (
    <AppLayout teamId={meeting.team_id}>
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
          style={{ color: 'var(--app-text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--app-text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--app-text-secondary)'}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="pb-4 border-b space-y-2" style={{ borderColor: 'var(--app-border-subtle)' }}>
            <div className="flex items-center gap-2">
              <MeetingStatusBadge status={meeting.status} size="md" />
              <MeetingTypeBadge type={meeting.meeting_type} size="md" />
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: 'var(--app-text-primary)' }}>{meeting.title}</h1>
            <p className="text-xs font-mono" style={{ color: 'var(--app-text-muted)' }}>
              {formatDateLong(meeting.date)} · {formatTime12h(meeting.start_time)} - {formatTime12h(meeting.end_time)} ({meeting.timezone || 'UTC'})
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AppCard variant="dashboard" className="text-center p-4">
              <Clock size={16} className="mx-auto mb-2" style={{ color: 'var(--app-text-secondary)' }} />
              <p className="text-xl font-bold" style={{ color: 'var(--app-text-primary)' }}>{meeting.duration_minutes || 0}</p>
              <p className="text-[10px] font-mono uppercase mt-0.5" style={{ color: 'var(--app-text-muted)' }}>Minutes</p>
            </AppCard>
            <AppCard variant="dashboard" className="text-center p-4">
              <Users size={16} className="mx-auto mb-2" style={{ color: 'var(--app-text-secondary)' }} />
              <p className="text-xl font-bold" style={{ color: 'var(--app-text-primary)' }}>{participants.length}</p>
              <p className="text-[10px] font-mono uppercase mt-0.5" style={{ color: 'var(--app-text-muted)' }}>Participants</p>
            </AppCard>
            <AppCard variant="dashboard" className="text-center p-4">
              <FileText size={16} className="mx-auto mb-2" style={{ color: 'var(--app-text-secondary)' }} />
              <p className="text-xl font-bold" style={{ color: 'var(--app-text-primary)' }}>
                {transcriptContent ? `${transcriptContent.split('\n').filter(Boolean).length}` : '0'}
              </p>
              <p className="text-[10px] font-mono uppercase mt-0.5" style={{ color: 'var(--app-text-muted)' }}>Segments</p>
            </AppCard>
            <AppCard variant="dashboard" className="text-center p-4">
              <Sparkles size={16} className="mx-auto mb-2 text-blue-400" />
              <p className="text-xs font-semibold mt-1" style={{ color: 'var(--app-text-primary)' }}>Phase 2</p>
              <p className="text-[10px] font-mono uppercase mt-0.5" style={{ color: 'var(--app-text-muted)' }}>AI Processing</p>
            </AppCard>
          </div>

          {/* Real Transcript Pipeline Status Banner */}
          <AppCard variant="dashboard" className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: 'var(--app-text-secondary)' }}>Transcript Status:</span>
                  {transcriptStatus === 'raw_stored' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <FileText size={11} /> RAW STORED
                    </span>
                  )}
                  {transcriptStatus === 'processing' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Loader2 size={11} className="animate-spin" /> PROCESSING
                    </span>
                  )}
                  {transcriptStatus === 'ready_for_ai' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle size={11} /> READY FOR AI
                    </span>
                  )}
                  {transcriptStatus === 'failed' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <AlertCircle size={11} /> FAILED
                    </span>
                  )}
                  {!transcriptStatus && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                      {transcriptLoading ? 'CHECKING...' : 'NO TRANSCRIPT'}
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>
                  {transcriptStatus === 'raw_stored' && 'Transcript saved. Your processed transcript will be ready in a few minutes...'}
                  {transcriptStatus === 'processing' && 'Cleaning and preparing transcript through the 14-stage preprocessing pipeline... Your processed transcript will be ready in a few minutes.'}
                  {transcriptStatus === 'ready_for_ai' && 'Transcript preprocessing completed. Cleaned and normalized for AI models.'}
                  {transcriptStatus === 'failed' && (transcriptData?.error_message ? `Transcript processing failed: ${transcriptData.error_message}` : 'Transcript processing failed.')}
                  {!transcriptStatus && (transcriptLoading ? 'Retrieving transcript details...' : 'No transcript recorded for this meeting.')}
                </p>
              </div>

              {transcriptStatus === 'failed' && (
                <div className="flex items-center gap-2 shrink-0">
                  <AppButton
                    variant="mono"
                    size="sm"
                    disabled={isRetrying}
                    onClick={handleRetry}
                  >
                    {isRetrying ? (
                      <>
                        <Loader2 size={13} className="animate-spin mr-1.5" /> Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={13} className="mr-1.5" /> Retry Processing
                      </>
                    )}
                  </AppButton>
                </div>
              )}
            </div>
            {retryError && (
              <p className="text-xs text-rose-400 mt-2">Error during retry: {retryError}</p>
            )}
          </AppCard>

          {/* Participants */}
          <AppCard
            variant="dashboard"
            title={
              <div className="flex items-center gap-2">
                <Users size={15} style={{ color: 'var(--app-text-secondary)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--app-text-primary)' }}>Participants ({participants.length})</span>
              </div>
            }
          >
            <div className="flex flex-wrap gap-2">
              {participants.map((p: MeetingParticipant) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}>
                    {getInitials(p.full_name)}
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>{p.full_name}</span>
                  {p.role === 'host' && <RoleBadge role="host" size="sm" />}
                </div>
              ))}
            </div>
          </AppCard>

          {/* AI Notice Card - Clear Phase 2 Distinction */}
          <div className="rounded-xl border p-4 space-y-1.5" style={{ backgroundColor: 'rgba(59, 130, 246, 0.04)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-blue-400" />
              <span className="text-xs font-semibold text-blue-400">AI Intelligence — Pending Phase 2</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--app-text-secondary)' }}>
              AI Executive Summary, Action Item extraction, and automated Jira/Kanban ticket generation will be generated in the upcoming AI phase.
              {transcriptStatus === 'ready_for_ai'
                ? ' The 14-stage cleaned transcript is verified and ready for AI models.'
                : ' Transcript preprocessing must be completed before AI generation can run.'}
            </p>
          </div>

          {/* Transcript Viewer */}
          {transcriptContent ? (
            <AppCard
              variant="dashboard"
              title={
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <FileText size={15} style={{ color: 'var(--app-text-secondary)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--app-text-primary)' }}>Meeting Transcript</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }}>
                    {transcriptData?.cleaned_transcript_path ? '14-Stage Preprocessed' : 'Raw Transcript'}
                  </span>
                </div>
              }
            >
              <div className="border rounded-xl p-4 max-h-80 overflow-y-auto" style={{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)' }}>
                <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed" style={{ color: 'var(--app-text-secondary)' }}>{transcriptContent}</pre>
              </div>
            </AppCard>
          ) : (
            <AppCard variant="dashboard">
              <p className="text-xs text-center py-6" style={{ color: 'var(--app-text-muted)' }}>
                {transcriptLoading ? 'Loading transcript...' : 'No transcript recorded for this meeting yet.'}
              </p>
            </AppCard>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <AppButton variant="mono-outline" size="sm" onClick={() => navigate(`/teams/${meeting.team_id}/meetings`)}>
              Back to Meetings
            </AppButton>
            <div className="flex gap-3 ml-auto">
              {transcriptContent && (
                <AppButton variant="mono-outline" size="sm" onClick={handleDownloadTranscript}>
                  <Download size={14} className="mr-1" /> Download Transcript
                </AppButton>
              )}
              <AppButton variant="mono" size="sm" onClick={() => navigate(`/teams/${meeting.team_id}/board`)}>
                <LayoutDashboard size={14} className="mr-1" /> View Board
              </AppButton>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
