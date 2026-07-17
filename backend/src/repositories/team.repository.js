import pool from '../config/database.js';
import { randomUUID } from 'crypto';

export const teamRepository = {
  async create({ name, description, avatar_url, color, timezone, working_days, daily_scrum_time, created_by }) {
    const { rows } = await pool.query(
      `INSERT INTO teams (name, description, avatar_url, color, timezone, working_days, daily_scrum_time, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, description ?? null, avatar_url ?? null, color, timezone, working_days, daily_scrum_time, created_by]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT t.*, u.full_name AS creator_name, u.avatar_url AS creator_avatar,
              (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
       FROM teams t JOIN users u ON u.id = t.created_by WHERE t.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async addMember(team_id, user_id, role = 'developer') {
    const { rows } = await pool.query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1,$2,$3) ON CONFLICT (team_id, user_id) DO NOTHING RETURNING *`,
      [team_id, user_id, role]
    );
    return rows[0];
  },

  async isMember(team_id, user_id) {
    const { rows } = await pool.query(
      `SELECT 1 FROM team_members WHERE team_id=$1 AND user_id=$2`,
      [team_id, user_id]
    );
    return rows.length > 0;
  },

  async createInvitation({ team_id, invited_by, email }) {
    const token = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO invitations (team_id, invited_by, email, token)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [team_id, invited_by, email ?? null, token]
    );
    return rows[0];
  },

  async findInvitationByToken(token) {
    const { rows } = await pool.query(
      `SELECT i.*, t.name AS team_name, t.avatar_url AS team_avatar, t.color AS team_color,
              u.full_name AS inviter_name,
              (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
       FROM invitations i
       JOIN teams t ON t.id = i.team_id
       JOIN users u ON u.id = i.invited_by
       WHERE i.token = $1`,
      [token]
    );
    return rows[0] ?? null;
  },

  async updateInvitationStatus(token, status) {
    const { rows } = await pool.query(
      `UPDATE invitations SET status=$1 WHERE token=$2 RETURNING *`,
      [status, token]
    );
    return rows[0];
  },

  async expireOldInvitations() {
    await pool.query(
      `UPDATE invitations SET status='expired'
       WHERE status='pending' AND expires_at < NOW()`
    );
  },
};
