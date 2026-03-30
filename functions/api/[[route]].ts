import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setCookie } from 'hono/cookie';
import type { Env, User } from './_api/types';
import { PLAN_CREDITS, CREDIT_PACKS, PLAN_PRICES } from './_api/types';
import {
  signJWT,
  verifyJWT,
  exchangeGoogleCode,
  getGoogleUserInfo,
  findOrCreateUser,
  buildGoogleAuthUrl,
} from './_api/auth';
import { authMiddleware, optionalAuthMiddleware } from './_api/middleware';
import { checkAndDeductCredit, processRemoveBg } from './_api/removebg';
import { getHistory, createHistory, deleteHistory } from './_api/history';

type CFEnv = {
  Bindings: Env;
};

const app = new Hono<CFEnv>().basePath('/api');

// CORS
app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Health ───
app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

// ─── Auth Routes ───
app.get('/auth/google', (c) => {
  const url = buildGoogleAuthUrl(c.env);
  return c.redirect(url);
});

app.get('/auth/google/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.json({ error: 'Missing code' }, 400);

  try {
    const tokens = await exchangeGoogleCode(code, c.env);
    const googleUser = await getGoogleUserInfo(tokens.access_token);
    const user = await findOrCreateUser(googleUser, c.env);

    const jwt = await signJWT(
      { sub: user.id, email: user.email, name: user.name, plan: user.plan },
      c.env.JWT_SECRET
    );

    setCookie(c, 'auth_token', jwt, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 7 * 24 * 3600,
      path: '/',
    });

    return c.redirect(`${c.env.FRONTEND_URL}/editor?auth=success`);
  } catch (err) {
    console.error('OAuth error:', err);
    return c.redirect(`${c.env.FRONTEND_URL}/?auth=error`);
  }
});

app.get('/auth/me', authMiddleware, (c) => {
  const user = c.get('user') as User;
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    plan: user.plan,
    credits: user.credits,
  });
});

app.post('/auth/logout', (c) => {
  setCookie(c, 'auth_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 0,
    path: '/',
  });
  return c.json({ success: true });
});

// ─── Remove Background ───
app.post('/remove-bg', optionalAuthMiddleware, async (c) => {
  const user = c.get('user') as User | null;
  const credit = await checkAndDeductCredit(c, user);
  if (!credit.allowed) {
    return c.json({ error: credit.reason }, 402);
  }
  return processRemoveBg(c);
});

// ─── Credits ───
app.get('/credits', authMiddleware, async (c) => {
  const user = c.get('user') as User;

  const packs = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(credits_remaining), 0) as pack_credits
     FROM credit_packs
     WHERE user_id = ? AND credits_remaining > 0 AND (expires_at IS NULL OR expires_at > datetime('now'))`
  )
    .bind(user.id)
    .first<{ pack_credits: number }>();

  return c.json({
    plan: user.plan,
    monthly_credits: user.credits,
    monthly_limit: PLAN_CREDITS[user.plan] || 0,
    pack_credits: packs?.pack_credits ?? 0,
    total_available: user.credits + (packs?.pack_credits ?? 0),
  });
});

// ─── History ───
app.get('/history', authMiddleware, getHistory);
app.post('/history', authMiddleware, createHistory);
app.delete('/history/:id', authMiddleware, deleteHistory);

// ─── Pricing Info (public) ───
app.get('/pricing', (c) =>
  c.json({
    plans: PLAN_PRICES,
    credits_per_plan: PLAN_CREDITS,
    credit_packs: CREDIT_PACKS,
  })
);

export default app;

// Cloudflare Pages Functions handler
export const onRequest: PagesFunction<Env> = async (context) => {
  return app.fetch(context.request, context.env, context);
};
