import type { FastifyPluginAsync } from 'fastify';
import { SignUpSchema, LoginSchema } from '@ledgr/shared';
import { AuthService } from '../services/auth.service';
import { getDatabase } from '../db';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Sign up
  fastify.post('/signup', async (request, reply) => {
    const parseRes = SignUpSchema.safeParse(request.body);
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(parseRes.error.errors[0]?.message || 'Invalid signup details');
    }
    const session = await AuthService.signUp(fastify, parseRes.data);
    return reply.status(201).send({ success: true, data: session });
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const parseRes = LoginSchema.safeParse(request.body);
    if (!parseRes.success) {
      throw fastify.httpErrors.badRequest(parseRes.error.errors[0]?.message || 'Invalid login details');
    }
    const session = await AuthService.login(fastify, parseRes.data);
    return reply.send({ success: true, data: session });
  });

  // Me (current authenticated user)
  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const db = getDatabase();
    const user = await db.getUserById(request.user.id);
    if (!user) {
      throw fastify.httpErrors.notFound('User profile not found');
    }
    return reply.send({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      }
    });
  });

  // Export all user data (GDPR requirement)
  fastify.get('/export-all', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const db = getDatabase();
    const data = await db.exportAllUserData(request.user.id);
    return reply.send({ success: true, data });
  });

  // Delete account (GDPR requirement)
  fastify.delete('/account', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const db = getDatabase();
    const deleted = await db.deleteUser(request.user.id);
    return reply.send({ success: deleted });
  });
};
