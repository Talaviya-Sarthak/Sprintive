import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  Tag,
  User,
  Trash2,
  Edit2,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { MOCK_TEAM_MEMBERS } from '../data/mockKanbanData';
import type { KanbanTask, KanbanStatus, TaskPriority } from '../types';

interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: KanbanTask | null;
  onEditTask: (task: KanbanTask) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveStatus: (taskId: string, newStatus: KanbanStatus) => void;
  onUpdatePriority?: (taskId: string, newPriority: TaskPriority) => void;
}

const STATUS_LIST: { id: KanbanStatus; label: string; dot: string }[] = [
  { id: 'backlog', label: 'Backlog', dot: 'bg-slate-400' },
  { id: 'todo', label: 'To Do', dot: 'bg-blue-400' },
  { id: 'in_progress', label: 'In Progress', dot: 'bg-indigo-400' },
  { id: 'review', label: 'Review', dot: 'bg-amber-400' },
  { id: 'done', label: 'Done', dot: 'bg-emerald-400' },
];

const PRIORITY_LIST: { id: TaskPriority; label: string; badge: string; dot: string }[] = [
  { id: 'low', label: 'Low', badge: 'bg-slate-500/10 text-slate-300 border-slate-500/30', dot: 'bg-slate-400' },
  { id: 'medium', label: 'Medium', badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30', dot: 'bg-blue-400' },
  { id: 'high', label: 'High', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' },
  { id: 'urgent', label: 'Urgent', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30', dot: 'bg-rose-400' },
];

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

export default function TaskDetailDrawer({
  isOpen,
  onClose,
  task,
  onEditTask,
  onDeleteTask,
  onMoveStatus,
  onUpdatePriority,
}: TaskDetailDrawerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!task) return null;

  const currentPriority = PRIORITY_LIST.find(p => p.id === task.priority) ?? PRIORITY_LIST[1];
  const currentStatus = STATUS_LIST.find(s => s.id === task.status) ?? STATUS_LIST[0];

  const assigneeName = task.assignee?.name ?? 'Unassigned';
  const initials =
    task.assignee?.name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U';

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No due date set';

  const formattedCreatedDate = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently';

  const handleDelete = () => {
    onDeleteTask(task.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-over Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-screen max-w-md sm:max-w-lg bg-[#121319] border-l border-[#242634] shadow-2xl flex flex-col h-full"
            >
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-[#20222e] flex items-center justify-between gap-3 bg-[#15161f]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1c1e29] border border-[#2b2d3d] text-[#a1a1aa] font-medium shrink-0">
                    {task.id.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-[#71717a] truncate font-mono">
                    <span>Task Overview</span>
                    <ChevronRight size={12} />
                    <span className="text-[#f4f4f5] capitalize font-sans font-medium truncate">
                      {currentStatus.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onEditTask(task);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#d4d4d8] hover:text-[#ffffff] bg-[#1d1f2b] hover:bg-[#252838] border border-[#2c2f42] transition-colors cursor-pointer"
                  >
                    <Edit2 size={12} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#202230] transition-colors cursor-pointer"
                    aria-label="Close drawer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto app-scrollbar p-6 space-y-6 text-xs text-[#a1a1aa]">
                {/* Title */}
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#f4f4f5] tracking-tight leading-snug">
                    {task.title}
                  </h2>
                </div>

                {/* Status & Priority Quick Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-[#222432] bg-[#161722]">
                  {/* Status Dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#71717a]">
                      Column Status
                    </label>
                    <div className="relative">
                      <select
                        value={task.status}
                        onChange={e => onMoveStatus(task.id, e.target.value as KanbanStatus)}
                        className="w-full bg-[#1b1c28] border border-[#292c3d] text-[#f4f4f5] rounded-lg px-2.5 py-1.5 text-xs outline-none cursor-pointer focus:border-blue-500/50"
                      >
                        {STATUS_LIST.map(s => (
                          <option key={s.id} value={s.id} className="bg-[#181922] text-[#f4f4f5]">
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Priority Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#71717a]">
                      Priority
                    </label>
                    <div className="relative">
                      <select
                        value={task.priority}
                        onChange={e => onUpdatePriority && onUpdatePriority(task.id, e.target.value as TaskPriority)}
                        className="w-full bg-[#1b1c28] border border-[#292c3d] text-[#f4f4f5] rounded-lg px-2.5 py-1.5 text-xs outline-none cursor-pointer focus:border-blue-500/50 font-medium"
                      >
                        {PRIORITY_LIST.map(p => (
                          <option key={p.id} value={p.id} className="bg-[#181922] text-[#f4f4f5]">
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#71717a] flex items-center gap-1.5">
                    <Layers size={13} />
                    <span>Description</span>
                  </h3>
                  <div className="p-4 rounded-xl border border-[#222432] bg-[#161722] text-[#d4d4d8] leading-relaxed whitespace-pre-wrap font-normal text-xs min-h-[90px]">
                    {task.description ? (
                      task.description
                    ) : (
                      <span className="text-[#71717a] italic">No description provided for this task.</span>
                    )}
                  </div>
                </div>

                {/* Metadata Properties Table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#71717a]">
                    Task Properties
                  </h3>

                  <div className="border border-[#222432] rounded-xl divide-y divide-[#202230] bg-[#161722]">
                    {/* Assignee */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2 text-[#71717a]">
                        <User size={13} />
                        <span>Assignee</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold border shrink-0 ${getAvatarTint(
                            assigneeName
                          )}`}
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
                        <div className="text-right">
                          <p className="font-medium text-[#f4f4f5] text-xs">{assigneeName}</p>
                          {task.assignee?.role && (
                            <p className="text-[10px] text-[#71717a]">{task.assignee.role}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2 text-[#71717a]">
                        <Calendar size={13} />
                        <span>Due Date</span>
                      </div>
                      <span className="font-mono text-xs text-[#d4d4d8]">
                        {formattedDueDate}
                      </span>
                    </div>

                    {/* Created */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2 text-[#71717a]">
                        <Clock size={13} />
                        <span>Created</span>
                      </div>
                      <span className="font-mono text-xs text-[#71717a]">
                        {formattedCreatedDate}
                      </span>
                    </div>

                    {/* Source */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2 text-[#71717a]">
                        <Shield size={13} />
                        <span>Origin</span>
                      </div>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-[#a1a1aa] bg-[#1c1d29] px-2 py-0.5 rounded border border-[#2a2c3d]">
                        {task.source === 'ai' ? (
                          <>
                            <Sparkles size={11} className="text-indigo-400" />
                            <span>AI Agent</span>
                          </>
                        ) : (
                          <span>Manual</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Labels Section */}
                {task.labels && task.labels.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#71717a] flex items-center gap-1.5">
                      <Tag size={13} />
                      <span>Labels</span>
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {task.labels.map(label => (
                        <span
                          key={label}
                          className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-mono font-medium border ${getTagStyle(
                            label
                          )}`}
                        >
                          #{label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-[#20222e] bg-[#15161f] flex items-center justify-between gap-3 shrink-0">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-xs text-[#f87171] hover:text-[#ef4444] px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete Task</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#ef4444] font-medium">Delete task?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="text-xs bg-[#ef4444] text-white px-2.5 py-1 rounded-md font-semibold hover:bg-red-600 transition-colors cursor-pointer shadow-xs"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs text-[#a1a1aa] hover:text-[#f4f4f5] px-1 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#d4d4d8] hover:text-[#ffffff] bg-[#1d1f2b] hover:bg-[#252838] border border-[#2c2f42] transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
