import { consumeCredit, refundCredit, requireUser } from '../_shared/auth.js';
import { storeAiContribution } from '../_shared/contributions.js';
import { error, json } from '../_shared/http.js';
import { generateWithLLM, recordUsage } from '../_shared/llm.js';

export async function onRequestPost({ request, env }) {
  const user = await requireUser(request, env);
  if (!user) return error('UNAUTHENTICATED', 401);
  const requestId = crypto.randomUUID();
  let consumed = false;
  let generationCredits = Math.max(1, Number(env.GENERATION_CREDITS ?? 4));
  try {
    const payload = await request.json();
    generationCredits = payload?.mode === 'type-training'
      ? Math.max(1, Number(env.TYPE_TRAINING_CREDITS ?? 2))
      : generationCredits;
    await consumeCredit(env, user.id, 'generation', requestId, generationCredits);
    consumed = true;
    const result = await generateWithLLM(env, payload);
    await storeAiContribution(env, user.id, payload, {
      kind: 'generated_exam',
      model: result.model,
      output: result.exam,
    });
    await recordUsage(env, user.id, 'generation', result.model, 'success', 0, 0, generationCredits);
    return json({ exam: result.exam });
  } catch (err) {
    if (consumed) await refundCredit(env, user.id, 'generation_failed', requestId, generationCredits);
    await recordUsage(env, user.id, 'generation', 'unknown', 'error');
    const code = err instanceof Error ? err.message : 'API_ERROR';
    return error(code, code === 'NO_CREDITS' ? 402 : 500);
  }
}
