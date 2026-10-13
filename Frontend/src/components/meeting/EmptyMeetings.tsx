import { Calendar, Plus } from 'lucide-react';
import { AppButton } from '../app-ui';

interface EmptyMeetingsProps {
  onCreate?: () => void;
  message?: string;
}

export default function EmptyMeetings({ onCreate, message }: EmptyMeetingsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] flex items-center justify-center mb-5">
        <Calendar size={24} className="text-[var(--app-text-muted)]" />
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--app-text-primary)] mb-1.5">
        {message || 'No meetings yet'}
      </h3>
      <p className="text-[13px] text-[var(--app-text-secondary)] mb-6 max-w-sm leading-relaxed">
        Create your first meeting to start recording and generating AI-powered summaries.
      </p>
      {onCreate && (
        <AppButton variant="mono" size="sm" onClick={onCreate}>
          <Plus size={14} className="mr-1.5" /> Create Meeting
        </AppButton>
      )}
    </div>
  );
}
