import { CheckCircle, Circle } from 'lucide-react';

interface MeetingTimelineProps {
  agenda?: string[];
  status: string;
}

export default function MeetingTimeline({ agenda, status }: MeetingTimelineProps) {
  if (!agenda || agenda.length === 0) {
    return (
      <div className="text-center py-8 text-[#475569] text-sm">
        No agenda items
      </div>
    );
  }

  const isPast = status === 'ended' || status === 'cancelled';

  return (
    <div className="space-y-0">
      {agenda.map((item, index) => (
        <div key={index} className="flex gap-3 group">
          <div className="flex flex-col items-center">
            {isPast ? (
              <CheckCircle size={16} className="text-green-400 mt-0.5" />
            ) : (
              <Circle size={16} className="text-[#3B82F6] mt-0.5" />
            )}
            {index < agenda.length - 1 && <div className="w-px flex-1 bg-white/8 my-1" />}
          </div>
          <div className="pb-6">
            <p className="text-sm font-medium text-[#CBD5E1]">{item}</p>
          </div>
        </div>
      ))}
    </div>
  );
}