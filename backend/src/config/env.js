import 'dotenv/config';

const required = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[env] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// ── Parse SUPABASE_STORAGE_URL ──────────────────────────────────────────────
// Format: {project-ref}:{service-role-key}
// Example: zekayjgbsjluziukrzof:eyJhbGciOiJIUzI1NiIs...
//
// The URL https://{project-ref}.supabase.co is built automatically.
function parseStorageUrl(raw) {
  if (!raw) return { url: '', key: '' };
  const colonIndex = raw.indexOf(':');
  if (colonIndex === -1) return { url: '', key: '' };
  const projectRef = raw.substring(0, colonIndex);
  const serviceRoleKey = raw.substring(colonIndex + 1);
  if (!projectRef || !serviceRoleKey) return { url: '', key: '' };
  return {
    url: `https://${projectRef}.supabase.co`,
    key: serviceRoleKey,
  };
}

const storage = parseStorageUrl(process.env.SUPABASE_STORAGE_URL);

export const env = {
  port:               parseInt(process.env.PORT ?? '5000', 10),
  nodeEnv:            process.env.NODE_ENV ?? 'development',
  isDev:              (process.env.NODE_ENV ?? 'development') === 'development',

  databaseUrl:        process.env.DATABASE_URL,

  jwtAccessSecret:    process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret:   process.env.JWT_REFRESH_SECRET,
  accessTokenExpiry:  process.env.ACCESS_TOKEN_EXPIRY  ?? '15m',
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY ?? '7d',

  googleClientId:     process.env.GOOGLE_CLIENT_ID     ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',

  githubClientId:     process.env.GITHUB_CLIENT_ID     ?? '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',

  frontendUrl:        (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),

  // ── Object Storage ─────────────────────────────────────────────────────────
  // Change SUPABASE_STORAGE_URL to switch Supabase projects.
  // Format: {project-ref}:{service-role-key}
  storageProvider:    process.env.STORAGE_PROVIDER ?? 'supabase',
  supabaseUrl:        storage.url,
  supabaseServiceRoleKey: storage.key,
  supabaseBucket:     process.env.SUPABASE_BUCKET ?? 'meetings',

  // ── Transcript Processing Service ──────────────────────────────────────────
  transcriptProcessingServiceUrl: process.env.TRANSCRIPT_PROCESSING_SERVICE_URL ?? 'http://localhost:8001',

  // ── AI Service ─────────────────────────────────────────────────────────────
  aiServiceUrl:       process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY ?? 'sprintive_internal_service_secret_key_2026',
  aiServiceTimeoutMs: parseInt(process.env.AI_SERVICE_TIMEOUT_MS ?? '10000', 10),

  // ── Deepgram STT ──────────────────────────────────────────────────────────
  deepgramApiKey:     process.env.DEEPGRAM_API_KEY ?? '',
  deepgramModel:      process.env.DEEPGRAM_MODEL  ?? 'nova-3',

  // ── Brevo Email ────────────────────────────────────────────────────────────
  brevoApiKey:        process.env.BREVO_API_KEY            ?? '',
  brevoSenderEmail:   process.env.BREVO_SENDER_EMAIL       ?? 'noreply@sprintive.app',
  brevoSenderName:    process.env.BREVO_SENDER_NAME        ?? 'Sprintive',
};

// Warn about missing Brevo config on startup (do NOT block boot)
if (!process.env.BREVO_API_KEY) {
  console.warn('[env] Brevo email sending NOT configured — missing: BREVO_API_KEY');
}

// Log storage config on startup
if (storage.url) {
  console.log(`[env] Storage: ${env.storageProvider} → ${env.supabaseUrl} / ${env.supabaseBucket}`);
} else if (env.storageProvider === 'supabase') {
  console.warn('[env] Storage: SUPABASE_STORAGE_URL not set — uploads will fail');
}
