import { Search, X } from 'lucide-react';
import type { MeetingStatus, MeetingType } from '../../types';

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
  { value: 'all', label: 'All' },
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
  title, description, search, onSearchChange,
  statusFilter, onStatusFilterChange,
  typeFilter, onTypeFilterChange,
  onCreateClick,
}: MeetingHeaderProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">{title}</h1>
          {description && <p className="text-sm text-[#94A3B8] mt-1">{description}</p>}
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm transition-colors shadow-lg shadow-[#3B82F6]/20 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          New Meeting
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#475569]" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search meetings..."
            className="w-full bg-[#111827] border border-white/8 rounded-xl pl-10 pr-9 py-2.5 text-sm text-[#CBD5E1] placeholder-[#475569] outline-none focus:border-[#3B82F6] transition-colors"
          />
          {search && (
            <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94A3B8]">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value as MeetingStatus | 'all')}
            className="bg-[#111827] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-[#CBD5E1] outline-none focus:border-[#3B82F6] transition-colors"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={e => onTypeFilterChange(e.target.value as MeetingType | 'all')}
            className="bg-[#111827] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-[#CBD5E1] outline-none focus:border-[#3B82F6] transition-colors"
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}