import type { ExtractedFile, AnalysisResult, GeneratedExam, ExamGenerationInput, ExamTask, ExamSolution, Provider, GradingResult, GradingFeedback, ExamAnswer } from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_REFERER = 'https://examdraft.com';

export const OPENROUTER_MODELS = [
  { id: 'anthropic/claude-sonnet-4-5',          name: 'Claude Sonnet 4.5' },
  { id: 'anthropic/claude-3.5-sonnet',           name: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-4o',                         name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini',                    name: 'GPT-4o Mini' },
  { id: 'google/gemini-2.5-flash',       name: 'Gemini 2.5 Flash' },
  { id: 'meta-llama/llama-3.3-70b-instruct',     name: 'Llama 3.3 70B' },
] as const;

// Sensible defaults: cheap model for analysis (large input), capable model for generation (quality output)
export const DEFAULT_OPENROUTER_GENERATION_MODEL = 'anthropic/claude-sonnet-4-5';
export const DEFAULT_OPENROUTER_ANALYSIS_MODEL   = 'google/gemini-2.5-flash';

/** @deprecated use DEFAULT_OPENROUTER_GENERATION_MODEL */
export const DEFAULT_OPENROUTER_MODEL = DEFAULT_OPENROUTER_GENERATION_MODEL;

// --- localStorage helpers ---

function storage(key: string): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
}

export function getProvider(): Provider {
  return (storage('examdraft_provider') as Provider) ?? 'openrouter';
}

function getAnthropicKey(): string {
  const key = storage('examdraft_api_key');
  if (!key) throw new Error('NO_API_KEY');
  return key;
}

function getOpenRouterKey(): string {
  const key = storage('examdraft_openrouter_key');
  if (!key) throw new Error('NO_API_KEY');
  return key;
}

function getOpenRouterGenerationModel(): string {
  return storage('examdraft_openrouter_model') ?? DEFAULT_OPENROUTER_GENERATION_MODEL;
}

function getOpenRouterAnalysisModel(): string {
  return storage('examdraft_openrouter_analysis_model') ?? DEFAULT_OPENROUTER_ANALYSIS_MODEL;
}

// --- Header builders ---

function buildAnthropicHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

function buildOpenRouterHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': OPENROUTER_REFERER,
    'X-Title': 'ExamDraft',
  };
}

// --- Robust JSON extraction ---

/**
 * Repairs a truncated JSON string by closing unclosed brackets/braces
 * in the CORRECT nesting order (LIFO stack, not all-brackets-then-all-braces).
 *
 * Example: truncated `{"tasks":[{"subTasks":[{}`
 * Stack at end: ['{', '[', '{', '[']  → closes as `]}]}` (valid)
 * Wrong (old):  close all `]` then all `}` → `]]}}` (invalid nesting)
 */
function repairTruncatedJSON(text: string): string {
  let current = text;

  // Iterative backtracking: if we land inside a string, walk back to the
  // previous `}` and retry.  Capped at 200 attempts to prevent infinite loops
  // when the response contains many `}` characters inside string values.
  for (let attempt = 0; attempt < 200; attempt++) {
    const stack: ('{' | '[')[] = [];
    let inString = false, escape = false;

    for (const ch of current) {
      if (escape)                   { escape = false; continue; }
      if (ch === '\\' && inString)  { escape = true;  continue; }
      if (ch === '"')               { inString = !inString; continue; }
      if (inString)                 continue;
      if      (ch === '{' || ch === '[') stack.push(ch as '{' | '[');
      else if (ch === '}') { if (stack.at(-1) === '{') stack.pop(); }
      else if (ch === ']') { if (stack.at(-1) === '[') stack.pop(); }
    }

    if (!inString) {
      // Close in reverse order (LIFO) — respects nesting
      let repaired = current.trimEnd().replace(/,\s*$/, '');
      for (let i = stack.length - 1; i >= 0; i--) {
        repaired += stack[i] === '{' ? '}' : ']';
      }
      return repaired;
    }

    // Truncated inside a string value — backtrack to last complete object
    const lastBrace = current.lastIndexOf('}');
    if (lastBrace <= 0) break;
    current = current.slice(0, lastBrace + 1);
  }

  return current;
}

/**
 * Extracts a JSON object from a model response that may contain:
 * - Markdown code fences (```json ... ```, ```JSON ...```, etc.)
 * - Explanatory text before/after the JSON
 * - Trailing commas before } or ] (common model mistake)
 * - Truncated output due to max_tokens limits
 */
function extractJSON(raw: string): string {
  // 1. Strip all markdown code fences (case-insensitive, any language tag)
  let text = raw.replace(/```[a-zA-Z0-9]*\n?/g, '').replace(/```/g, '').trim();

  // 2. Extract outermost JSON object — find first { and last }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  } else if (start !== -1) {
    // No closing brace at all — take everything from first {
    text = text.slice(start);
  }

  // 3. Remove trailing commas before } or ] (common model mistake)
  text = text.replace(/,(\s*[}\]])/g, '$1');

  // 4. If still invalid JSON, attempt truncation repair
  try {
    JSON.parse(text);
  } catch {
    text = repairTruncatedJSON(text);
    // Final trailing-comma pass after repair
    text = text.replace(/,(\s*[}\]])/g, '$1');
  }

  return text;
}

// --- Fetch with timeout ---

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 90_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('NETWORK_ERROR');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// --- Response parsers ---

