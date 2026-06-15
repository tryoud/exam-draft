import { getSessionUser } from '../_shared/auth.js';
import { storeAiContribution, storeDocumentContributions } from '../_shared/contributions.js';
import { error, json } from '../_shared/http.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return error('DB_NOT_CONFIGURED', 500);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return error('INVALID_JSON', 400);
  }

  if (!payload?.improvementConsent) return error('NO_CONSENT', 400);

  const user = await getSessionUser(request, env);
  const userId = user?.id ?? null;

  try {
    if (payload.kind === 'analysis' && payload.result) {
      await storeDocumentContributions(env, userId, payload, payload.result);
      await storeAiContribution(env, userId, payload, {
        kind: 'analysis',
        provider: payload.provider ?? 'byok',
        model: payload.model ?? 'unknown',
        output: payload.result,
      });
    } else if (payload.kind === 'generated_exam' && payload.exam) {
      await storeAiContribution(env, userId, payload, {
        kind: 'generated_exam',
        provider: payload.provider ?? 'byok',
        model: payload.model ?? 'unknown',
        output: payload.exam,
      });
    } else {
      return error('INVALID_PAYLOAD', 400);
    }
    return json({ stored: true });
  } catch (err) {
    console.error('[ExamDraft] contribute error:', err);
    return json({ stored: false });
  }
}
