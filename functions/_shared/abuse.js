import { nowIso, sha256Hex } from './http.js';

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'anonaddy.com',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'maildrop.cc',
  'mailinator.com',
  'mintemail.com',
  'moakt.com',
  'sharklasers.com',
  'temp-mail.org',
  'tempmail.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
]);

function windowStart(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function emailDomain(email) {
  return String(email ?? '').split('@').pop()?.toLowerCase() ?? '';
}

export function isDisposableEmailDomain(domain) {
  const normalized = String(domain ?? '').toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.has(normalized);
}

export async function requestIpHash(request, env) {
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown';
  return sha256Hex(`${env.AUTH_RATE_LIMIT_SALT ?? 'dev-rate-limit-salt'}:${ip}`);
}

export async function recordAuthAttempt(env, { action, email, ipHash, status, reason = null }) {
  if (!env.DB) return;
  await env.DB.prepare(
    `INSERT INTO auth_attempts (id, action, email, email_domain, ip_hash, status, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    action,
    email,
    emailDomain(email),
    ipHash,
    status,
    reason,
    nowIso()
  ).run();
}

async function countAuthAttempts(env, whereSql, bindings) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM auth_attempts WHERE ${whereSql}`
  ).bind(...bindings).first();
  return Number(row?.count ?? 0);
}

async function countDistinctAttemptEmails(env, whereSql, bindings) {
  const row = await env.DB.prepare(
    `SELECT COUNT(DISTINCT email) AS count FROM auth_attempts WHERE ${whereSql}`
  ).bind(...bindings).first();
  return Number(row?.count ?? 0);
}

export async function checkMagicLinkRateLimit(env, { email, ipHash }) {
  const domain = emailDomain(email);
  const emailHourlyLimit = Number(env.AUTH_EMAIL_HOURLY_LIMIT ?? 2);
  const ipHourlyLimit = Number(env.AUTH_IP_HOURLY_LIMIT ?? 5);
  const ipDistinctDailyLimit = Number(env.AUTH_IP_DISTINCT_EMAIL_DAILY_LIMIT ?? 3);
  const domainDailyLimit = Number(env.AUTH_DOMAIN_DAILY_LIMIT ?? 25);

  const emailHourly = await countAuthAttempts(
    env,
    `action = 'magic_link_start' AND email = ? AND created_at > ?`,
    [email, windowStart(1)]
  );
  if (emailHourly >= emailHourlyLimit) return 'EMAIL_RATE_LIMITED';

  const ipHourly = await countAuthAttempts(
    env,
    `action = 'magic_link_start' AND ip_hash = ? AND created_at > ?`,
    [ipHash, windowStart(1)]
  );
  if (ipHourly >= ipHourlyLimit) return 'IP_RATE_LIMITED';

  const distinctEmailsDaily = await countDistinctAttemptEmails(
    env,
    `action = 'magic_link_start' AND ip_hash = ? AND created_at > ?`,
    [ipHash, windowStart(24)]
  );
  if (distinctEmailsDaily >= ipDistinctDailyLimit) return 'TOO_MANY_EMAILS';

  const domainDaily = await countAuthAttempts(
    env,
    `action = 'magic_link_start' AND email_domain = ? AND created_at > ?`,
    [domain, windowStart(24)]
  );
  if (domainDaily >= domainDailyLimit) return 'DOMAIN_RATE_LIMITED';

  return null;
}