async function parseAnthropicResponse(response: Response): Promise<string> {
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
    const status = response.status;
    if (status === 401) throw new Error('INVALID_API_KEY');
    if (status === 429) throw new Error('RATE_LIMIT');
    if (status === 529) throw new Error('API_OVERLOADED');
    throw new Error(err.error?.message || 'API_ERROR');
  }
  const data = await response.json() as { content: Array<{ text: string }> };
  if (!data.content?.length) throw new Error('API_ERROR');
  return extractJSON(data.content[0].text);
}

async function parseOpenRouterResponse(response: Response): Promise<string> {
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as {
      error?: { message?: string; code?: number | string };
    };
    const status = response.status;
    if (status === 401) throw new Error('OPENROUTER_INVALID_API_KEY');
    if (status === 429) throw new Error('RATE_LIMIT');
    // Surface the actual OpenRouter / provider error message for better debugging
    const msg = err.error?.message;
    throw new Error(msg ? `OpenRouter: ${msg}` : 'API_ERROR');
  }
  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  if (!data.choices?.length) throw new Error('API_ERROR');
  return extractJSON(data.choices[0].message.content);
}

// --- Slide context helper ---

/**
 * Combines all slide files into a single capped string.
 * Prevents runaway token costs when many slide files are uploaded.
 */
function combineSlides(slideFiles: ExtractedFile[], maxTotalChars = 80_000): string {
  const combined = slideFiles
    .map((f, i) => `=== VORLESUNGSFOLIE ${i + 1}: ${f.name} ===\n${f.text ?? ''}`)
    .join('\n\n');
  return combined.length > maxTotalChars
    ? combined.slice(0, maxTotalChars) + '\n[Folieninhalt gekürzt — zu viele Dateien]'
    : combined;
}

// --- Content block builders ---

/** Anthropic native format — supports PDF documents for image-mode files. */
function buildAnthropicBlock(file: ExtractedFile, index: number, label: string): Record<string, unknown> {
  if (file.mode === 'image' && file.base64) {
    return {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: file.base64 },
    };
  }
  return {
    type: 'text',
    text: `=== ${label} ${index + 1}: ${file.name} ===\n${file.text}`,
  };
}

/** OpenRouter (OpenAI-compatible) — text only. Image-mode files fall back to text with a note. */
function buildOpenRouterText(file: ExtractedFile, index: number, label: string): string {
  const header = `=== ${label} ${index + 1}: ${file.name} ===`;
  if (file.mode === 'image') {
    return `${header}\n[Hinweis: Bild-Modus wird von OpenRouter nicht unterstützt — Datei wird als Text gesendet. Diagramme können fehlen.]\n${file.text ?? ''}`;
  }
  return `${header}\n${file.text ?? ''}`;
}

function detectTotalPointsFromExamText(examFiles: ExtractedFile[]): number | null {
  const texts = examFiles
    .map((file) => file.text ?? '')
    .filter(Boolean);

  const contextualPatterns = [
    /(?:gesamt(?:punkt(?:e|zahl)?)?|max(?:imal)?(?:\s+erreichbar(?:e|en)?)?|insgesamt|summe)\s*[:\-]?\s*(\d{2,3})\s*(?:punkte|pkt|p\.?)\b/gi,
    /(\d{2,3})\s*(?:punkte|pkt|p\.?)\s*(?:gesamt|insgesamt|max(?:imal)?)/gi,
    /erreichbar(?:e|en)?\s*[:\-]?\s*(\d{2,3})\s*(?:punkte|pkt|p\.?)\b/gi,
  ];

  for (const text of texts) {
    for (const pattern of contextualPatterns) {
      for (const match of text.matchAll(pattern)) {
        const value = Number(match[1]);
        if (value >= 20 && value <= 300) return value;
      }
    }
  }

  return null;
}

function detectDurationFromExamText(examFiles: ExtractedFile[]): number | null {
  const texts = examFiles
    .map((file) => file.text ?? '')
    .filter(Boolean);

  const contextualPatterns = [
    /(?:bearbeitungszeit|arbeitszeit|prüfungsdauer|klausurdauer|dauer|zeit)\s*[:\-]?\s*(\d{2,3})\s*(?:min(?:uten)?|mins?|minute(?:n)?)\b/gi,
    /(\d{2,3})\s*(?:min(?:uten)?|mins?|minute(?:n)?)\s*(?:bearbeitungszeit|arbeitszeit|prüfungsdauer|klausurdauer|dauer|zeit)\b/gi,
    /(?:bearbeitungszeit|arbeitszeit|prüfungsdauer|klausurdauer|dauer|zeit)\s*[:\-]?\s*(\d{1,2})\s*(?:std|stunden?|h)\b/gi,
    /(\d{1,2})\s*(?:std|stunden?|h)\s*(?:bearbeitungszeit|arbeitszeit|prüfungsdauer|klausurdauer|dauer|zeit)\b/gi,
  ];

  for (const text of texts) {
    for (let i = 0; i < contextualPatterns.length; i++) {
      const pattern = contextualPatterns[i];
      for (const match of text.matchAll(pattern)) {
        const value = Number(match[1]);
        if (i < 2 && value >= 15 && value <= 360) return value;
        if (i >= 2 && value >= 1 && value <= 8) return value * 60;
      }
    }
  }

  return null;
}

// --- Response validators ---

