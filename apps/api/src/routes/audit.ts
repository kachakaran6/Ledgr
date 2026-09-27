import type { FastifyPluginAsync } from 'fastify';
import { getDatabase } from '../db';

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // List audit logs for user
  fastify.get('/', async (request, reply) => {
    const db = getDatabase();
    const query = request.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const logs = await db.getAuditLogs(request.user.id, limit);
    return reply.send({ success: true, data: logs });
  });
};
