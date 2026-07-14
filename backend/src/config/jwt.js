import { env } from './env.js';

/**
 * Centralized JWT configuration.
 * Import these options wherever tokens are signed or verified
 * to guarantee consistency across the codebase.
 */

export const accessTokenOptions = {
  secret:  env.jwtAccessSecret,
  options: {
    expiresIn: env.accessTokenExpiry,
    issuer:    'scrummind',
    audience:  'scrummind-client',
  },
};

export const refreshTokenOptions = {
  secret:  env.jwtRefreshSecret,
  options: {
    expiresIn: env.refreshTokenExpiry,
    issuer:    'scrummind',
    audience:  'scrummind-client',
  },
};
