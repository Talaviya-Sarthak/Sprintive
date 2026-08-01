import pool from '../config/database.js';

/**
 * participant_audio repository — per-participant recording metadata.
 * Stores only object keys (storage_key), never provider URLs.
 */
export const recordingRepository = {
  /**
   * Create a recording metadata row.
   */
  async create({ meeting_id, participant_id, participant_name, mime_type = null, size_bytes = null, duration_ms = null, started_at = null, ended_at = null, status = 'pending' }) {
    const { rows } = await pool.query(
      `INSERT INTO participant_audio
         (meeting_id, participant_id, participant_name, mime_type, size_bytes, duration_ms, status, started_at, ended_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [meeting_id, participant_id, participant_name, mime_type, size_bytes, duration_ms, status, started_at, ended_at]
    );
    return rows[0];
  },

  /**
   * Find a single recording by id.
   */
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM participant_audio WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  /**
   * Find the most recent recording for a meeting + participant.
   */
  async findByMeetingAndParticipant(meeting_id, participant_id) {
    const { rows } = await pool.query(
      `SELECT * FROM participant_audio
       WHERE meeting_id = $1 AND participant_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [meeting_id, participant_id]
    );
    return rows[0] ?? null;
  },

  /**
   * All recordings for a meeting, oldest first.
   */
  async findByMeeting(meeting_id) {
    const { rows } = await pool.query(
      `SELECT * FROM participant_audio WHERE meeting_id = $1 ORDER BY created_at ASC`,
      [meeting_id]
    );
    return rows;
  },

  /**
   * Recordings ready (or retriable) for speech recognition.
   */
  async findReadyForProcessing(meeting_id) {
    const { rows } = await pool.query(
      `SELECT * FROM participant_audio
       WHERE meeting_id = $1 AND status IN ('stored', 'failed')
       ORDER BY created_at ASC`,
      [meeting_id]
    );
    return rows;
  },

  /**
   * Update the row after the audio is persisted to object storage.
   * status → 'stored'.
   */
  async markStored(id, { storage_key, mime_type, size_bytes, duration_ms }) {
    const { rows } = await pool.query(
      `UPDATE participant_audio
       SET storage_key = $2, mime_type = COALESCE($3, mime_type),
           size_bytes = COALESCE($4, size_bytes), duration_ms = COALESCE($5, duration_ms),
           status = 'stored'
       WHERE id = $1
       RETURNING *`,
      [id, storage_key, mime_type, size_bytes, duration_ms]
    );
    return rows[0] ?? null;
  },

  /**
   * Generic status update with optional extra fields.
   */
  async updateStatus(id, status, extra = {}) {
    const setClauses = ['status = $2'];
    const values = [id, status];
    let idx = 3;
    if (extra.storage_key !== undefined) { setClauses.push(`storage_key = $${idx++}`); values.push(extra.storage_key); }
    if (extra.mime_type !== undefined)   { setClauses.push(`mime_type = $${idx++}`);   values.push(extra.mime_type); }
    if (extra.size_bytes !== undefined)  { setClauses.push(`size_bytes = $${idx++}`);  values.push(extra.size_bytes); }
    if (extra.duration_ms !== undefined) { setClauses.push(`duration_ms = $${idx++}`); values.push(extra.duration_ms); }
    if (extra.ended_at !== undefined)    { setClauses.push(`ended_at = $${idx++}`);    values.push(extra.ended_at); }
    if (extra.error !== undefined)       { setClauses.push(`error = $${idx++}`);       values.push(extra.error); }

    const { rows } = await pool.query(
      `UPDATE participant_audio SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },

  /**
   * Mark every still-pending recording of a meeting as 'missing'
   * (no audio ever arrived for that upload).
   */
  async markPendingAsMissing(meeting_id) {
    const { rows } = await pool.query(
      `UPDATE participant_audio
       SET status = 'missing'
       WHERE meeting_id = $1 AND status = 'pending'
       RETURNING *`,
      [meeting_id]
    );
    return rows;
  },

  /**
   * Insert 'missing' placeholder rows for meeting participants who never
   * uploaded any audio. This guarantees a complete recording record.
   */
  async createMissingForAbsentParticipants(meeting_id, participants) {
    const missing = [];
    for (const p of participants) {
      const { rows } = await pool.query(
        `SELECT 1 FROM participant_audio WHERE meeting_id = $1 AND participant_id = $2 LIMIT 1`,
        [meeting_id, p.user_id]
      );
      if (rows.length === 0) {
        const created = await this.create({
          meeting_id,
          participant_id: p.user_id,
          participant_name: p.full_name || p.user_id,
          status: 'missing',
        });
        missing.push(created);
      }
    }
    return missing;
  },
};
