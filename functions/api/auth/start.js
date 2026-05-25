import {
  checkMagicLinkRateLimit,
  emailDomain,
  isDisposableEmailDomain,
  recordAuthAttempt,
  requestIpHash,
} from '../../_shared/abuse.js';
import { appOrigin, json, nowIso, randomToken, sha256Hex } from '../../_shared/http.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'DB_NOT_CONFIGURED' }, 500);
  const { email, locale } = await request.json().catch(() => ({}));
  const normalizedLocale = locale === 'en' ? 'en' : 'de';
  const normalized = String(email ?? '').trim().toLowerCase();
  const ipHash = await requestIpHash(request, env);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    await recordAuthAttempt(env, { action: 'magic_link_start', email: normalized, ipHash, status: 'blocked', reason: 'INVALID_EMAIL' });
    return json({ error: 'INVALID_EMAIL' }, 400);
  }
  const domain = emailDomain(normalized);
  if (isDisposableEmailDomain(domain)) {
    await recordAuthAttempt(env, { action: 'magic_link_start', email: normalized, ipHash, status: 'blocked', reason: 'DISPOSABLE_EMAIL' });
    return json({ error: 'DISPOSABLE_EMAIL' }, 400);
  }

  const rateLimitReason = await checkMagicLinkRateLimit(env, { email: normalized, ipHash });
  if (rateLimitReason) {
    await recordAuthAttempt(env, { action: 'magic_link_start', email: normalized, ipHash, status: 'blocked', reason: rateLimitReason });
    return json({ error: rateLimitReason }, 429);
  }

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO magic_links (token_hash, email, expires_at, used_at) VALUES (?, ?, ?, NULL)`
  ).bind(tokenHash, normalized, expiresAt).run();
  await recordAuthAttempt(env, { action: 'magic_link_start', email: normalized, ipHash, status: 'sent' });

  const link = `${appOrigin(request, env)}/api/auth/callback?token=${encodeURIComponent(token)}&locale=${normalizedLocale}`;
  if (env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM || 'ExamDraft <login@examdraft.com>',
        to: normalized,
        subject: normalizedLocale === 'en' ? 'Your ExamDraft login link' : 'Dein ExamDraft Login-Link',
        html: normalizedLocale === 'en'
          ? `<p>Here is your login link for ExamDraft:</p><p><a href="${link}">Sign in to ExamDraft</a></p><p>The link expires in 15 minutes.</p>`
          : `<p>Hier ist dein Login-Link für ExamDraft:</p><p><a href="${link}">Bei ExamDraft anmelden</a></p><p>Der Link läuft in 15 Minuten ab.</p>`,
      }),
    });
    return json({ sent: true });
  }

  console.log(`[ExamDraft] Dev magic link for ${normalized}: ${link} at ${nowIso()}`);
  return json({ sent: true, devLink: link });
}
