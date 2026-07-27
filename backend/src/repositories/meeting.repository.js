import pool from '../config/database.js';
import { randomUUID } from 'crypto';

export const meetingRepository = {
  async create({ team_id, title, sprint_name, host_id }) {
    const { rows } = await pool.query(
      `INSERT INTO meetings (team_id, title, sprint_name, host_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [team_id, title, sprint_name ?? null, host_id]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT m.*, u.full_name AS host_name, u.avatar_url AS host_avatar,
              t.name AS team_name
       FROM meetings m
       JOIN users u ON u.id = m.host_id
       JOIN teams t ON t.id = m.team_id
       WHERE m.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async findByTeam(team_id) {
    const { rows } = await pool.query(
      `SELECT m.*, u.full_name AS host_name
       FROM meetings m JOIN users u ON u.id = m.host_id
       WHERE m.team_id = $1 ORDER BY m.created_at DESC`,
      [team_id]
    );
    return rows;
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
      `INSERT INTO meeting_participants (meeting_id, user_id, role)
       VALUES ($1,$2,$3) ON CONFLICT (meeting_id, user_id) DO UPDATE SET left_at=NULL RETURNING *`,
      [meeting_id, user_id, role]
    );
    return rows[0];
  },

  async removeParticipant(meeting_id, user_id) {
    await pool.query(
      `UPDATE meeting_participants SET left_at=NOW() WHERE meeting_id=$1 AND user_id=$2`,
      [meeting_id, user_id]
    );
  },

  async getParticipants(meeting_id) {
    const { rows } = await pool.query(
      `SELECT mp.*, u.full_name, u.avatar_url, u.email
       FROM meeting_participants mp JOIN users u ON u.id = mp.user_id
       WHERE mp.meeting_id=$1 AND mp.left_at IS NULL`,
      [meeting_id]
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

  async saveTranscript({ meeting_id, transcript_path, transcript_name, transcript_size = 0, duration = null }) {
    const { rows } = await pool.query(
      `INSERT INTO meeting_transcripts (meeting_id, transcript_path, transcript_name, transcript_size, duration)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [meeting_id, transcript_path, transcript_name, transcript_size, duration]
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
};
