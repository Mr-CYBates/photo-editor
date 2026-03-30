import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyJWT } from './auth';
import type { Env, JWTPayload, User } from './types';

// Extend Hono context with user
declare module 'hono' {
  interface ContextVariableMap {
    user: User | null;
    jwtPayload: JWTPayload | null;
  }
}

function extractToken(c: Context<{ Bindings: Env }>): string | null {
  // Try Authorization header first
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Try cookie
  const cookieToken = getCookie(c, 'auth_token');
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Auth middleware: requires valid JWT. Returns 401 if not present.
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  const token = extractToken(c);
  if (!token) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Fetch fresh user from DB
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(payload.sub)
    .first<User>();

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  c.set('user', user);
  c.set('jwtPayload', payload);
  await next();
}

/**
 * Optional auth middleware: extracts user if token present but doesn't require it.
 */
export async function optionalAuthMiddleware(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  const token = extractToken(c);
  if (token) {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (payload) {
      const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
        .bind(payload.sub)
        .first<User>();
      c.set('user', user ?? null);
      c.set('jwtPayload', payload ?? null);
    } else {
      c.set('user', null);
      c.set('jwtPayload', null);
    }
  } else {
    c.set('user', null);
    c.set('jwtPayload', null);
  }
  await next();
}
