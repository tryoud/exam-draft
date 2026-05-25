import { consumeCredit, refundCredit, requireUser } from '../_shared/auth.js';
import { error, json } from '../_shared/http.js';
import { gradeWithLLM, recordUsage } from '../_shared/llm.js';

function gradeMcClientSide(exam, answers) {
  if (!exam?.tasks?.every((task) => task.options && Object.keys(task.options).length > 0)) return null;
  const feedback = exam.tasks.map((task) => {
    const solution = exam.solution?.find((item) => item.taskId === task.id);
    const correctKey = String(solution?.correctOption ?? '').toUpperCase();
    const given = String(answers.find((answer) => answer.taskId === task.id)?.answer ?? '').trim().toUpperCase();
    const correct = given !== '' && given === correctKey;
    return {
      taskId: task.id,
      earnedPoints: correct ? task.points : 0,
      maxPoints: task.points,
      feedback: correct ? `Richtig. Antwort ${correctKey} ist korrekt.` : `Falsch. Richtig: ${correctKey}.`,
      correctPoints: correct ? [`Antwort ${correctKey} korrekt gewählt`] : [],
      missingPoints: correct ? [] : [`Richtige Antwort war ${correctKey}`],
    };
  });
  const totalEarned = feedback.reduce((sum, item) => sum + item.earnedPoints, 0);
  const totalMax = exam.totalPoints;
  return { totalEarned, totalMax, percentage: totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0, feedback };
}

export async function onRequestPost({ request, env }) {
  const user = await requireUser(request, env);
  if (!user) return error('UNAUTHENTICATED', 401);
  const payload = await request.json();
  const instant = gradeMcClientSide(payload.exam, payload.answers ?? []);
  if (instant) return json(instant);

  const requestId = crypto.randomUUID();
  let consumed = false;
  try {
    await consumeCredit(env, user.id, 'grading', requestId);
    consumed = true;
    const result = await gradeWithLLM(env, payload);
    await recordUsage(env, user.id, 'grading', result.model, 'success');
    return json(result.result);
  } catch (err) {
    if (consumed) await refundCredit(env, user.id, 'grading_failed', requestId);
    await recordUsage(env, user.id, 'grading', 'unknown', 'error');
    const code = err instanceof Error ? err.message : 'API_ERROR';
    return error(code, code === 'NO_CREDITS' ? 402 : 500);
  }
}
