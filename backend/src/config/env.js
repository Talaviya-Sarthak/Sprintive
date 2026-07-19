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

  frontendUrl:        process.env.FRONTEND_URL ?? 'http://localhost:5173',

  // Cloudflare R2
  r2AccountId:        process.env.R2_ACCOUNT_ID        ?? '',
  r2AccessKeyId:      process.env.R2_ACCESS_KEY_ID     ?? '',
  r2SecretAccessKey:  process.env.R2_SECRET_ACCESS_KEY ?? '',
  r2BucketName:       process.env.R2_BUCKET_NAME       ?? 'sprintive-recordings',
  r2PublicUrl:        process.env.R2_PUBLIC_URL         ?? '',

  // SMTP
  smtpHost:           process.env.SMTP_HOST            ?? '',
  smtpPort:           parseInt(process.env.SMTP_PORT   ?? '587', 10),
  smtpUser:           process.env.SMTP_USER            ?? '',
  smtpPass:           process.env.SMTP_PASS            ?? '',
  smtpFrom:           process.env.SMTP_FROM            ?? 'noreply@sprintive.app',
};
