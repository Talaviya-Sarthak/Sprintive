import React, { useState } from 'react';
import {
  Calendar,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  Video,
} from 'lucide-react';
import type { KanbanTask, KanbanStatus, TaskPriority } from '../types';

interface KanbanCardProps {
  task: KanbanTask;
  onClick: (task: KanbanTask) => void;
  onMoveStatus: (taskId: string, newStatus: KanbanStatus) => void;
}

const STATUS_ORDER: KanbanStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];

function getTagStyle(label: string) {
  const l = label.toLowerCase();
  if (l.includes('auth') || l.includes('sec') || l.includes('crit')) {
    return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30';
  }
  if (l.includes('webrtc') || l.includes('realtime') || l.includes('stream') || l.includes('net')) {
    return 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border-cyan-500/30';
  }
  if (l.includes('audio') || l.includes('media') || l.includes('video') || l.includes('voice')) {
    return 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30';
  }
  if (l.includes('ui') || l.includes('ux') || l.includes('frontend') || l.includes('access')) {
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30';
  }
  if (l.includes('db') || l.includes('data') || l.includes('devops') || l.includes('perf')) {
    return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30';
  }
  if (l.includes('transc') || l.includes('export') || l.includes('pipe') || l.includes('bug')) {
    return 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30';
  }
  return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30';
}

function getAvatarTint(name: string) {
  const tints = [
    'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30',
    'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30',
    'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
    'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30',
    'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
  return tints[Math.abs(hash) % tints.length];
}

export default function KanbanCard({
  task,
  onClick,
  onMoveStatus,
}: KanbanCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const currentIndex = STATUS_ORDER.indexOf(task.status);
  const prevStatus = currentIndex > 0 ? STATUS_ORDER[currentIndex - 1] : null;
  const nextStatus = currentIndex < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIndex + 1] : null;

  const assigneeName = task.assignee?.name ?? 'Unassigned';
  const firstName = assigneeName.split(' ')[0];
  const initials =
    task.assignee?.name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U';

  const avatarStyle = getAvatarTint(assigneeName);

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const getPriorityConfig = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return {
          borderClass: 'border-l-[3px] border-l-rose-500',
          badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
          dotClass: 'bg-rose-500 animate-pulse',
          label: 'URGENT',
        };
      case 'high':
        return {
          borderClass: 'border-l-[3px] border-l-amber-500',
          badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
          dotClass: 'bg-amber-500',
          label: 'HIGH',
        };
      case 'medium':
        return {
          borderClass: 'border-l-[3px] border-l-blue-500',
          badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
          dotClass: 'bg-blue-500',
          label: 'MEDIUM',
        };
      case 'low':
      default:
        return {
          borderClass: 'border-l-[3px] border-l-slate-400',
          badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
          dotClass: 'bg-slate-400',
          label: 'LOW',
        };
    }
  };

  const priorityConfig = getPriorityConfig(task.priority);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Limit to at most 2 labels for compact scanning
  const displayLabels = task.labels?.slice(0, 2) ?? [];
  const remainingLabelsCount = (task.labels?.length ?? 0) - displayLabels.length;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(task)}
      className={`group relative rounded-xl border px-3 py-2.5 transition-all duration-150 cursor-pointer select-none ${
        priorityConfig.borderClass
      } ${
        isDragging
          ? 'opacity-40 border-dashed border-[var(--app-border-focus)] scale-[0.98]'
          : 'bg-[var(--kanban-card-bg)] hover:bg-[var(--kanban-card-hover)] border-[var(--kanban-card-border)] hover:border-[var(--kanban-card-border-hover)] shadow-xs hover:shadow-md'
      }`}
    >
      {/* Top Header Row: Priority & Quick Move Arrows */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5">
          <GripVertical
            size={11}
            className="text-[var(--app-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 -ml-1"
          />
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase tracking-wider border ${priorityConfig.badgeClass}`}
          >
            <span className={`w-1 h-1 rounded-full ${priorityConfig.dotClass}`} />
            {priorityConfig.label}
          </span>
        </div>

        {/* Quick Shift Buttons on Hover */}
        <div
          className={`flex items-center gap-0.5 transition-opacity ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {prevStatus && (
            <button
              type="button"
              title={`Move to ${prevStatus.replace('_', ' ')}`}
              onClick={() => onMoveStatus(task.id, prevStatus)}
              className="p-0.5 rounded text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-surface-hover)] transition-colors cursor-pointer"
            >
              <ChevronLeft size={12} />
            </button>
          )}
          {nextStatus && (
            <button
              type="button"
              title={`Move to ${nextStatus.replace('_', ' ')}`}
              onClick={() => onMoveStatus(task.id, nextStatus)}
              className="p-0.5 rounded text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-surface-hover)] transition-colors cursor-pointer"
            >
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Task Title */}
      <h4 className="text-xs font-semibold text-[var(--kanban-card-text-title)] group-hover:text-[var(--app-text-primary)] transition-colors leading-snug line-clamp-2 mb-1">
        {task.title}
      </h4>

      {/* Short Preview Description (Single Line Preview) */}
      {task.description && (
        <p className="text-[11px] text-[var(--kanban-card-text-desc)] leading-normal line-clamp-1 mb-2">
          {task.description}
        </p>
      )}

      {/* Compact Labels (Max 2 displayed) */}
      {displayLabels.length > 0 && (
        <div className="flex items-center gap-1 mb-2">
          {displayLabels.map(label => (
            <span
              key={label}
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-mono font-medium border ${getTagStyle(
                label
              )}`}
            >
              #{label}
            </span>
          ))}
          {remainingLabelsCount > 0 && (
            <span className="text-[9px] font-mono text-[var(--app-text-muted)] px-1 py-0.5 rounded bg-[var(--app-surface-subtle)] border border-[var(--app-border)]">
              +{remainingLabelsCount}
            </span>
          )}
        </div>
      )}

      {/* Originating Meeting Badge */}
      {task.meeting_title && (
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--app-text-muted)] font-mono truncate mb-2">
          <Video size={10} className="text-[var(--app-text-dim)] shrink-0" />
          <span className="truncate">{task.meeting_title}</span>
        </div>
      )}

      {/* Card Footer: Assignee & Due Date */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--kanban-card-border)] text-xs">
        <div className="flex items-center gap-1.5 min-w-0" title={assigneeName}>
          <div
            className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0 ${avatarStyle}`}
          >
            {task.assignee?.avatar ? (
              <img
                src={task.assignee.avatar}
                alt=""
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              initials
            )}
          </div>
          <span className="text-[11px] font-medium text-[var(--app-text-secondary)] truncate max-w-[85px]">
            {firstName}
          </span>
        </div>

        {formattedDueDate && (
          <div className="flex items-center gap-1 text-[10.5px] text-[var(--app-text-muted)] shrink-0 font-mono bg-[var(--app-surface-subtle)] px-1.5 py-0.5 rounded border border-[var(--app-border)]">
            <Calendar size={10} className="text-[var(--app-text-dim)]" />
            <span>{formattedDueDate}</span>
          </div>
        )}
      </div>
    </div>
  );
}
