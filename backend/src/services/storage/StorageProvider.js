/**
 * StorageProvider — abstract storage interface.
 *
 * The rest of the application MUST communicate only with this abstraction.
 * Concrete providers (Supabase, S3, R2, …) implement this interface, so
 * switching providers never touches application or database code.
 *
 * Design notes:
 *  - Methods are async and provider-agnostic.
 *  - Only object keys are handled here; URLs are never persisted.
 *  - `getSignedUrl` is available for short-lived, ephemeral links.
 */

export class StorageProvider {
  /**
   * Upload a file (Buffer) under the given object key.
   * @param {string} key Object key, e.g. `meetings/{meetingId}/{participantId}.wav`
   * @param {Buffer} body File content
   * @param {object} [options] Provider options (contentType, cacheControl, …)
   * @returns {Promise<string>} The object key
   * @throws {StorageError} on provider failure
   */
  async upload(key, body, options = {}) {
    throw new Error(`${this.constructor.name}.upload() is not implemented`);
  }

  /**
   * Download a file from the given object key.
   * @param {string} key Object key
   * @returns {Promise<Buffer>} File content
   * @throws {StorageError} when missing or on provider failure
   */
  async download(key) {
    throw new Error(`${this.constructor.name}.download() is not implemented`);
  }

  /**
   * Delete an object.
   * @param {string} key Object key
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error(`${this.constructor.name}.delete() is not implemented`);
  }

  /**
   * Check whether an object exists.
   * @param {string} key Object key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    throw new Error(`${this.constructor.name}.exists() is not implemented`);
  }

  /**
   * Create a short-lived signed URL for an object.
   * @param {string} key Object key
   * @param {number} [expiresIn] Seconds until expiry
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(key, expiresIn = 3600) {
    throw new Error(`${this.constructor.name}.getSignedUrl() is not implemented`);
  }
}

/**
 * Error thrown by storage providers. Carries the provider name for logging.
 */
export class StorageError extends Error {
  /**
   * @param {string} message
   * @param {object} [details] { provider, key, status, cause }
   */
  constructor(message, details = {}) {
    super(message);
    this.name = 'StorageError';
    this.provider = details.provider ?? 'unknown';
    this.key = details.key ?? null;
    this.status = details.status ?? null;
    this.cause = details.cause ?? null;
  }
}