function validateAnalysisResult(
  data: unknown,
  detectedTotalPoints?: number | null,
  detectedDuration?: number | null
): AnalysisResult {
  const d = data as Record<string, unknown>;
  if (
    typeof d.subject !== 'string' ||
    !Array.isArray(d.taskTypes) ||
    typeof d.totalTaskTypes !== 'number'
  ) {
    throw new Error('JSON_PARSE_ERROR');
  }

  const taskTypes = d.taskTypes as Array<Record<string, unknown>>;
  const avgDifficultyFallback = taskTypes.length > 0
    ? taskTypes.reduce((sum, task) => sum + (typeof task.difficulty === 'number' ? task.difficulty : 3), 0) / taskTypes.length
    : 3;
  const totalPointsFallback = taskTypes.reduce(
    (sum, task) => sum + (typeof task.avgPoints === 'number' ? task.avgPoints : 0),
    0
  );

  // Tolerate missing optional arrays — model sometimes omits them to save tokens
  if (!Array.isArray(d.topicAreas))  d.topicAreas  = [];
  if (!Array.isArray(d.slideTopics)) d.slideTopics = [];
  if (typeof d.averageDifficulty !== 'number' || Number.isNaN(d.averageDifficulty)) {
    d.averageDifficulty = avgDifficultyFallback;
  }
  if (typeof detectedTotalPoints === 'number' && detectedTotalPoints > 0) {
    d.totalPoints = detectedTotalPoints;
  }
  if (typeof d.totalPoints !== 'number' || Number.isNaN(d.totalPoints) || d.totalPoints <= 0) {
    d.totalPoints = detectedTotalPoints ?? (totalPointsFallback > 0 ? totalPointsFallback : 60);
  }
  if (typeof detectedDuration === 'number' && detectedDuration > 0) {
    d.estimatedDuration = detectedDuration;
  }
  if (typeof d.estimatedDuration !== 'number' || Number.isNaN(d.estimatedDuration) || d.estimatedDuration <= 0) {
    d.estimatedDuration = 120;
  }
  if (typeof d.examCount !== 'number' || Number.isNaN(d.examCount) || d.examCount <= 0) {
    d.examCount = 1;
  }
  if (typeof d.hasSlideContext !== 'boolean') d.hasSlideContext = false;
  if (typeof d.hadImageOnlyContent !== 'boolean') d.hadImageOnlyContent = false;

  return d as unknown as AnalysisResult;
}

function validateGeneratedExam(data: unknown): GeneratedExam {
  let d = data as Record<string, unknown>;

  // Some models wrap the exam in a {"exam": {...}} envelope — unwrap it
  if (d.exam && typeof d.exam === 'object' && !Array.isArray(d.exam)) {
    d = d.exam as Record<string, unknown>;
  }

  if (typeof d.title !== 'string' || !Array.isArray(d.tasks)) {
    console.error('[ExamDraft] validateGeneratedExam: missing required fields. Keys:', Object.keys(d));
    throw new Error('JSON_PARSE_ERROR');
  }

  // Tolerate missing optional arrays — model sometimes omits them to save tokens
  if (!Array.isArray(d.solution))      d.solution = [];
  if (!Array.isArray(d.includedTypes)) d.includedTypes = [];
  if (!Array.isArray(d.excludedTypes)) d.excludedTypes = [];

  return d as unknown as GeneratedExam;
}

// --- Public API ---

