import 'dotenv/config';

/**
 * Validates and exports all environment variables.
 * The app will crash at startup if any required variable is missing,
 * preventing silent misconfigurations in production.
 */

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
};
