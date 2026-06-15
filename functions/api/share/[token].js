import { json, error, nowIso } from '../../_shared/http.js';

export async function onRequestGet({ params, env }) {
  if (!env.DB) return error('DB_NOT_CONFIGURED', 500);

  const { token } = params;
  if (!token?.match(/^[a-f0-9]{20}$/)) return error('INVALID_TOKEN', 400);

  const row = await env.DB.prepare(
    `SELECT id, exam_title, exam_subject, exam_task_count, exam_duration,
            exam_total_points, task_titles_json, view_count, expires_at, created_at
     FROM share_links WHERE id = ?`
  ).bind(token).first();

  if (!row) return error('NOT_FOUND', 404);
  if (row.expires_at && row.expires_at < nowIso()) return error('EXPIRED', 410);

  // Increment view count (fire-and-forget)
  env.DB.prepare(`UPDATE share_links SET view_count = view_count + 1 WHERE id = ?`)
    .bind(token).run().catch(() => {});

  let taskTitles = [];
  try { taskTitles = JSON.parse(row.task_titles_json ?? '[]'); } catch {}

  return json({
    token: row.id,
    title: row.exam_title,
    subject: row.exam_subject,
    taskCount: row.exam_task_count,
    duration: row.exam_duration,
    totalPoints: row.exam_total_points,
    taskTitles,
    viewCount: row.view_count + 1,
    createdAt: row.created_at,
  });
}
