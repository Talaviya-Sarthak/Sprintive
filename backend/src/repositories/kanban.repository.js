import pool from '../config/database.js';

export const kanbanRepository = {
  /**
   * Fetch all meetings with task counts and all resolved tasks for a team.
   * Optionally filtered by meeting_id.
   *
   * @param {string} teamId
   * @param {object} options
   * @param {string|null} options.meetingId
   * @returns {Promise<{ meetings: Array<object>, tasks: Array<object> }>}
   */
  async getTeamTasks(teamId, { meetingId = null } = {}) {
    // 1. Fetch team members to enrich assignee avatars
    const { rows: memberRows } = await pool.query(
      `SELECT tm.user_id, u.full_name, u.avatar_url, tm.role
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1`,
      [teamId]
    );
    const memberMap = new Map();
    for (const m of memberRows) {
      memberMap.set(String(m.user_id), m);
      if (m.full_name) {
        memberMap.set(m.full_name.trim().toLowerCase(), m);
      }
    }

    // 2. Fetch all meetings for team that have summaries
    const { rows: meetingRows } = await pool.query(
      `SELECT 
         m.id AS meeting_id,
         m.title AS meeting_title,
         m.scheduled_start,
         m.started_at,
         m.created_at,
         COALESCE(ms.tickets_generated, '[]'::jsonb) AS tickets_generated
       FROM meetings m
       LEFT JOIN meeting_summaries ms ON ms.meeting_id = m.id
       WHERE m.team_id = $1
       ORDER BY COALESCE(m.started_at, m.scheduled_start, m.created_at) DESC`,
      [teamId]
    );

    const meetingsList = [];
    const allTasks = [];

    for (const row of meetingRows) {
      const rawTickets = Array.isArray(row.tickets_generated)
        ? row.tickets_generated
        : (typeof row.tickets_generated === 'string'
            ? JSON.parse(row.tickets_generated)
            : []);

      const meetingDate = row.started_at || row.scheduled_start || row.created_at;

      meetingsList.push({
        id: row.meeting_id,
        title: row.meeting_title,
        date: meetingDate,
        task_count: rawTickets.length,
      });

      // Filter by meetingId if requested
      if (meetingId && row.meeting_id !== meetingId) {
        continue;
      }

      for (const t of rawTickets) {
        const taskId = t.id || t.ticket_id;
        const matchedMember = t.assignee_id
          ? memberMap.get(String(t.assignee_id))
          : (t.assignee ? memberMap.get(t.assignee.trim().toLowerCase()) : null);

        const enrichedTask = {
          ...t,
          id: taskId,
          ticket_id: taskId,
          meeting_id: row.meeting_id,
          meeting_title: row.meeting_title,
          meeting_date: meetingDate,
          assignee_avatar: matchedMember?.avatar_url || null,
          assignee_role: matchedMember?.role || null,
        };
        allTasks.push(enrichedTask);
      }
    }

    return {
      meetings: meetingsList,
      tasks: allTasks,
    };
  },

  /**
   * Update the status of a specific ticket across the team's meetings.
   *
   * @param {string} teamId
   * @param {string} ticketId
   * @param {string} newStatus
   * @returns {Promise<{ updated_task: object, meeting_id: string, meeting_title: string }|null>}
   */
  async updateTicketStatus(teamId, ticketId, newStatus) {
    // Find all meeting summaries for this team
    const { rows } = await pool.query(
      `SELECT 
         ms.meeting_id,
         m.title AS meeting_title,
         ms.tickets_generated
       FROM meeting_summaries ms
       JOIN meetings m ON m.id = ms.meeting_id
       WHERE m.team_id = $1`,
      [teamId]
    );

    for (const row of rows) {
      let tickets = Array.isArray(row.tickets_generated)
        ? row.tickets_generated
        : (typeof row.tickets_generated === 'string'
            ? JSON.parse(row.tickets_generated)
            : []);

      const targetIdx = tickets.findIndex(
        (t) => String(t.id) === String(ticketId) || String(t.ticket_id) === String(ticketId)
      );

      if (targetIdx !== -1) {
        const targetTask = { ...tickets[targetIdx], status: newStatus };
        tickets[targetIdx] = targetTask;

        // Persist back to database
        await pool.query(
          `UPDATE meeting_summaries
           SET tickets_generated = $1
           WHERE meeting_id = $2`,
          [JSON.stringify(tickets), row.meeting_id]
        );

        return {
          updated_task: {
            ...targetTask,
            id: targetTask.id || targetTask.ticket_id,
            ticket_id: targetTask.ticket_id || targetTask.id,
            meeting_id: row.meeting_id,
            meeting_title: row.meeting_title,
          },
          meeting_id: row.meeting_id,
          meeting_title: row.meeting_title,
        };
      }
    }

    return null;
  },
};
