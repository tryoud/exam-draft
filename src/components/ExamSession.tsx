import { useState, useEffect, useRef } from 'react';
import type { GeneratedExam, ExamTask, ExamSolution, GradingResult } from '../lib/types';
import { gradeExam, gradeExamClientSide } from '../lib/anthropic';
import { showError } from './Toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function calcGrade(pct: number): string {
  if (pct >= 95) return '1,0';
  if (pct >= 90) return '1,3';
  if (pct >= 85) return '1,7';
  if (pct >= 80) return '2,0';
  if (pct >= 75) return '2,3';
  if (pct >= 70) return '2,7';
  if (pct >= 65) return '3,0';
  if (pct >= 60) return '3,3';
  if (pct >= 55) return '3,7';
  if (pct >= 50) return '4,0';
  return '5,0';
}

function gradeColor(g: string): string {
  const n = parseFloat(g.replace(',', '.'));
  if (n <= 1.3) return 'text-[#2e7d4f]';
  if (n <= 2.3) return 'text-[#2f5bd2]';
  if (n <= 3.3) return 'text-[#a56c17]';
  if (n <= 4.0) return 'text-[#c47b21]';
  return 'text-[#b44a35]';
}

// ── MarkdownContent (minimal — handles tables) ────────────────────────────────

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i]); i++; }
      const rows = tableLines
        .filter((l) => !/^\s*\|[\s\-:|]+\|\s*$/.test(l))
        .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      if (rows.length > 0) {
        const [header, ...body] = rows;
        elements.push(
          <table key={`tbl-${i}`} className="border-collapse text-sm my-3 w-full">
            <thead><tr>{header.map((c, j) => <th key={j} className="border border-[#ddd7cd] px-3 py-1.5 text-left bg-[#f0ebe2] text-[#111111] font-semibold">{renderInline(c)}</th>)}</tr></thead>
            <tbody>{body.map((r, ri) => <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-[#faf8f4]'}>{r.map((c, ci) => <td key={ci} className="border border-[#e4ddd1] px-3 py-1.5 text-[#19161d]">{renderInline(c)}</td>)}</tr>)}</tbody>
          </table>
        );
      }
    } else {
      let block = '';
      while (i < lines.length && !lines[i].trim().startsWith('|')) { block += (block ? '\n' : '') + lines[i]; i++; }
      if (block.trim()) elements.push(<span key={`txt-${i}`} className="whitespace-pre-wrap">{renderInline(block)}</span>);
    }
  }
  return <div className="font-mono text-sm text-[#4a4450] leading-relaxed">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-[#19161d]">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="bg-[#ede8df] rounded px-1 text-[#19161d]">{part.slice(1, -1)}</code>;
    return part;
  });
}

// ── Timer ring ────────────────────────────────────────────────────────────────

function TimerRing({ secondsLeft, totalSeconds, paused }: { secondsLeft: number; totalSeconds: number; paused: boolean }) {
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 1;
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const warning = secondsLeft <= 300;
  const urgent  = secondsLeft <= 60;
  const color = urgent ? '#ef4444' : warning ? '#f59e0b' : '#3b82f6';

  return (
    <div className={`relative flex items-center justify-center ${urgent && !paused ? 'animate-pulse' : ''}`}>
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#ddd7cd" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      {/* Time text centered inside the ring */}
      <span
        className="absolute text-[11px] font-mono font-bold leading-none"
        style={{ color: urgent ? '#ef4444' : warning ? '#a56c17' : '#111111' }}
      >
        {formatTime(secondsLeft)}
      </span>
    </div>
  );
}

// ── Task input card (write mode) ──────────────────────────────────────────────

