import { useState } from 'react';
import Modal from '../ui/Modal';
import Input, { Select, TextArea } from '../ui/Input';
import Button from '../ui/Button';
import type { Meeting, MeetingType } from '../../types';

interface EditMeetingModalProps {
  open: boolean;
  onClose: () => void;
  onUpdate: (data: Partial<Meeting>) => void;
  meeting: Meeting | null;
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

export default function EditMeetingModal({ open, onClose, onUpdate, meeting, teamMembers: _teamMembers }: EditMeetingModalProps) {
  const [title, setTitle] = useState(meeting?.title ?? '');
  const [description, setDescription] = useState(meeting?.description ?? '');
  const [meetingType, setMeetingType] = useState<MeetingType>(meeting?.meeting_type ?? 'daily_scrum');
  const [date, setDate] = useState(meeting?.date ?? '');
  const [startTime, setStartTime] = useState(meeting?.start_time ?? '');
  const [endTime, setEndTime] = useState(meeting?.end_time ?? '');
  const [timezone, setTimezone] = useState(meeting?.timezone ?? 'America/New_York');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useState(() => {
    if (meeting) {
      setTitle(meeting.title);
      setDescription(meeting.description ?? '');
      setMeetingType(meeting.meeting_type);
      setDate(meeting.date);
      setStartTime(meeting.start_time);
      setEndTime(meeting.end_time);
      setTimezone(meeting.timezone);
    }
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!date) errs.date = 'Date is required';
    if (!startTime) errs.startTime = 'Start time is required';
    if (!endTime) errs.endTime = 'End time is required';
    if (startTime && endTime && startTime >= endTime) errs.endTime = 'End time must be after start time';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onUpdate({
      title: title.trim(),
      description: description.trim(),
      meeting_type: meetingType,
      date,
      start_time: startTime,
      end_time: endTime,
      timezone,
    });

    onClose();
    setErrors({});
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Meeting" maxWidth="max-w-2xl">
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

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}