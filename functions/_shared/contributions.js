import { nowIso, sha256Hex } from './http.js';

const CONSENT_VERSION = 'improvement-v1';

function anonymizeText(text) {
  return String(text ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b\d{5,12}\b/g, '[number]')
    .replace(/\b(Matrikelnummer|Student ID|Student Number)\s*[:#]?\s*\S+/gi, '$1 [redacted]')
    .slice(0, 80_000);
}

export async function recordImprovementConsent(env, userId, granted) {
  if (!env.DB) return;
  await env.DB.prepare(
    `INSERT INTO consent_events (id, user_id, consent_type, consent_version, granted, created_at)
     VALUES (?, ?, 'document_improvement', ?, ?, ?)`
  ).bind(crypto.randomUUID(), userId, CONSENT_VERSION, granted ? 1 : 0, nowIso()).run();
}

export async function storeDocumentContributions(env, userId, payload, analysisResult) {
  if (!env.DB || !payload?.improvementConsent) return [];
  await recordImprovementConsent(env, userId, true);
  const subject = analysisResult?.subject ?? null;
  const files = [...(payload.examFiles ?? []), ...(payload.slideFiles ?? [])];
  const now = nowIso();
  const storedIds = [];
  for (const file of files) {
    const text = String(file.text ?? '').trim();
    if (!text) continue;
    const anonymizedText = anonymizeText(text);
    const contentHash = await sha256Hex(anonymizedText);
    const duplicate = await env.DB.prepare(
      `SELECT id FROM document_contributions WHERE user_id = ? AND content_hash = ? AND deleted_at IS NULL LIMIT 1`
    ).bind(userId, contentHash).first();
    if (duplicate) {
      storedIds.push(duplicate.id);
      continue;
    }
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO document_contributions
       (id, user_id, source_type, original_filename, extracted_text, anonymized_text, subject, language, consent_version, rights_confirmed, status, created_at, deleted_at, content_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'de', ?, 1, 'pending_review', ?, NULL, ?)`
    ).bind(
      id,
      userId,
      file.type ?? 'upload',
      file.name ?? null,
      anonymizedText,
      anonymizedText,
      subject,
      CONSENT_VERSION,
      now,
      contentHash
    ).run();
    storedIds.push(id);
  }
  return storedIds;
}

export async function storeAiContribution(env, userId, payload, { kind, provider = 'openrouter', model, output }) {
  if (!env.DB || !payload?.improvementConsent) return;
  await recordImprovementConsent(env, userId, true);
  const inputHash = await sha256Hex(JSON.stringify({
    kind,
    analysis: payload.analysis ?? null,
    examFiles: (payload.examFiles ?? []).map((file) => ({
      name: file.name ?? null,
      type: file.type ?? null,
      textHash: file.text ? '[stored-in-document-contributions]' : null,
    })),
    slideFiles: (payload.slideFiles ?? []).map((file) => ({
      name: file.name ?? null,
      type: file.type ?? null,
      textHash: file.text ? '[stored-in-document-contributions]' : null,
    })),
    includeSlides: payload.includeSlides ?? null,
    lectureContextSummary: payload.lectureContextSummary ? '[provided]' : null,
    mode: payload.mode ?? null,
    difficulty: payload.difficulty ?? null,
    selectedTypeId: payload.selectedTypeId ?? null,
    excludedTopics: payload.excludedTopics ?? null,
  }));
  const duplicate = await env.DB.prepare(
    `SELECT id FROM ai_contributions WHERE user_id = ? AND kind = ? AND input_hash = ? AND deleted_at IS NULL LIMIT 1`
  ).bind(userId, kind, inputHash).first();
  if (duplicate) return;

  await env.DB.prepare(
    `INSERT INTO ai_contributions
     (id, user_id, source_contribution_id, kind, provider, model, input_hash, output_json, consent_version, status, created_at, deleted_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'pending_review', ?, NULL)`
  ).bind(
    crypto.randomUUID(),
    userId,
    kind,
    provider,
    model,
    inputHash,
    JSON.stringify(output).slice(0, 160_000),
    CONSENT_VERSION,
    nowIso()
  ).run();
}
