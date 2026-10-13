import React, { useState, useEffect } from 'react';
import { Calendar, Tag, Trash2 } from 'lucide-react';
import { AppModal } from '../../../components/app-ui/AppModal';
import { AppButton } from '../../../components/app-ui/AppButton';
import { AppInput } from '../../../components/app-ui/AppInput';
import { AppSelect } from '../../../components/app-ui/AppSelect';
import { MOCK_TEAM_MEMBERS } from '../data/mockKanbanData';
import type { KanbanTask, KanbanStatus, TaskPriority } from '../types';

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<KanbanTask>) => void;
  onDelete?: (taskId: string) => void;
  initialTask?: KanbanTask | null;
  defaultStatus?: KanbanStatus;
}

const STATUS_OPTIONS: { value: KanbanStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; desc: string }[] = [
  { value: 'low', label: 'Low', desc: 'Non-blocking enhancement' },
  { value: 'medium', label: 'Medium', desc: 'Standard sprint delivery' },
  { value: 'high', label: 'High', desc: 'Important feature milestone' },
  { value: 'urgent', label: 'Urgent', desc: 'Critical blocker / immediate' },
];

export default function TaskDialog({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialTask,
  defaultStatus = 'backlog',
}: TaskDialogProps) {
  const isEditing = Boolean(initialTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<KanbanStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [labelsText, setLabelsText] = useState('');
  const [error, setError] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setStatus(initialTask.status);
      setPriority(initialTask.priority);
      setAssigneeId(initialTask.assignee?.id || '');
      setDueDate(initialTask.dueDate || '');
      setLabelsText(initialTask.labels?.join(', ') || '');
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('medium');
      setAssigneeId(MOCK_TEAM_MEMBERS[0]?.id || '');
      setDueDate('');
      setLabelsText('');
    }
    setError('');
    setShowConfirmDelete(false);
  }, [initialTask, defaultStatus, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    const selectedAssignee = MOCK_TEAM_MEMBERS.find(m => m.id === assigneeId);

    const labels = labelsText
      .split(',')
      .map(l => l.trim().toLowerCase())
      .filter(Boolean);

    onSave({
      ...(initialTask ? { id: initialTask.id } : {}),
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignee: selectedAssignee,
      dueDate: dueDate || undefined,
      labels: labels.length > 0 ? labels : undefined,
      source: initialTask?.source ?? 'manual',
    });

    onClose();
  };

  const handleDelete = () => {
    if (initialTask && onDelete) {
      onDelete(initialTask.id);
      onClose();
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Task' : 'Create New Task'}
      description={
        isEditing
          ? 'Update task specifications, priority level, and workflow state.'
          : 'Define a new action item or deliverable for this workspace.'
      }
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {isEditing && onDelete && (
              <>
                {!showConfirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#ef4444] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#ef4444] font-medium">Delete task?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="text-xs bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 px-2 py-1 rounded-md font-semibold hover:bg-[#ef4444]/20 cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="text-xs text-[#a1a1aa] hover:text-[#f4f4f5] px-1 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <AppButton variant="mono-ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </AppButton>
            <AppButton variant="mono" size="sm" type="submit" form="task-dialog-form">
              {isEditing ? 'Save Changes' : 'Create Task'}
            </AppButton>
          </div>
        </div>
      }
    >
      <form id="task-dialog-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <AppInput
          label="Task Title *"
          placeholder="e.g. Implement WebSocket reconnection strategy"
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
          error={error}
          autoFocus
        />

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-mono font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Detailed description, acceptance criteria, or technical notes..."
            className="w-full border rounded-lg p-3 text-xs outline-none transition-colors resize-none placeholder:text-[var(--app-text-dim)]"
            style={{
              backgroundColor: 'var(--app-surface-card)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text-primary)',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--app-border-focus)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--app-border)';
            }}
          />
        </div>

        {/* Two Column Grid: Status & Assignee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AppSelect
            label="Column / Status"
            value={status}
            onChange={e => setStatus(e.target.value as KanbanStatus)}
            options={STATUS_OPTIONS}
          />

          <AppSelect
            label="Assignee"
            value={assigneeId}
            onChange={e => setAssigneeId(e.target.value)}
            options={[
              { value: '', label: 'Unassigned' },
              ...MOCK_TEAM_MEMBERS.map(m => ({
                value: m.id,
                label: `${m.name} (${m.role ?? 'Member'})`,
              })),
            ]}
          />
        </div>

        {/* Priority Selector (Subtle Themed Badges) */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-mono font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
            Priority Level
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRIORITY_OPTIONS.map(opt => {
              const isSelected = priority === opt.value;

              const getSelectedStyle = () => {
                if (!isSelected) {
                  return 'border-[var(--app-border)] bg-[var(--app-surface-subtle)] text-[var(--app-text-secondary)] hover:border-[var(--app-border-focus)] hover:bg-[var(--app-surface-hover)]';
                }
                switch (opt.value) {
                  case 'urgent':
                    return 'border-rose-500/60 bg-rose-500/15 text-rose-700 dark:text-rose-200 shadow-sm';
                  case 'high':
                    return 'border-amber-500/60 bg-amber-500/15 text-amber-800 dark:text-amber-200 shadow-sm';
                  case 'medium':
                    return 'border-blue-500/60 bg-blue-500/15 text-blue-700 dark:text-blue-200 shadow-sm';
                  case 'low':
                  default:
                    return 'border-slate-500/60 bg-slate-500/15 text-slate-700 dark:text-slate-200';
                }
              };

              const getDotColor = () => {
                switch (opt.value) {
                  case 'urgent':
                    return 'bg-rose-500';
                  case 'high':
                    return 'bg-amber-500';
                  case 'medium':
                    return 'bg-blue-500';
                  case 'low':
                  default:
                    return 'bg-slate-400';
                }
              };

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${getSelectedStyle()}`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />
                    <span className="text-xs font-semibold uppercase font-mono tracking-wider">
                      {opt.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--app-text-muted)] mt-1 line-clamp-1">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Two Column Grid: Due Date & Labels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
              Due Date
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none text-[var(--app-text-muted)]">
                <Calendar size={13} />
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-xs outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--app-surface-card)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text-primary)',
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono font-medium uppercase tracking-wider text-[var(--app-text-muted)]">
              Labels (comma separated)
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none text-[var(--app-text-muted)]">
                <Tag size={13} />
              </div>
              <input
                type="text"
                value={labelsText}
                onChange={e => setLabelsText(e.target.value)}
                placeholder="e.g. auth, security, ui"
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-xs outline-none transition-colors placeholder:text-[var(--app-text-dim)]"
                style={{
                  backgroundColor: 'var(--app-surface-card)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text-primary)',
                }}
              />
            </div>
          </div>
        </div>
      </form>
    </AppModal>
  );
}
