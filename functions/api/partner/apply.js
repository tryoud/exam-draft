import { json, error, nowIso, sha256Hex } from '../../_shared/http.js';

const VALID_ORG_TYPES = new Set(['fachschaft', 'tutorium', 'uni_group', 'other']);
const DAILY_LIMIT_PER_IP = 3;

export async function onRequestPost({ request, env }) {
  if (!env.DB) return error('DB_NOT_CONFIGURED', 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return error('INVALID_JSON', 400);
  }

  const { orgName, contactEmail, orgType, university, subjects, notes } = body ?? {};

  if (!orgName?.trim() || orgName.trim().length > 200) return error('INVALID_ORG_NAME', 400);
  if (!contactEmail?.trim() || !contactEmail.includes('@') || contactEmail.length > 200) return error('INVALID_EMAIL', 400);
  if (!VALID_ORG_TYPES.has(orgType)) return error('INVALID_ORG_TYPE', 400);

  const ip = request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For') ?? 'unknown';
  const ipHash = await sha256Hex(ip + (env.AUTH_RATE_LIMIT_SALT ?? 'partner_salt'));
  const today = new Date().toISOString().slice(0, 10);

  const recentCount = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM partner_applications WHERE ip_hash = ? AND created_at >= ?`
  ).bind(ipHash, today + 'T00:00:00.000Z').first();

  if ((recentCount?.cnt ?? 0) >= DAILY_LIMIT_PER_IP) {
    return error('RATE_LIMIT_EXCEEDED', 429);
  }

  const existingEmail = await env.DB.prepare(
    `SELECT id FROM partner_applications WHERE contact_email = ? AND status != 'rejected'`
  ).bind(contactEmail.trim().toLowerCase()).first();

  if (existingEmail) return json({ ok: true, duplicate: true });

  await env.DB.prepare(
    `INSERT INTO partner_applications (id, org_name, contact_email, org_type, university, subjects, notes, ip_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    orgName.trim(),
    contactEmail.trim().toLowerCase(),
    orgType,
    university?.trim() ?? null,
    subjects ? JSON.stringify(subjects) : null,
    notes?.trim()?.slice(0, 1000) ?? null,
    ipHash,
    nowIso()
  ).run();

  return json({ ok: true });
}
