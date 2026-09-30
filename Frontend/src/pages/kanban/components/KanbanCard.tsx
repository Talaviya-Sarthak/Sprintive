import React, { useState } from 'react';
import {
  Calendar,
  GripVertical,
  ChevronRight,
  ChevronLeft,
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
    return 'bg-rose-500/10 text-rose-300 border-rose-500/25';
  }
  if (l.includes('webrtc') || l.includes('realtime') || l.includes('stream') || l.includes('net')) {
    return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25';
  }
  if (l.includes('audio') || l.includes('media') || l.includes('video') || l.includes('voice')) {
    return 'bg-violet-500/10 text-violet-300 border-violet-500/25';
  }
  if (l.includes('ui') || l.includes('ux') || l.includes('frontend') || l.includes('access')) {
    return 'bg-blue-500/10 text-blue-300 border-blue-500/25';
  }
  if (l.includes('db') || l.includes('data') || l.includes('devops') || l.includes('perf')) {
    return 'bg-amber-500/10 text-amber-300 border-amber-500/25';
  }
  if (l.includes('transc') || l.includes('export') || l.includes('pipe') || l.includes('bug')) {
    return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25';
  }
  return 'bg-slate-500/10 text-slate-300 border-slate-500/25';
}

function getAvatarTint(name: string) {
  const tints = [
    'bg-indigo-500/20 text-indigo-300 border-indigo-500/35',
    'bg-cyan-500/20 text-cyan-300 border-cyan-500/35',
    'bg-amber-500/20 text-amber-300 border-amber-500/35',
    'bg-emerald-500/20 text-emerald-300 border-emerald-500/35',
    'bg-purple-500/20 text-purple-300 border-purple-500/35',
    'bg-rose-500/20 text-rose-300 border-rose-500/35',
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
          badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          dotClass: 'bg-rose-400 animate-pulse',
          label: 'URGENT',
        };
      case 'high':
        return {
          borderClass: 'border-l-[3px] border-l-amber-500',
          badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          dotClass: 'bg-amber-400',
          label: 'HIGH',
        };
      case 'medium':
        return {
          borderClass: 'border-l-[3px] border-l-blue-500',
          badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          dotClass: 'bg-blue-400',
          label: 'MEDIUM',
        };
      case 'low':
      default:
        return {
          borderClass: 'border-l-[3px] border-l-slate-400',
          badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
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
          ? 'opacity-40 border-dashed border-[#52525b] scale-[0.98]'
          : 'bg-[#181920] hover:bg-[#20212b] border-[#282a35] hover:border-[#3b3e4f] shadow-xs hover:shadow-md hover:shadow-black/50'
      }`}
    >
      {/* Top Header Row: Priority & Quick Move Arrows */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5">
          <GripVertical
            size={11}
            className="text-[#52525b] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 -ml-1"
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
              className="p-0.5 rounded text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#282a35] transition-colors cursor-pointer"
            >
              <ChevronLeft size={12} />
            </button>
          )}
          {nextStatus && (
            <button
              type="button"
              title={`Move to ${nextStatus.replace('_', ' ')}`}
              onClick={() => onMoveStatus(task.id, nextStatus)}
              className="p-0.5 rounded text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#282a35] transition-colors cursor-pointer"
            >
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Task Title */}
      <h4 className="text-xs font-semibold text-[#f4f4f5] group-hover:text-[#ffffff] transition-colors leading-snug line-clamp-2 mb-1">
        {task.title}
      </h4>

      {/* Short Preview Description (Single Line Preview) */}
      {task.description && (
        <p className="text-[11px] text-[#9ca3af] leading-normal line-clamp-1 mb-2">
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
            <span className="text-[9px] font-mono text-[#71717a] px-1 py-0.5 rounded bg-[#13141a] border border-[#242633]">
              +{remainingLabelsCount}
            </span>
          )}
        </div>
      )}

      {/* Card Footer: Assignee & Due Date */}
      <div className="flex items-center justify-between pt-2 border-t border-[#232530] text-xs">
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
          <span className="text-[11px] font-medium text-[#d4d4d8] truncate max-w-[85px]">
            {firstName}
          </span>
        </div>

        {formattedDueDate && (
          <div className="flex items-center gap-1 text-[10.5px] text-[#9ca3af] shrink-0 font-mono bg-[#111217] px-1.5 py-0.5 rounded border border-[#232530]">
            <Calendar size={10} className="text-[#a1a1aa]" />
            <span>{formattedDueDate}</span>
          </div>
        )}
      </div>
    </div>
  );
}
