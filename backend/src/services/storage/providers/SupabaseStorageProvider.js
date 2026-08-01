import { env } from '../../../config/env.js';
import { StorageProvider, StorageError } from '../StorageProvider.js';
import { logger } from '../../../utils/logger.js';

/**
 * SupabaseStorageProvider — implements StorageProvider against Supabase Storage.
 *
 * Uses Supabase's Storage REST API directly (no SDK dependency):
 *   POST/DELETE/HEAD .../storage/v1/object/{bucket}/{key}
 *
 * The rest of the application only ever sees StorageProvider; this class is a
 * drop-in that can be swapped for S3StorageProvider without touching callers.
 */
export class SupabaseStorageProvider extends StorageProvider {
  constructor() {
    super();
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey || !env.supabaseBucket) {
      logger.warn('[storage] Supabase provider missing env config (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_BUCKET)');
    }
  }

  /** @returns {string} e.g. https://<project>.supabase.co */
  get baseUrl() {
    return `${env.supabaseUrl}/storage/v1`;
  }

  /** @returns {string} Object URL for the configured bucket */
  objectUrl(key) {
    const cleanKey = key.replace(/^\/+/, '');
    return `${this.baseUrl}/object/${env.supabaseBucket}/${cleanKey}`;
  }

  /** @returns {Record<string,string>} Auth + JSON headers */
  authHeaders(extra = {}) {
    return {
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      apikey: env.supabaseServiceRoleKey,
      ...extra,
    };
  }

  async upload(key, body, options = {}) {
    const cleanKey = key.replace(/^\/+/, '');
    const headers = this.authHeaders({
      'Content-Type': options.contentType ?? 'application/octet-stream',
      'x-upsert': options.upsert ? 'true' : 'false',
      ...(options.cacheControl ? { 'Cache-Control': options.cacheControl } : {}),
    });

    let res;
    try {
      res = await fetch(this.objectUrl(cleanKey), {
        method: 'POST',
        headers,
        body: body instanceof Uint8Array ? body : Buffer.from(body),
      });
    } catch (cause) {
      throw new StorageError('Supabase upload network failure', { provider: 'supabase', key: cleanKey, cause });
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new StorageError(`Supabase upload failed (${res.status})`, {
        provider: 'supabase', key: cleanKey, status: res.status, cause: detail,
      });
    }

    logger.debug(`[storage] uploaded ${cleanKey} (${body.byteLength ?? body.length} bytes)`);
    return cleanKey;
  }

  async download(key) {
    const cleanKey = key.replace(/^\/+/, '');
    let res;
    try {
      res = await fetch(this.objectUrl(cleanKey), { method: 'GET', headers: this.authHeaders() });
    } catch (cause) {
      throw new StorageError('Supabase download network failure', { provider: 'supabase', key: cleanKey, cause });
    }

    if (!res.ok) {
      throw new StorageError(`Supabase download failed (${res.status})`, {
        provider: 'supabase', key: cleanKey, status: res.status,
      });
    }

    return Buffer.from(await res.arrayBuffer());
  }

  async delete(key) {
    const cleanKey = key.replace(/^\/+/, '');
    let res;
    try {
      res = await fetch(this.objectUrl(cleanKey), { method: 'DELETE', headers: this.authHeaders() });
    } catch (cause) {
      throw new StorageError('Supabase delete network failure', { provider: 'supabase', key: cleanKey, cause });
    }

    if (!res.ok && res.status !== 400) {
      throw new StorageError(`Supabase delete failed (${res.status})`, {
        provider: 'supabase', key: cleanKey, status: res.status,
      });
    }
  }

  async exists(key) {
    const cleanKey = key.replace(/^\/+/, '');
    let res;
    try {
      res = await fetch(this.objectUrl(cleanKey), { method: 'HEAD', headers: this.authHeaders() });
    } catch (cause) {
      throw new StorageError('Supabase exists check network failure', { provider: 'supabase', key: cleanKey, cause });
    }
    if (res.status >= 500) {
      throw new StorageError(`Supabase exists check failed (${res.status})`, {
        provider: 'supabase', key: cleanKey, status: res.status,
      });
    }
    return res.ok;
  }

  async getSignedUrl(key, expiresIn = 3600) {
    const cleanKey = key.replace(/^\/+/, '');
    const url = `${this.baseUrl}/object/sign/${env.supabaseBucket}/${cleanKey}`;
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ expiresIn }),
      });
    } catch (cause) {
      throw new StorageError('Supabase signed URL network failure', { provider: 'supabase', key: cleanKey, cause });
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new StorageError(`Supabase signed URL failed (${res.status})`, {
        provider: 'supabase', key: cleanKey, status: res.status, cause: detail,
      });
    }

    const data = await res.json();
    return `${env.supabaseUrl}${data.signedURL}`;
  }
}
