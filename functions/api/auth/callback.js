import { addLedgerEntry } from '../../_shared/auth.js';
import { nowIso, sessionCookie, sha256Hex } from '../../_shared/http.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return new Response('DB_NOT_CONFIGURED', { status: 500 });
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const appPath = url.searchParams.get('locale') === 'en' ? '/en/app' : '/app';
  const tokenHash = await sha256Hex(token);
  const now = nowIso();
  const magic = await env.DB.prepare(
    `SELECT token_hash, email FROM magic_links WHERE token_hash = ? AND expires_at > ? AND used_at IS NULL`
  ).bind(tokenHash, now).first();
  if (!magic) return new Response(null, { status: 302, headers: { Location: `${url.origin}${appPath}?auth=invalid` } });

  await env.DB.prepare(`UPDATE magic_links SET used_at = ? WHERE token_hash = ?`).bind(now, tokenHash).run();

  let user = await env.DB.prepare(`SELECT id, email FROM users WHERE email = ?`).bind(magic.email).first();
  const isNew = !user;
  if (!user) {
    user = { id: crypto.randomUUID(), email: magic.email };
    await env.DB.prepare(
      `INSERT INTO users (id, email, created_at, last_login_at) VALUES (?, ?, ?, ?)`
    ).bind(user.id, user.email, now, now).run();
  } else {
    await env.DB.prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`).bind(now, user.id).run();
  }

  if (isNew) {
    const credits = Math.max(0, Number(env.FREE_START_CREDITS ?? 1));
    if (credits > 0) await addLedgerEntry(env, user.id, 'grant', credits, 'free_start');
  }

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`
  ).bind(sessionId, user.id, expiresAt, now).run();

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}${appPath}?auth=ok`,
      'Set-Cookie': sessionCookie(sessionId, expiresAt, url.protocol === 'https:'),
    },
  });
}
