import { requireUser } from '../../_shared/auth.js';
import { json, error } from '../../_shared/http.js';

export async function onRequestGet({ params, request, env }) {
  if (!env.DB) return error('DB_NOT_CONFIGURED', 500);

  const user = await requireUser(request, env);
  if (!user) return error('UNAUTHENTICATED', 401);

  const { moduleId } = params;
  if (!moduleId?.trim()) return error('INVALID_MODULE_ID', 400);

  const snapshots = await env.DB.prepare(
    `SELECT subject, task_types_json, topic_areas_json, total_points, estimated_duration,
            exam_count, confidence_score, coverage_score, year_semester, created_at
     FROM exam_pattern_snapshots
     WHERE module_id = ? AND status = 'approved'
     ORDER BY created_at DESC
     LIMIT 20`
  ).bind(moduleId).all();

  if (!snapshots.results?.length) {
    const module = await env.DB.prepare(
      `SELECT id, name, university, country, language, department, subject_area FROM modules WHERE id = ?`
    ).bind(moduleId).first();
    if (!module) return error('MODULE_NOT_FOUND', 404);
    return json({ module, snapshots: [], aggregated: null });
  }

  const module = await env.DB.prepare(
    `SELECT id, name, university, country, language, department, subject_area FROM modules WHERE id = ?`
  ).bind(moduleId).first();

  // Aggregate across approved snapshots
  const parsed = snapshots.results.map((s) => ({
    ...s,
    taskTypes: safeParseJson(s.task_types_json, []),
    topicAreas: safeParseJson(s.topic_areas_json, []),
  }));

  const totalExamCount = parsed.reduce((sum, s) => sum + (s.exam_count ?? 1), 0);
  const avgConfidence = avg(parsed.map((s) => s.confidence_score).filter(Boolean));
  const avgCoverage = avg(parsed.map((s) => s.coverage_score).filter(Boolean));

  // Merge task types by id, weighted by frequency
  const taskTypeMap = new Map();
  for (const snap of parsed) {
    for (const tt of snap.taskTypes) {
      if (!tt?.id) continue;
      const existing = taskTypeMap.get(tt.id);
      if (existing) {
        existing.frequency = (existing.frequency + tt.frequency) / 2;
        existing.avgPoints = (existing.avgPoints + tt.avgPoints) / 2;
        existing.difficulty = (existing.difficulty + tt.difficulty) / 2;
        existing.examCount += 1;
      } else {
        taskTypeMap.set(tt.id, { ...tt, examCount: 1 });
      }
    }
  }

  // Deduplicate topic areas
  const allTopics = [...new Set(parsed.flatMap((s) => s.topicAreas))];

  return json({
    module,
    snapshotCount: snapshots.results.length,
    aggregated: {
      totalExamCount,
      avgConfidenceScore: avgConfidence,
      avgCoverageScore: avgCoverage,
      taskTypes: [...taskTypeMap.values()].sort((a, b) => b.frequency - a.frequency),
      topicAreas: allTopics,
    },
    snapshots: parsed.map((s) => ({
      subject: s.subject,
      examCount: s.exam_count,
      totalPoints: s.total_points,
      estimatedDuration: s.estimated_duration,
      yearSemester: s.year_semester,
      createdAt: s.created_at,
    })),
  });
}

function safeParseJson(str, fallback) {
  try { return JSON.parse(str ?? ''); } catch { return fallback; }
}

function avg(arr) {
  if (!arr.length) return null;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}