export async function analyzeExams(
  examFiles: ExtractedFile[],
  slideFiles: ExtractedFile[],
  includeSlides: boolean,
  lectureContextSummary?: string
): Promise<AnalysisResult> {
  const provider = getProvider();

  const textModeWarning = examFiles.some((f) => f.mode === 'text' && f.hasSignificantImages)
    ? `HINWEIS: Einige Dateien wurden im Text-Modus gesendet und können Diagramme/Abbildungen enthalten die nicht sichtbar sind. Wenn eine Aufgabe sich auf eine nicht lesbare Abbildung bezieht, beschreibe den Aufgabentyp anhand des Kontexts und markiere hasdiagramContext als true.`
    : '';

  const hasLectureSummary = Boolean(lectureContextSummary?.trim());
  const hasSlideFiles = includeSlides && slideFiles.length > 0;

  const slideInfo = hasLectureSummary
    ? ` und einer kompakten Zusammenfassung der Vorlesungsthemen`
    : hasSlideFiles
    ? ` und ${slideFiles.length} Vorlesungsfoliensatz(sätze)`
    : '';

  const instructionText = `Du bist ein Experte für Hochschulprüfungsanalyse.

Analysiere die ${examFiles.length} Altklausur(en)${slideInfo} und extrahiere alle für die Generierung neuer Probeklausuren relevanten Strukturmerkmale.

${textModeWarning}

DATEIINTERPRETATION:
- PDFs können nur Klausuren, nur Lösungen oder beides kombiniert enthalten.
- Erkenne selbst, ob Musterlösungen, Erwartungshorizonte oder Punkteschemata vorhanden sind. Falls ja: Nutze diese, um Schwierigkeit, Detailtiefe und Bewertungsmaßstäbe zu kalibrieren — aber zähle Lösungsseiten NICHT als eigenständige Aufgaben.
- Bei getrennten Klausur- und Lösungsdateien: Verknüpfe sie inhaltlich.

AUFGABENTYPEN — GRANULARITÄT:
- Fasse ähnliche Aufgaben zu einem Typ zusammen (z.B. alle "Berechne X"-Varianten = 1 Typ).
- Ziel: 3–8 klar unterscheidbare Typen. Zu feingranular ist schlechter als zu grob.
- Benenne Typen auf Deutsch, fachspezifisch (z.B. "Normalform-Bestimmung", nicht "Mathematikaufgabe").
- exampleQuestion: wörtliches oder nah paraphrasiertes Beispiel aus den Originalklausuren — kein Platzhalter.

SCHWIERIGKEITSSKALA (difficulty 1–5):
1=Auswendiglernen/Definitionen, 2=Standardverfahren nach Schema, 3=Anwendung mit Modifikation, 4=Mehrstufige Analyse/Konzeptverknüpfung, 5=Offene Problemstellung/kreative Lösung

FREQUENCY: Prozentanteil an der Gesamtpunktzahl aller Klausuren (nicht Aufgabenanzahl). Alle Werte summieren sich auf 100.

VORLESUNGSKONTEXT (falls vorhanden):
- slideTopics: konkrete klausurrelevante Themen (nicht Kapitelüberschriften wie "Einführung").
- Der Kontext ergänzt die Klausurstruktur aus den Originalen, ersetzt sie nicht.

Gib NUR dieses JSON zurück (kein Markdown, kein Text davor/danach):
{"subject":"Fachname","totalTaskTypes":Zahl,"taskTypes":[{"id":"snake_case_id","name":"Aufgabentyp auf Deutsch","description":"Was genau gefordert wird","frequency":Prozent(0-100),"avgPoints":Punkte,"difficulty":1-5,"exampleQuestion":"Typisches Beispiel aus Originalklausur (wörtlich/paraphrasiert)","hasdiagramContext":bool}],"averageDifficulty":1-5,"estimatedDuration":Minuten,"totalPoints":Punkte,"topicAreas":["Spezifisches Thema"],"examCount":Zahl,"hasSlideContext":${hasLectureSummary || hasSlideFiles},"slideTopics":["Klausurrelevantes Thema aus Folien"],"hadImageOnlyContent":bool}`;

  let json: string;

  if (provider === 'openrouter') {
    const key = getOpenRouterKey();
    const model = getOpenRouterAnalysisModel();
    const slideParts = hasLectureSummary
      ? [`=== VORLESUNGSKONTEXT (kompakte Themen-Zusammenfassung) ===\n${lectureContextSummary?.trim()}`]
      : hasSlideFiles
      ? [slideFiles.length > 3
          ? `=== VORLESUNGSFOLIEN (${slideFiles.length} Dateien, zusammengefasst) ===\n${combineSlides(slideFiles)}`
          : slideFiles.map((f, i) => buildOpenRouterText(f, i, 'VORLESUNGSFOLIE')).join('\n\n')]
      : [];
    const parts = [
      ...examFiles.map((f, i) => buildOpenRouterText(f, i, 'ALTKLAUSUR')),
      ...slideParts,
      instructionText,
    ];
    const response = await fetchWithTimeout(OPENROUTER_API_URL, {
      method: 'POST',
      headers: buildOpenRouterHeaders(key),
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        temperature: 0,
        messages: [{ role: 'user', content: parts.join('\n\n') }],
      }),
    });
    json = await parseOpenRouterResponse(response);
  } else {
    const key = getAnthropicKey();
    const examBlocks = examFiles.map((f, i) => buildAnthropicBlock(f, i, 'ALTKLAUSUR'));
    const slideBlocks = hasLectureSummary
      ? [{ type: 'text', text: `=== VORLESUNGSKONTEXT (kompakte Themen-Zusammenfassung) ===\n${lectureContextSummary?.trim()}` }]
      : hasSlideFiles
      ? slideFiles.map((f, i) => buildAnthropicBlock(f, i, 'VORLESUNGSFOLIE'))
      : [];
    const response = await fetchWithTimeout(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: buildAnthropicHeaders(key),
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2000,
        temperature: 0,
        messages: [{ role: 'user', content: [...examBlocks, ...slideBlocks, { type: 'text', text: instructionText }] }],
      }),
    });
    json = await parseAnthropicResponse(response);
  }

  console.log('[ExamDraft] analyzeExams raw response (first 500 chars):', json.slice(0, 500));

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    console.error('[ExamDraft] JSON.parse failed. Raw response:', json);
    throw new Error('JSON_PARSE_ERROR');
  }

  try {
    return validateAnalysisResult(
      parsed,
      detectTotalPointsFromExamText(examFiles),
      detectDurationFromExamText(examFiles)
    );
  } catch (validErr) {
    console.error('[ExamDraft] Schema validation failed. Parsed object:', parsed);
    throw new Error('JSON_PARSE_ERROR');
  }
}

// --- Internal helper: single LLM call ---

