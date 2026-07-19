import pool from '../config/database.js';
import { randomUUID } from 'crypto';

export const teamRepository = {
  async create({ name, description, avatar_url, color, timezone, working_days, daily_scrum_time, created_by }, client) {
    const db = client ?? pool;
    
    // Ensure working_days is an array of integers
    const workingDaysArray = Array.isArray(working_days) 
      ? working_days.map(d => parseInt(d, 10))
      : [1, 2, 3, 4, 5];
    
    // Ensure daily_scrum_time is in HH:MM:SS format
    const scrum_time = daily_scrum_time.match(/^\d{2}:\d{2}$/) 
      ? `${daily_scrum_time}:00` 
      : daily_scrum_time;
    
    // Generate invite code in format: SPR-XXXXXX
    const inviteCode = 'SPR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { rows } = await db.query(
      `INSERT INTO teams (name, description, avatar_url, color, timezone, working_days, daily_scrum_time, created_by, invite_code)
       VALUES ($1,$2,$3,$4,$5,$6::int[],$7::TIME,$8,$9) RETURNING *`,
      [name, description ?? null, avatar_url ?? null, color, timezone, workingDaysArray, scrum_time, created_by, inviteCode]
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

  async findByUser(userId) {
    const { rows } = await pool.query(
      `SELECT t.*, u.full_name AS creator_name,
              (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count,
              tm.role AS my_role
       FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       JOIN users u ON u.id = t.created_by
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );
    return rows;
  },

  async update(id, fields) {
    const allowed = ['name','description','avatar_url','color','timezone','working_days','daily_scrum_time'];
    const sets = [];
    const vals = [];
    let idx = 1;
    for (const [k, v] of Object.entries(fields)) {
      if (allowed.includes(k)) {
        if (k === 'working_days' && Array.isArray(v)) {
          // Cast working_days array to PostgreSQL int[] type
          sets.push(`${k}=$${idx++}::int[]`);
          vals.push(v.map(d => parseInt(d, 10)));
        } else {
          sets.push(`${k}=$${idx++}`);
          vals.push(v);
        }
      }
    }
    if (!sets.length) return null;
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE teams SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${idx} RETURNING *`,
      vals
    );
    return rows[0] ?? null;
  },

  async delete(id) {
    await pool.query(`DELETE FROM teams WHERE id=$1`, [id]);
  },

  async addMember(team_id, user_id, role = 'developer', client) {
    const db = client ?? pool;
    const { rows } = await db.query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1,$2,$3) ON CONFLICT (team_id, user_id) DO NOTHING RETURNING *`,
      [team_id, user_id, role]
    );
    return rows[0];
  },

  async removeMember(team_id, user_id) {
    await pool.query(
      `DELETE FROM team_members WHERE team_id=$1 AND user_id=$2`,
      [team_id, user_id]
    );
  },

  async getMembers(team_id) {
    const { rows } = await pool.query(
      `SELECT tm.id, tm.team_id, tm.user_id, tm.role, tm.joined_at,
              u.full_name, u.email, u.avatar_url
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at ASC`,
      [team_id]
    );
    return rows;
  },

  async getMemberRole(team_id, user_id) {
    const { rows } = await pool.query(
      `SELECT role FROM team_members WHERE team_id=$1 AND user_id=$2`,
      [team_id, user_id]
    );
    return rows[0]?.role ?? null;
  },

  async createWithOwner({ name, description, avatar_url, color, timezone, working_days, daily_scrum_time, created_by }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const team = await this.create(
        { name, description, avatar_url, color, timezone, working_days, daily_scrum_time, created_by },
        client
      );
      await this.addMember(team.id, created_by, 'scrum_master', client);
      await client.query('COMMIT');
      return team;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async isMember(team_id, user_id) {
    const { rows } = await pool.query(
      `SELECT 1 FROM team_members WHERE team_id=$1 AND user_id=$2`,
      [team_id, user_id]
    );
    return rows.length > 0;
  },

  async countOwnedTeams(user_id) {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM teams WHERE created_by=$1`,
      [user_id]
    );
    return parseInt(rows[0].cnt, 10);
  },

  async countJoinedTeams(user_id) {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.user_id=$1 AND t.created_by <> $1`,
      [user_id]
    );
    return parseInt(rows[0].cnt, 10);
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

  async getTeamInvitations(team_id) {
    const { rows } = await pool.query(
      `SELECT i.*, u.full_name AS inviter_name
       FROM invitations i
       JOIN users u ON u.id = i.invited_by
       WHERE i.team_id = $1
       ORDER BY i.created_at DESC`,
      [team_id]
    );
    return rows;
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

  async findPendingInvitationByEmail(team_id, email) {
    const { rows } = await pool.query(
      `SELECT * FROM invitations WHERE team_id=$1 AND email=$2 AND status='pending'`,
      [team_id, email]
    );
    return rows[0] ?? null;
  },
};
