const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function extractJson(raw) {
  const stripped = String(raw).replace(/```[a-zA-Z0-9]*\n?/g, '').replace(/```/g, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  return start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped;
}

async function openRouter(env, model, prompt, maxTokens, temperature) {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('PROVIDER_NOT_CONFIGURED');
  }
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': env.APP_ORIGIN || 'https://examdraft.com',
      'X-Title': 'ExamDraft',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message ? `OpenRouter: ${data.error.message}` : 'API_ERROR');
  }
  return extractJson(data?.choices?.[0]?.message?.content ?? '');
}

function requireObject(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  return value;
}

function parseAndValidate(json, kind) {
  const parsed = requireObject(JSON.parse(json), 'JSON_PARSE_ERROR');
  if (kind === 'analysis' && (!parsed.subject || !Array.isArray(parsed.taskTypes))) throw new Error('JSON_PARSE_ERROR');
  if (kind === 'exam' && (!parsed.title || !Array.isArray(parsed.tasks))) throw new Error('JSON_PARSE_ERROR');
  if (kind === 'grading' && (!Array.isArray(parsed.feedback) || typeof parsed.totalEarned !== 'number')) throw new Error('JSON_PARSE_ERROR');
  return parsed;
}

export async function analyzeWithLLM(env, payload) {
  const model = env.OPENROUTER_ANALYSIS_MODEL || 'google/gemini-3-flash-preview';
  const moduleContext = payload.moduleContext && typeof payload.moduleContext === 'object'
    ? [
        payload.moduleContext.moduleName ? `Modul/Fach: ${payload.moduleContext.moduleName}` : '',
        payload.moduleContext.universityName ? `Uni/Hochschule: ${payload.moduleContext.universityName}` : '',
        payload.moduleContext.examDate ? `Klausurdatum: ${payload.moduleContext.examDate}` : '',
        payload.moduleContext.targetGrade ? `Zielnote: ${payload.moduleContext.targetGrade}` : '',
      ].filter(Boolean).join('\n')
    : '';
  const examText = (payload.examFiles ?? [])
    .map((file, i) => `=== ALTKLAUSUR ${i + 1}: ${file.name} ===\n${file.text ?? ''}`)
    .join('\n\n');
  const slideText = payload.lectureContextSummary
    ? `=== VORLESUNGSKONTEXT ===\n${payload.lectureContextSummary}`
    : (payload.slideFiles ?? []).map((file, i) => `=== FOLIEN ${i + 1}: ${file.name} ===\n${file.text ?? ''}`).join('\n\n');
  const prompt = `Analysiere die folgenden Altklausuren für einen Klausurgenerator. Gib NUR valides JSON zurück.

${moduleContext ? `MODULKONTEXT:\n${moduleContext}\n\nNutze diesen Kontext zur Benennung des Fachs und zur Einordnung der Analyse. Er ersetzt keine Evidenz aus den Altklausuren.` : ''}

${examText}

${slideText}

JSON-Schema:
{"subject":"Fachname","totalTaskTypes":Zahl,"taskTypes":[{"id":"snake_case_id","name":"Aufgabentyp","description":"Beschreibung","frequency":Prozent,"avgPoints":Punkte,"difficulty":1-5,"exampleQuestion":"Beispiel","hasdiagramContext":false}],"averageDifficulty":1-5,"estimatedDuration":Minuten,"totalPoints":Punkte,"topicAreas":["Thema"],"examCount":Zahl,"hasSlideContext":false,"slideTopics":[],"hadImageOnlyContent":false}`;
  const json = await openRouter(env, model, prompt, 2500, 0);
  return { result: parseAndValidate(json, 'analysis'), model };
}

export async function generateWithLLM(env, payload) {
  const model = env.OPENROUTER_GENERATION_MODEL || 'anthropic/claude-sonnet-4.6';
  const prompt = `Erstelle eine Probeklausur auf Deutsch. Gib NUR valides JSON zurück.

INPUT:
${JSON.stringify(payload)}

ANFORDERUNGEN:
- Bei mode=random: vollständige Klausur proportional zur Analyse.
- Bei mode=type-training: 5 Variationen des gewählten Aufgabentyps.
- Vollständige Musterlösungen mit keyPoints und commonMistakes.
- Keine Markdown-Erklärung außerhalb des JSON.

JSON-Schema:
{"title":"Probeklausur","duration":120,"totalPoints":60,"tasks":[{"id":"task_1","number":1,"type":"Typ","typeId":"type_id","title":"Titel","description":"Aufgabe","points":10,"subTasks":[],"hints":[],"hasDiagram":false,"diagramDescription":"","options":{"A":"optional"}}],"includedTypes":["type_id"],"excludedTypes":[],"solution":[{"taskId":"task_1","solution":"Lösung","keyPoints":["Punkt"],"commonMistakes":["Fehler"],"correctOption":"A"}]}`;
  const json = await openRouter(env, model, prompt, 9000, 0.7);
  return { exam: parseAndValidate(json, 'exam'), model };
}

export async function gradeWithLLM(env, payload) {
  const model = env.OPENROUTER_GRADING_MODEL || env.OPENROUTER_ANALYSIS_MODEL || 'google/gemini-3-flash-preview';
  const prompt = `Korrigiere die Antworten anhand der Klausur und Musterlösung. Gib NUR valides JSON zurück.

${JSON.stringify(payload)}

JSON-Schema:
{"totalEarned":0,"totalMax":60,"percentage":0,"feedback":[{"taskId":"task_1","earnedPoints":0,"maxPoints":10,"feedback":"Text","correctPoints":[],"missingPoints":[]}]}`;
  const json = await openRouter(env, model, prompt, 4000, 0.2);
  return { result: parseAndValidate(json, 'grading'), model };
}

export async function recordUsage(env, userId, kind, model, status, inputTokens = 0, outputTokens = 0, creditsCharged = 0) {
  if (!env.DB) return;
  await env.DB.prepare(
    `INSERT INTO usage_events (id, user_id, kind, provider, model, input_tokens_est, output_tokens_est, status, cost_est_eur, credits_charged, created_at)
     VALUES (?, ?, ?, 'openrouter', ?, ?, ?, ?, 0, ?, ?)`
  ).bind(crypto.randomUUID(), userId, kind, model, inputTokens, outputTokens, status, creditsCharged, new Date().toISOString()).run();
}