async function llmCall(
  provider: ReturnType<typeof getProvider>,
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  if (provider === 'openrouter') {
    const key = getOpenRouterKey();
    const model = getOpenRouterGenerationModel();
    const response = await fetchWithTimeout(OPENROUTER_API_URL, {
      method: 'POST',
      headers: buildOpenRouterHeaders(key),
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    return parseOpenRouterResponse(response);
  } else {
    const key = getAnthropicKey();
    const response = await fetchWithTimeout(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: buildAnthropicHeaders(key),
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    return parseAnthropicResponse(response);
  }
}

function parseAndLog<T>(
  json: string,
  label: string,
  validate: (d: unknown) => T
): T {
  console.log(`[ExamDraft] ${label} raw (first 400 chars):`, json.slice(0, 400));
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    console.error(`[ExamDraft] ${label} JSON.parse failed:`, json);
    throw new Error('JSON_PARSE_ERROR');
  }
  try {
    return validate(parsed);
  } catch {
    console.error(`[ExamDraft] ${label} validation failed. Keys:`, Object.keys(parsed as object ?? {}));
    throw new Error('JSON_PARSE_ERROR');
  }
}

// --- Types for the exam plan phase ---
interface TaskPlan {
  id: string;
  number: number;
  type: string;
  typeId: string;
  title: string;
  points: number;
  subTaskCount: number;
  subTaskPoints: number[];
  hasDiagram: boolean;
}

interface ExamPlan {
  title: string;
  duration: number;
  totalPoints: number;
  includedTypes: string[];
  excludedTypes: string[];
  taskPlans: TaskPlan[];
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Returns true when the exam is primarily multiple-choice
 * (any task type whose name or id contains "multiple" / "mc" / "choice"
 *  and accounts for ≥50 % of the frequency).
 */
function isMCExam(analysis: import('./types').AnalysisResult): boolean {
  const MC_RE = /multiple.?choice|single.?choice|\bmc\b|\bchoice\b/i;
  return analysis.taskTypes.some(
    (t) => (MC_RE.test(t.name) || MC_RE.test(t.id)) && t.frequency >= 50,
  );
}

// ── Type-training: simple single-call path ────────────────────────────────────
async function generateTypeTraining(
  input: ExamGenerationInput,
  provider: ReturnType<typeof getProvider>
): Promise<GeneratedExam> {
  const typeInfo = input.analysis.taskTypes.find((t) => t.id === input.selectedTypeId);
  const typeName = typeInfo?.name ?? input.selectedTypeId ?? 'Aufgabentyp';
  const avgPts   = typeInfo?.avgPoints ?? 5;

  const prompt = `Erstelle 5 Übungsaufgaben vom Typ "${typeName}" für das Fach "${input.analysis.subject}". Gib NUR JSON zurück.

AUFGABENTYP:
- Name: ${typeName}
- Beschreibung: ${typeInfo?.description ?? '–'}
- Schwierigkeit: ${typeInfo?.difficulty ?? 3}/5
- Typische Punkte: ${avgPts}
- Beispiel aus Originalklausur: "${typeInfo?.exampleQuestion ?? '–'}"
- Themengebiete: ${input.analysis.topicAreas.join(', ')}

ANFORDERUNGEN:
- 5 Variationen, jede mit einem anderen Aspekt oder Szenario desselben Typs — keine inhaltlichen Wiederholungen.
- Unterschiedliche Zahlenwerte, Kontexte und konkrete Formulierungen.
- Stil: fachsprachlich, präzise, wie in den Originalklausuren.
- Vollständige Musterlösung mit Lösungsweg für jede Aufgabe.
- keyPoints: messbare Bewertungspunkte — was ein Korrektor explizit als richtig zählt.
- commonMistakes: typische Fehler Studierender bei diesem Aufgabentyp, fachspezifisch.

JSON-Schema:
{"title":"Training: ${typeName}","duration":30,"totalPoints":${avgPts * 5},"tasks":[{"id":"task_1","number":1,"type":"${typeName}","typeId":"${input.selectedTypeId ?? ''}","title":"Variation 1: [Kurzbeschreibung]","description":"Vollständiger Aufgabentext","points":${avgPts},"subTasks":[],"hints":[],"hasDiagram":false,"diagramDescription":""}],"includedTypes":["${input.selectedTypeId ?? ''}"],"excludedTypes":[],"solution":[{"taskId":"task_1","solution":"Vollständiger Lösungsweg mit allen Schritten","keyPoints":["Konkretes messbares Bewertungskriterium"],"commonMistakes":["Typischer fachspezifischer Fehler"]}]}`;

  const json = await llmCall(provider, prompt, 8000, 0.7);
  return parseAndLog(json, 'typeTraining', (d) => {
    const obj = d as Record<string, unknown>;
    const exam = (obj.tasks ? obj : (obj.exam as Record<string, unknown> | undefined) ?? obj) as Record<string, unknown>;
    if (typeof exam.title !== 'string' || !Array.isArray(exam.tasks)) throw new Error('JSON_PARSE_ERROR');
    if (!Array.isArray(exam.solution))      exam.solution = [];
    if (!Array.isArray(exam.includedTypes)) exam.includedTypes = [];
    if (!Array.isArray(exam.excludedTypes)) exam.excludedTypes = [];
    return exam as unknown as GeneratedExam;
  });
}

// ── Full exam: 3-phase scalable generation ────────────────────────────────────
export async function generateExam(input: ExamGenerationInput): Promise<GeneratedExam> {
  const provider = getProvider();

  if (input.mode === 'type-training') {
    return generateTypeTraining(input, provider);
  }

  const difficultyMap = {
    easier: 'EINFACHER: kleinere Zahlen, mehr Hinweise, direktere Fragen',
    same:   'GLEICH SCHWER: ähnliche Komplexität wie die Originale',
    harder: 'SCHWERER: komplexere Aufgaben, keine Hinweise, höhere Abstraktion',
  };

  const slimAnalysis = {
    subject: input.analysis.subject,
    taskTypes: input.analysis.taskTypes.map(({ id, name, frequency, avgPoints, difficulty, hasdiagramContext }) => ({
      id, name, frequency, avgPoints, difficulty, hasdiagramContext,
    })),
    averageDifficulty: input.analysis.averageDifficulty,
    estimatedDuration: input.analysis.estimatedDuration,
    totalPoints: input.analysis.totalPoints,
    topicAreas: input.analysis.topicAreas,
    hasSlideContext: input.analysis.hasSlideContext,
    slideTopics: input.analysis.slideTopics,
    hadImageOnlyContent: input.analysis.hadImageOnlyContent,
  };

  const excludedLine = input.excludedTopics?.length
    ? `AUSGESCHLOSSENE THEMEN: ${input.excludedTopics.join(', ')}\n`
    : '';

  // Detect multiple-choice exams — they need larger batches and different schemas
  const mc = isMCExam(input.analysis);

  // ── PHASE 1: Plan — which tasks, how many points ──────────────────────────────
  // Each taskPlan entry ≈ 70 tokens; estimate task count from analysis to set budget.
  // MC exams have many tiny tasks; non-MC can also have 20–40 tasks in rare cases.
  const weightedAvgPts = slimAnalysis.taskTypes.reduce(
    (s, t) => s + t.avgPoints * (t.frequency / 100), 0,
  ) || 5;
  const estimatedTaskCount = Math.ceil(slimAnalysis.totalPoints / weightedAvgPts);
  const planMaxTokens = Math.min(4000, Math.max(1500, estimatedTaskCount * 80 + 400));

  const planPrompt = `Erstelle den Strukturplan einer Probeklausur. NUR Metadaten — KEIN Aufgabentext. Gib NUR JSON zurück.

ANALYSE: ${JSON.stringify(slimAnalysis)}
SCHWIERIGKEIT: ${difficultyMap[input.difficulty]}
${excludedLine}
PLANUNGSREGELN:
1. Aufgabenanzahl, Gesamtpunktzahl und Zeitdauer EXAKT wie in der Analyse.
2. Aufgabentypen proportional zu ihrer frequency verteilen (frequency=40 → ~40% der Gesamtpunkte).
3. subTaskPoints muss exakt auf points summieren (z.B. points=12, subTaskCount=3 → [4,4,4] oder [3,4,5]).
4. hasDiagram: nur true für Typen mit hasdiagramContext=true in der Analyse.${input.analysis.hasSlideContext && input.analysis.slideTopics.length > 0 ? `\n5. Aufgabentitel sollen Themen abdecken: ${input.analysis.slideTopics.join(', ')}.` : ''}

JSON-Schema:
{"title":"Probeklausur: [Fach]","duration":Minuten,"totalPoints":Punkte,"includedTypes":["typeId"],"excludedTypes":["typeId"],"taskPlans":[{"id":"task_1","number":1,"type":"Typname","typeId":"type_id","title":"Aufgabentitel","points":Punkte,"subTaskCount":Anzahl,"subTaskPoints":[Punkte pro Teilaufgabe],"hasDiagram":bool}]}`;

  const planJson = await llmCall(provider, planPrompt, planMaxTokens, 0.7);
  const plan = parseAndLog(planJson, 'generateExam[plan]', (d) => {
    const obj = d as Record<string, unknown>;
    if (!Array.isArray(obj.taskPlans) || typeof obj.title !== 'string') throw new Error('JSON_PARSE_ERROR');
    if (!Array.isArray(obj.includedTypes)) obj.includedTypes = [];
    if (!Array.isArray(obj.excludedTypes)) obj.excludedTypes = [];
    return obj as unknown as ExamPlan;
  });

  console.log(`[ExamDraft] Plan: ${plan.taskPlans.length} tasks, ${plan.totalPoints} pts (mc=${mc})`);

  // ── PHASE 2: Task details in parallel batches ─────────────────────────────────
  // MC questions are tiny (stem + 4 options ≈ 100 tokens) → batch more per call.
  // Regular tasks are larger; use 6 for big exams (≥16 tasks), 4 for smaller ones.
  const BATCH_SIZE    = mc ? 15 : estimatedTaskCount >= 16 ? 6 : 4;
  const BATCH_TOKENS  = mc ? 6000 : 4000;
  const batches = chunkArray(plan.taskPlans, BATCH_SIZE);

  const diagramNote = input.analysis.hadImageOnlyContent
    ? 'Für Diagramm-Aufgaben: beschreibe das Diagramm vollständig im Aufgabentext. Niemals auf "Abbildung X" verweisen.'
    : 'Bei Diagramm-Aufgaben: beschreibe die Diagrammstruktur im Aufgabentext.';

  // JSON schema differs for MC (options field) vs open tasks
  const taskSchema = mc
    ? `{"tasks":[{"id":"task_1","number":1,"type":"Multiple Choice","typeId":"multiple_choice","title":"Kurztitel","description":"Fragestamm (ohne Optionen)","points":1,"options":{"A":"Option A","B":"Option B","C":"Option C","D":"Option D"},"subTasks":[],"hints":[],"hasDiagram":false,"diagramDescription":""}]}`
    : `{"tasks":[{"id":"task_1","number":1,"type":"Typname","typeId":"type_id","title":"Titel","description":"Vollständiger prägnanter Aufgabentext","points":Punkte,"subTasks":[{"label":"a","text":"Teilaufgabe","points":Punkte}],"hints":["Hinweis falls sinnvoll"],"hasDiagram":bool,"diagramDescription":"Textbeschreibung falls hasDiagram"}]}`;

  const mcNote = mc
    ? 'MC-AUFGABEN: Schreibe den Fragestamm in "description". Die vier Antwortoptionen MÜSSEN ins "options"-Objekt (Schlüssel A/B/C/D). Optionen NICHT in description wiederholen.'
    : '';

  const batchResults = await Promise.all(
    batches.map(async (batch, batchIndex) => {
      // Collect example questions for the task types in this batch as style references
      const batchTypeIds = [...new Set(batch.map((t) => t.typeId))];
      const exampleLines = batchTypeIds
        .map((tid) => {
          const info = input.analysis.taskTypes.find((t) => t.id === tid);
          return info?.exampleQuestion ? `- ${info.name}: "${info.exampleQuestion}"` : null;
        })
        .filter(Boolean)
        .join('\n');
      const examplesNote = exampleLines
        ? `BEISPIELAUFGABEN aus Originalklausuren (Stil und Formulierung genau imitieren):\n${exampleLines}`
        : '';

      const batchPrompt = `Erstelle ${batch.length} Klausuraufgaben. Gib NUR JSON zurück.

FACH: ${input.analysis.subject}
SCHWIERIGKEIT: ${difficultyMap[input.difficulty]}
THEMENGEBIETE: ${input.analysis.topicAreas.join(', ')}
${input.analysis.hasSlideContext && input.analysis.slideTopics.length > 0 ? `VORLESUNGSTHEMEN (bevorzugt abdecken): ${input.analysis.slideTopics.join(', ')}` : ''}
${examplesNote}
${diagramNote}
${mcNote}

AUFGABENPLAN: ${JSON.stringify(batch)}

FORMATREGELN:
- description: vollständiger, eigenständig lesbarer Aufgabentext. Kein "Vgl. Abbildung X" ohne vorherige Beschreibung.
- subTasks: GENAU so viele wie subTaskCount im Plan; Punkte EXAKT wie subTaskPoints (müssen auf points summieren).
- Stil: fachsprachlich, präzise, mit konkreten Zahlenwerten und Formeln — wie in den Originalklausuren.
- Tabellen: nur bei echten tabellarischen Daten (DB-Schema, Vergleiche, Schedule). Markdown: | Spalte | / |---|. Nicht für Definitionen oder Aufzählungen.

JSON-Schema:
${taskSchema}`;

      const batchJson = await llmCall(provider, batchPrompt, BATCH_TOKENS, 0.7);
      return parseAndLog(batchJson, `generateExam[batch-${batchIndex}]`, (d) => {
        const obj = d as Record<string, unknown>;
        const tasks = Array.isArray(obj.tasks) ? obj.tasks : (Array.isArray(obj) ? obj : []);
        return tasks as ExamTask[];
      });
    })
  );

  const allTasks = batchResults.flat();

  // ── PHASE 3: Solutions ────────────────────────────────────────────────────────
  // MC solutions are tiny (just a correct key + brief explanation) → batch more.
  // Regular solutions can be very long (full Rechenweg + keyPoints + commonMistakes),
  // so keep batches small (≤3) to avoid hitting output-token limits and losing
  // solutions for later tasks due to JSON truncation.
  const SOLUTION_BATCH_SIZE   = mc ? 20 : 3;
  const SOLUTION_BATCH_TOKENS = mc ? 3000 : 6000;
  const solutionBatches = chunkArray(allTasks, SOLUTION_BATCH_SIZE);

  const solutionSchema = mc
    ? `{"solution":[{"taskId":"task_1","solution":"Kurze Begründung warum die richtige Antwort korrekt ist","correctOption":"B","keyPoints":["Kernpunkt"],"commonMistakes":["Häufiger Fehler"]}]}`
    : `{"solution":[{"taskId":"task_1","solution":"Vollständige Musterlösung mit Rechenweg","keyPoints":["Kernpunkt"],"commonMistakes":["Häufiger Fehler"]}]}`;

  async function fetchSolutionBatch(batchTasks: ExamTask[], label: string): Promise<ExamSolution[]> {
    const taskSummary = batchTasks.map((t: ExamTask) => ({
      id: t.id,
      number: t.number,
      title: t.title,
      type: t.type,
      points: t.points,
      description: t.description,
      ...(t.options ? { options: t.options } : { subTasks: t.subTasks ?? [] }),
    }));

    const solutionsPrompt = `Erstelle vollständige Musterlösungen für ${batchTasks.length} Klausuraufgaben. Gib NUR JSON zurück.

FACH: ${input.analysis.subject}
AUFGABEN: ${JSON.stringify(taskSummary)}

ANFORDERUNGEN:
- solution: Vollständiger Lösungsweg mit ALLEN Rechenschritten, Begründungen und Zwischenergebnissen. Keine Abkürzungen. Auf Deutsch.
- keyPoints: Konkrete Bewertungspunkte — was ein Korrektor explizit als richtig zählt. Messbar und spezifisch (z.B. "Normalform korrekt aufgestellt" statt "Aufgabe gelöst").
- commonMistakes: Typische Fehler Studierender bei diesem Aufgabentyp im Fach ${input.analysis.subject}. Fachspezifisch, nicht trivial (kein "Rechenfehler" als einziger Punkt).${mc ? '\n- correctOption: Exakt ein Buchstabe (A/B/C/D). Erkläre in solution kurz, warum jede falsche Option falsch ist.' : ''}

JSON-Schema:
${solutionSchema}`;

    const solutionsJson = await llmCall(provider, solutionsPrompt, SOLUTION_BATCH_TOKENS, 0.3);
    return parseAndLog(solutionsJson, label, (d) => {
      const obj = d as Record<string, unknown>;
      const arr = Array.isArray(obj) ? obj : (Array.isArray(obj.solution) ? obj.solution : []);
      return arr as ExamSolution[];
    });
  }

  const solutionBatchResults = await Promise.all(
    solutionBatches.map((batchTasks, batchIndex) =>
      fetchSolutionBatch(batchTasks, `generateExam[solutions-batch-${batchIndex}]`)
    )
  );

  let solutions = solutionBatchResults.flat();

  // ── PHASE 3b: Retry missing solutions ────────────────────────────────────────
  // If the model truncated a batch (output-token limit), some tasks won't have a
  // solution. Detect them and retry individually so every task gets covered.
  if (!mc) {
    const coveredIds = new Set(solutions.map((s) => s.taskId));
    const missingTasks = allTasks.filter((t) => !coveredIds.has(t.id));
    if (missingTasks.length > 0) {
      console.warn(`[ExamDraft] ${missingTasks.length} task(s) missing solutions — retrying individually`);
      const retryResults = await Promise.all(
        missingTasks.map((t, i) =>
          fetchSolutionBatch([t], `generateExam[solutions-retry-${i}]`).catch(() => [] as ExamSolution[])
        )
      );
      solutions = [...solutions, ...retryResults.flat()];
    }
  }

  return {
    title: plan.title,
    duration: plan.duration,
    totalPoints: plan.totalPoints,
    tasks: allTasks,
    includedTypes: plan.includedTypes,
    excludedTypes: plan.excludedTypes,
    solution: solutions,
  };
}

// ── AI Grading ────────────────────────────────────────────────────────────────

/**
 * Grade MC answers instantly client-side (no API call needed).
 * Returns null if the exam contains any open/non-MC tasks that require AI grading.
 */
export function gradeExamClientSide(
  exam: import('./types').GeneratedExam,
  answers: ExamAnswer[]
): GradingResult | null {
  // Only use client-side grading when every task has an options field
  const allMC = exam.tasks.every((t) => t.options && Object.keys(t.options).length > 0);
  if (!allMC) return null;

  const feedback: GradingFeedback[] = exam.tasks.map((t) => {
    const sol = exam.solution.find((s) => s.taskId === t.id);
    const correctKey = sol?.correctOption?.toUpperCase() ?? '';
    const given = (answers.find((a) => a.taskId === t.id)?.answer ?? '').trim().toUpperCase();
    const correct = given !== '' && given === correctKey;
    const earnedPoints = correct ? t.points : 0;
    return {
      taskId: t.id,
      earnedPoints,
      maxPoints: t.points,
      feedback: correct
        ? `Richtig! Antwort ${correctKey} ist korrekt.`
        : given === ''
        ? 'Keine Antwort gegeben.'
        : `Falsch. Deine Antwort: ${given} — Richtig: ${correctKey}.${sol?.solution ? ` Begründung: ${sol.solution}` : ''}`,
      correctPoints: correct ? [`Antwort ${correctKey} korrekt gewählt`] : [],
      missingPoints: correct ? [] : correctKey ? [`Richtige Antwort war ${correctKey}`] : [],
    };
  });

  const totalEarned = feedback.reduce((s, f) => s + f.earnedPoints, 0);
  const totalMax = exam.totalPoints;
  const percentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
  return { totalEarned, totalMax, percentage, feedback };
}

export async function gradeExam(
  exam: import('./types').GeneratedExam,
  answers: ExamAnswer[]
): Promise<GradingResult> {
  // Fast path: pure MC exam → instant client-side grading, no API call
  const clientResult = gradeExamClientSide(exam, answers);
  if (clientResult) return clientResult;

  const provider = getProvider();

  const taskDetails = exam.tasks.map((t) => {
    const sol = exam.solution.find((s) => s.taskId === t.id);
    return {
      id: t.id,
      number: t.number,
      title: t.title,
      points: t.points,
      description: t.description,
      subTasks: t.subTasks ?? [],
      musterloesung: sol?.solution ?? '',
      keyPoints: sol?.keyPoints ?? [],
    };
  });

  const answerBlocks = answers.map((a) => {
    const task = exam.tasks.find((t) => t.id === a.taskId);
    return `=== Aufgabe ${task?.number}: ${task?.title} (${task?.points} Punkte) ===\n${a.answer?.trim() || '[Keine Antwort gegeben]'}`;
  }).join('\n\n');

  const prompt = `Du bist ein erfahrener Hochschulkorrektor für "${exam.title}". Korrigiere die Klausur nach akademischen Standards.

AUFGABEN MIT MUSTERLÖSUNGEN:
${JSON.stringify(taskDetails)}

STUDENTENANTWORTEN:
${answerBlocks}

KORREKTURREGELN:
1. Teilpunkte: Vergib Punkte proportional — sind 2 von 3 keyPoints erfüllt, vergib ~2/3 der Maximalpunkte.
2. Folgefehler: Ein Fehler in Schritt A, der in Schritt B korrekt weiterverwendet wird → Abzug nur in Schritt A, nicht erneut in B.
3. earnedPoints: Ganzzahl, 0 ≤ earnedPoints ≤ maxPoints (darf maxPoints niemals überschreiten).
4. feedback: 1–3 Sätze auf Deutsch. Konstruktiv: Was war richtig? Was fehlte konkret? Welches Konzept wurde falsch angewendet?
5. correctPoints: Liste der tatsächlich erbrachten Teilleistungen — konkret, nicht "teilweise richtig".
6. missingPoints: Liste konkreter Lücken oder Fehler — keine pauschalen Aussagen wie "Antwort unvollständig".
7. Keine Antwort gegeben → earnedPoints=0, kurzes neutrales Feedback.

Gib NUR JSON zurück:
{"totalEarned":Punkte,"totalMax":${exam.totalPoints},"percentage":0-100,"feedback":[{"taskId":"task_1","earnedPoints":Punkte,"maxPoints":Punkte,"feedback":"Konstruktive Bewertung 1–3 Sätze","correctPoints":["Konkrete Teilleistung"],"missingPoints":["Konkreter Fehler oder fehlender Aspekt"]}]}`;

  const json = await llmCall(provider, prompt, 4000, 0.2);
  return parseAndLog(json, 'gradeExam', (d) => {
    const obj = d as Record<string, unknown>;
    if (typeof obj.totalEarned !== 'number' || !Array.isArray(obj.feedback)) {
      throw new Error('JSON_PARSE_ERROR');
    }
    // Ensure all feedback entries have arrays
    (obj.feedback as GradingFeedback[]).forEach((fb) => {
      if (!Array.isArray(fb.correctPoints)) fb.correctPoints = [];
      if (!Array.isArray(fb.missingPoints)) fb.missingPoints = [];
    });
    return obj as unknown as GradingResult;
  });
}
