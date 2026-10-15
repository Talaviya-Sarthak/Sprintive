import { useState } from 'react';
import { AppModal, AppInput, AppSelect, AppButton } from '../app-ui';
import type { Meeting, MeetingType } from '../../types';

interface CreateMeetingModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: Partial<Meeting>) => void;
  teamMembers: { user_id: string; full_name: string }[];
}

const meetingTypes: { value: MeetingType; label: string }[] = [
  { value: 'daily_scrum', label: 'Daily Scrum' },
  { value: 'sprint_planning', label: 'Sprint Planning' },
  { value: 'review', label: 'Sprint Review' },
  { value: 'retrospective', label: 'Retrospective' },
  { value: 'custom', label: 'Custom' },
];

const defaultUserTimezone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
})();

const baseTimezones = [
  'UTC', 'Asia/Kolkata', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai',
];

const timezones = baseTimezones.includes(defaultUserTimezone)
  ? baseTimezones
  : [defaultUserTimezone, ...baseTimezones];

export default function CreateMeetingModal({ open, onClose, onCreate, teamMembers }: CreateMeetingModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingType, setMeetingType] = useState<MeetingType>('daily_scrum');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timezone, setTimezone] = useState(defaultUserTimezone);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [agendaItems, setAgendaItems] = useState<string[]>(['']);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!date) errs.date = 'Date is required';
    if (!startTime) errs.startTime = 'Start time is required';
    if (!endTime) errs.endTime = 'End time is required';
    if (startTime && endTime && startTime >= endTime) errs.endTime = 'End time must be after start time';
    if (teamMembers.length > 0 && selectedParticipants.length === 0) errs.participants = 'Select at least one participant';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const agenda = agendaItems.filter(a => a.trim());
    const today = new Date().toISOString().split('T')[0];

    onCreate({
      title: title.trim(),
      description: description.trim(),
      meeting_type: meetingType,
      date: date || today,
      start_time: startTime,
      end_time: endTime,
      timezone,
      participant_count: selectedParticipants.length + 1,
      agenda: agenda.length > 0 ? agenda : undefined,
    });

    onClose();
    setTitle('');
    setDescription('');
    setMeetingType('daily_scrum');
    setDate('');
    setStartTime('');
    setEndTime('');
    setTimezone(defaultUserTimezone);
    setSelectedParticipants([]);
    setAgendaItems(['']);
    setErrors({});
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const addAgendaItem = () => setAgendaItems(prev => [...prev, '']);
  const updateAgendaItem = (index: number, value: string) => {
    setAgendaItems(prev => prev.map((item, i) => i === index ? value : item));
  };
  const removeAgendaItem = (index: number) => {
    setAgendaItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <AppModal open={open} onClose={onClose} title="Create Meeting Session" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppInput
            label="Meeting Title *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Daily Scrum — Sprint 14"
            error={errors.title}
          />
          <AppSelect
            label="Meeting Type"
            value={meetingType}
            onChange={e => setMeetingType(e.target.value as MeetingType)}
            options={meetingTypes}
          />
        </div>

        <AppInput
          label="Description / Context"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Brief agenda or focus points..."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AppInput
            label="Date *"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            error={errors.date}
          />
          <AppInput
            label="Start Time *"
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            error={errors.startTime}
          />
          <AppInput
            label="End Time *"
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            error={errors.endTime}
          />
        </div>

        <AppSelect
          label="Timezone"
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          options={timezones.map(tz => ({ value: tz, label: tz }))}
        />

        {teamMembers.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-mono font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>Participants *</label>
            {errors.participants && <p className="text-xs text-red-400 font-medium">{errors.participants}</p>}
            <div className="flex flex-wrap gap-2">
              {teamMembers.map(member => (
                <button
                  key={member.user_id}
                  type="button"
                  onClick={() => toggleParticipant(member.user_id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
                  style={{
                    backgroundColor: selectedParticipants.includes(member.user_id) ? 'var(--app-surface-active)' : 'var(--app-surface-subtle)',
                    color: selectedParticipants.includes(member.user_id) ? 'var(--app-text-primary)' : 'var(--app-text-secondary)',
                    borderColor: 'var(--app-border)',
                  }}
                >
                  {member.full_name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-mono font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>Agenda Items</label>
          <div className="space-y-2">
            {agendaItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={item}
                  onChange={e => updateAgendaItem(index, e.target.value)}
                  placeholder={`Agenda item ${index + 1}`}
                  className="flex-1 border rounded-lg px-3 py-2 text-xs outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text-primary)',
                  }}
                />
                {agendaItems.length > 1 && (
                  <button type="button" onClick={() => removeAgendaItem(index)} className="text-red-400 hover:text-red-300 p-1 cursor-pointer">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addAgendaItem}
            className="text-xs font-medium cursor-pointer transition-colors"
            style={{ color: 'var(--app-text-primary)' }}
          >
            + Add agenda item
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--app-border-subtle)' }}>
          <AppButton variant="mono-outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton variant="mono" size="sm" type="submit">
            Create Meeting
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
}