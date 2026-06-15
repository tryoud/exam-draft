import { json, error, nowIso } from '../../_shared/http.js';
import { getSession } from '../../_shared/auth.js';

// 30-day TTL for share links
const TTL_DAYS = 30;

export async function onRequestPost({ request, env }) {
  if (!env.DB) return error('DB_NOT_CONFIGURED', 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return error('INVALID_JSON', 400);
  }

  const { exam } = body ?? {};
  if (!exam?.title || !Array.isArray(exam.tasks) || exam.tasks.length === 0) {
    return error('INVALID_EXAM', 400);
  }

  // Optional auth — store creator if logged in
  const session = await getSession(request, env);
  const creatorId = session?.userId ?? null;

  const taskTitles = exam.tasks.map((t) => ({
    number: t.number,
    title: String(t.title ?? '').slice(0, 120),
    type: String(t.type ?? '').slice(0, 60),
    points: Number(t.points) || 0,
  }));

  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000).toISOString();
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 20);

  await env.DB.prepare(
    `INSERT INTO share_links
     (id, creator_user_id, exam_title, exam_subject, exam_task_count, exam_duration,
      exam_total_points, task_titles_json, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    token,
    creatorId,
    String(exam.title).slice(0, 300),
    String(exam.subject ?? exam.title).slice(0, 200),
    exam.tasks.length,
    Number(exam.duration) || 0,
    Number(exam.totalPoints) || 0,
    JSON.stringify(taskTitles),
    expiresAt,
    nowIso()
  ).run();

  const origin = env.APP_ORIGIN || new URL(request.url).origin;
  return json({ token, url: `${origin}/share?t=${token}` });
}
