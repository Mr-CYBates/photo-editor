import type { Context } from 'hono';
import type { Env, User, PLAN_CREDITS } from './types';
import { PLAN_CREDITS as PlanCredits } from './types';

/**
 * Check if user/IP has credits available and deduct one credit.
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
export async function checkAndDeductCredit(
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<{ allowed: boolean; reason?: string }> {
  const env = c.env;

  // --- Unregistered user: 1 free use tracked by IP ---
  if (!user) {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const kvKey = `free_use:${ip}`;
    const used = await env.KV.get(kvKey);

    if (used) {
      return { allowed: false, reason: 'Free trial exhausted. Please sign in for more credits.' };
    }

    // Mark as used, expires in 30 days
    await env.KV.put(kvKey, '1', { expirationTtl: 30 * 24 * 3600 });
    return { allowed: true };
  }

  // --- Registered user: check monthly credits first, then credit packs ---
  // 1. Try monthly credits
  if (user.credits > 0) {
    await env.DB.prepare(
      'UPDATE users SET credits = credits - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND credits > 0'
    ).bind(user.id).run();

    // Log usage
    await env.DB.prepare(
      'INSERT INTO credit_usage (id, user_id, action, source, cost) VALUES (?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), user.id, 'remove_bg', 'monthly', 1).run();

    return { allowed: true };
  }

  // 2. Try credit packs (oldest first, with remaining credits)
  const pack = await env.DB.prepare(
    `SELECT * FROM credit_packs
     WHERE user_id = ? AND credits_remaining > 0 AND (expires_at IS NULL OR expires_at > datetime('now'))
     ORDER BY created_at ASC LIMIT 1`
  ).bind(user.id).first<{ id: string; credits_remaining: number }>();

  if (pack) {
    await env.DB.prepare(
      'UPDATE credit_packs SET credits_remaining = credits_remaining - 1 WHERE id = ? AND credits_remaining > 0'
    ).bind(pack.id).run();

    await env.DB.prepare(
      'INSERT INTO credit_usage (id, user_id, action, source, cost) VALUES (?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), user.id, 'remove_bg', `pack:${pack.id}`, 1).run();

    return { allowed: true };
  }

  return { allowed: false, reason: 'No credits remaining. Purchase a credit pack or upgrade your plan.' };
}

/**
 * Proxy image to Remove.bg API and return the result.
 */
export async function processRemoveBg(
  c: Context<{ Bindings: Env }>
): Promise<Response> {
  const env = c.env;
  const contentType = c.req.header('Content-Type') || '';

  let removeBgBody: BodyInit;
  let removeBgHeaders: Record<string, string> = {
    'X-Api-Key': env.REMOVEBG_API_KEY,
  };

  if (contentType.includes('multipart/form-data')) {
    // Forward multipart form data as-is
    const formData = await c.req.formData();
    const imageFile = formData.get('image_file') as File | null;
    const imageUrl = formData.get('image_url') as string | null;

    const newFormData = new FormData();

    if (imageFile) {
      newFormData.append('image_file', imageFile);
    } else if (imageUrl) {
      newFormData.append('image_url', imageUrl);
    } else {
      return c.json({ error: 'No image provided. Send image_file or image_url.' }, 400);
    }

    // Forward optional parameters
    const size = formData.get('size') as string | null;
    const type = formData.get('type') as string | null;
    const bgColor = formData.get('bg_color') as string | null;

    if (size) newFormData.append('size', size);
    if (type) newFormData.append('type', type);
    if (bgColor) newFormData.append('bg_color', bgColor);

    removeBgBody = newFormData;
  } else if (contentType.includes('application/json')) {
    const json = await c.req.json<{ image_url?: string; size?: string; type?: string; bg_color?: string }>();
    if (!json.image_url) {
      return c.json({ error: 'image_url is required in JSON body' }, 400);
    }
    const newFormData = new FormData();
    newFormData.append('image_url', json.image_url);
    if (json.size) newFormData.append('size', json.size);
    if (json.type) newFormData.append('type', json.type);
    if (json.bg_color) newFormData.append('bg_color', json.bg_color);
    removeBgBody = newFormData;
  } else {
    return c.json({ error: 'Unsupported content type. Use multipart/form-data or application/json.' }, 400);
  }

  const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: removeBgHeaders,
    body: removeBgBody,
  });

  if (!removeBgResponse.ok) {
    const errorBody = await removeBgResponse.text();
    console.error('Remove.bg error:', removeBgResponse.status, errorBody);
    return c.json(
      { error: 'Background removal failed', details: errorBody },
      removeBgResponse.status as 400 | 402 | 429 | 500
    );
  }

  // Return the image with proper headers
  const imageData = await removeBgResponse.arrayBuffer();
  const resultContentType = removeBgResponse.headers.get('Content-Type') || 'image/png';

  return new Response(imageData, {
    status: 200,
    headers: {
      'Content-Type': resultContentType,
      'Content-Length': imageData.byteLength.toString(),
      'Cache-Control': 'no-store',
    },
  });
}
