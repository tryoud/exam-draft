import { getCookie, nowIso } from './http.js';

export async function getSessionUser(request, env) {
  const sessionId = getCookie(request, 'examdraft_session');
  if (!sessionId || !env.DB) return null;
  const row = await env.DB.prepare(
    `SELECT users.id, users.email
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = ? AND sessions.expires_at > ?`
  ).bind(sessionId, nowIso()).first();
  return row ? { id: row.id, email: row.email, sessionId } : null;
}

export async function requireUser(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return null;
  return user;
}

export async function creditBalance(env, userId) {
  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM credit_ledger WHERE user_id = ?`
  ).bind(userId).first();
  return Number(row?.balance ?? 0);
}

export async function purchasedCreditTotal(env, userId) {
  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM credit_ledger WHERE user_id = ? AND type = 'purchase'`
  ).bind(userId).first();
  return Number(row?.total ?? 0);
}

export async function addLedgerEntry(env, userId, type, amount, reason, requestId = null) {
  await env.DB.prepare(
    `INSERT INTO credit_ledger (id, user_id, type, amount, reason, request_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), userId, type, amount, reason, requestId, nowIso()).run();
}

export async function consumeCredit(env, userId, reason, requestId, amount = 1) {
  const balance = await creditBalance(env, userId);
  const credits = Math.max(1, Number(amount));
  if (balance < credits) {
    throw new Error('NO_CREDITS');
  }
  await addLedgerEntry(env, userId, 'consume', -credits, reason, requestId);
}

export async function refundCredit(env, userId, reason, requestId, amount = 1) {
  await addLedgerEntry(env, userId, 'refund', Math.max(1, Number(amount)), reason, requestId);
}
