import api from './api';
import type { KanbanData, KanbanTask, KanbanStatus } from '../pages/kanban/types';

export function normalizeTask(t: any): KanbanTask {
  const taskId = t.id || t.ticket_id;
  const assigneeObj = t.assignee
    ? (typeof t.assignee === 'object'
        ? t.assignee
        : {
            id: t.assignee_id || 'unassigned',
            name: t.assignee,
            avatar: t.assignee_avatar || undefined,
            role: t.assignee_role || 'Contributor',
          })
    : undefined;

  const dueDate = t.resolved_due_date || t.due_date || t.dueDate;
  const labels: string[] = Array.isArray(t.labels)
    ? t.labels
    : [
        t.type || 'task',
        ...(t.meeting_title ? [t.meeting_title.toLowerCase().replace(/\s+/g, '-').slice(0, 14)] : []),
      ];

  return {
    id: taskId,
    ticket_id: taskId,
    title: t.title,
    description: t.description || '',
    status: (t.status as KanbanStatus) || 'todo',
    priority: t.priority || 'medium',
    assignee: assigneeObj,
    assignee_id: t.assignee_id,
    raw_assignee: t.raw_assignee,
    dueDate,
    due_date: t.due_date,
    resolved_due_date: t.resolved_due_date,
    type: t.type || 'task',
    labels,
    source: t.source || 'ai',
    source_action_item: t.source_action_item,
    acceptance_criteria: Array.isArray(t.acceptance_criteria) ? t.acceptance_criteria : [],
    meeting_id: t.meeting_id,
    meeting_title: t.meeting_title,
    meeting_date: t.meeting_date,
    team_id: t.team_id,
    createdAt: t.created_at || t.createdAt,
  };
}

export const kanbanService = {
  /**
   * Fetch Kanban board data for a team, optionally filtered by meetingId.
   */
  async getKanbanTasks(teamId: string, meetingId?: string | null): Promise<KanbanData> {
    const params: Record<string, string> = {};
    if (meetingId && meetingId !== 'all') {
      params.meeting_id = meetingId;
    }

    const { data } = await api.get(`/teams/${teamId}/kanban`, { params });
    const payload = data.data;

    const normalizedTasks: KanbanTask[] = (payload.tasks || []).map(normalizeTask);

    const columns: Record<KanbanStatus, KanbanTask[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    for (const task of normalizedTasks) {
      const col = columns[task.status] ? task.status : 'todo';
      columns[col].push(task);
    }

    return {
      team_id: payload.team_id,
      meeting_id: payload.meeting_id,
      meetings: payload.meetings || [],
      tasks: normalizedTasks,
      columns,
      total_tasks: normalizedTasks.length,
    };
  },

  /**
   * Update status of a ticket in PostgreSQL.
   */
  async updateTicketStatus(teamId: string, ticketId: string, status: KanbanStatus): Promise<KanbanTask> {
    const { data } = await api.patch(`/teams/${teamId}/kanban/tickets/${ticketId}/status`, {
      status,
    });
    return normalizeTask(data.data.updated_task || data.data);
  },
};
