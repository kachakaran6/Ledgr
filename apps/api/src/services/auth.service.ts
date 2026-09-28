import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../db';
import type { SignUpInput, LoginInput, AuthSession } from '@ledgr/shared';

export class AuthService {
  static async signUp(fastify: FastifyInstance, input: SignUpInput): Promise<AuthSession> {
    const db = getDatabase();
    const email = input.email.trim().toLowerCase();
    const existing = await db.getUserByEmail(email);
    if (existing) {
      throw fastify.httpErrors.conflict('Email is already registered');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(input.password, salt);
    const user = await db.createUser(email, passwordHash, input.name?.trim());

    await db.createAuditLog(user.id, 'AUTH_SIGNUP', 'account', user.id, { email: user.email });

    const token = fastify.jwt.sign(
      { sub: user.id, id: user.id, email: user.email, name: user.name },
      { expiresIn: '7d' }
    );

    return {
      user: { id: user.id, email: user.email, name: user.name, created_at: user.created_at },
      token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
  }

  static async login(fastify: FastifyInstance, input: LoginInput): Promise<AuthSession> {
    const db = getDatabase();
    const email = input.email.trim().toLowerCase();
    const user = await db.getUserByEmail(email);
    if (!user) {
      throw fastify.httpErrors.unauthorized('Invalid email or password');
    }

    const isValid = await bcrypt.compare(input.password, user.password_hash);
    if (!isValid) {
      await db.createAuditLog(user.id, 'AUTH_LOGIN_FAILED', 'account', user.id, { email });
      throw fastify.httpErrors.unauthorized('Invalid email or password');
    }

    await db.createAuditLog(user.id, 'AUTH_LOGIN', 'account', user.id, { email: user.email });

    const token = fastify.jwt.sign(
      { sub: user.id, id: user.id, email: user.email, name: user.name },
      { expiresIn: '7d' }
    );

    return {
      user: { id: user.id, email: user.email, name: user.name, created_at: user.created_at },
      token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
  }
}
