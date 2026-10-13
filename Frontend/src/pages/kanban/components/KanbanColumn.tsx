import React, { useState } from 'react';
import {
  Plus,
  Inbox,
  ListTodo,
  PlayCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import KanbanCard from './KanbanCard';
import type { KanbanTask, KanbanColumnConfig, KanbanStatus } from '../types';

interface KanbanColumnProps {
  column: KanbanColumnConfig;
  tasks: KanbanTask[];
  onAddTask: (status: KanbanStatus) => void;
  onCardClick: (task: KanbanTask) => void;
  onMoveStatus: (taskId: string, newStatus: KanbanStatus) => void;
}

export default function KanbanColumn({
  column,
  tasks,
  onAddTask,
  onCardClick,
  onMoveStatus,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onMoveStatus(taskId, column.id);
    }
  };

  const getColumnTheme = (id: KanbanStatus) => {
    switch (id) {
      case 'backlog':
        return {
          icon: Inbox,
          iconColor: 'text-slate-500 dark:text-slate-400',
          dot: 'bg-slate-400',
          badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
          topBorder: 'border-t-2 border-t-slate-400 dark:border-t-slate-500/70',
          dragActive: 'border-slate-400/50 bg-[var(--app-surface-hover)]',
          emptyIconColor: 'text-slate-500',
        };
      case 'todo':
        return {
          icon: ListTodo,
          iconColor: 'text-blue-600 dark:text-blue-400',
          dot: 'bg-blue-500 dark:bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]',
          badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
          topBorder: 'border-t-2 border-t-blue-500/80',
          dragActive: 'border-blue-500/50 bg-[var(--app-surface-hover)]',
          emptyIconColor: 'text-blue-500 dark:text-blue-400/60',
        };
      case 'in_progress':
        return {
          icon: PlayCircle,
          iconColor: 'text-indigo-600 dark:text-indigo-400',
          dot: 'bg-indigo-500 dark:bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)] animate-pulse',
          badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
          topBorder: 'border-t-2 border-t-indigo-500/80',
          dragActive: 'border-indigo-500/50 bg-[var(--app-surface-hover)]',
          emptyIconColor: 'text-indigo-500 dark:text-indigo-400/60',
        };
      case 'review':
        return {
          icon: Eye,
          iconColor: 'text-amber-600 dark:text-amber-400',
          dot: 'bg-amber-500 dark:bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]',
          badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30',
          topBorder: 'border-t-2 border-t-amber-500/80',
          dragActive: 'border-amber-500/50 bg-[var(--app-surface-hover)]',
          emptyIconColor: 'text-amber-500 dark:text-amber-400/60',
        };
      case 'done':
        return {
          icon: CheckCircle2,
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          dot: 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]',
          badge: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
          topBorder: 'border-t-2 border-t-emerald-500/80',
          dragActive: 'border-emerald-500/50 bg-[var(--app-surface-hover)]',
          emptyIconColor: 'text-emerald-500 dark:text-emerald-400/60',
        };
    }
  };

  const theme = getColumnTheme(column.id);
  const ColumnIcon = theme.icon;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col h-full min-h-0 flex-1 min-w-[260px] sm:min-w-[280px] max-w-[320px] rounded-xl border border-[var(--kanban-col-border)] bg-[var(--kanban-col-bg)] transition-all duration-150 select-none shadow-xs ${
        theme.topBorder
      } ${isDragOver ? theme.dragActive : ''}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--kanban-col-border)] shrink-0 bg-[var(--kanban-col-header)] rounded-t-[10px]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <ColumnIcon size={13} className={theme.iconColor} />
            <h3 className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-[var(--app-text-primary)]">
              {column.title}
            </h3>
          </div>
          <span
            className={`text-[9.5px] font-mono font-semibold px-1.5 py-0.2 rounded-full border ${theme.badge}`}
          >
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          aria-label={`Add task to ${column.title}`}
          onClick={() => onAddTask(column.id)}
          className="p-1 rounded-md text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-surface-hover)] border border-transparent hover:border-[var(--app-border)] transition-all cursor-pointer"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Task Cards Container */}
      <div className="flex-1 min-h-0 p-2 space-y-2 overflow-y-auto overflow-x-hidden app-scrollbar">
        {tasks.length > 0 ? (
          tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              onClick={onCardClick}
              onMoveStatus={onMoveStatus}
            />
          ))
        ) : (
          <div
            className={`h-full min-h-[100px] flex flex-col items-center justify-center p-3 border border-dashed rounded-lg text-center transition-colors ${
              isDragOver
                ? 'border-[var(--app-border-focus)] bg-[var(--app-surface-hover)]'
                : 'border-[var(--kanban-empty-border)] bg-[var(--kanban-empty-bg)]'
            }`}
          >
            <ColumnIcon size={16} className={`${theme.emptyIconColor} mb-1 opacity-70`} />
            <p className="text-[11px] font-medium text-[var(--app-text-secondary)]">No tasks</p>
            <p className="text-[10px] text-[var(--app-text-muted)] mt-0.5">
              Drop card or click +
            </p>
          </div>
        )}
      </div>

      {/* Column Footer: Quick Add Button */}
      <div className="p-2 pt-0">
        <button
          type="button"
          onClick={() => onAddTask(column.id)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-dashed border-transparent hover:border-[var(--app-border)] hover:bg-[var(--app-surface-card)] text-[11px] font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-all cursor-pointer"
        >
          <Plus size={12} />
          <span>Add task</span>
        </button>
      </div>
    </div>
  );
}
