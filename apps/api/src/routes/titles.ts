import type { FastifyPluginAsync } from 'fastify';
import { CreateTitleSchema, UpdateTitleSchema } from '@ledgr/shared';
import { TitleService } from '../services/title.service';

export const titleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // List titles
  fastify.get('/', async (request, reply) => {
    const query = request.query as { include_archived?: string };
    const includeArchived = query.include_archived === 'true';
    const titles = await TitleService.getTitles(request.user.id, includeArchived);
    return reply.send({ success: true, data: titles });
  });

  // Get title by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const title = await TitleService.getTitleById(request.user.id, id);
    if (!title) {
      throw fastify.httpErrors.notFound('Title not found');
    }
    return reply.send({ success: true, data: title });
  });

  // Create title
  fastify.post('/', async (request, reply) => {
    const parseRes = CreateTitleSchema.safeParse(request.body);
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(parseRes.error.errors[0]?.message || 'Invalid title data');
    }
    const title = await TitleService.createTitle(request.user.id, parseRes.data);
    return reply.status(201).send({ success: true, data: title });
  });

  // Update title
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseRes = UpdateTitleSchema.safeParse(request.body);
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(parseRes.error.errors[0]?.message || 'Invalid title update');
    }
    const updated = await TitleService.updateTitle(request.user.id, id, parseRes.data);
    if (!updated) {
      throw fastify.httpErrors.notFound('Title not found');
    }
    return reply.send({ success: true, data: updated });
  });

  // Delete title
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await TitleService.deleteTitle(request.user.id, id);
    if (!deleted) {
      throw fastify.httpErrors.notFound('Title not found');
    }
    return reply.send({ success: true });
  });
};
