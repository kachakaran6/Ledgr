import path from 'path';
import fs from 'fs';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { config } from './config';
import authPlugin from './plugins/auth';
import { healthRoutes, recordLatency } from './routes/health';
import { authRoutes } from './routes/auth';
import { titleRoutes } from './routes/titles';
import { subtaskRoutes } from './routes/subtasks';
import { exportRoutes } from './routes/export';
import { syncRoutes } from './routes/sync';
import { auditRoutes } from './routes/audit';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

export function buildServer(): FastifyInstance {
  const isTest = process.env.NODE_ENV === 'test';

  const fastify = Fastify({
    logger: isTest
      ? false
      : {
          level: 'info',
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname'
            }
          }
        },
    disableRequestLogging: isTest
  });

  // Security Headers
  fastify.register(helmet, {
    contentSecurityPolicy: false
  });

  // CORS
  fastify.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // Rate Limiting (Protects API p99 latency & prevents brute force)
  fastify.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    allowList: ['127.0.0.1', 'localhost']
  });

  // Sensible HTTP error utilities
  fastify.register(sensible);

  // Authentication Plugin (JWT + RLS Context)
  fastify.register(authPlugin);

  // Performance Monitoring Hook: track p50/p95/p99 response latency
  fastify.addHook('onResponse', async (_request, reply) => {
    const responseTime = reply.elapsedTime;
    recordLatency(responseTime);
  });

  // Centralized Error Handler
  fastify.setErrorHandler((error: any, _request, reply) => {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    let code = 'INTERNAL_SERVER_ERROR';
    if (statusCode === 422) code = 'UNPROCESSABLE_ENTITY';
    else if (statusCode === 400) code = 'BAD_REQUEST';
    else if (statusCode === 401) code = 'UNAUTHORIZED';
    else if (statusCode === 403) code = 'FORBIDDEN';
    else if (statusCode === 404) code = 'NOT_FOUND';
    else if (statusCode === 409) code = 'CONFLICT';
    else if (statusCode === 429) code = 'RATE_LIMIT_EXCEEDED';

    reply.status(statusCode).send({
      success: false,
      error: {
        code,
        message,
        details: error.validation || undefined
      }
    });
  });

  // Register Routes
  fastify.register(healthRoutes);
  fastify.register(authRoutes, { prefix: '/api/auth' });
  fastify.register(titleRoutes, { prefix: '/api/titles' });
  fastify.register(subtaskRoutes, { prefix: '/api/subtasks' });
  fastify.register(exportRoutes, { prefix: '/api/export' });
  fastify.register(syncRoutes, { prefix: '/api/sync' });
  fastify.register(auditRoutes, { prefix: '/api/audit' });

  // Serve static web frontend if available (e.g. in Docker production container)
  const candidateStaticPaths = [
    process.env.STATIC_PATH,
    path.resolve(__dirname, '../public'),
    path.resolve(process.cwd(), 'public'),
    path.resolve(__dirname, '../../web/dist')
  ].filter(Boolean) as string[];

  const staticDir = candidateStaticPaths.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

  if (staticDir) {
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api')) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'API Route not found' }
        });
      }

      const rawPath = request.url ? request.url.split('?')[0] || '/' : '/';
      const safePath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
      const requestedFile = path.join(staticDir, safePath);

      if (fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()) {
        const ext = path.extname(requestedFile).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        reply.type(contentType);
        return reply.send(fs.createReadStream(requestedFile));
      }

      const indexHtml = path.join(staticDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        reply.type('text/html; charset=utf-8');
        return reply.send(fs.createReadStream(indexHtml));
      }

      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Not found' }
      });
    });
  }

  return fastify;
}


