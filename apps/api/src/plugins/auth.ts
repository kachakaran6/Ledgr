import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { config } from '../config';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string;
      sub?: string;
      email: string;
      name?: string;
    };
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyJwt, {
    secret: config.jwtSecret
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      if (!request.user.id && request.user.sub) {
        request.user.id = request.user.sub;
      }
    } catch {
      throw fastify.httpErrors.unauthorized('Invalid or missing authentication token');
    }
  });
};

export default fp(authPlugin);
