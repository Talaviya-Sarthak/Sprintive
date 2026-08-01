import { env } from '../../config/env.js';
import { SupabaseStorageProvider } from './providers/SupabaseStorageProvider.js';
import { StorageProvider } from './StorageProvider.js';
import { logger } from '../../utils/logger.js';

/**
 * StorageService — provider factory.
 *
 * Selects a concrete StorageProvider based on STORAGE_PROVIDER env var.
 * Adding a new provider (e.g. Amazon S3) is a one-file change:
 *
 *   import { S3StorageProvider } from './providers/S3StorageProvider.js';
 *   providers.s3 = new S3StorageProvider();
 *
 * No caller ever imports a concrete provider directly.
 */

const providers = {
  supabase: () => new SupabaseStorageProvider(),
};

/** @type {StorageProvider | null} */
let cached = null;

/**
 * @returns {StorageProvider} The active storage provider (singleton).
 * @throws {Error} when STORAGE_PROVIDER is unknown.
 */
export function getStorageProvider() {
  if (cached) return cached;

  const name = env.storageProvider?.toLowerCase() ?? 'supabase';
  const factory = providers[name];

  if (!factory) {
    throw new Error(`Unknown STORAGE_PROVIDER "${name}". Available: ${Object.keys(providers).join(', ')}`);
  }

  cached = factory();
  logger.info(`[storage] active provider: ${name}`);
  return cached;
}
