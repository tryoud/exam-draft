import { getCookie, clearSessionCookie, json } from '../../_shared/http.js';

export async function onRequestPost({ request, env }) {
  const sessionId = getCookie(request, 'examdraft_session');
  if (sessionId && env.DB) {
    await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
  }
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}
