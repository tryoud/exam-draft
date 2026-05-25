import { addLedgerEntry } from '../../_shared/auth.js';
import { json, nowIso } from '../../_shared/http.js';

function timingSafeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret, payload) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyStripeSignature(request, rawBody, secret) {
  const header = request.headers.get('Stripe-Signature') ?? '';
  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const [key, ...value] = part.split('=');
      return [key, value.join('=')];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  return timingSafeEqualHex(expected, signature);
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'DB_NOT_CONFIGURED' }, 500);
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: 'STRIPE_WEBHOOK_SECRET_REQUIRED' }, 501);

  const rawBody = await request.text();
  const verified = await verifyStripeSignature(request, rawBody, env.STRIPE_WEBHOOK_SECRET);
  if (!verified) return json({ error: 'INVALID_SIGNATURE' }, 400);

  let event = null;
  try {
    event = JSON.parse(rawBody || '{}');
  } catch {
    return json({ error: 'INVALID_WEBHOOK' }, 400);
  }
  if (!event || event.type !== 'checkout.session.completed') return json({ ok: true });

  const session = event.data?.object;
  const stripeSessionId = session?.id;
  if (!stripeSessionId) return json({ error: 'INVALID_WEBHOOK' }, 400);

  const existing = await env.DB.prepare(`SELECT id FROM payments WHERE stripe_session_id = ?`).bind(stripeSessionId).first();
  if (existing) return json({ ok: true });

  const userId = session.client_reference_id || session.metadata?.user_id;
  if (!userId) return json({ error: 'MISSING_USER_ID' }, 400);
  const credits = Math.max(1, Number(env.STRIPE_CREDITS_PER_PACK ?? 20));
  await env.DB.prepare(
    `INSERT INTO payments (id, user_id, stripe_session_id, status, credits_granted, created_at)
     VALUES (?, ?, ?, 'paid', ?, ?)`
  ).bind(crypto.randomUUID(), userId, stripeSessionId, credits, nowIso()).run();
  await addLedgerEntry(env, userId, 'purchase', credits, 'stripe_purchase', stripeSessionId);
  return json({ ok: true });
}
