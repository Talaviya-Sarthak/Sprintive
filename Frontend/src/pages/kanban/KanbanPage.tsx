import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Search,
  Plus,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Kanban,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { AppButton } from '../../components/app-ui/AppButton';
import KanbanBoard from './components/KanbanBoard';
import TaskDialog from './components/TaskDialog';
import TaskDetailDrawer from './components/TaskDetailDrawer';
import { INITIAL_MOCK_TASKS, MOCK_TEAM_MEMBERS } from './data/mockKanbanData';
import type { KanbanTask, KanbanStatus, TaskPriority, SortOption } from './types';

export default function KanbanPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { teams } = useAuth();

  // Active workspace team context
  const activeTeamId = teamId ?? (teams.length > 0 ? teams[0].id : undefined);
  const activeTeam = teams.find(t => t.id === activeTeamId);

  // Local Task State (initialized from mock data)
  const [tasks, setTasks] = useState<KanbanTask[]>(INITIAL_MOCK_TASKS);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<KanbanStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Dialog State (Create / Edit modal)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [defaultColumnStatus, setDefaultColumnStatus] = useState<KanbanStatus>('backlog');

  // Drawer State (Right-side detail inspection sheet)
  const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState<KanbanTask | null>(null);

  // Open Create Dialog
  const handleOpenCreate = (status: KanbanStatus = 'backlog') => {
    setEditingTask(null);
    setDefaultColumnStatus(status);
    setDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (task: KanbanTask) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  // Open Detail Drawer
  const handleOpenDrawer = (task: KanbanTask) => {
    setSelectedTaskForDrawer(task);
  };

  // Close Detail Drawer
  const handleCloseDrawer = () => {
    setSelectedTaskForDrawer(null);
  };

  // Save Task (Create or Update)
  const handleSaveTask = (taskData: Partial<KanbanTask>) => {
    if (editingTask) {
      const updated = { ...editingTask, ...taskData } as KanbanTask;
      setTasks(prev => prev.map(t => (t.id === editingTask.id ? updated : t)));
      if (selectedTaskForDrawer?.id === editingTask.id) {
        setSelectedTaskForDrawer(updated);
      }
    } else {
      const newTask: KanbanTask = {
        id: `task-${Date.now()}`,
        title: taskData.title || 'Untitled Task',
        description: taskData.description,
        status: taskData.status || defaultColumnStatus,
        priority: taskData.priority || 'medium',
        assignee: taskData.assignee,
        dueDate: taskData.dueDate,
        labels: taskData.labels,
        source: 'manual',
        createdAt: new Date().toISOString(),
      };
      setTasks(prev => [newTask, ...prev]);
    }
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (selectedTaskForDrawer?.id === taskId) {
      setSelectedTaskForDrawer(null);
    }
  };

  // Move Task Status (via Drag and Drop, Card Arrow, or Drawer)
  const handleMoveStatus = (taskId: string, newStatus: KanbanStatus) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    if (selectedTaskForDrawer?.id === taskId) {
      setSelectedTaskForDrawer(prev => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Update Priority from Drawer
  const handleUpdatePriority = (taskId: string, newPriority: TaskPriority) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, priority: newPriority } : t))
    );
    if (selectedTaskForDrawer?.id === taskId) {
      setSelectedTaskForDrawer(prev => (prev ? { ...prev, priority: newPriority } : null));
    }
  };

  // Priority weight for sorting
  const priorityWeight: Record<TaskPriority, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(q);
          const matchDesc = task.description?.toLowerCase().includes(q) ?? false;
          const matchAssignee = task.assignee?.name.toLowerCase().includes(q) ?? false;
          const matchLabel = task.labels?.some(l => l.toLowerCase().includes(q)) ?? false;
          if (!matchTitle && !matchDesc && !matchAssignee && !matchLabel) {
            return false;
          }
        }

        if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
          return false;
        }

        if (assigneeFilter !== 'all') {
          if (assigneeFilter === 'unassigned') {
            if (task.assignee) return false;
          } else if (task.assignee?.id !== assigneeFilter) {
            return false;
          }
        }

        if (statusFilter !== 'all' && task.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'priority-desc':
            return priorityWeight[b.priority] - priorityWeight[a.priority];
          case 'priority-asc':
            return priorityWeight[a.priority] - priorityWeight[b.priority];
          case 'due-asc':
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          case 'due-desc':
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
          case 'recent':
          default:
            return (
              new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
            );
        }
      });
  }, [tasks, searchQuery, priorityFilter, assigneeFilter, statusFilter, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    priorityFilter !== 'all' ||
    assigneeFilter !== 'all' ||
    statusFilter !== 'all' ||
    sortBy !== 'recent';

  const clearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setStatusFilter('all');
    setSortBy('recent');
  };

  const totalCount = tasks.length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const reviewCount = tasks.filter(t => t.status === 'review').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <AppLayout teamId={activeTeamId}>
      <div className="flex flex-col h-full px-3 sm:px-5 py-3.5 max-w-[1600px] mx-auto select-none">
        {/* Compact Page Header */}
        <div className="flex flex-col gap-3 pb-3.5 border-b border-[#1f202b] mb-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#15161f] border border-[#242636] text-[#f4f4f5]">
                  <Kanban size={15} />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#f4f4f5]">
                    Kanban Board
                  </h1>
                  <p className="text-[11px] text-[#9ca3af]">
                    Manage tasks across{' '}
                    <span className="text-[#f4f4f5] font-medium">
                      {activeTeam?.name ?? 'your workspace'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar & Add Task CTA */}
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#262836] bg-[#111217] text-xs">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1c1d27] border border-[#2b2d3d] text-zinc-300">
                  <span className="text-[10.5px] text-[#9ca3af]">Total:</span>
                  <span className="font-mono font-bold text-[#f4f4f5]">{totalCount}</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300">
                  <Clock size={11} className="text-blue-400" />
                  <span className="text-[10.5px] text-blue-300/80">Active:</span>
                  <span className="font-mono font-bold text-blue-200">{inProgressCount}</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  <AlertCircle size={11} className="text-amber-400" />
                  <span className="text-[10.5px] text-amber-300/80">Review:</span>
                  <span className="font-mono font-bold text-amber-200">{reviewCount}</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <CheckCircle2 size={11} className="text-emerald-400" />
                  <span className="text-[10.5px] text-emerald-300/80">Done:</span>
                  <span className="font-mono font-bold text-emerald-200">{doneCount}</span>
                </div>
              </div>

              <AppButton
                variant="mono"
                size="sm"
                onClick={() => handleOpenCreate('backlog')}
                className="gap-1 shadow-sm h-7.5 px-2.5 text-xs"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Add Task</span>
              </AppButton>
            </div>
          </div>

          {/* Interactive Controls Bar: Search, Filters, Sort */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none"
              />
              <input
                type="text"
                placeholder="Filter tasks by name, assignee, tag..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full border rounded-lg pl-8 pr-7 py-1 text-xs outline-none transition-colors bg-[#13141a] border-[#242636] text-[#f4f4f5] focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#f4f4f5] cursor-pointer"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Filter and Sort Controls */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Priority Filter */}
              <div
                className={`flex items-center gap-1 border rounded-lg px-2 py-0.5 text-xs transition-colors ${
                  priorityFilter !== 'all'
                    ? priorityFilter === 'urgent'
                      ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                      : priorityFilter === 'high'
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                      : priorityFilter === 'medium'
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                      : 'border-slate-500/50 bg-slate-500/10 text-slate-300'
                    : 'border-[#242636] bg-[#13141a] text-[#a1a1aa]'
                }`}
              >
                <SlidersHorizontal size={11} className={priorityFilter !== 'all' ? 'text-current' : 'text-[#71717a]'} />
                <span className="text-[10.5px] font-mono opacity-80">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value as TaskPriority | 'all')}
                  className="bg-transparent text-[11px] text-inherit outline-none cursor-pointer font-medium"
                >
                  <option value="all" className="bg-[#181920] text-[#f4f4f5]">All</option>
                  <option value="urgent" className="bg-[#181920] text-rose-300">Urgent</option>
                  <option value="high" className="bg-[#181920] text-amber-300">High</option>
                  <option value="medium" className="bg-[#181920] text-blue-300">Medium</option>
                  <option value="low" className="bg-[#181920] text-slate-300">Low</option>
                </select>
              </div>

              {/* Assignee Filter */}
              <div
                className={`flex items-center gap-1 border rounded-lg px-2 py-0.5 text-xs transition-colors ${
                  assigneeFilter !== 'all'
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                    : 'border-[#242636] bg-[#13141a] text-[#a1a1aa]'
                }`}
              >
                <span className="text-[10.5px] font-mono opacity-80">Assignee:</span>
                <select
                  value={assigneeFilter}
                  onChange={e => setAssigneeFilter(e.target.value)}
                  className="bg-transparent text-[11px] text-inherit outline-none cursor-pointer max-w-[105px] truncate font-medium"
                >
                  <option value="all" className="bg-[#181920] text-[#f4f4f5]">All</option>
                  <option value="unassigned" className="bg-[#181920] text-[#f4f4f5]">Unassigned</option>
                  {MOCK_TEAM_MEMBERS.map(m => (
                    <option key={m.id} value={m.id} className="bg-[#181920] text-[#f4f4f5]">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div
                className={`flex items-center gap-1 border rounded-lg px-2 py-0.5 text-xs transition-colors ${
                  statusFilter !== 'all'
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                    : 'border-[#242636] bg-[#13141a] text-[#a1a1aa]'
                }`}
              >
                <span className="text-[10.5px] font-mono opacity-80">Status:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as KanbanStatus | 'all')}
                  className="bg-transparent text-[11px] text-inherit outline-none cursor-pointer font-medium"
                >
                  <option value="all" className="bg-[#181920] text-[#f4f4f5]">All</option>
                  <option value="backlog" className="bg-[#181920] text-[#f4f4f5]">Backlog</option>
                  <option value="todo" className="bg-[#181920] text-[#f4f4f5]">To Do</option>
                  <option value="in_progress" className="bg-[#181920] text-[#f4f4f5]">In Progress</option>
                  <option value="review" className="bg-[#181920] text-[#f4f4f5]">Review</option>
                  <option value="done" className="bg-[#181920] text-[#f4f4f5]">Done</option>
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1 border border-[#242636] rounded-lg px-2 py-0.5 bg-[#13141a] text-xs text-[#a1a1aa]">
                <ArrowUpDown size={11} className="text-[#71717a]" />
                <span className="text-[10.5px] font-mono text-[#71717a]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-[11px] text-[#f4f4f5] outline-none cursor-pointer font-medium"
                >
                  <option value="recent" className="bg-[#181920] text-[#f4f4f5]">Recent</option>
                  <option value="priority-desc" className="bg-[#181920] text-[#f4f4f5]">Priority (High)</option>
                  <option value="priority-asc" className="bg-[#181920] text-[#f4f4f5]">Priority (Low)</option>
                  <option value="due-asc" className="bg-[#181920] text-[#f4f4f5]">Due (Soon)</option>
                  <option value="due-desc" className="bg-[#181920] text-[#f4f4f5]">Due (Late)</option>
                </select>
              </div>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200 px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  <X size={11} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Board Component */}
        <KanbanBoard
          tasks={filteredTasks}
          onAddTask={handleOpenCreate}
          onCardClick={handleOpenDrawer}
          onMoveStatus={handleMoveStatus}
        />

        {/* Right-Side Full Task Detail Drawer */}
        <TaskDetailDrawer
          isOpen={Boolean(selectedTaskForDrawer)}
          onClose={handleCloseDrawer}
          task={selectedTaskForDrawer}
          onEditTask={handleOpenEdit}
          onDeleteTask={handleDeleteTask}
          onMoveStatus={handleMoveStatus}
          onUpdatePriority={handleUpdatePriority}
        />

        {/* Create / Edit Task Modal Dialog */}
        <TaskDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          initialTask={editingTask}
          defaultStatus={defaultColumnStatus}
        />
      </div>
    </AppLayout>
  );
}
