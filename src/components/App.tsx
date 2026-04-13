import { useState, useEffect, useCallback } from 'react';
import type { AppState, AppStep, ExtractedFile, AnalysisResult, GeneratedExam, Provider } from '../lib/types';
import { DEFAULT_OPENROUTER_ANALYSIS_MODEL } from '../lib/anthropic';
import { processFile } from '../lib/pdfExtractor';
import { analyzeExams, generateExam, getProvider } from '../lib/anthropic';
import { estimateTotalTokens, formatTokens } from '../lib/tokenEstimator';
import ApiKeySetup from './ApiKeySetup';
import UploadZone, { type PendingFile } from './UploadZone';
import ConsentCheckbox from './ConsentCheckbox';
import TokenEstimator from './TokenEstimator';
import AnalysisDashboard from './AnalysisDashboard';
import ExamConfigurator from './ExamConfigurator';
import GeneratedExamComponent from './GeneratedExam';
import ExamSession from './ExamSession';
import TypeTrainer from './TypeTrainer';
import { ToastContainer, useToasts, showError } from './Toast';
import { DEMO_EXAM, DEMO_ANALYSIS } from '../lib/demoExam';

/** Migrate stale model IDs that OpenRouter no longer accepts. */
function migrateStoredModels() {
  const migrations: Record<string, string> = {
    'google/gemini-2.5-flash-preview': 'google/gemini-2.5-flash',
  };
  for (const key of ['examdraft_openrouter_model', 'examdraft_openrouter_analysis_model']) {
    const val = localStorage.getItem(key);
    if (val && migrations[val]) {
      localStorage.setItem(key, migrations[val]);
    }
  }
}

function getStoredConfig(): { key: string | null; provider: Provider; model: string; analysisModel: string } {
  if (typeof window === 'undefined') return { key: null, provider: 'openrouter', model: '', analysisModel: '' };
  migrateStoredModels();
  const provider = (localStorage.getItem('examdraft_provider') as Provider) ?? 'openrouter';
  const key = provider === 'openrouter'
    ? localStorage.getItem('examdraft_openrouter_key')
    : localStorage.getItem('examdraft_api_key');
  const model = localStorage.getItem('examdraft_openrouter_model') ?? '';
  const analysisModel = localStorage.getItem('examdraft_openrouter_analysis_model') ?? DEFAULT_OPENROUTER_ANALYSIS_MODEL;
  return { key, provider, model, analysisModel };
}

const initialState: AppState = {
  apiKey: null,
  provider: 'openrouter',
  openrouterModel: '',
  openrouterAnalysisModel: '',
  examFiles: [],
  slideFiles: [],
  includeSlides: true,
  lectureContextMode: 'summary',
  lectureContextText: '',
  consentGiven: false,
  rightsConfirmed: false,
  analysisResult: null,
  selectedMode: null,
  selectedDifficulty: 'same',
  selectedTypeId: null,
  selectedExcludedTopics: [],
  generatedExam: null,
  currentStep: 1,
  isLoading: false,
  loadingMessage: '',
  error: null,
};

