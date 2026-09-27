import type { FastifyPluginAsync } from 'fastify';
import { SyncBatchSchema } from '@ledgr/shared';
import { SyncService } from '../services/sync.service';

export const syncRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // Batch offline mutation processing & delta pull
  fastify.post('/batch', async (request, reply) => {
    const parseRes = SyncBatchSchema.safeParse(request.body);
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(parseRes.error.errors[0]?.message || 'Invalid sync batch payload');
    }

    const result = await SyncService.processBatch(request.user.id, parseRes.data);
    return reply.send({ success: true, data: result });
  });
};
