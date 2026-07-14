import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import app from './app.js';

/**
 * Starts the server only after a successful database connection.
 * This ensures the app never accepts traffic with a broken DB connection.
 */
async function bootstrap() {
  try {
    await connectDatabase();

    const server = app.listen(env.port, () => {
      logger.info(`ScrumMind API running on port ${env.port} [${env.nodeEnv}]`);
      logger.info(`Health check → http://localhost:${env.port}/health`);
    });

    // ─── Graceful Shutdown ────────────────────────────────────────────────
    const shutdown = (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

bootstrap();
