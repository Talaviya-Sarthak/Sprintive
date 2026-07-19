/**
 * Application-wide constants.
 * Centralizing magic values here prevents typos and makes
 * future changes (e.g. bcrypt rounds) a single-line edit.
 */

export const BCRYPT_ROUNDS = 12;

export const PLAN_LIMITS = {
  free: {
    maxOwnedTeams:  2,
    maxJoinedTeams: 1,
  },
};

export const TOKEN_TYPES = {
  ACCESS:  'access',
  REFRESH: 'refresh',
};

export const AUTH_PROVIDERS = {
  LOCAL:  'local',
  GOOGLE: 'google',
  GITHUB: 'github',
};

export const HTTP_STATUS = {
  OK:                    200,
  CREATED:               201,
  NO_CONTENT:            204,
  BAD_REQUEST:           400,
  UNAUTHORIZED:          401,
  FORBIDDEN:             403,
  NOT_FOUND:             404,
  CONFLICT:              409,
  UNPROCESSABLE_ENTITY:  422,
  TOO_MANY_REQUESTS:     429,
  INTERNAL_SERVER_ERROR: 500,
};
