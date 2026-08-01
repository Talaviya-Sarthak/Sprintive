import pool from '../config/database.js';

/**
 * speech_segments repository — recognized speech output per participant.
 * Stored for future AI processing only (no assembly / analysis here).
 */
export const speechSegmentRepository = {
  /**
   * Insert multiple segments for one recording in a single transaction.
   * @param {object} opts
   * @param {string} opts.meeting_id
   * @param {string} opts.participant_id
   * @param {string} opts.participant_name
   * @param {string} [opts.audio_id]
   * @param {Array<{start:number,end:number,text:string}>} opts.segments
   * @returns {Promise<number>} number of rows inserted
   */
  async bulkCreate({ meeting_id, participant_id, participant_name, audio_id = null, segments = [] }) {
    if (segments.length === 0) return 0;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let inserted = 0;
      for (const seg of segments) {
        const text = (seg.text ?? '').trim();
        if (!text) continue;
        const start = Number.isFinite(seg.start) ? seg.start : 0;
        const end = Number.isFinite(seg.end) ? seg.end : start;
        await client.query(
          `INSERT INTO speech_segments (meeting_id, participant_id, participant_name, audio_id, start_time, end_time, text)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [meeting_id, participant_id, participant_name, audio_id, start, end, text]
        );
        inserted++;
      }
      await client.query('COMMIT');
      return inserted;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * All segments for a meeting, ordered by participant then time.
   */
  async findByMeeting(meeting_id) {
    const { rows } = await pool.query(
      `SELECT * FROM speech_segments
       WHERE meeting_id = $1
       ORDER BY participant_name ASC, start_time ASC`,
      [meeting_id]
    );
    return rows;
  },

  /**
   * All segments for one recording.
   */
  async findByAudio(audio_id) {
    const { rows } = await pool.query(
      `SELECT * FROM speech_segments WHERE audio_id = $1 ORDER BY start_time ASC`,
      [audio_id]
    );
    return rows;
  },

  /**
   * Delete segments for a recording (used when retrying transcription).
   */
  async deleteByAudio(audio_id) {
    await pool.query(`DELETE FROM speech_segments WHERE audio_id = $1`, [audio_id]);
  },
};
