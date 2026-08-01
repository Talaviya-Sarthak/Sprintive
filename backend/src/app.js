import express from 'express';
import helmet  from 'helmet';
import cors    from 'cors';
import passport from 'passport';
import { env }              from './config/env.js';
import { configurePassport } from './config/passport.js';
import { httpLogger }        from './utils/logger.js';
import { globalLimiter }     from './middleware/rateLimiter.middleware.js';
import { notFound }          from './middleware/notFound.middleware.js';
import { errorHandler }      from './middleware/error.middleware.js';
import authRoutes            from './routes/auth.routes.js';
import teamRoutes            from './routes/team.routes.js';
import meetingRoutes         from './routes/meeting.routes.js';
import recordingRoutes       from './routes/recording.routes.js';
import profileRoutes         from './routes/profile.routes.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin:         env.frontendUrl,
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Middleware to parse JSON fields from multipart FormData
app.use((req, res, next) => {
  if (req.is('multipart/form-data')) {
    // Process JSON fields sent in FormData
    for (const [key, value] of Object.entries(req.body || {})) {
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        try {
          req.body[key] = JSON.parse(value);
        } catch {
          // Leave as string if not valid JSON
        }
      }
    }
  }
  next();
});

app.use(httpLogger);
app.use(globalLimiter);
app.use('/uploads', express.static('uploads'));

configurePassport();
app.use(passport.initialize());

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Sprintive API is running.', env: env.nodeEnv });
});

app.use('/api/auth',     authRoutes);
app.use('/api/teams',    teamRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/meetings', recordingRoutes);
app.use('/api/profile',  profileRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
