import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
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
  Video,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { AppButton } from '../../components/app-ui/AppButton';
import KanbanBoard from './components/KanbanBoard';
import TaskDialog from './components/TaskDialog';
import TaskDetailDrawer from './components/TaskDetailDrawer';
import { kanbanService } from '../../services/kanban.service';
import { teamService } from '../../services/team.service';
import { meetingService } from '../../services/meeting.service';
import type {
  KanbanTask,
  KanbanStatus,
  TaskPriority,
  SortOption,
  KanbanMeeting,
  TaskAssignee,
} from './types';

export default function KanbanPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { teams } = useAuth();

  // Active workspace team context
  const activeTeamId = teamId ?? (teams.length > 0 ? teams[0].id : undefined);
  const activeTeam = teams.find(t => t.id === activeTeamId);

  // Meeting filter param from URL
  const meetingIdParam = searchParams.get('meeting_id') || 'all';

  // API State
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [meetings, setMeetings] = useState<KanbanMeeting[]>([]);
  const [teamMembers, setTeamMembers] = useState<TaskAssignee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<KanbanStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Dialog State (Create / Edit modal)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [defaultColumnStatus, setDefaultColumnStatus] = useState<KanbanStatus>('todo');

  // Drawer State (Right-side detail inspection sheet)
  const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState<KanbanTask | null>(null);

  // Processing status for filtered meeting
  const [meetingProcStatus, setMeetingProcStatus] = useState<{
    meeting_id: string;
    is_processing: boolean;
    current_stage: string;
    transcript_status: string;
    ai_status: string;
    error: string | null;
  } | null>(null);
  const [isRetryingProc, setIsRetryingProc] = useState(false);

  // Load team members
  useEffect(() => {
    if (!activeTeamId) return;
    teamService
      .getMembers(activeTeamId)
      .then(members => {
        setTeamMembers(
          members.map(m => ({
            id: m.user_id,
            name: m.full_name,
            avatar: m.avatar_url || undefined,
            role: m.role,
          }))
        );
      })
      .catch(() => {
        // Fallback or ignore
      });
  }, [activeTeamId]);

  // Fetch Board Data
  const fetchBoardData = useCallback(async () => {
    if (!activeTeamId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setActionError(null);

    try {
      const [data, proc] = await Promise.all([
        kanbanService.getKanbanTasks(
          activeTeamId,
          meetingIdParam === 'all' ? null : meetingIdParam
        ),
        meetingIdParam !== 'all'
          ? meetingService.getProcessingStatus(meetingIdParam).catch(() => null)
          : Promise.resolve(null),
      ]);
      setTasks(data.tasks);
      setMeetings(data.meetings);
      setMeetingProcStatus(proc);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to load Kanban tasks'
      );
    } finally {
      setLoading(false);
    }
  }, [activeTeamId, meetingIdParam]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // Poll processing status if meeting is in progress
  useEffect(() => {
    if (!meetingProcStatus?.is_processing || meetingIdParam === 'all') return;
    const interval = setInterval(async () => {
      try {
        const proc = await meetingService.getProcessingStatus(meetingIdParam);
        setMeetingProcStatus(proc);
        if (!proc.is_processing) {
          fetchBoardData();
        }
      } catch (_) {}
    }, 2500);
    return () => clearInterval(interval);
  }, [meetingProcStatus?.is_processing, meetingIdParam, fetchBoardData]);

  const handleRetryProcessing = async () => {
    if (!meetingIdParam || meetingIdParam === 'all') return;
    setIsRetryingProc(true);
    setActionError(null);
    try {
      await meetingService.retryProcessing(meetingIdParam);
      await fetchBoardData();
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Retry failed');
    } finally {
      setIsRetryingProc(false);
    }
  };

  // Handle meeting filter dropdown change
  const handleMeetingChange = (newMeetingId: string) => {
    const updatedParams = new URLSearchParams(searchParams);
    if (newMeetingId === 'all') {
      updatedParams.delete('meeting_id');
    } else {
      updatedParams.set('meeting_id', newMeetingId);
    }
    setSearchParams(updatedParams);
  };

  // Open Create Dialog
  const handleOpenCreate = (status: KanbanStatus = 'todo') => {
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

  // Save Task (Create or Update local fallback)
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
        ticket_id: `task-${Date.now()}`,
        title: taskData.title || 'Untitled Task',
        description: taskData.description,
        status: taskData.status || defaultColumnStatus,
        priority: taskData.priority || 'medium',
        assignee: taskData.assignee,
        dueDate: taskData.dueDate,
        labels: taskData.labels || ['manual'],
        source: 'manual',
        team_id: activeTeamId,
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

  // Move Task Status with Optimistic UI & Server Persistence
  const handleMoveStatus = async (taskId: string, newStatus: KanbanStatus) => {
    const previousTasks = [...tasks];

    // Optimistically update UI
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    if (selectedTaskForDrawer?.id === taskId) {
      setSelectedTaskForDrawer(prev => (prev ? { ...prev, status: newStatus } : null));
    }
    setActionError(null);

    if (!activeTeamId) return;

    try {
      await kanbanService.updateTicketStatus(activeTeamId, taskId, newStatus);
    } catch (err: any) {
      // Rollback on server error
      setTasks(previousTasks);
      if (selectedTaskForDrawer?.id === taskId) {
        const reverted = previousTasks.find(t => t.id === taskId);
        if (reverted) setSelectedTaskForDrawer(reverted);
      }
      setActionError(
        err.response?.data?.message || err.message || 'Failed to update ticket status on server'
      );
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
          const matchAssignee = task.assignee?.name?.toLowerCase().includes(q) ?? false;
          const matchMeeting = task.meeting_title?.toLowerCase().includes(q) ?? false;
          const matchLabel = task.labels?.some(l => l.toLowerCase().includes(q)) ?? false;
          if (!matchTitle && !matchDesc && !matchAssignee && !matchMeeting && !matchLabel) {
            return false;
          }
        }

        if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
          return false;
        }

        if (assigneeFilter !== 'all') {
          if (assigneeFilter === 'unassigned') {
            if (task.assignee?.id && task.assignee.id !== 'unassigned') return false;
          } else if (task.assignee?.id !== assigneeFilter && task.assignee_id !== assigneeFilter) {
            return false;
          }
        }

        if (statusFilter !== 'all' && task.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority-desc') {
          return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        }
        if (sortBy === 'priority-asc') {
          return (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
        }
        if (sortBy === 'due-asc') {
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return dateA - dateB;
        }
        if (sortBy === 'due-desc') {
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : -Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : -Infinity;
          return dateB - dateA;
        }
        // default recent
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
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

  const currentFilteredMeeting = meetings.find(m => m.id === meetingIdParam);

  return (
    <AppLayout teamId={activeTeamId}>
      <div className="flex flex-col h-full min-h-0 w-full px-3 sm:px-5 py-3 max-w-[1600px] mx-auto select-none overflow-hidden">
        {/* Compact Page Header */}
        <div className="flex flex-col gap-3 pb-3 border-b border-[var(--app-border)] mb-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text-primary)]">
                  <Kanban size={15} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--app-text-primary)]">
                      Kanban Board
                    </h1>
                    {meetingIdParam !== 'all' && currentFilteredMeeting && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300">
                        <Video size={10} />
                        <span className="max-w-[140px] truncate">{currentFilteredMeeting.title}</span>
                        <button
                          type="button"
                          onClick={() => handleMeetingChange('all')}
                          className="hover:text-blue-900 dark:hover:text-blue-100 ml-0.5 cursor-pointer"
                          title="Show all meetings"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--app-text-muted)]">
                    Manage tasks across{' '}
                    <span className="text-[var(--app-text-primary)] font-medium">
                      {activeTeam?.name ?? 'your workspace'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar & Add Task CTA */}
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-card)] text-xs shadow-xs">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-[var(--app-text-secondary)]">
                  <span className="text-[10.5px] text-[var(--app-text-muted)]">Total:</span>
                  <span className="font-mono font-bold text-[var(--app-text-primary)]">{totalCount}</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300">
                  <Clock size={11} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-[10.5px] text-blue-700/80 dark:text-blue-300/80">Active:</span>
                  <span className="font-mono font-bold text-blue-800 dark:text-blue-200">{inProgressCount}</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300">
                  <AlertCircle size={11} className="text-amber-600 dark:text-amber-400" />
                  <span className="text-[10.5px] text-amber-800/80 dark:text-amber-300/80">Review:</span>
                  <span className="font-mono font-bold text-amber-900 dark:text-amber-200">{reviewCount}</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10.5px] text-emerald-800/80 dark:text-emerald-300/80">Done:</span>
                  <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200">{doneCount}</span>
                </div>
              </div>

              <AppButton
                variant="mono"
                size="sm"
                onClick={() => handleOpenCreate('todo')}
                className="gap-1 shadow-sm h-7.5 px-2.5 text-xs"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Add Task</span>
              </AppButton>
            </div>
          </div>

          {/* Action error banner */}
          {actionError && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs">
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Interactive Controls Bar: Search, Filters, Sort */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 shrink-0 mb-2">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)] pointer-events-none"
              />
              <input
                type="text"
                placeholder="Filter tasks by name, assignee, tag..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full border rounded-lg pl-8 pr-7 py-1 text-xs outline-none transition-colors bg-[var(--app-surface-card)] border-[var(--app-border)] text-[var(--app-text-primary)] placeholder:text-[var(--app-text-dim)] focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] cursor-pointer"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Filter and Sort Controls */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Meeting Filter Dropdown */}
              <div
                className={`flex items-center gap-1 border rounded-lg px-2 py-0.5 text-xs transition-colors ${
                  meetingIdParam !== 'all'
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                    : 'border-[var(--app-border)] bg-[var(--app-surface-card)] text-[var(--app-text-secondary)]'
                }`}
              >
                <Video size={11} className={meetingIdParam !== 'all' ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--app-text-muted)]'} />
                <span className="text-[10.5px] font-mono opacity-80">Meeting:</span>
                <select
                  value={meetingIdParam}
                  onChange={e => handleMeetingChange(e.target.value)}
                  className="bg-transparent text-[11px] text-inherit outline-none cursor-pointer max-w-[130px] truncate font-medium"
                >
                  <option value="all" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">
                    All Meetings ({meetings.reduce((acc, m) => acc + (m.task_count || 0), 0)})
                  </option>
                  {meetings.map(m => (
                    <option key={m.id} value={m.id} className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">
                      {m.title} ({m.task_count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div
                className={`flex items-center gap-1 border rounded-lg px-2 py-0.5 text-xs transition-colors ${
                  priorityFilter !== 'all'
                    ? priorityFilter === 'urgent'
                      ? 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                      : priorityFilter === 'high'
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                      : priorityFilter === 'medium'
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      : 'border-slate-500/50 bg-slate-500/10 text-slate-700 dark:text-slate-300'
                    : 'border-[var(--app-border)] bg-[var(--app-surface-card)] text-[var(--app-text-secondary)]'
                }`}
              >
                <SlidersHorizontal size={11} className={priorityFilter !== 'all' ? 'text-current' : 'text-[var(--app-text-muted)]'} />
                <span className="text-[10.5px] font-mono opacity-80">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value as TaskPriority | 'all')}
                  className="bg-transparent text-[11px] text-inherit outline-none cursor-pointer font-medium"
                >
                  <option value="all" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">All</option>
                  <option value="urgent" className="bg-[var(--app-surface-card)] text-rose-600 dark:text-rose-300">Urgent</option>
                  <option value="high" className="bg-[var(--app-surface-card)] text-amber-600 dark:text-amber-300">High</option>
                  <option value="medium" className="bg-[var(--app-surface-card)] text-blue-600 dark:text-blue-300">Medium</option>
                  <option value="low" className="bg-[var(--app-surface-card)] text-slate-600 dark:text-slate-300">Low</option>
                </select>
              </div>

              {/* Assignee Filter */}
              <div
                className={`flex items-center gap-1 border rounded-lg px-2 py-0.5 text-xs transition-colors ${
                  assigneeFilter !== 'all'
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                    : 'border-[var(--app-border)] bg-[var(--app-surface-card)] text-[var(--app-text-secondary)]'
                }`}
              >
                <span className="text-[10.5px] font-mono opacity-80">Assignee:</span>
                <select
                  value={assigneeFilter}
                  onChange={e => setAssigneeFilter(e.target.value)}
                  className="bg-transparent text-[11px] text-inherit outline-none cursor-pointer max-w-[105px] truncate font-medium"
                >
                  <option value="all" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">All</option>
                  <option value="unassigned" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">Unassigned</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id} className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div
                className={`flex items-center gap-1 border rounded-lg px-2 py-0.5 text-xs transition-colors ${
                  statusFilter !== 'all'
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                    : 'border-[var(--app-border)] bg-[var(--app-surface-card)] text-[var(--app-text-secondary)]'
                }`}
              >
                <span className="text-[10.5px] font-mono opacity-80">Status:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as KanbanStatus | 'all')}
                  className="bg-transparent text-[11px] text-inherit outline-none cursor-pointer font-medium"
                >
                  <option value="all" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">All</option>
                  <option value="backlog" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">Backlog</option>
                  <option value="todo" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">To Do</option>
                  <option value="in_progress" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">In Progress</option>
                  <option value="review" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">Review</option>
                  <option value="done" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">Done</option>
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1 border border-[var(--app-border)] rounded-lg px-2 py-0.5 bg-[var(--app-surface-card)] text-xs text-[var(--app-text-secondary)]">
                <ArrowUpDown size={11} className="text-[var(--app-text-muted)]" />
                <span className="text-[10.5px] font-mono text-[var(--app-text-muted)]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-[11px] text-[var(--app-text-primary)] outline-none cursor-pointer font-medium"
                >
                  <option value="recent" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">Recent</option>
                  <option value="priority-desc" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">Priority (High)</option>
                  <option value="priority-asc" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">Priority (Low)</option>
                  <option value="due-asc" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">Due (Soon)</option>
                  <option value="due-desc" className="bg-[var(--app-surface-card)] text-[var(--app-text-primary)]">Due (Late)</option>
                </select>
              </div>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-200 px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  <X size={11} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Board Viewport Container */}
        <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
          {/* Loading State */}
          {loading ? (
          <div className="flex flex-col items-center justify-center h-80 gap-3">
            <Loader2 size={24} className="animate-spin text-blue-500 dark:text-blue-400" />
            <p className="text-xs text-[var(--app-text-muted)] font-mono">Loading Kanban board...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center h-80 gap-3 border border-rose-500/20 rounded-xl bg-rose-500/5 p-6 text-center">
            <AlertCircle size={28} className="text-rose-500 dark:text-rose-400" />
            <h3 className="text-sm font-semibold text-[var(--app-text-primary)]">Unable to Load Board</h3>
            <p className="text-xs text-[var(--app-text-muted)] max-w-sm">{error}</p>
            <AppButton variant="mono-outline" size="sm" onClick={fetchBoardData} className="mt-2 gap-1.5">
              <RefreshCw size={13} />
              <span>Retry</span>
            </AppButton>
          </div>
        ) : tasks.length === 0 ? (
          meetingProcStatus?.is_processing ? (
            /* Processing State */
            <div className="flex flex-col items-center justify-center h-80 gap-3 border border-blue-500/30 rounded-xl bg-blue-500/[0.03] p-8 text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--app-text-primary)]">AI is analyzing your latest meeting</h3>
              <p className="text-xs text-[var(--app-text-secondary)] max-w-md leading-relaxed">
                Tasks will appear here automatically when processing is complete.
                {meetingProcStatus.current_stage && (
                  <span className="block mt-1 font-mono text-[11px] text-blue-600 dark:text-blue-300">
                    Stage: {meetingProcStatus.current_stage.replace(/_/g, ' ')}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-xs font-mono">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Processing in progress...</span>
                </div>
              </div>
            </div>
          ) : (meetingProcStatus?.transcript_status === 'failed' || meetingProcStatus?.ai_status === 'failed') ? (
            /* Failed State */
            <div className="flex flex-col items-center justify-center h-80 gap-3 border border-rose-500/30 rounded-xl bg-rose-500/[0.03] p-8 text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400">
                <AlertCircle size={20} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--app-text-primary)]">AI processing failed</h3>
              <p className="text-xs text-[var(--app-text-secondary)] max-w-md leading-relaxed">
                {meetingProcStatus.error || 'We encountered an error processing the transcript for this meeting.'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <AppButton
                  variant="mono"
                  size="sm"
                  disabled={isRetryingProc}
                  onClick={handleRetryProcessing}
                  className="gap-1.5"
                >
                  {isRetryingProc ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Retrying...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={12} />
                      <span>Retry Processing</span>
                    </>
                  )}
                </AppButton>
                <AppButton variant="mono-outline" size="sm" onClick={() => handleMeetingChange('all')}>
                  Show All Meetings
                </AppButton>
              </div>
            </div>
          ) : (
            /* Standard Empty State */
            <div className="flex flex-col items-center justify-center h-80 gap-3 border border-[var(--app-border)] rounded-xl bg-[var(--app-surface-card)] shadow-xs p-8 text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-indigo-500 dark:text-indigo-400">
                <Sparkles size={20} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--app-text-primary)]">
                {meetingIdParam !== 'all' ? 'No tasks from this meeting' : 'No tasks on this board yet'}
              </h3>
              <p className="text-xs text-[var(--app-text-secondary)] max-w-md leading-relaxed">
                {meetingIdParam !== 'all'
                  ? 'This meeting was processed, but did not produce any actionable tasks.'
                  : 'Tasks generated by the Scrum Intelligence Agent after completed meetings will appear here automatically.'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {meetingIdParam !== 'all' && (
                  <AppButton variant="mono-outline" size="sm" onClick={() => handleMeetingChange('all')}>
                    Show All Meetings
                  </AppButton>
                )}
                {activeTeamId && (
                  <AppButton
                    variant="mono-outline"
                    size="sm"
                    onClick={() => navigate(`/teams/${activeTeamId}/meetings`)}
                  >
                    <Video size={13} className="mr-1.5" /> Go to Meetings
                  </AppButton>
                )}
                <AppButton variant="mono" size="sm" onClick={() => handleOpenCreate('todo')}>
                  <Plus size={13} className="mr-1.5" /> Create Task Manually
                </AppButton>
              </div>
            </div>
          )
        ) : (
          /* Kanban Board Component */
          <KanbanBoard
            tasks={filteredTasks}
            onAddTask={handleOpenCreate}
            onCardClick={handleOpenDrawer}
            onMoveStatus={handleMoveStatus}
          />
        )}
        </div>

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
