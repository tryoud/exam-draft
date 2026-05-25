import { getSessionUser } from '../_shared/auth.js';
import { json, nowIso, sha256Hex } from '../_shared/http.js';

const ALLOWED_EVENTS = new Set([
  'landing_view',
  'app_opened',
  'demo_opened',
  'auth_started',
  'auth_success',
  'upload_started',
  'analysis_started',
  'analysis_success',
  'paywall_shown',
  'checkout_started',
  'checkout_success',
  'generation_started',
  'generation_success',
  'generation_failed',
  'byok_selected',
]);

function trimProperties(input) {
  const props = input && typeof input === 'object' ? input : {};
  const safe = {};
  for (const [key, value] of Object.entries(props).slice(0, 30)) {
    if (!/^[a-zA-Z0-9_.:-]{1,64}$/.test(key)) continue;
    if (typeof value === 'string') safe[key] = value.slice(0, 300);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) safe[key] = value;
  }
  return safe;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: true });
  const payload = await request.json().catch(() => null);
  const event = String(payload?.event ?? '');
  if (!ALLOWED_EVENTS.has(event)) return json({ error: 'INVALID_EVENT' }, 400);

  const user = await getSessionUser(request, env);
  const ip = request.headers.get('CF-Connecting-IP') ?? request.headers.get('x-forwarded-for') ?? '';
  const salt = env.AUTH_RATE_LIMIT_SALT ?? 'analytics';
  const ipHash = ip ? await sha256Hex(`${salt}:${ip}`) : null;
  const userAgent = request.headers.get('User-Agent') ?? '';
  const properties = trimProperties(payload?.properties);

  await env.DB.prepare(
    `INSERT INTO analytics_events
     (id, user_id, event, properties_json, path, locale, ip_hash, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    user?.id ?? null,
    event,
    JSON.stringify(properties),
    String(properties.path ?? '').slice(0, 300) || null,
    String(properties.locale ?? '').slice(0, 8) || null,
    ipHash,
    userAgent.slice(0, 300),
    nowIso()
  ).run();

  return json({ ok: true });
}
