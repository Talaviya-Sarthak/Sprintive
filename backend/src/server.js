import { createServer } from 'http';
import { Server }        from 'socket.io';
import { env }           from './config/env.js';
import { connectDatabase } from './config/database.js';
import { logger }        from './utils/logger.js';
import app               from './app.js';
import { initSocket }    from './socket/meeting.socket.js';

async function bootstrap() {
  try {
    await connectDatabase();

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