export default function App() {
  const [state, setState] = useState<AppState>({ ...initialState });
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [examPendingFiles, setExamPendingFiles] = useState<PendingFile[]>([]);
  const [slidePendingFiles, setSlidePendingFiles] = useState<PendingFile[]>([]);
  const [showSession, setShowSession] = useState(false);
  const [showTypeTrainer, setShowTypeTrainer] = useState(false);
  const [trainerLoading, setTrainerLoading] = useState(false);

  const { toasts, addToast, removeToast } = useToasts();

  const lectureSummaryMasterPrompt = `Ich gebe dir im nächsten Schritt den Inhalt von Vorlesungsfolien oder daraus kopierten Ausschnitten. Deine Aufgabe ist es, einen kompakten, klausurrelevanten Vorlesungskontext für ein KI-gestütztes Prüfungsanalyse-Tool zu erstellen.

AUFGABE:
- Extrahiere alle Inhalte, die mit hoher Wahrscheinlichkeit in einer Klausur geprüft werden.
- Entferne: Organisatorisches, Wiederholungen, Literaturhinweise, Danksagungen, allgemeine Einleitungen.
- Behalte: Definitionen, Verfahren, Formeln, Algorithmen, Klassifikationen, typische Beispiele, Standardannahmen.

BESONDERS HERVORHEBEN:
- Rechenverfahren mit festen Schritten (vollständig und in richtiger Reihenfolge)
- Formeln und Gleichungen (exakt übernehmen, mit Variablenbedeutung)
- Typische Diagrammtypen, die interpretiert oder erstellt werden müssen
- Wiederkehrende Begründungsmuster (z.B. "Beweis durch Widerspruch", "Vollständige Induktion")
- Häufige Fehlerquellen, Grenzfälle und Sonderfälle
- Themen, die in mehreren Vorlesungseinheiten wiederkehren (höchste Klausurrelevanz)

ZIELFORMAT — Kompakter strukturierter Klartext:
- Kurze Abschnittstitel, dann Stichpunkte — keine langen Prosa-Absätze
- Formeln als Text: z.B. "f(x) = ax² + bx + c"
- Maximal ~1500 Wörter — verdichtet auf das Wesentliche
- Auf Deutsch
- Kein Fazit, keine Einleitung, keine Metakommentare

Die Ausgabe wird direkt als Vorlesungskontext in ein KI-gestütztes Klausurgenerierungs-Tool eingefügt.`;

  useEffect(() => {
    const { key, provider, model, analysisModel } = getStoredConfig();
    if (key) {
      setState((s) => ({ ...s, apiKey: key, provider, openrouterModel: model, openrouterAnalysisModel: analysisModel }));
    } else {
      setShowKeySetup(true);
    }

    // Restore session: analysis result + generated exam from sessionStorage
    try {
      const savedAnalysis = sessionStorage.getItem('examdraft_session_analysis');
      const savedExam = sessionStorage.getItem('examdraft_session_exam');
      if (savedAnalysis) {
        const analysis = JSON.parse(savedAnalysis) as import('../lib/types').AnalysisResult;
        const exam = savedExam ? JSON.parse(savedExam) as import('../lib/types').GeneratedExam : null;
        setState((s) => ({
          ...s,
          analysisResult: analysis,
          generatedExam: exam,
          currentStep: exam ? 4 : 2,
        }));
      }
    } catch {
      // Corrupt session data — ignore silently
      sessionStorage.removeItem('examdraft_session_analysis');
      sessionStorage.removeItem('examdraft_session_exam');
    }
  }, []);

  function setStep(step: AppStep) {
    setState((s) => ({ ...s, currentStep: step }));
  }

  const canAnalyze =
    examPendingFiles.length >= 1 &&
    state.consentGiven &&
    state.rightsConfirmed &&
    !state.isLoading &&
    true; // file readiness is managed per-file in FileCard

  async function handleAnalyze() {
    if (!state.apiKey) {
      setShowKeySetup(true);
      return;
    }

    setState((s) => ({ ...s, isLoading: true, loadingMessage: 'Extrahiere Text aus PDFs...' }));

    try {
      // OpenRouter doesn't support PDF image/document mode — always extract text
      const useImageAllowed = state.provider !== 'openrouter';

      // Process all files in parallel
      const examExtracted = await Promise.all(
        examPendingFiles.map((pf) => processFile(pf.file, 'exam', useImageAllowed && pf.useImage))
      );
      const slideExtracted = state.includeSlides && state.lectureContextMode === 'pdfs'
        ? await Promise.all(
            slidePendingFiles.map((pf) => processFile(pf.file, 'slides', useImageAllowed && pf.useImage))
          )
        : [];

      setState((s) => ({ ...s, loadingMessage: 'Sende Daten an den KI-Anbieter...' }));

      const result = await analyzeExams(
        examExtracted,
        slideExtracted,
        state.includeSlides,
        state.lectureContextMode === 'summary' ? state.lectureContextText.trim() : undefined
      );

      try {
        sessionStorage.setItem('examdraft_session_analysis', JSON.stringify(result));
        sessionStorage.removeItem('examdraft_session_exam');
      } catch { /* storage quota exceeded — ignore */ }

      setState((s) => ({
        ...s,
        examFiles: examExtracted,
        slideFiles: slideExtracted,
        analysisResult: result,
        isLoading: false,
        loadingMessage: '',
        currentStep: 2,
      }));
    } catch (err: unknown) {
      console.error('[ExamDraft] analyzeExams error:', err);
      const code = err instanceof Error ? err.message : 'API_ERROR';
      if (code === 'INVALID_API_KEY' || code === 'OPENROUTER_INVALID_API_KEY' || code === 'NO_API_KEY') {
        addToast(
          code === 'OPENROUTER_INVALID_API_KEY'
            ? 'Ungültiger API-Key. Prüfe deinen Key auf openrouter.ai/keys.'
            : code === 'INVALID_API_KEY'
            ? 'Ungültiger API-Key. Prüfe deinen Key auf console.anthropic.com.'
            : 'Kein API-Key gesetzt. Bitte trage deinen Key ein.',
          'error',
          { actionLabel: 'API-Key hinterlegen', onAction: () => setShowKeySetup(true) }
        );
      } else {
        showError(code);
      }
      setState((s) => ({ ...s, isLoading: false, loadingMessage: '' }));
    }
  }

  async function handleGenerate(
    mode: 'random' | 'type-training',
    difficulty: 'easier' | 'same' | 'harder',
    typeId?: string,
    excludedTopics?: string[]
  ) {
    if (!state.analysisResult) return;
    if (!state.apiKey) { setShowKeySetup(true); return; }

    setState((s) => ({
      ...s,
      isLoading: true,
      loadingMessage: 'Generiere Aufgaben...',
      currentStep: 4,
      selectedMode: mode,
      selectedDifficulty: difficulty,
      selectedTypeId: typeId ?? null,
      selectedExcludedTopics: excludedTopics ?? [],
    }));

    try {
      const exam = await generateExam({
        analysis: state.analysisResult,
        mode,
        difficulty,
        selectedTypeId: typeId,
        excludedTopics,
      });

      try {
        sessionStorage.setItem('examdraft_session_exam', JSON.stringify(exam));
      } catch { /* storage quota exceeded — ignore */ }

      setState((s) => ({
        ...s,
        generatedExam: exam,
        isLoading: false,
        loadingMessage: '',
        error: null,
      }));

      if (mode === 'type-training') {
        setShowTypeTrainer(true);
      }
    } catch (err: unknown) {
      console.error('[ExamDraft] generateExam error:', err);
      const code = err instanceof Error ? err.message : 'API_ERROR';
      if (code === 'INVALID_API_KEY' || code === 'OPENROUTER_INVALID_API_KEY' || code === 'NO_API_KEY') {
        addToast(
          code === 'OPENROUTER_INVALID_API_KEY'
            ? 'Ungültiger API-Key. Prüfe deinen Key auf openrouter.ai/keys.'
            : code === 'INVALID_API_KEY'
            ? 'Ungültiger API-Key. Prüfe deinen Key auf console.anthropic.com.'
            : 'Kein API-Key gesetzt. Bitte trage deinen Key ein.',
          'error',
          { actionLabel: 'API-Key hinterlegen', onAction: () => setShowKeySetup(true) }
        );
      } else {
        showError(code);
      }
      // Stay on Step 4 — show error state there instead of silently reverting
      setState((s) => ({
        ...s,
        isLoading: false,
        loadingMessage: '',
        error: code,
      }));
    }
  }

  async function handleRetry() {
    if (!state.analysisResult || !state.selectedMode) return;
    await handleGenerate(
      state.selectedMode,
      state.selectedDifficulty,
      state.selectedTypeId ?? undefined,
      state.selectedExcludedTopics.length ? state.selectedExcludedTopics : undefined
    );
  }

  async function handleRegenerateTrainer() {
    if (!state.analysisResult || !state.selectedTypeId) return;
    setTrainerLoading(true);
    try {
      const exam = await generateExam({
        analysis: state.analysisResult,
        mode: 'type-training',
        difficulty: state.selectedDifficulty,
        selectedTypeId: state.selectedTypeId,
      });
      try {
        sessionStorage.setItem('examdraft_session_exam', JSON.stringify(exam));
      } catch { /* storage quota exceeded — ignore */ }
      setState((s) => ({ ...s, generatedExam: exam, error: null }));
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : 'API_ERROR';
      showError(code);
    } finally {
      setTrainerLoading(false);
    }
  }

  function handleNewAnalysis() {
    sessionStorage.removeItem('examdraft_session_analysis');
    sessionStorage.removeItem('examdraft_session_exam');
    setState({ ...initialState, apiKey: state.apiKey, provider: state.provider, openrouterModel: state.openrouterModel, openrouterAnalysisModel: state.openrouterAnalysisModel });
    setExamPendingFiles([]);
    setSlidePendingFiles([]);
    setShowSession(false);
    setShowTypeTrainer(false);
  }

  function handleNewExam() {
    setState((s) => ({
      ...s,
      generatedExam: null,
      currentStep: 3,
      selectedMode: null,
      selectedExcludedTopics: [],
      error: null,
    }));
    setShowSession(false);
    setShowTypeTrainer(false);
  }

  // Derived values for TokenEstimator (use pending files' size as approximation)
  const approxExamFiles: ExtractedFile[] = examPendingFiles.map((pf) => ({
    name: pf.file.name,
    size: pf.file.size,
    type: 'exam',
    mode: pf.useImage ? 'image' : 'text',
    text: null,
    base64: null,
    tokenEstimate: pf.useImage
      ? 10 * 750 // rough fallback before analysis
      : Math.ceil(pf.file.size / 40), // PDF text is ~10% of file size; /40 = *0.10/4chars-per-token
    pageCount: 10,
    imageCount: 0,
    hasSignificantImages: pf.useImage,
  }));

  const approxSlideFiles: ExtractedFile[] = slidePendingFiles.map((pf) => ({
    name: pf.file.name,
    size: pf.file.size,
    type: 'slides',
    mode: pf.useImage ? 'image' : 'text',
    text: null,
    base64: null,
    tokenEstimate: pf.useImage ? 5 * 750 : Math.ceil(pf.file.size / 40),
    pageCount: 5,
    imageCount: 0,
    hasSignificantImages: pf.useImage,
  }));

  const approxSummaryContext: ExtractedFile[] =
    state.includeSlides && state.lectureContextMode === 'summary' && state.lectureContextText.trim()
      ? [{
          name: 'vorlesungskontext.txt',
          size: state.lectureContextText.length,
          type: 'slides',
          mode: 'text',
          text: state.lectureContextText.trim(),
          base64: null,
          tokenEstimate: Math.ceil(state.lectureContextText.trim().length / 4),
          pageCount: 1,
          imageCount: 0,
          hasSignificantImages: false,
        }]
      : [];

  const examTextCount = examPendingFiles.filter((f) => !f.useImage).length;
  const examImageCount = examPendingFiles.filter((f) => f.useImage).length;

  const selectedTypeName =
    state.analysisResult?.taskTypes.find((t) => t.id === state.selectedTypeId)?.name ?? '';

  async function handleCopyLecturePrompt() {
    try {
      await navigator.clipboard.writeText(lectureSummaryMasterPrompt);
      addToast('Master-Prompt in die Zwischenablage kopiert.', 'success');
    } catch {
      addToast('Zwischenablage konnte nicht beschrieben werden.', 'error');
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {showKeySetup && (
        <ApiKeySetup
          mode={state.apiKey ? 'drawer' : 'fullscreen'}
          onSaved={(provider, key, model, analysisModel) => {
            setState((s) => ({ ...s, apiKey: key, provider, openrouterModel: model, openrouterAnalysisModel: analysisModel }));
            setShowKeySetup(false);
          }}
          onClose={state.apiKey ? () => setShowKeySetup(false) : undefined}
        />
      )}

      {showSession && state.generatedExam && (
        <ExamSession
          exam={state.generatedExam}
          onClose={() => setShowSession(false)}
          onNewExam={() => { setShowSession(false); handleNewExam(); }}
        />
      )}

      {!showSession && (
        <div className="app-shell">
          {/* Header */}
          <header className="app-header sticky top-0 z-40 flex items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <a href="/" className="flex items-center gap-2.5 hover:opacity-75 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-7 h-7 shrink-0">
                  <rect width="32" height="32" rx="7" fill="#111111"/>
                  <rect x="8" y="8"    width="16" height="3.5" rx="1.75" fill="#f0ebe2"/>
                  <rect x="8" y="14.25" width="11" height="3.5" rx="1.75" fill="#f0ebe2"/>
                  <rect x="8" y="20.5" width="16" height="3.5" rx="1.75" fill="#f0ebe2"/>
                </svg>
                <span className="text-[#111111] font-bold text-lg">ExamDraft</span>
              </a>
              <span className="text-[#7d7785] text-xs hidden sm:inline">
                Lerne klüger. Übe smarter. Bestehe sicher.
              </span>
            </div>
            <button
              onClick={() => setShowKeySetup(true)}
              className="app-pill-button flex items-center gap-2 px-3 py-1 text-xs transition-all"
            >
              <span
                className={`w-2 h-2 rounded-full ${state.apiKey ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className={state.apiKey ? 'text-green-700' : 'text-red-600'}>
                {state.apiKey
                  ? state.provider === 'openrouter' ? 'OpenRouter' : 'Anthropic'
                  : 'Kein Key'}
              </span>
            </button>
          </header>

          {/* Step indicator */}
          {state.currentStep > 0 && (
            <div className="app-stepbar">
              <div className="max-w-5xl mx-auto px-4 py-3">
                <div className="flex items-center gap-2 text-xs">
                  {(['Upload', 'Analyse', 'Konfiguration', 'Klausur'] as const).map((label, i) => {
                    const stepNum = (i + 1) as AppStep;
                    const active = state.currentStep === stepNum;
                    const done = state.currentStep > stepNum;
                    // Allow navigating back to completed steps (not forward)
                    const navigable = done && !state.isLoading;
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <span
                          onClick={navigable ? () => setStep(stepNum) : undefined}
                          className={`transition-colors ${
                            active
                              ? 'text-[#2f5bd2] font-semibold'
                              : done
                              ? 'text-[#2e7d4f]'
                              : 'text-[#918b99]'
                          } ${navigable ? 'cursor-pointer hover:text-[#2e7d4f] underline underline-offset-2 decoration-dotted' : ''}`}
                        >
                          {done ? '✓ ' : `${stepNum}. `}{label}
                        </span>
                        {i < 3 && <span className="text-[#c0bac6]">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Main content */}
          <main className="app-main max-w-5xl mx-auto px-4 py-8">
            {/* Step 1: Upload */}
            {state.currentStep === 1 && (
              <div className="space-y-6 animate-slide-up">
                <div>
                  <h1 className="text-3xl font-semibold text-[#111111] mb-1">Klausuren hochladen</h1>
                  <p className="text-sm text-[#6f6a78]">
                    Lade deine Altklausuren hoch. Vorlesungskontext ist standardmäßig aktiv, weil er die Themenwahl meist deutlich verbessert.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-sm font-medium text-[#3c3943]">Altklausuren</h2>
                      <span className="text-red-500 text-xs">*</span>
                    </div>
                    <UploadZone
                      type="exam"
                      files={examPendingFiles}
                      onFilesChange={setExamPendingFiles}
                      maxFiles={10}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-medium text-[#3c3943]">Vorlesungskontext</h2>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div
                          onClick={() =>
                            setState((s) => ({ ...s, includeSlides: !s.includeSlides }))
                          }
                          className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer ${
                            state.includeSlides ? 'bg-[#6b8dff]' : 'bg-[#d6d1c8]'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                              state.includeSlides ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </div>
                        <span className="text-xs text-[#7d7785]">Kontext einbeziehen</span>
                      </label>
                    </div>
                    {state.includeSlides && (
                      <div className="mb-3 flex rounded-xl overflow-hidden border border-[#d8d2c8] bg-white/65">
                        <button
                          onClick={() => setState((s) => ({ ...s, lectureContextMode: 'summary' }))}
                          className={`flex-1 px-3 py-2 text-xs transition-all ${
                            state.lectureContextMode === 'summary'
                              ? 'bg-[#6b8dff] text-white'
                              : 'text-[#6f6a78] hover:text-[#19161d]'
                          }`}
                        >
                          Themen-Zusammenfassung
                        </button>
                        <button
                          onClick={() => setState((s) => ({ ...s, lectureContextMode: 'pdfs' }))}
                          className={`flex-1 px-3 py-2 text-xs transition-all ${
                            state.lectureContextMode === 'pdfs'
                              ? 'bg-[#6b8dff] text-white'
                              : 'text-[#6f6a78] hover:text-[#19161d]'
                          }`}
                        >
                          Folien-PDFs
                        </button>
                      </div>
                    )}

                    {state.includeSlides && state.lectureContextMode === 'summary' ? (
                      <div className="app-surface rounded-[1.4rem] p-4">
                        <p className="text-sm text-[#4a4651] mb-2">
                          Empfohlener Standard-Flow: Kopiere den Master-Prompt, füge ihn zusammen mit deinen Vorlesungsfolien in einen LLM-Chat ein und kopiere die kompakte Themen-Zusammenfassung hier zurück hinein.
                        </p>
                        <div className="mb-4 space-y-2 rounded-[1.1rem] bg-[#f8f4ee] p-4">
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#7b7685]">Anleitung</p>
                          <p className="text-sm text-[#4a4651]">1. `Master-Prompt kopieren` klicken</p>
                          <p className="text-sm text-[#4a4651]">2. Prompt plus Vorlesungsfolien in einen LLM-Chat einfügen</p>
                          <p className="text-sm text-[#4a4651]">3. Die kompakte Antwort unten einfügen</p>
                          <button
                            type="button"
                            onClick={handleCopyLecturePrompt}
                            className="app-secondary-btn mt-2 w-full rounded-xl px-4 py-2 text-sm transition-all duration-200"
                          >
                            Master-Prompt kopieren
                          </button>
                        </div>
                        <textarea
                          value={state.lectureContextText}
                          onChange={(e) => setState((s) => ({ ...s, lectureContextText: e.target.value }))}
                          placeholder="Beispiel: Fourier-Reihen, Abtasttheorem, Filterentwurf, Frequenzgang, Bode-Diagramme, Laplace-Transformation, typische Herleitungen und Standardannahmen ..."
                          className="w-full min-h-[12rem] rounded-[1.1rem] border border-[#ddd7cd] bg-[#fcfbf8] px-4 py-3 text-sm leading-7 text-[#2b2830] placeholder:text-[#9b95a2] outline-none focus:border-[#6b8dff]"
                        />
                        <p className="text-xs text-[#8b8593] mt-2">
                          Spart Tokens und reicht oft aus, wenn die relevanten Themen sauber zusammengefasst sind.
                        </p>
                        <button
                          type="button"
                          onClick={() => setState((s) => ({ ...s, lectureContextMode: 'pdfs' }))}
                          className="app-secondary-btn mt-4 w-full rounded-xl px-4 py-2 text-sm transition-all duration-200"
                        >
                          Stattdessen Folien-PDFs hochladen
                        </button>
                      </div>
                    ) : (
                      <>
                        <UploadZone
                          type="slides"
                          files={slidePendingFiles}
                          onFilesChange={setSlidePendingFiles}
                          disabled={!state.includeSlides}
                          maxFiles={20}
                        />
                        <p className="text-xs text-[#908997] mt-2">
                          Alternative: PDFs hochladen, wenn konkrete Formulierungen oder Folienstruktur wichtig sind.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {examPendingFiles.length > 0 && (
                  <TokenEstimator
                    examFiles={approxExamFiles}
                    slideFiles={state.lectureContextMode === 'summary' ? approxSummaryContext : approxSlideFiles}
                    includeSlides={state.includeSlides && (state.lectureContextMode === 'pdfs' ? slidePendingFiles.length > 0 : Boolean(state.lectureContextText.trim()))}
                    examCount={examPendingFiles.length}
                    slideCount={state.lectureContextMode === 'summary' ? (state.lectureContextText.trim() ? 1 : 0) : slidePendingFiles.length}
                    examTextCount={examTextCount}
                    examImageCount={examImageCount}
                    provider={state.provider}
                    analysisModel={state.openrouterAnalysisModel}
                    generationModel={state.openrouterModel}
                  />
                )}

                <div className="app-surface rounded-[1.6rem] p-5">
                  <ConsentCheckbox
                    consentGiven={state.consentGiven}
                    rightsConfirmed={state.rightsConfirmed}
                    onConsentChange={(v) => setState((s) => ({ ...s, consentGiven: v }))}
                    onRightsChange={(v) => setState((s) => ({ ...s, rightsConfirmed: v }))}
                  />
                </div>

                <button
                  onClick={() => {
                    setState((s) => ({
                      ...s,
                      analysisResult: DEMO_ANALYSIS,
                      generatedExam: DEMO_EXAM,
                      currentStep: 4,
                    }));
                  }}
                  className="app-secondary-btn w-full px-4 py-2 text-sm transition-all duration-200"
                >
                  🎭 Demo laden (kein API-Call)
                </button>

                <button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className="app-primary-btn w-full disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {state.isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {state.loadingMessage}
                    </>
                  ) : (
                    'Klausuren analysieren →'
                  )}
                </button>
              </div>
            )}

            {/* Step 2: Analysis */}
            {state.currentStep === 2 && (
              <AnalysisDashboard
                isLoading={state.isLoading}
                result={state.analysisResult}
                examCount={examPendingFiles.length}
                slideCount={slidePendingFiles.length}
                imageFilesCount={examImageCount}
                onContinue={() => setStep(3)}
              />
            )}

            {/* Step 3: Configuration */}
            {state.currentStep === 3 && state.analysisResult && (
              <ExamConfigurator
                analysis={state.analysisResult}
                onGenerate={handleGenerate}
                isLoading={state.isLoading}
                provider={state.provider}
                generationModel={state.openrouterModel}
              />
            )}

            {/* Step 4: Generated exam */}
            {state.currentStep === 4 && (
              <>
                {showTypeTrainer && state.generatedExam ? (
                  <TypeTrainer
                    exam={state.generatedExam}
                    typeName={selectedTypeName}
                    onNewType={() => { setShowTypeTrainer(false); setStep(3); }}
                    onRegenerate={handleRegenerateTrainer}
                    isLoading={trainerLoading}
                  />
                ) : (
                  <GeneratedExamComponent
                    isLoading={state.isLoading}
                    exam={state.generatedExam}
                    error={state.error}
                    onStartSession={() => setShowSession(true)}
                    onNewExam={handleNewExam}
                    onNewAnalysis={handleNewAnalysis}
                    onRetry={handleRetry}
                  />
                )}
              </>
            )}
          </main>
        </div>
      )}
    </>
  );
}