function TaskInputCard({
  task,
  answer,
  onAnswer,
}: {
  task: ExamTask;
  answer: string;
  onAnswer: (v: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMC = task.options && Object.keys(task.options).length > 0;

  function autoResize() {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  }

  return (
    <div className="app-surface rounded-[1.5rem] overflow-hidden mb-4">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl font-bold text-[#d0c8bb] shrink-0">#{task.number}</span>
          <div>
            <h3 className="font-semibold text-[#111111]">{task.title}</h3>
            <div className="flex gap-2 mt-0.5">
              <span className="text-xs text-[#7d7785] bg-white/75 border border-[#ddd7cd] rounded-full px-2 py-0.5">{task.type}</span>
              <span className="text-xs text-[#2f5bd2] bg-[#eef2ff] border border-[#d8e1ff] rounded-full px-2 py-0.5">{task.points} Pkt</span>
            </div>
          </div>
        </div>

        {task.hasDiagram && task.diagramDescription && (
          <div className="mb-3 bg-[#f3f6ff] border border-[#d8e1ff] rounded-[1.2rem] p-3">
            <p className="text-xs text-[#2f5bd2] mb-1">📊 Diagramm-Aufgabe</p>
            <pre className="text-xs text-[#4a4450] font-mono whitespace-pre-wrap">{task.diagramDescription}</pre>
          </div>
        )}

        <MarkdownContent text={task.description} />

        {/* MC options (display only — selection below) */}
        {isMC && task.options && (
          <div className="grid gap-2 mt-3 sm:grid-cols-2">
            {Object.entries(task.options).map(([key, val]) => {
              const selected = answer === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onAnswer(selected ? '' : key)}
                  className={`flex items-start gap-2.5 text-left rounded-xl px-3 py-2.5 text-sm border transition-all ${
                    selected
                      ? 'bg-[#eef2ff] border-[#6b8dff] text-[#2f5bd2]'
                      : 'bg-white/60 border-[#ddd7cd] text-[#4a4450] hover:border-[#b5beff]'
                  }`}
                >
                  <span className={`font-bold shrink-0 w-5 ${selected ? 'text-[#2f5bd2]' : 'text-[#8b8593]'}`}>{key}</span>
                  <span className="font-mono text-xs leading-relaxed">{val}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Open answer textarea */}
        {!isMC && (
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => { onAnswer(e.target.value); autoResize(); }}
            placeholder="Deine Antwort hier eingeben..."
            rows={4}
            className="w-full mt-3 bg-[#fcfbf8] border border-[#ddd7cd] focus:border-[#6b8dff] focus:outline-none rounded-[1.1rem] px-3 py-2 text-[#19161d] text-sm font-mono resize-none transition-colors"
          />
        )}

        {/* Sub-tasks */}
        {!isMC && task.subTasks && task.subTasks.length > 0 && (
          <div className="mt-2 space-y-1 pl-3 border-l-2 border-[#ddd7cd]">
            {task.subTasks.map((st) => (
              <p key={st.label} className="text-xs text-[#7d7785]">
                <span className="text-[#2f5bd2] font-semibold">{st.label})</span> {st.text}{' '}
                <span className="text-[#b1abb4]">({st.points} Pkt)</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Task review card (after submission) ───────────────────────────────────────

function TaskReviewCard({
  task,
  answer,
  solution,
  selfScore,
  onSelfScore,
  aiFeedback,
}: {
  task: ExamTask;
  answer: string;
  solution?: ExamSolution;
  selfScore: number;
  onSelfScore: (v: number) => void;
  aiFeedback?: { earnedPoints: number; maxPoints: number; feedback: string; correctPoints: string[]; missingPoints: string[] } | null;
}) {
  const [showSolution, setShowSolution] = useState(false);
  const isMC = task.options && Object.keys(task.options).length > 0;
  const correct = isMC ? answer === solution?.correctOption?.toUpperCase() : null;

  return (
    <div className="app-surface rounded-[1.5rem] overflow-hidden mb-4">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-[#d0c8bb] shrink-0">#{task.number}</span>
            <div>
              <h3 className="font-semibold text-[#111111]">{task.title}</h3>
              <div className="flex gap-2 mt-0.5">
                <span className="text-xs text-[#7d7785] bg-white/75 border border-[#ddd7cd] rounded-full px-2 py-0.5">{task.type}</span>
                <span className="text-xs text-[#2f5bd2] bg-[#eef2ff] border border-[#d8e1ff] rounded-full px-2 py-0.5">{task.points} Pkt</span>
              </div>
            </div>
          </div>
          {/* MC result badge */}
          {isMC && correct !== null && (
            <span className={`text-xs font-medium rounded-full px-3 py-1 shrink-0 ${correct ? 'bg-[#eef8f1] text-[#2e7d4f] border border-[#cce6d5]' : 'bg-[#fff1ed] text-[#b44a35] border border-[#efc2b7]'}`}>
              {correct ? '✓ Richtig' : '✗ Falsch'}
            </span>
          )}
        </div>

        {/* MC options with correct answer highlighted */}
        {isMC && task.options && (
          <div className="grid gap-2 mb-3 sm:grid-cols-2">
            {Object.entries(task.options).map(([key, val]) => {
              const isSelected = answer === key;
              const isCorrect = key === solution?.correctOption?.toUpperCase();
              let cls = 'bg-white/60 border-[#ddd7cd] text-[#8b8593]';
              if (isCorrect) cls = 'bg-[#eef8f1] border-[#cce6d5] text-[#2e7d4f]';
              else if (isSelected && !isCorrect) cls = 'bg-[#fff1ed] border-[#efc2b7] text-[#b44a35]';
              return (
                <div key={key} className={`flex items-start gap-2.5 rounded-xl px-3 py-2 border text-sm ${cls}`}>
                  <span className="font-bold shrink-0 w-5">{key}</span>
                  <span className="font-mono text-xs leading-relaxed">{val}</span>
                  {isCorrect && <span className="ml-auto shrink-0">✓</span>}
                  {isSelected && !isCorrect && <span className="ml-auto shrink-0">✗</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Open answer + solution side by side */}
        {!isMC && (
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-[#7d7785] mb-1.5">Deine Antwort</p>
              <div className="bg-[#fcfbf8] border border-[#e4ddd1] rounded-[1.1rem] p-3 text-sm text-[#4a4450] font-mono whitespace-pre-wrap min-h-[70px]">
                {answer || <span className="text-[#b1abb4] italic">Keine Antwort</span>}
              </div>
            </div>
            <div>
              <p className="text-xs text-[#7d7785] mb-1.5">Musterlösung</p>
              {solution ? (
                <div>
                  {showSolution ? (
                    <div className="bg-[#eef8f1] border border-[#cce6d5] rounded-[1.1rem] p-3 text-sm text-[#3e3944] font-mono whitespace-pre-wrap">
                      {solution.solution}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSolution(true)}
                      className="w-full h-[70px] bg-[#eef8f1] border border-[#cce6d5] rounded-[1.1rem] text-sm text-[#2e7d4f] hover:bg-[#e3f4e9] transition-colors flex items-center justify-center gap-2"
                    >
                      <span>👁</span> Lösung anzeigen
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-[#fcfbf8] border border-[#e4ddd1] rounded-[1.1rem] p-3 min-h-[70px] flex items-center justify-center">
                  <span className="text-xs text-[#b1abb4]">Keine Lösung verfügbar</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MC solution explanation (collapsible) */}
        {isMC && solution && (
          <div className="mb-3">
            {showSolution ? (
              <div className="bg-[#eef8f1] border border-[#cce6d5] rounded-[1.1rem] p-3 text-sm text-[#3e3944] font-mono whitespace-pre-wrap">
                <span className="font-semibold text-[#2e7d4f]">Richtige Antwort: {solution.correctOption} — </span>
                {solution.solution}
              </div>
            ) : (
              <button
                onClick={() => setShowSolution(true)}
                className="text-xs text-[#2e7d4f] hover:text-[#1d5e3a] transition-colors"
              >
                ▼ Begründung anzeigen
              </button>
            )}
          </div>
        )}

        {/* Self-scoring (open tasks only) */}
        {!isMC && (
          <div className="flex items-center gap-3 pt-2 border-t border-[#e4ddd1]">
            <span className="text-xs text-[#7d7785]">Selbstbewertung:</span>
            <input
              type="number"
              min={0}
              max={task.points}
              value={selfScore}
              onChange={(e) => onSelfScore(Math.min(task.points, Math.max(0, Number(e.target.value))))}
              className="w-14 bg-[#fcfbf8] border border-[#ddd7cd] focus:border-[#6b8dff] focus:outline-none rounded-lg px-2 py-1 text-sm text-center font-mono"
            />
            <span className="text-xs text-[#8b8593]">/ {task.points} Punkte</span>
          </div>
        )}

        {/* AI feedback (shown after KI-Analyse) */}
        {aiFeedback && (
          <div className="mt-3 p-3 bg-[#f3f0ff] border border-[#d8d0ff] rounded-[1.1rem] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#5340a0]">KI-Bewertung</span>
              <span className={`text-sm font-bold ${aiFeedback.earnedPoints >= aiFeedback.maxPoints * 0.5 ? 'text-[#2e7d4f]' : 'text-[#b44a35]'}`}>
                {aiFeedback.earnedPoints}/{aiFeedback.maxPoints} Pkt
              </span>
            </div>
            <p className="text-xs text-[#4a4450]">{aiFeedback.feedback}</p>
            {aiFeedback.correctPoints.length > 0 && (
              <ul className="space-y-0.5">
                {aiFeedback.correctPoints.map((p, i) => <li key={i} className="text-xs text-[#2e7d4f] flex gap-1.5"><span>✓</span>{p}</li>)}
              </ul>
            )}
            {aiFeedback.missingPoints.length > 0 && (
              <ul className="space-y-0.5">
                {aiFeedback.missingPoints.map((p, i) => <li key={i} className="text-xs text-[#b44a35] flex gap-1.5"><span>✗</span>{p}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Phase = 'picker' | 'running' | 'review';

interface ExamSessionProps {
  exam: GeneratedExam;
  onClose: () => void;
  onNewExam: () => void;
}

export default function ExamSession({ exam, onClose, onNewExam }: ExamSessionProps) {
  // Lock body scroll while the overlay is open — prevents the page scrollbar
  // from peeking through the fixed inset-0 container on the right edge.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const [phase, setPhase] = useState<Phase>('picker');
  const [examMode, setExamMode] = useState<'exam' | 'practice'>('exam');
  const [customMinutes, setCustomMinutes] = useState(exam.duration);
  const [secondsLeft, setSecondsLeft] = useState(exam.duration * 60);
  const [paused, setPaused] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(exam.tasks.map((t) => [t.id, '']))
  );
  const [selfScores, setSelfScores] = useState<Record<string, number>>(
    Object.fromEntries(exam.tasks.map((t) => [t.id, 0]))
  );
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [isGrading, setIsGrading] = useState(false);

  const isMCExam = exam.tasks.every((t) => t.options && Object.keys(t.options).length > 0);
  const solutionMap = new Map(exam.solution.map((s) => [s.taskId, s]));
  const totalSeconds = customMinutes * 60;

  // Timer
  useEffect(() => {
    if (phase !== 'running' || examMode !== 'exam' || paused || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [phase, examMode, paused, secondsLeft]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (secondsLeft === 0 && phase === 'running' && examMode === 'exam') {
      handleSubmit();
    }
  }, [secondsLeft]);

  function startSession(mode: 'exam' | 'practice') {
    setExamMode(mode);
    setSecondsLeft(customMinutes * 60);
    setAnswers(Object.fromEntries(exam.tasks.map((t) => [t.id, ''])));
    setSelfScores(Object.fromEntries(exam.tasks.map((t) => [t.id, 0])));
    setGradingResult(null);
    setPaused(false);
    setPhase('running');
  }

  function handleSubmit() {
    setPaused(true);
    setShowConfirm(false);
    setPhase('review');
    // Auto-fill self-scores for MC (correct = full points, wrong = 0)
    if (isMCExam) {
      const mcScores = Object.fromEntries(
        exam.tasks.map((t) => {
          const sol = solutionMap.get(t.id);
          const correct = answers[t.id] === sol?.correctOption?.toUpperCase();
          return [t.id, correct ? t.points : 0];
        })
      );
      setSelfScores(mcScores);
    }
  }

  async function requestAIGrading() {
    setIsGrading(true);
    try {
      const answerList = exam.tasks.map((t) => ({ taskId: t.id, answer: answers[t.id] ?? '' }));
      const instant = gradeExamClientSide(exam, answerList);
      const result = instant ?? await gradeExam(exam, answerList);
      setGradingResult(result);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'API_ERROR');
    } finally {
      setIsGrading(false);
    }
  }

  // Scores
  const totalSelf = isMCExam
    ? Object.values(selfScores).reduce((a, b) => a + b, 0)
    : Object.values(selfScores).reduce((a, b) => a + b, 0);
  const mcTotalEarned = isMCExam
    ? exam.tasks.filter((t) => answers[t.id] === solutionMap.get(t.id)?.correctOption?.toUpperCase()).reduce((s, t) => s + t.points, 0)
    : null;
  const displayScore = gradingResult?.totalEarned ?? (isMCExam ? mcTotalEarned : totalSelf) ?? 0;
  const displayPct = exam.totalPoints > 0 ? Math.round((displayScore / exam.totalPoints) * 100) : 0;
  const grade = calcGrade(displayPct);

  const answeredCount = Object.values(answers).filter((a) => a.trim().length > 0).length;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 1;

  // ── Picker ──────────────────────────────────────────────────────────────────
  if (phase === 'picker') {
    return (
      <div className="fixed inset-0 z-50 app-body overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#f7f3ea]/95 backdrop-blur-sm border-b border-[#e4ddd1] h-14 flex items-center px-4">
          <button onClick={onClose} className="text-[#7d7785] hover:text-[#111111] text-sm transition-colors">← Zurück</button>
        </div>

        <div className="max-w-md mx-auto px-4 py-10">
          {/* Exam info */}
          <p className="text-xs text-[#8b8593] uppercase tracking-widest mb-2">Probeklausur</p>
          <h1 className="text-2xl font-bold text-[#111111] mb-1 leading-tight">{exam.title}</h1>
          <div className="flex gap-3 mb-10 text-xs text-[#7d7785]">
            <span>⏱ {exam.duration} Min</span>
            <span>·</span>
            <span>{exam.totalPoints} Punkte</span>
            <span>·</span>
            <span>{exam.tasks.length} Aufgaben</span>
          </div>

          {/* Mode options */}
          <div className="space-y-3">
            {/* Klausur-Modus */}
            <div className="app-surface rounded-[1.5rem] overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="font-semibold text-[#111111] mb-0.5">Klausur-Modus</h2>
                    <p className="text-xs text-[#8b8593]">Schreibe unter Zeitdruck — wie in der echten Prüfung.</p>
                  </div>
                  <span className="text-2xl shrink-0 mt-0.5">⏱</span>
                </div>

                {/* Time adjustment */}
                <div className="flex items-center gap-2 mb-4 pl-0.5">
                  <span className="text-xs text-[#7d7785]">Zeit:</span>
                  <input
                    type="number"
                    min={5}
                    max={360}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Math.max(5, Math.min(360, Number(e.target.value))))}
                    className="w-16 bg-[#fcfbf8] border border-[#ddd7cd] focus:border-[#6b8dff] focus:outline-none rounded-lg px-2 py-1.5 text-sm text-center font-mono"
                  />
                  <span className="text-xs text-[#7d7785]">Minuten</span>
                  {customMinutes !== exam.duration && (
                    <button
                      onClick={() => setCustomMinutes(exam.duration)}
                      className="ml-auto text-xs text-[#8b8593] hover:text-[#4c4754] transition-colors"
                    >
                      ↺ zurücksetzen
                    </button>
                  )}
                </div>

                <button
                  onClick={() => startSession('exam')}
                  className="app-primary-btn w-full text-white py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                  Starten →
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 px-1">
              <div className="flex-1 h-px bg-[#e4ddd1]" />
              <span className="text-xs text-[#b1abb4]">oder</span>
              <div className="flex-1 h-px bg-[#e4ddd1]" />
            </div>

            {/* Übungs-Modus */}
            <button
              onClick={() => startSession('practice')}
              className="w-full app-surface rounded-[1.5rem] p-5 text-left hover:bg-white/70 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-[#111111] mb-0.5 group-hover:text-[#2f5bd2] transition-colors">Übungs-Modus</h2>
                  <p className="text-xs text-[#8b8593]">Kein Timer, kein Druck — eigenes Tempo, Lösungen jederzeit.</p>
                </div>
                <span className="text-2xl shrink-0 mt-0.5">📖</span>
              </div>
              <p className="mt-3 text-xs text-[#2f5bd2] group-hover:underline">Los geht's →</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Running ──────────────────────────────────────────────────────────────────
  if (phase === 'running') {
    return (
      <div className="fixed inset-0 z-50 app-body flex flex-col">
        {/* Header */}
        <div className={`border-b border-[#e4ddd1] bg-[#f7f3ea]/95 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 ${examMode === 'exam' ? 'h-16' : 'h-14'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowConfirm(true)} className="text-[#7d7785] hover:text-[#111111] text-sm transition-colors">← Zurück</button>
            <span className="text-[#c4bcaf]">|</span>
            <span className="text-sm font-medium text-[#111111]">
              {examMode === 'exam' ? 'Klausur schreiben' : 'Übungs-Modus'}
            </span>
          </div>

          {examMode === 'exam' ? (
            <div className="flex items-center gap-3">
              <TimerRing secondsLeft={secondsLeft} totalSeconds={totalSeconds} paused={paused} />
              <button
                onClick={() => setPaused(!paused)}
                className="text-xs text-[#6f6a78] hover:text-[#111111] border border-[#ddd7cd] bg-white/60 px-3 py-1.5 rounded-full transition-colors"
              >
                {paused ? '▶' : '⏸'}
              </button>
            </div>
          ) : (
            <span className="text-xs text-[#8b8593]">{answeredCount}/{exam.tasks.length} beantwortet</span>
          )}
        </div>

        {/* Paused overlay */}
        {paused && examMode === 'exam' && (
          <div className="absolute inset-0 z-40 bg-[#f7f3ea]/90 backdrop-blur-sm flex items-center justify-center">
            <div className="app-surface rounded-[1.8rem] p-8 text-center max-w-xs mx-4">
              <p className="text-4xl mb-3">⏸</p>
              <p className="text-lg font-bold text-[#111111] mb-1">Pausiert</p>
              <p className="text-sm text-[#7d7785] mb-5">Verbleibend: {formatTime(secondsLeft)}</p>
              <button onClick={() => setPaused(false)} className="app-primary-btn text-white w-full py-2.5 rounded-xl font-medium">▶ Weiter</button>
            </div>
          </div>
        )}

        {/* Tasks */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {exam.tasks.map((task) => (
              <TaskInputCard
                key={task.id}
                task={task}
                answer={answers[task.id]}
                onAnswer={(v) => setAnswers((prev) => ({ ...prev, [task.id]: v }))}
              />
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="h-14 border-t border-[#e4ddd1] bg-[#f7f3ea]/95 backdrop-blur-sm flex items-center justify-center px-4 shrink-0">
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-[#fff1ed] hover:bg-[#ffe7e0] text-[#b44a35] border border-[#efc2b7] px-6 py-2 rounded-xl text-sm font-medium transition-all"
          >
            {examMode === 'exam' ? 'Prüfung abgeben' : 'Abschließen & Lösungen ansehen'}
          </button>
        </div>

        {/* Confirm dialog */}
        {showConfirm && (
          <div className="fixed inset-0 z-60 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="app-surface rounded-[1.6rem] p-6 max-w-sm w-full">
              <h3 className="text-[#111111] font-semibold mb-2">
                {examMode === 'exam' ? 'Prüfung abgeben?' : 'Sitzung beenden?'}
              </h3>
              <p className="text-sm text-[#7d7785] mb-1">
                {answeredCount} von {exam.tasks.length} Aufgaben beantwortet.
              </p>
              {examMode === 'exam' && (
                <p className="text-sm text-[#7d7785] mb-4">Verbleibende Zeit: {formatTime(secondsLeft)}</p>
              )}
              {examMode === 'practice' && <div className="mb-4" />}
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-[#b44a35] hover:bg-[#9e3f2c] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  {examMode === 'exam' ? 'Abgeben' : 'Beenden'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 app-secondary-btn px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  {examMode === 'exam' ? 'Weiter schreiben' : 'Zurück'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Review ───────────────────────────────────────────────────────────────────
  const feedbackMap = new Map(gradingResult?.feedback.map((f) => [f.taskId, f]));
  const passed = parseFloat(grade.replace(',', '.')) <= 4.0;

  return (
    <div className="fixed inset-0 z-50 app-body overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#f7f3ea]/95 backdrop-blur-sm border-b border-[#e4ddd1] h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-[#7d7785] hover:text-[#111111] text-sm transition-colors">← Schließen</button>
          <span className="text-[#c4bcaf]">|</span>
          <span className="text-sm font-medium text-[#111111]">Auswertung</span>
        </div>
        {examMode === 'exam' && (
          <span className="text-xs text-[#8b8593]">Zeit genutzt: {formatTime(totalSeconds - secondsLeft)}</span>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 animate-slide-up">
        {/* Score summary */}
        <div className="app-surface rounded-[1.8rem] p-6 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-center">
              <p className={`text-4xl font-bold ${gradeColor(grade)}`}>{grade}</p>
              <p className="text-xs text-[#7d7785] mt-1">{passed ? 'Bestanden ✓' : 'Nicht bestanden ✗'}</p>
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-[#111111]">{displayScore} / {exam.totalPoints} Punkte</p>
              <p className="text-sm text-[#57515e]">{displayPct}% erreicht</p>
              <div className="mt-2 h-2 bg-[#ebe5da] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${passed ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(displayPct, 100)}%` }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { startSession(examMode); }}
                className="app-secondary-btn px-4 py-2 rounded-xl text-sm transition-colors"
              >
                Nochmal
              </button>
              <button
                onClick={onNewExam}
                className="app-secondary-btn px-4 py-2 rounded-xl text-sm transition-colors"
              >
                Neue Klausur
              </button>
            </div>
          </div>

          {/* KI-Analyse opt-in */}
          {!isMCExam && !gradingResult && (
            <div className="mt-4 pt-4 border-t border-[#e4ddd1] flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#111111]">KI-Analyse anfragen</p>
                <p className="text-xs text-[#8b8593]">Detailliertes Feedback pro Aufgabe · verbraucht Tokens</p>
              </div>
              <button
                onClick={requestAIGrading}
                disabled={isGrading}
                className="app-secondary-btn disabled:opacity-45 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                {isGrading ? (
                  <><div className="w-3.5 h-3.5 border-2 border-[#7d7785]/30 border-t-[#7d7785] rounded-full animate-spin" />Analysiere...</>
                ) : (
                  '✦ KI analysieren lassen'
                )}
              </button>
            </div>
          )}

          {gradingResult && !isMCExam && (
            <div className="mt-4 pt-4 border-t border-[#e4ddd1]">
              <p className="text-xs text-[#2e7d4f] font-medium">✓ KI-Analyse abgeschlossen — {gradingResult.totalEarned}/{gradingResult.totalMax} Punkte</p>
            </div>
          )}
        </div>

        {/* Per-task review */}
        {exam.tasks.map((task) => (
          <TaskReviewCard
            key={task.id}
            task={task}
            answer={answers[task.id] ?? ''}
            solution={solutionMap.get(task.id)}
            selfScore={selfScores[task.id] ?? 0}
            onSelfScore={(v) => setSelfScores((prev) => ({ ...prev, [task.id]: v }))}
            aiFeedback={feedbackMap.get(task.id) ?? null}
          />
        ))}

        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="app-secondary-btn px-4 py-2 rounded-xl text-sm transition-colors">Zur Klausur</button>
          <button onClick={onNewExam} className="app-secondary-btn px-4 py-2 rounded-xl text-sm transition-colors">Neue Klausur</button>
        </div>
      </div>
    </div>
  );
}
