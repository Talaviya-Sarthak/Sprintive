import { env } from '../../config/env.js';
import { SupabaseStorageProvider } from './supabase.provider.js';
import { logger } from '../../utils/logger.js';

/**
 * Provider-agnostic object storage service.
 * 
 * Current: Supabase Storage
 * Future: Amazon S3 (implement S3StorageProvider and swap in env.js)
 * 
 * Architecture:
 *   TranscriptService → StorageService → StorageProvider (Supabase/S3)
 */
class StorageService {
  constructor() {
    this.provider = this._createProvider();
  }

  _createProvider() {
    const provider = env.storageProvider?.toLowerCase();
    switch (provider) {
      case 'supabase':
        return new SupabaseStorageProvider();
      // Future: case 's3': return new S3StorageProvider();
      default:
        logger.warn(`[storage] Unknown provider "${provider}", defaulting to Supabase`);
        return new SupabaseStorageProvider();
    }
  }

  /**
   * Upload the conversation transcript to object storage.
   * @param {string} meetingId - Meeting UUID
   * @param {string} content - The full conversation.txt content
   * @returns {Promise<{path: string, size: number, bucket: string, provider: string}>}
   */
  async uploadTranscript(meetingId, content) {
    const path = `meeting-transcripts/${meetingId}/${meetingId}.txt`;
    const result = await this.provider.upload(path, content, 'text/plain; charset=utf-8');

    return {
      path: result.path,
      size: result.size,
      bucket: env.supabaseBucket,
      provider: env.storageProvider,
    };
  }

  /**
   * Download a transcript from object storage.
   * @param {string} path - Object path
   * @returns {Promise<string>}
   */
  async getTranscript(path) {
    const buffer = await this.provider.download(path);
    return buffer.toString('utf8');
  }

  /**
   * Delete a transcript from object storage.
   * @param {string} path - Object path
   * @returns {Promise<void>}
   */
  async deleteTranscript(path) {
    await this.provider.delete(path);
  }
}

export const storageService = new StorageService();
