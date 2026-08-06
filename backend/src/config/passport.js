import passport from 'passport';
import { Strategy as GoogleStrategy }  from 'passport-google-oauth20';
import { Strategy as GitHubStrategy }  from 'passport-github2';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { env } from './env.js';
import { accessTokenOptions } from './jwt.js';
import { findUserById } from '../repositories/auth.repository.js';
import { findOrCreateOAuthUser } from '../services/auth.service.js';

/**
 * Configures all Passport.js strategies.
 * Call this once during app initialization.
 */
export function configurePassport() {

  // ─── JWT Strategy ────────────────────────────────────────────────────────
  // Extracts the Bearer token from the Authorization header.
  // Used to protect private routes via the auth middleware.
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey:    accessTokenOptions.secret,
        issuer:         accessTokenOptions.options.issuer,
        audience:       accessTokenOptions.options.audience,
      },
      async (payload, done) => {
        try {
          const user = await findUserById(payload.sub);
          if (!user || !user.is_active) return done(null, false);
          return done(null, user);
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );

  // ─── Google OAuth Strategy ───────────────────────────────────────────────
  if (env.googleClientId && env.googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID:     env.googleClientId,
          clientSecret: env.googleClientSecret,
          callbackURL:  `/api/auth/google/callback`,
          scope:        ['profile', 'email'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email     = profile.emails?.[0]?.value ?? null;
            const avatarUrl = profile.photos?.[0]?.value ?? null;
            const user = await findOrCreateOAuthUser({
              provider:   'google',
              providerId: profile.id,
              email,
              fullName:   profile.displayName,
              avatarUrl,
            });
            return done(null, user);
          } catch (err) {
            return done(err, false);
          }
        }
      )
    );
  }

  // ─── GitHub OAuth Strategy ───────────────────────────────────────────────
  if (env.githubClientId && env.githubClientSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID:     env.githubClientId,
          clientSecret: env.githubClientSecret,
          callbackURL:  `/api/auth/github/callback`,
          scope:        ['user:email'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email     = profile.emails?.[0]?.value ?? null;
            const avatarUrl = profile.photos?.[0]?.value ?? null;
            const user = await findOrCreateOAuthUser({
              provider:   'github',
              providerId: String(profile.id),
              email,
              fullName:   profile.displayName || profile.username,
              avatarUrl,
            });
            return done(null, user);
          } catch (err) {
            return done(err, false);
          }
        }
      )
    );
  }
}
