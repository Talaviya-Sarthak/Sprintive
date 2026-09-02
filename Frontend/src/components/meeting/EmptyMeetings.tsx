import { Calendar, Plus } from 'lucide-react';
import { AppButton } from '../app-ui';

interface EmptyMeetingsProps {
  onCreate?: () => void;
  message?: string;
}

export default function EmptyMeetings({ onCreate, message }: EmptyMeetingsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#141417] border border-[#27272a] flex items-center justify-center mb-5">
        <Calendar size={24} className="text-[#52525b]" />
      </div>
      <h3 className="text-[15px] font-semibold text-[#f4f4f5] mb-1.5">
        {message || 'No meetings yet'}
      </h3>
      <p className="text-[13px] text-[#71717a] mb-6 max-w-sm leading-relaxed">
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
