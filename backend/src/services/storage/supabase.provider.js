import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/**
 * Supabase Storage provider for object storage.
 * Uses the Supabase REST API directly (no @supabase/supabase-js dependency).
 */
export class SupabaseStorageProvider {
  constructor() {
    this.baseUrl = env.supabaseUrl;
    this.serviceKey = env.supabaseServiceRoleKey;
    this.bucket = env.supabaseBucket;

    if (!this.baseUrl || !this.serviceKey) {
      logger.warn('[storage] Supabase credentials not configured — uploads will fail');
    }
  }

  /**
   * Upload a file to Supabase Storage.
   * @param {string} path - Object path (e.g. "meeting-transcripts/{meetingId}/conversation.txt")
   * @param {Buffer|string} body - File content
   * @param {string} contentType - MIME type
   * @returns {Promise<{path: string, size: number}>}
   */
  async upload(path, body, contentType = 'text/plain') {
    const url = `${this.baseUrl}/storage/v1/object/${this.bucket}/${path}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.serviceKey}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase upload failed (${response.status}): ${error}`);
    }

    const size = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body, 'utf8');
    logger.info(`[storage] Uploaded ${path} (${size} bytes) to Supabase`);
    return { path, size };
  }

  /**
   * Download a file from Supabase Storage.
   * @param {string} path - Object path
   * @returns {Promise<Buffer>}
   */
  async download(path) {
    const url = `${this.baseUrl}/storage/v1/object/${this.bucket}/${path}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.serviceKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase download failed (${response.status}): ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Delete a file from Supabase Storage.
   * @param {string} path - Object path
   * @returns {Promise<void>}
   */
  async delete(path) {
    const url = `${this.baseUrl}/storage/v1/object/${this.bucket}/${path}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.serviceKey}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      throw new Error(`Supabase delete failed (${response.status}): ${error}`);
    }
  }

  /**
   * Check if a file exists.
   * @param {string} path - Object path
   * @returns {Promise<boolean>}
   */
  async exists(path) {
    const url = `${this.baseUrl}/storage/v1/object/info/${this.bucket}/${path}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.serviceKey}`,
      },
    });

    return response.ok;
  }
}
