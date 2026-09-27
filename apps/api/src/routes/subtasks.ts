import type { FastifyPluginAsync } from 'fastify';
import {
  CreateSubtaskSchema,
  UpdateSubtaskSchema,
  FilterSubtasksSchema,
  BulkDeleteSubtasksSchema,
  ReorderSubtasksSchema
} from '@ledgr/shared';
import { SubtaskService } from '../services/subtask.service';

export const subtaskRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // List / search / filter subtasks
  fastify.get('/', async (request, reply) => {
    const parseRes = FilterSubtasksSchema.safeParse(request.query);
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(parseRes.error.errors[0]?.message || 'Invalid filter parameters');
    }
    const result = await SubtaskService.getSubtasks(request.user.id, parseRes.data);
    return reply.send({
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: parseRes.data.page,
        limit: parseRes.data.limit,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Get subtask by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const subtask = await SubtaskService.getSubtaskById(request.user.id, id);
    if (!subtask) {
      throw fastify.httpErrors.notFound('Subtask not found');
    }
    return reply.send({ success: true, data: subtask });
  });

  // Create subtask (with strict API-level past-date validation!)
  fastify.post('/', async (request, reply) => {
    const parseRes = CreateSubtaskSchema.safeParse(request.body);
    if (!parseRes.success) {
      const isDateErr = parseRes.error.errors.some((e) => e.path.includes('entry_date') || e.message.includes('Future'));
      if (isDateErr) {
        throw fastify.httpErrors.unprocessableEntity(parseRes.error.errors[0]?.message || 'Future dates are not allowed');
      }
      throw fastify.httpErrors.badRequest(parseRes.error.errors[0]?.message || 'Invalid subtask input');
    }

    const subtask = await SubtaskService.createSubtask(fastify, request.user.id, parseRes.data);
    return reply.status(201).send({ success: true, data: subtask });
  });

  // Update subtask
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseRes = UpdateSubtaskSchema.safeParse(request.body);
    if (!parseRes.success) {
      const isDateErr = parseRes.error.errors.some((e) => e.path.includes('entry_date') || e.message.includes('Future'));
      if (isDateErr) {
        throw fastify.httpErrors.unprocessableEntity(parseRes.error.errors[0]?.message || 'Future dates are not allowed');
      }
      throw fastify.httpErrors.badRequest(parseRes.error.errors[0]?.message || 'Invalid subtask input');
    }

    const updated = await SubtaskService.updateSubtask(fastify, request.user.id, id, parseRes.data);
    if (!updated) {
      throw fastify.httpErrors.notFound('Subtask not found');
    }
    return reply.send({ success: true, data: updated });
  });

  // Delete subtask
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await SubtaskService.deleteSubtask(request.user.id, id);
    if (!deleted) {
      throw fastify.httpErrors.notFound('Subtask not found');
    }
    return reply.send({ success: true });
  });

  // Bulk delete subtasks
  fastify.post('/bulk-delete', async (request, reply) => {
    const parseRes = BulkDeleteSubtasksSchema.safeParse(request.body);
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(parseRes.error.errors[0]?.message || 'Invalid bulk delete payload');
    }
    const count = await SubtaskService.bulkDeleteSubtasks(request.user.id, parseRes.data.ids);
    return reply.send({ success: true, data: { deletedCount: count } });
  });

  // Reorder subtasks
  fastify.post('/reorder', async (request, reply) => {
    const parseRes = ReorderSubtasksSchema.safeParse(request.body);
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(parseRes.error.errors[0]?.message || 'Invalid reorder payload');
    }
    const success = await SubtaskService.reorderSubtasks(request.user.id, parseRes.data.title_id, parseRes.data.ordered_ids);
    return reply.send({ success });
  });
};
