import { Search, X, Plus } from 'lucide-react';
import type { MeetingStatus, MeetingType } from '../../types';
import { AppInput, AppButton } from '../app-ui';

interface MeetingHeaderProps {
  title: string;
  description?: string;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: MeetingStatus | 'all';
  onStatusFilterChange: (value: MeetingStatus | 'all') => void;
  typeFilter: MeetingType | 'all';
  onTypeFilterChange: (value: MeetingType | 'all') => void;
  onCreateClick: () => void;
}

const statusOptions: { value: MeetingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Live' },
  { value: 'ended', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const typeOptions: { value: MeetingType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'daily_scrum', label: 'Daily Scrum' },
  { value: 'sprint_planning', label: 'Sprint Planning' },
  { value: 'review', label: 'Sprint Review' },
  { value: 'retrospective', label: 'Retrospective' },
  { value: 'custom', label: 'Custom' },
];

export default function MeetingHeader({
  title,
  description,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  onCreateClick,
}: MeetingHeaderProps) {
  return (
    <div className="space-y-4 pb-6 border-b border-[#1f1f23]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#f4f4f5] tracking-tight">{title}</h1>
          {description && <p className="text-xs text-[#a1a1aa] mt-1">{description}</p>}
        </div>
        <AppButton variant="mono" size="sm" onClick={onCreateClick}>
          <Plus size={14} className="mr-1.5" /> New Meeting
        </AppButton>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <AppInput
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Filter meetings by title or sprint..."
            icon={<Search size={13} />}
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#f4f4f5] cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value as MeetingStatus | 'all')}
            className="bg-[#141417] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-[#f4f4f5] outline-none focus:border-[#3f3f46] transition-colors cursor-pointer"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[#141417] text-[#f4f4f5]">
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={e => onTypeFilterChange(e.target.value as MeetingType | 'all')}
            className="bg-[#141417] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-[#f4f4f5] outline-none focus:border-[#3f3f46] transition-colors cursor-pointer"
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[#141417] text-[#f4f4f5]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
