import { createServer } from 'http';
import { Server }        from 'socket.io';
import { env }           from './config/env.js';
import { connectDatabase } from './config/database.js';
import { logger }        from './utils/logger.js';
import { verifySmtpConnection } from './utils/email.js';
import app               from './app.js';
import { initSocket }    from './socket/meeting.socket.js';
import { closeTranscriptQueue } from './queues/transcript.queue.js';
import { closeRedisConnection } from './config/redis.js';

async function bootstrap() {
  try {
    await connectDatabase();

    // Verify Brevo API on startup; log success/failure but do NOT block boot
    // so the API stays available even if email is temporarily down.
    logger.info('[email] Verifying Brevo API connection…');
    const brevoOk = await verifySmtpConnection();
    if (brevoOk) {
      logger.info('[email] Brevo API is ready — emails will be delivered');
    } else {
      logger.warn('[email] Brevo API verification failed — invitation emails will NOT be sent');
      logger.warn('[email] To fix: set BREVO_API_KEY, BREVO_SENDER_EMAIL in Render env vars');
    }

    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          const normalized = origin.replace(/\/+$/, '');
          const expected = env.frontendUrl.replace(/\/+$/, '');
          if (normalized === expected || normalized === 'http://localhost:5173' || normalized.endsWith('.vercel.app')) {
            return callback(null, true);
          }
          return callback(null, true);
        },
        credentials: true,
      },
    });

    initSocket(io);

    httpServer.listen(env.port, () => {
      logger.info(`Sprintive API running on port ${env.port} [${env.nodeEnv}]`);
      logger.info(`Health check → http://localhost:${env.port}/health`);
    });

    // If RUN_WORKER=true (for single-container Render deployments),
    // launch the BullMQ transcript worker in the background.
    if (process.env.RUN_WORKER === 'true') {
      logger.info('[server] RUN_WORKER=true detected: starting BullMQ transcript worker...');
      import('./workers/transcript.worker.js').catch((err) => {
        logger.error(`[server] Failed to start in-process transcript worker: ${err.message}`);
      });
    }

    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      try {
        await closeTranscriptQueue();
        await closeRedisConnection();
      } catch (cleanupErr) {
        logger.warn(`[server:shutdown] Error closing queue/redis: ${cleanupErr.message}`);
      }
      httpServer.close(() => { logger.info('HTTP server closed'); process.exit(0); });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (error) {
    console.error("SERVER STARTUP ERROR");
    console.error(error);
    process.exit(1);
}
}

bootstrap();
