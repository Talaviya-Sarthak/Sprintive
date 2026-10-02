import { AppError } from '../middleware/error.middleware.js';
import { kanbanRepository } from '../repositories/kanban.repository.js';
import { teamRepository } from '../repositories/team.repository.js';
import { meetingRepository } from '../repositories/meeting.repository.js';
import { logger } from '../utils/logger.js';

const ALLOWED_STATUSES = new Set(['backlog', 'todo', 'in_progress', 'review', 'done']);

export class KanbanService {
  /**
   * Verify that the requesting user has permission to access the team's Kanban.
   *
   * @param {string} teamId
   * @param {string} userId
   */
  async verifyTeamAccess(teamId, userId) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError(`Team ${teamId} not found`, 404, 'TEAM_NOT_FOUND');
    }

    if (String(team.created_by) === String(userId)) {
      return team;
    }

    const role = await teamRepository.getMemberRole(teamId, userId);
    if (!role) {
      throw new AppError('You do not have access to this team', 403, 'FORBIDDEN');
    }

    return team;
  }

  /**
   * Fetch Kanban board tasks and column groupings for a team.
   *
   * @param {string} teamId
   * @param {string} userId
   * @param {object} options
   * @param {string|null} options.meetingId
   * @returns {Promise<object>}
   */
  async getKanban(teamId, userId, { meetingId = null } = {}) {
    await this.verifyTeamAccess(teamId, userId);

    if (meetingId) {
      const meeting = await meetingRepository.findById(meetingId);
      if (!meeting || String(meeting.team_id) !== String(teamId)) {
        throw new AppError(`Meeting ${meetingId} not found in this team`, 404, 'MEETING_NOT_FOUND');
      }
    }

    logger.info(`Fetching Kanban for team ${teamId}${meetingId ? ` (meeting: ${meetingId})` : ''}`);

    const { meetings, tasks } = await kanbanRepository.getTeamTasks(teamId, { meetingId });

    // Group tasks into columns
    const columns = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    for (const task of tasks) {
      const col = columns[task.status] ? task.status : 'todo';
      columns[col].push(task);
    }

    return {
      team_id: teamId,
      meeting_id: meetingId,
      meetings,
      tasks,
      columns,
      total_tasks: tasks.length,
    };
  }

  /**
   * Update a ticket's status on the Kanban board.
   *
   * @param {string} teamId
   * @param {string} ticketId
   * @param {string} newStatus
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async updateTicketStatus(teamId, ticketId, newStatus, userId) {
    await this.verifyTeamAccess(teamId, userId);

    if (!newStatus || !ALLOWED_STATUSES.has(newStatus)) {
      throw new AppError(
        `Invalid status '${newStatus}'. Allowed: ${Array.from(ALLOWED_STATUSES).join(', ')}`,
        422,
        'INVALID_STATUS'
      );
    }

    const result = await kanbanRepository.updateTicketStatus(teamId, ticketId, newStatus);
    if (!result) {
      throw new AppError(`Ticket ${ticketId} not found in team ${teamId}`, 404, 'TICKET_NOT_FOUND');
    }

    logger.info(`Updated ticket ${ticketId} status to '${newStatus}' for team ${teamId}`);
    return result;
  }
}

export const kanbanService = new KanbanService();
