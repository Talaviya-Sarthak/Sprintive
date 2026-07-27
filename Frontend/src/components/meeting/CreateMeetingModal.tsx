import { useState } from 'react';
import Modal from '../ui/Modal';
import Input, { Select, TextArea } from '../ui/Input';
import Button from '../ui/Button';
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

const timezones = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata',
];

export default function CreateMeetingModal({ open, onClose, onCreate, teamMembers }: CreateMeetingModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingType, setMeetingType] = useState<MeetingType>('daily_scrum');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
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
    if (selectedParticipants.length === 0) errs.participants = 'Select at least one participant';
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
    setTimezone('America/New_York');
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
    <Modal open={open} onClose={onClose} title="Create Meeting" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Meeting Title *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Daily Scrum — Sprint 14"
            error={errors.title}
          />
          <Select
            label="Meeting Type"
            value={meetingType}
            onChange={e => setMeetingType(e.target.value as MeetingType)}
            options={meetingTypes}
          />
        </div>

        <TextArea
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Meeting description..."
          rows={2}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Date *"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            error={errors.date}
          />
          <Input
            label="Start Time *"
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            error={errors.startTime}
          />
          <Input
            label="End Time *"
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            error={errors.endTime}
          />
        </div>

        <Select
          label="Timezone"
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          options={timezones.map(tz => ({ value: tz, label: tz }))}
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#CBD5E1]">Participants *</label>
          {errors.participants && <p className="text-xs text-red-400">{errors.participants}</p>}
          <div className="flex flex-wrap gap-2">
            {teamMembers.map(member => (
              <button
                key={member.user_id}
                type="button"
                onClick={() => toggleParticipant(member.user_id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  selectedParticipants.includes(member.user_id)
                    ? 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30'
                    : 'bg-white/5 text-[#94A3B8] border-white/10 hover:bg-white/10'
                }`}
              >
                {member.full_name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#CBD5E1]">Agenda</label>
          <div className="space-y-2">
            {agendaItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={item}
                  onChange={e => updateAgendaItem(index, e.target.value)}
                  placeholder={`Agenda item ${index + 1}`}
                  className="flex-1 bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#CBD5E1] placeholder-[#475569] outline-none focus:border-[#3B82F6] transition-colors"
                />
                {agendaItems.length > 1 && (
                  <button type="button" onClick={() => removeAgendaItem(index)} className="text-red-400 hover:text-red-300 p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addAgendaItem} className="text-xs text-[#3B82F6] hover:text-[#60A5FA] font-medium">
            + Add agenda item
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Create Meeting</Button>
        </div>
      </form>
    </Modal>
  );
}