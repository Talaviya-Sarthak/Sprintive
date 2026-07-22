import { createServer } from 'http';
import { Server }        from 'socket.io';
import { env }           from './config/env.js';
import { connectDatabase } from './config/database.js';
import { logger }        from './utils/logger.js';
import { verifySmtpConnection } from './utils/email.js';
import app               from './app.js';
import { initSocket }    from './socket/meeting.socket.js';

async function bootstrap() {
  try {
    await connectDatabase();

    // Verify SMTP on startup; log success/failure but do NOT block boot
    // so the API stays available even if email is temporarily down.
    logger.info('[email] Verifying SMTP connection…');
    const smtpOk = await verifySmtpConnection();
    if (smtpOk) {
      logger.info('[email] SMTP is ready — emails will be delivered');
    } else {
      logger.warn('[email] SMTP verification failed — invitation emails will NOT be sent');
      logger.warn('[email] To fix: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in Render env vars');
    }

    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin:      env.frontendUrl,
        credentials: true,
      },
    });

    initSocket(io);

    httpServer.listen(env.port, () => {
      logger.info(`Sprintive API running on port ${env.port} [${env.nodeEnv}]`);
      logger.info(`Health check → http://localhost:${env.port}/health`);
    });

    const shutdown = (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      httpServer.close(() => { logger.info('HTTP server closed'); process.exit(0); });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

bootstrap();
