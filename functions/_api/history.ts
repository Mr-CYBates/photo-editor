import type { Context } from 'hono';
import type { Env, EditHistory, User } from './types';

/**
 * Get paginated edit history for a user.
 */
export async function getHistory(c: Context<{ Bindings: Env }>): Promise<Response> {
  const user = c.get('user') as User;
  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = Math.min(parseInt(c.req.query('page_size') || '20', 10), 100);
  const offset = (page - 1) * pageSize;

  const [countResult, items] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as total FROM edit_history WHERE user_id = ?')
      .bind(user.id)
      .first<{ total: number }>(),
    c.env.DB.prepare(
      'SELECT * FROM edit_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    )
      .bind(user.id, pageSize, offset)
      .all<EditHistory>(),
  ]);

  const total = countResult?.total ?? 0;

  return c.json({
    items: items.results,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    },
  });
}

/**
 * Save a new edit history record.
 */
export async function createHistory(c: Context<{ Bindings: Env }>): Promise<Response> {
  const user = c.get('user') as User;
  const body = await c.req.json<{
    thumbnail?: string;
    original_name?: string;
    original_size?: number;
    operations?: string;
    bg_color?: string;
  }>();

  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO edit_history (id, user_id, thumbnail, original_name, original_size, operations, bg_color)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    user.id,
    body.thumbnail || null,
    body.original_name || null,
    body.original_size || null,
    body.operations ? (typeof body.operations === 'string' ? body.operations : JSON.stringify(body.operations)) : null,
    body.bg_color || null
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM edit_history WHERE id = ?')
    .bind(id)
    .first<EditHistory>();

  return c.json({ item: record }, 201);
}

/**
 * Delete a history item (only if owned by user).
 */
export async function deleteHistory(c: Context<{ Bindings: Env }>): Promise<Response> {
  const user = c.get('user') as User;
  const historyId = c.req.param('id');

  if (!historyId) {
    return c.json({ error: 'History item ID is required' }, 400);
  }

  // Verify ownership
  const item = await c.env.DB.prepare(
    'SELECT id FROM edit_history WHERE id = ? AND user_id = ?'
  ).bind(historyId, user.id).first();

  if (!item) {
    return c.json({ error: 'History item not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM edit_history WHERE id = ? AND user_id = ?')
    .bind(historyId, user.id)
    .run();

  return c.json({ success: true });
}
