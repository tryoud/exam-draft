import { requireUser } from '../_shared/auth.js';
import { storeAiContribution, storeDocumentContributions } from '../_shared/contributions.js';
import { error, json } from '../_shared/http.js';
import { analyzeWithLLM, recordUsage } from '../_shared/llm.js';

export async function onRequestPost({ request, env }) {
  const user = await requireUser(request, env);
  if (!user) return error('UNAUTHENTICATED', 401);
  try {
    const payload = await request.json();
    const result = await analyzeWithLLM(env, payload);
    await storeDocumentContributions(env, user.id, payload, result.result);
    await storeAiContribution(env, user.id, payload, {
      kind: 'analysis',
      model: result.model,
      output: result.result,
    });
    await recordUsage(env, user.id, 'analysis', result.model, 'success', 0, 0, 0);
    return json({ result: result.result });
  } catch (err) {
    await recordUsage(env, user.id, 'analysis', 'unknown', 'error');
    const code = err instanceof Error ? err.message : 'API_ERROR';
    return error(code, 500);
  }
}
