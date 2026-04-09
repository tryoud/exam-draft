import { useState, useEffect } from 'react';
import type { GeneratedExam, ExamTask, ExamSolution } from '../lib/types';
import { downloadHTML } from '../lib/examExport';
import { ERROR_MESSAGES } from './Toast';

const LOADING_MESSAGES = [
  'Plane Klausurstruktur...',
  'Generiere Aufgaben...',
  'Formuliere Teilaufgaben...',
  'Erstelle Musterlösungen...',
  'Fertigstellung...',
];

interface GeneratedExamProps {
  isLoading: boolean;
  exam: GeneratedExam | null;
  error?: string | null;
  onStartSession: () => void;
  onNewExam: () => void;
  onNewAnalysis: () => void;
  onRetry?: () => void;
}

// ── Markdown content renderer (handles tables) ────────────────────────────────

/** Render inline markdown: **bold** and `code` */
function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="font-semibold text-[#19161d]">{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className="bg-[#ede8df] rounded px-1 text-[#19161d]">{part.slice(1, -1)}</code>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MarkdownContent({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .filter((l) => !/^\s*\|[\s\-:|]+\|\s*$/.test(l))
        .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      if (rows.length > 0) {
        const [header, ...body] = rows;
        elements.push(
          <table key={`tbl-${i}`} className="border-collapse text-sm my-3 w-full">
            <thead>
              <tr>
                {header.map((cell, j) => (
                  <th key={j} className="border border-[#ddd7cd] px-3 py-1.5 text-left text-[#111111] bg-[#f0ebe2] font-semibold">
                    <InlineMarkdown text={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-[#faf8f4]'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-[#e4ddd1] px-3 py-1.5 text-[#19161d]">
                      <InlineMarkdown text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
    } else {
      let block = '';
      while (i < lines.length && !lines[i].trim().startsWith('|')) {
        block += (block ? '\n' : '') + lines[i];
        i++;
      }
      if (block.trim()) {
        elements.push(
          <span key={`txt-${i}`} className="whitespace-pre-wrap">
            <InlineMarkdown text={block} />
          </span>
        );
      }
    }
  }

  return (
    <div className={`font-mono text-sm text-[#4a4450] leading-relaxed ${className}`}>
      {elements}
    </div>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({ task, solution }: { task: ExamTask; solution?: ExamSolution }) {
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div className="app-surface rounded-[1.5rem] overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-[#d0c8bb]">#{task.number}</span>
            <div>
              <h3 className="font-semibold text-[#111111]">{task.title}</h3>
              <div className="flex gap-2 mt-1">
                <span className="text-xs bg-white/75 border border-[#ddd7cd] text-[#6f6a78] rounded-full px-2.5 py-1">
                  {task.type}
                </span>
                <span className="text-xs bg-[#eef2ff] text-[#2f5bd2] border border-[#d8e1ff] rounded-full px-2.5 py-1">
                  {task.points} Punkte
                </span>
              </div>
            </div>
          </div>
        </div>

        {task.hasDiagram && task.diagramDescription && (
          <div className="mb-4 bg-[#f3f6ff] border border-[#d8e1ff] rounded-[1.2rem] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#2f5bd2] text-sm">📊 Diagramm-Aufgabe</span>
            </div>
            <pre className="text-xs text-[#4a4450] font-mono whitespace-pre-wrap leading-relaxed">
              {task.diagramDescription}
            </pre>
          </div>
        )}

        <MarkdownContent text={task.description} className="mb-4" />

        {task.options && Object.keys(task.options).length > 0 && (
          <div className="grid gap-2 mb-4 sm:grid-cols-2">
            {Object.entries(task.options).map(([key, val]) => (
              <div
                key={key}
                className="flex items-start gap-2.5 bg-white/60 border border-[#e4ddd1] rounded-xl px-3 py-2 text-sm text-[#4a4450]"
              >
                <span className="font-bold text-[#2f5bd2] shrink-0 w-5">{key}</span>
                <span className="font-mono text-xs leading-relaxed">{val}</span>
              </div>
            ))}
          </div>
        )}

        {task.subTasks && task.subTasks.length > 0 && (
          <div className="space-y-2 mb-4 pl-4 border-l-2 border-[#ddd7cd]">
            {task.subTasks.map((sub) => (
              <div key={sub.label} className="flex items-start gap-3">
                <span className="text-sm font-semibold text-[#2f5bd2] shrink-0">
                  {sub.label})
                </span>
                <div className="flex-1">
                  <span className="text-sm text-[#4a4450] font-mono">{sub.text}</span>
                  <span className="ml-2 text-xs text-[#8b8593]">({sub.points} Pkt)</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {task.hints && task.hints.length > 0 && (
          <div>
            <button
              onClick={() => setShowHints(!showHints)}
              className="text-xs text-[#7d7785] hover:text-[#4c4754] transition-colors"
            >
              {showHints ? '▲ Hinweise ausblenden' : `▼ ${task.hints.length} Hinweis${task.hints.length !== 1 ? 'e' : ''} anzeigen`}
            </button>
            {showHints && (
              <ul className="mt-2 space-y-1">
                {task.hints.map((hint, i) => (
                  <li key={i} className="text-xs text-[#a56c17] flex gap-2">
                    <span>💡</span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {solution && (
        <div className="border-t border-[#e4ddd1]">
          <button
            onClick={() => setShowSolution(!showSolution)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm text-[#7d7785] hover:text-[#4c4754] hover:bg-white/60 transition-all"
          >
            <span>{showSolution ? '▲ Lösung ausblenden' : '▼ Musterlösung anzeigen'}</span>
          </button>
          {showSolution && (
            <div className="px-5 pb-5 space-y-4 animate-slide-up">
              <MarkdownContent
                text={solution.solution}
                className="bg-[#fcfbf8] border border-[#e4ddd1] rounded-[1.2rem] p-4"
              />
              {solution.keyPoints.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#7d7785] mb-2">Kernpunkte:</p>
                  <ul className="space-y-1">
                    {solution.keyPoints.map((kp, i) => (
                      <li key={i} className="text-xs text-[#2e7d4f] flex gap-2">
                        <span>✓</span>
                        <span>{kp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {solution.commonMistakes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#7d7785] mb-2">Häufige Fehler:</p>
                  <ul className="space-y-1">
                    {solution.commonMistakes.map((m, i) => (
                      <li key={i} className="text-xs text-[#b44a35] flex gap-2">
                        <span>✗</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GeneratedExamComponent({
  isLoading,
  exam,
  error,
  onStartSession,
  onNewExam,
  onNewAnalysis,
  onRetry,
}: GeneratedExamProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [showNewAnalysisConfirm, setShowNewAnalysisConfirm] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-3 text-sm text-[#7d7785]">
            <div className="w-4 h-4 border-2 border-[#6b8dff] border-t-transparent rounded-full animate-spin" />
            {LOADING_MESSAGES[msgIndex]}
          </div>
          <p className="text-xs text-[#9b95a2] mt-2">Die Generierung kann 1–2 Minuten dauern.</p>
        </div>
        <div className="app-surface rounded-[1.8rem] p-6">
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="h-8 w-48 rounded-full bg-[#ebe5da] animate-pulse" />
              <div className="h-20 rounded-[1.2rem] bg-[#f3eee5] animate-pulse" />
              <div className="h-20 rounded-[1.2rem] bg-[#f3eee5] animate-pulse" />
              <div className="h-20 rounded-[1.2rem] bg-[#f3eee5] animate-pulse" />
            </div>
            <div className="rounded-[1.4rem] border border-[#e4ddd1] bg-[#fcfbf8] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8b8593] mb-4">Fortschritt</p>
              <div className="space-y-3">
                {LOADING_MESSAGES.map((message, index) => (
                  <div
                    key={message}
                    className={`flex items-center gap-3 rounded-full px-3 py-2 transition-all ${
                      index === msgIndex ? 'bg-[#eef2ff] text-[#2f5bd2]' : 'bg-[#f5f1e9] text-[#8b8593]'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${index <= msgIndex ? 'bg-[#6b8dff]' : 'bg-[#d8d2c8]'}`} />
                    <span className="text-sm">{message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && !exam) {
    return (
      <div className="app-surface rounded-[1.8rem] p-8 text-center space-y-4 animate-slide-up">
        <div className="text-[#b44a35] text-3xl">⚠</div>
        <div>
          <h3 className="text-[#111111] font-semibold mb-1">Generierung fehlgeschlagen</h3>
          <p className="text-sm text-[#7d7785]">
            {ERROR_MESSAGES[error ?? ''] ?? ERROR_MESSAGES['API_ERROR']}
          </p>
          <p className="text-xs text-[#8b8593] mt-2">
            Tokens für diesen Versuch wurden möglicherweise bereits verbraucht.
          </p>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          {onRetry && (
            <button
              onClick={onRetry}
              className="app-primary-btn text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            >
              ↻ Erneut versuchen
            </button>
          )}
          <button
            onClick={onNewExam}
            className="app-secondary-btn px-4 py-2 rounded-xl text-sm transition-all duration-200"
          >
            ← Zurück zur Konfiguration
          </button>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  const solutionMap = new Map(exam.solution.map((s) => [s.taskId, s]));

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="app-surface rounded-[1.8rem] p-6">
        <h1 className="text-xl font-bold text-[#111111] mb-2">{exam.title}</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs bg-white/75 border border-[#ddd7cd] text-[#6f6a78] rounded-full px-3 py-1.5">
            ⏱ {exam.duration} Min
          </span>
          <span className="text-xs bg-white/75 border border-[#ddd7cd] text-[#6f6a78] rounded-full px-3 py-1.5">
            📊 {exam.totalPoints} Punkte
          </span>
          <span className="text-xs bg-white/75 border border-[#ddd7cd] text-[#6f6a78] rounded-full px-3 py-1.5">
            📝 {exam.tasks.length} Aufgaben
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onStartSession}
            className="app-primary-btn text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          >
            Jetzt üben →
          </button>
          <div className="w-px h-5 bg-[#ddd7cd] mx-1" />
          <button
            onClick={() => downloadHTML(exam, false)}
            className="app-secondary-btn px-4 py-2.5 rounded-xl text-sm transition-all duration-200"
          >
            ⬇ Klausur
          </button>
          <button
            onClick={() => downloadHTML(exam, true)}
            className="app-secondary-btn px-4 py-2.5 rounded-xl text-sm transition-all duration-200"
          >
            ⬇ Mit Lösung
          </button>
          <div className="w-px h-5 bg-[#ddd7cd] mx-1" />
          <button
            onClick={onNewExam}
            className="app-secondary-btn px-4 py-2.5 rounded-xl text-sm transition-all duration-200"
          >
            Neue Klausur
          </button>
          <button
            onClick={() => setShowNewAnalysisConfirm(true)}
            className="app-secondary-btn px-4 py-2.5 rounded-xl text-sm transition-all duration-200"
          >
            📊 Neue Analyse
          </button>
        </div>
      </div>

      {showNewAnalysisConfirm && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="app-surface rounded-[1.6rem] p-6 max-w-sm w-full">
            <h3 className="text-[#111111] font-semibold mb-2">Neue Analyse starten?</h3>
            <p className="text-sm text-[#7d7785] mb-4">
              Alle hochgeladenen Dateien und Ergebnisse werden verworfen.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onNewAnalysis}
                className="flex-1 bg-[#b44a35] hover:bg-[#9e3f2c] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Ja, neue Analyse
              </button>
              <button
                onClick={() => setShowNewAnalysisConfirm(false)}
                className="flex-1 app-secondary-btn px-4 py-2 rounded-xl text-sm transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {exam.tasks.map((task) => (
          <TaskCard key={task.id} task={task} solution={solutionMap.get(task.id)} />
        ))}
      </div>

      {(exam.includedTypes.length > 0 || exam.excludedTypes.length > 0) && (
        <div className="app-surface rounded-[1.6rem] p-5">
          <h3 className="text-sm font-medium text-[#57515e] mb-3">Aufgabenzusammensetzung</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {exam.includedTypes.length > 0 && (
              <div>
                <p className="text-xs text-[#7d7785] mb-2">✅ Enthalten</p>
                <div className="flex flex-wrap gap-1">
                  {exam.includedTypes.map((t) => (
                    <span key={t} className="text-xs bg-[#eef8f1] text-[#2e7d4f] border border-[#cce6d5] rounded-full px-2.5 py-1">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {exam.excludedTypes.length > 0 && (
              <div>
                <p className="text-xs text-[#7d7785] mb-2">⏭ Nicht enthalten</p>
                <div className="flex flex-wrap gap-1">
                  {exam.excludedTypes.map((t) => (
                    <span key={t} className="text-xs bg-[#f5f1e9] text-[#7d7785] border border-[#ddd7cd] rounded-full px-2.5 py-1">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
