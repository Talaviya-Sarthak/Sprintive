import pool from '../config/database.js';

export const meetingRepository = {
  async create({ team_id, title, description, sprint_name, meeting_type, host_id, scheduled_start, scheduled_end, timezone, duration_minutes, agenda }) {
    const { rows } = await pool.query(
      `INSERT INTO meetings (team_id, title, description, sprint_name, meeting_type, host_id, scheduled_start, scheduled_end, timezone, duration_minutes, agenda)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [team_id, title, description ?? null, sprint_name ?? null, meeting_type ?? 'daily_scrum', host_id, scheduled_start ?? null, scheduled_end ?? null, timezone ?? 'UTC', duration_minutes ?? 30, agenda ? JSON.stringify(agenda) : '[]']
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT m.*,
              u.full_name AS host_name, u.avatar_url AS host_avatar,
              t.name AS team_name,
              (SELECT COUNT(*)::int FROM meeting_participants mp WHERE mp.meeting_id = m.id AND mp.left_at IS NULL) AS participant_count
       FROM meetings m
       JOIN users u ON u.id = m.host_id
       JOIN teams t ON t.id = m.team_id
       WHERE m.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async findByTeam(team_id, { search, status, meeting_type, sort_by, sort_order, page, limit } = {}) {
    let sql = `SELECT m.*, u.full_name AS host_name, u.avatar_url AS host_avatar,
                      t.name AS team_name,
                      (SELECT COUNT(*)::int FROM meeting_participants mp WHERE mp.meeting_id = m.id AND mp.left_at IS NULL) AS participant_count
               FROM meetings m
               JOIN users u ON u.id = m.host_id
               JOIN teams t ON t.id = m.team_id
               WHERE m.team_id = $1`;
    const params = [team_id];
    let idx = 2;

    if (search) {
      sql += ` AND (m.title ILIKE $${idx} OR m.description ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    if (status && status !== 'all') {
      sql += ` AND m.status = $${idx}`;
      params.push(status);
      idx++;
    }

    if (meeting_type && meeting_type !== 'all') {
      sql += ` AND m.meeting_type = $${idx}`;
      params.push(meeting_type);
      idx++;
    }

    const validSorts = { date: 'm.scheduled_start', title: 'm.title', status: 'm.status', created_at: 'm.created_at' };
    const sortCol = validSorts[sort_by] || 'm.scheduled_start';
    const order = sort_order === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortCol} ${order} NULLS LAST`;

    if (page && limit) {
      const offset = (page - 1) * limit;
      sql += ` LIMIT $${idx} OFFSET $${idx + 1}`;
      params.push(limit, offset);
    }

    // Also get total count
    let countSql = `SELECT COUNT(*)::int FROM meetings m WHERE m.team_id = $1`;
    const countParams = [team_id];
    let cIdx = 2;
    if (search) {
      countSql += ` AND (m.title ILIKE $${cIdx} OR m.description ILIKE $${cIdx})`;
      countParams.push(`%${search}%`);
      cIdx++;
    }
    if (status && status !== 'all') {
      countSql += ` AND m.status = $${cIdx}`;
      countParams.push(status);
      cIdx++;
    }
    if (meeting_type && meeting_type !== 'all') {
      countSql += ` AND m.meeting_type = $${cIdx}`;
      countParams.push(meeting_type);
    }

    const [result, countResult] = await Promise.all([
      pool.query(sql, params),
      pool.query(countSql, countParams),
    ]);

    return {
      meetings: result.rows,
      total: countResult.rows[0].count,
    };
  },

  async update(id, fields) {
    const setClauses = [];
    const params = [];
    let idx = 1;

    const allowedFields = ['title', 'description', 'sprint_name', 'meeting_type', 'scheduled_start', 'scheduled_end', 'timezone', 'duration_minutes', 'agenda', 'status'];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClauses.push(`${key} = $${idx}`);
        params.push(key === 'agenda' && Array.isArray(value) ? JSON.stringify(value) : value);
        idx++;
      }
    }

    if (setClauses.length === 0) return null;

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE meetings SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },

  async remove(id) {
    const { rows } = await pool.query(
      `DELETE FROM meetings WHERE id = $1 RETURNING id`,
      [id]
    );
    return rows[0] ?? null;
  },

  async updateStatus(id, status, extra = {}) {
    const fields = ['status=$2'];
    const values = [id, status];
    let idx = 3;
    if (extra.started_at) { fields.push(`started_at=$${idx++}`); values.push(extra.started_at); }
    if (extra.ended_at)   { fields.push(`ended_at=$${idx++}`);   values.push(extra.ended_at); }
    const { rows } = await pool.query(
      `UPDATE meetings SET ${fields.join(',')} WHERE id=$1 RETURNING *`,
      values
    );
    return rows[0];
  },

  async addParticipant(meeting_id, user_id, role = 'participant') {
    const { rows } = await pool.query(
      `INSERT INTO meeting_participants (meeting_id, user_id, role, attendance_status)
       VALUES ($1,$2,$3,'joined')
       ON CONFLICT (meeting_id, user_id) DO UPDATE SET left_at=NULL, attendance_status='joined' RETURNING *`,
      [meeting_id, user_id, role]
    );
    return rows[0];
  },

  async removeParticipant(meeting_id, user_id) {
    await pool.query(
      `UPDATE meeting_participants SET left_at=NOW(), attendance_status='absent' WHERE meeting_id=$1 AND user_id=$2`,
      [meeting_id, user_id]
    );
  },

  async getParticipants(meeting_id) {
    const { rows } = await pool.query(
      `SELECT mp.*, u.full_name, u.avatar_url, u.email
       FROM meeting_participants mp JOIN users u ON u.id = mp.user_id
       WHERE mp.meeting_id=$1 AND mp.left_at IS NULL
       ORDER BY mp.role = 'host' DESC, mp.joined_at ASC`,
      [meeting_id]
    );
    return rows;
  },

  async getTeamMembers(team_id) {
    const { rows } = await pool.query(
      `SELECT tm.user_id, u.full_name, u.avatar_url, u.email, tm.role
       FROM team_members tm JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1`,
      [team_id]
    );
    return rows;
  },

  async saveChat({ meeting_id, user_id, message }) {
    const { rows } = await pool.query(
      `INSERT INTO meeting_chats (meeting_id, user_id, message) VALUES ($1,$2,$3) RETURNING *`,
      [meeting_id, user_id, message]
    );
    return rows[0];
  },

  async getChats(meeting_id) {
    const { rows } = await pool.query(
      `SELECT mc.*, u.full_name, u.avatar_url
       FROM meeting_chats mc JOIN users u ON u.id = mc.user_id
       WHERE mc.meeting_id=$1 ORDER BY mc.created_at ASC`,
      [meeting_id]
    );
    return rows;
  },

  async saveTranscript({ meeting_id, content, transcript_path, transcript_name, transcript_size = 0, duration = null }) {
    const { rows } = await pool.query(
      `INSERT INTO meeting_transcripts (meeting_id, content, transcript_path, transcript_name, transcript_size, duration)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [meeting_id, content ?? null, transcript_path ?? null, transcript_name ?? null, transcript_size, duration]
    );
    return rows[0];
  },

  async getTranscript(meeting_id) {
    const { rows } = await pool.query(
      `SELECT * FROM meeting_transcripts WHERE meeting_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [meeting_id]
    );
    return rows[0] ?? null;
  },

  // ── Meeting Summary ──────────────────────────────────────────────────────────

  async upsertSummary({ meeting_id, duration_minutes, attendance_count, total_participants, ai_summary, action_items, tickets_generated }) {
    const { rows } = await pool.query(
      `INSERT INTO meeting_summaries (meeting_id, duration_minutes, attendance_count, total_participants, ai_summary, action_items, tickets_generated)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (meeting_id) DO UPDATE SET
         duration_minutes = EXCLUDED.duration_minutes,
         attendance_count = EXCLUDED.attendance_count,
         total_participants = EXCLUDED.total_participants,
         ai_summary = EXCLUDED.ai_summary,
         action_items = EXCLUDED.action_items,
         tickets_generated = EXCLUDED.tickets_generated
       RETURNING *`,
      [meeting_id, duration_minutes, attendance_count, total_participants, ai_summary ?? null, action_items ? JSON.stringify(action_items) : '[]', tickets_generated ? JSON.stringify(tickets_generated) : '[]']
    );
    return rows[0];
  },

  async getSummary(meeting_id) {
    const { rows } = await pool.query(
      `SELECT ms.*,
              m.duration_minutes,
              m.scheduled_start, m.scheduled_end,
              m.title AS meeting_title
       FROM meeting_summaries ms
       JOIN meetings m ON m.id = ms.meeting_id
       WHERE ms.meeting_id = $1
       ORDER BY ms.created_at DESC LIMIT 1`,
      [meeting_id]
    );
    return rows[0] ?? null;
  },
};
