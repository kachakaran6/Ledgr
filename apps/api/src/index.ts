import { buildServer } from './server';
import { config } from './config';

async function start() {
  const server = buildServer();

  try {
    const address = await server.listen({
      port: config.port,
      host: config.host
    });
    server.log.info(`🚀 LogPast API Server running at: ${address}`);
    server.log.info(`📊 Health check available at: ${address}/health`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
