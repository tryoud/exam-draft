import { useState } from 'react';
import type { GeneratedExam, GradingResult, GradingFeedback } from '../lib/types';
import { gradeExam, gradeExamClientSide } from '../lib/anthropic';
import { showError } from './Toast';

interface ExamGraderProps {
  exam: GeneratedExam;
  onClose: () => void;
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

function gradeColor(grade: string): string {
  const n = parseFloat(grade.replace(',', '.'));
  if (n <= 1.3) return 'text-[#2e7d4f]';
  if (n <= 2.3) return 'text-[#2f5bd2]';
  if (n <= 3.3) return 'text-[#a56c17]';
  if (n <= 4.0) return 'text-[#c47b21]';
  return 'text-[#b44a35]';
}

function FeedbackCard({ fb, taskNumber, taskTitle, correctOption }: { fb: GradingFeedback; taskNumber: number; taskTitle: string; correctOption?: string }) {
  const [expanded, setExpanded] = useState(false);
  const earned = fb.earnedPoints ?? 0;
  const max = fb.maxPoints ?? 0;
  const pct = max > 0 ? Math.round((earned / max) * 100) : 0;

  return (
    <div className="app-surface rounded-[1.5rem] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-[#d0c8bb]">#{taskNumber}</span>
          <div>
            <p className="text-sm font-medium text-[#111111]">{taskTitle}</p>
            <p className="text-xs text-[#7d7785] mt-0.5">{fb.feedback?.slice(0, 80)}{fb.feedback?.length > 80 ? '…' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className={`text-sm font-bold ${pct >= 50 ? 'text-[#2e7d4f]' : 'text-[#b44a35]'}`}>
              {earned}/{max}
            </p>
            <p className="text-xs text-[#8b8593]">{pct}%</p>
          </div>
          <span className="text-[#8b8593]">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-[#e4ddd1] pt-4 animate-slide-up">
          {correctOption && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#7d7785]">Richtige Antwort:</span>
              <span className="text-sm font-bold text-[#2e7d4f] bg-[#eef8f1] border border-[#cce6d5] rounded-lg px-2.5 py-0.5">{correctOption}</span>
            </div>
          )}
          <p className="text-sm text-[#4a4450]">{fb.feedback}</p>
          {fb.correctPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#7d7785] mb-2">Richtig bewertet:</p>
              <ul className="space-y-1">
                {fb.correctPoints.map((p, i) => (
                  <li key={i} className="text-xs text-[#2e7d4f] flex gap-2">
                    <span className="shrink-0">✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fb.missingPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#7d7785] mb-2">Fehlte / war falsch:</p>
              <ul className="space-y-1">
                {fb.missingPoints.map((p, i) => (
                  <li key={i} className="text-xs text-[#b44a35] flex gap-2">
                    <span className="shrink-0">✗</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExamGrader({ exam, onClose }: ExamGraderProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);

  // Pure MC exam → instant client-side grading; mixed/open → AI grading
  const isMCExam = exam.tasks.every((t) => t.options && Object.keys(t.options).length > 0);

  async function handleSubmit() {
    const answerList = exam.tasks.map((t) => ({
      taskId: t.id,
      answer: answers[t.id] ?? '',
    }));

    // Fast path: no API call needed for pure MC exams
    const instant = gradeExamClientSide(exam, answerList);
    if (instant) {
      setResult(instant);
      return;
    }

    setIsGrading(true);
    try {
      const res = await gradeExam(exam, answerList);
      setResult(res);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : 'API_ERROR';
      showError(code);
    } finally {
      setIsGrading(false);
    }
  }

  const grade = result ? calcGrade(result.percentage) : null;
  const answeredCount = Object.values(answers).filter((a) => a.trim().length > 0).length;

  return (
    <div className="fixed inset-0 z-50 app-body overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#f7f3ea]/95 backdrop-blur-sm border-b border-[#e4ddd1] h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-[#7d7785] hover:text-[#111111] transition-colors text-sm"
          >
            ← Zurück
          </button>
          <span className="text-[#c4bcaf]">|</span>
          <span className="text-[#111111] font-semibold text-sm">KI-Bewertung</span>
          <span className="text-[#7d7785] text-sm hidden sm:inline">— {exam.title}</span>
        </div>
        {!result && (
          <span className="text-xs text-[#8b8593]">
            {answeredCount}/{exam.tasks.length} beantwortet
          </span>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Results view */}
        {result && (
          <div className="space-y-6 animate-slide-up">
            <div className="app-surface rounded-[1.8rem] p-6 text-center">
              <p className="text-[#7d7785] text-sm mb-1">Ergebnis</p>
              <p className="text-4xl font-bold text-[#111111] mb-1">
                {result.totalEarned} / {result.totalMax} Punkte
              </p>
              <p className="text-[#57515e] text-sm mb-4">{result.percentage}% erreicht</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-[#7d7785] text-sm">Note:</span>
                <span className={`text-3xl font-bold ${gradeColor(grade!)}`}>{grade}</span>
                <span className={`text-sm ${parseFloat(grade!.replace(',', '.')) <= 4.0 ? 'text-[#2e7d4f]' : 'text-[#b44a35]'}`}>
                  {parseFloat(grade!.replace(',', '.')) <= 4.0 ? '✓ Bestanden' : '✗ Nicht bestanden'}
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-4 h-2 bg-[#ebe5da] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${result.percentage >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(result.percentage, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-medium text-[#57515e]">Aufgaben-Feedback</h2>
              {result.feedback.map((fb) => {
                const task = exam.tasks.find((t) => t.id === fb.taskId);
                const sol = exam.solution.find((s) => s.taskId === fb.taskId);
                return task ? (
                  <FeedbackCard
                    key={fb.taskId}
                    fb={fb}
                    taskNumber={task.number}
                    taskTitle={task.title}
                    correctOption={sol?.correctOption}
                  />
                ) : null;
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setResult(null); }}
                className="app-secondary-btn px-4 py-2 rounded-xl text-sm transition-colors"
              >
                ← Antworten bearbeiten
              </button>
              <button
                onClick={onClose}
                className="app-secondary-btn px-4 py-2 rounded-xl text-sm transition-colors"
              >
                Zur Klausur
              </button>
            </div>
          </div>
        )}

        {/* Answer input view */}
        {!result && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-[#111111] mb-1">Antworten eingeben</h1>
              <p className="text-sm text-[#7d7785]">
                {isMCExam
                  ? 'Wähle für jede Frage die richtige Antwort — Auswertung erfolgt sofort.'
                  : 'Schreibe deine Lösungen — die KI korrigiert und benotet sie danach.'}
              </p>
            </div>

            <div className="space-y-5">
              {exam.tasks.map((task) => (
                <div key={task.id} className="app-surface rounded-[1.5rem] p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl font-bold text-[#d0c8bb] shrink-0">#{task.number}</span>
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

                  {/* Task description (collapsed summary) */}
                  <p className="text-xs text-[#7d7785] mb-3 font-mono line-clamp-3 leading-relaxed">
                    {task.description}
                  </p>

                  {task.subTasks && task.subTasks.length > 0 && (
                    <div className="mb-3 pl-3 border-l border-[#ddd7cd] space-y-1">
                      {task.subTasks.map((st) => (
                        <p key={st.label} className="text-xs text-[#7d7785]">
                          <span className="text-[#2f5bd2] font-semibold">{st.label})</span>{' '}
                          {st.text}{' '}
                          <span className="text-[#b1abb4]">({st.points} Pkt)</span>
                        </p>
                      ))}
                    </div>
                  )}

                  {task.options && Object.keys(task.options).length > 0 ? (
                    // MC task → radio buttons
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(task.options).map(([key, val]) => {
                        const selected = answers[task.id] === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [task.id]: key }))}
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
                  ) : (
                    // Open task → textarea
                    <textarea
                      value={answers[task.id] ?? ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [task.id]: e.target.value }))
                      }
                      placeholder="Deine Lösung hier eingeben..."
                      rows={5}
                      className="w-full bg-[#fcfbf8] border border-[#ddd7cd] focus:border-[#6b8dff] rounded-[1.1rem] px-4 py-3 text-sm text-[#19161d] placeholder-[#b1abb4] font-mono resize-y outline-none transition-colors"
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isGrading || answeredCount === 0}
              className="app-primary-btn w-full disabled:opacity-45 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isGrading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  KI korrigiert...
                </>
              ) : isMCExam ? (
                `✓ Auswertung (${answeredCount}/${exam.tasks.length} beantwortet)`
              ) : (
                `✓ KI-Korrektur starten (${answeredCount}/${exam.tasks.length} Aufgaben)`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
