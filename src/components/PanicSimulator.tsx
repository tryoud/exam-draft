import { useState, useEffect, useRef, useCallback } from 'react';
import type { GeneratedExam, ExamTask, ExamSolution } from '../lib/types';

interface PanicSimulatorProps {
  exam: GeneratedExam;
  onClose: () => void;
  onNewExam: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getGrade(percent: number): string {
  if (percent >= 90) return '1';
  if (percent >= 80) return '2';
  if (percent >= 70) return '3';
  if (percent >= 60) return '4';
  return '5';
}

function getGradeLabel(grade: string): string {
  return { '1': 'Sehr gut', '2': 'Gut', '3': 'Befriedigend', '4': 'Ausreichend', '5': 'Nicht bestanden' }[grade] ?? '';
}

interface TaskCardProps {
  task: ExamTask;
  answer: string;
  onAnswerChange: (v: string) => void;
  submitted: boolean;
  solution?: ExamSolution;
  selfScore: number;
  onSelfScore: (v: number) => void;
}

function SimTaskCard({ task, answer, onAnswerChange, submitted, solution, selfScore, onSelfScore }: TaskCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }

  return (
    <div className="app-surface rounded-[1.5rem] overflow-hidden mb-4">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl font-bold text-[#d0c8bb]">#{task.number}</span>
          <div>
            <h3 className="font-semibold text-[#111111]">{task.title}</h3>
            <span className="text-xs text-[#7d7785]">{task.type} · {task.points} Punkte</span>
          </div>
        </div>

        {task.hasDiagram && task.diagramDescription && (
          <div className="mb-4 bg-[#f3f6ff] border border-[#d8e1ff] rounded-[1.2rem] p-3">
            <p className="text-xs text-[#2f5bd2] mb-1">📊 Diagramm-Aufgabe</p>
            <pre className="text-xs text-[#4a4450] font-mono whitespace-pre-wrap">{task.diagramDescription}</pre>
          </div>
        )}

        <div className="font-mono text-sm text-[#4a4450] leading-relaxed mb-4 whitespace-pre-wrap">
          {task.description}
        </div>

        {task.subTasks && task.subTasks.length > 0 && (
          <div className="space-y-2 mb-4 pl-4 border-l-2 border-[#ddd7cd]">
            {task.subTasks.map((sub) => (
              <div key={sub.label} className="flex items-start gap-3">
                <span className="text-sm font-semibold text-[#2f5bd2] shrink-0">{sub.label})</span>
                <span className="text-sm text-[#4a4450] font-mono">{sub.text}</span>
                <span className="text-xs text-[#8b8593] shrink-0">({sub.points} Pkt)</span>
              </div>
            ))}
          </div>
        )}

        {!submitted ? (
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => { onAnswerChange(e.target.value); autoResize(); }}
            placeholder="Deine Antwort hier eingeben..."
            rows={4}
            className="w-full bg-[#fcfbf8] border border-[#ddd7cd] focus:border-[#6b8dff] focus:outline-none rounded-[1.1rem] px-3 py-2 text-[#19161d] text-sm font-mono resize-none transition-colors"
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#7d7785] mb-2">Deine Antwort:</p>
              <div className="bg-[#fcfbf8] border border-[#e4ddd1] rounded-[1.1rem] p-3 text-sm text-[#4a4450] font-mono whitespace-pre-wrap min-h-[80px]">
                {answer || <span className="text-[#b1abb4] italic">Keine Antwort</span>}
              </div>
            </div>
            {solution && (
              <div>
                <p className="text-xs text-[#7d7785] mb-2">Musterlösung:</p>
                <div className="bg-[#eef8f1] border border-[#cce6d5] rounded-[1.1rem] p-3 text-sm text-[#3e3944] font-mono whitespace-pre-wrap">
                  {solution.solution}
                </div>
              </div>
            )}
          </div>
        )}

        {submitted && (
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm text-[#7d7785]">Selbstbewertung:</label>
            <input
              type="number"
              min={0}
              max={task.points}
              value={selfScore}
              onChange={(e) => onSelfScore(Math.min(task.points, Math.max(0, Number(e.target.value))))}
              className="w-16 bg-[#fcfbf8] border border-[#ddd7cd] focus:border-[#6b8dff] focus:outline-none rounded-lg px-2 py-1 text-[#19161d] text-sm text-center"
            />
            <span className="text-sm text-[#8b8593]">/ {task.points} Punkte</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PanicSimulator({ exam, onClose, onNewExam }: PanicSimulatorProps) {
  const totalSeconds = exam.duration * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [paused, setPaused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'one'>('all');
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(exam.tasks.map((t) => [t.id, '']))
  );
  const [selfScores, setSelfScores] = useState<Record<string, number>>(
    Object.fromEntries(exam.tasks.map((t) => [t.id, 0]))
  );

  useEffect(() => {
    if (paused || submitted || secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [paused, submitted, secondsLeft]);

  const solutionMap = new Map(exam.solution.map((s) => [s.taskId, s]));

  const timerColor =
    secondsLeft <= 300
      ? 'text-[#b44a35]'
      : secondsLeft <= 600
      ? 'text-[#a56c17]'
      : 'text-[#111111]';

  const timerPulse = secondsLeft <= 300 && !submitted ? 'animate-pulse' : '';
  const progress = secondsLeft / totalSeconds;
  const circumference = 2 * Math.PI * 36;

  const totalSelf = Object.values(selfScores).reduce((a, b) => a + b, 0);
  const percent = exam.totalPoints > 0 ? (totalSelf / exam.totalPoints) * 100 : 0;
  const grade = getGrade(percent);

  const visibleTasks = viewMode === 'all' ? exam.tasks : [exam.tasks[currentTaskIndex]];

  return (
    <div className="fixed inset-0 z-50 app-body flex flex-col">
      <div className="h-14 border-b border-[#e4ddd1] bg-[#f7f3ea]/95 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
        <span className="text-sm font-medium text-[#111111]">Klausur schreiben</span>

        <div className="flex flex-col items-center">
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="#ddd7cd" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="36"
                fill="none"
                stroke={secondsLeft <= 300 ? '#ef4444' : secondsLeft <= 600 ? '#f59e0b' : '#3b82f6'}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
          </div>
          <span className={`text-sm font-mono font-bold ${timerColor} ${timerPulse}`}>
            {formatTime(secondsLeft)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {!submitted && (
            <button
              onClick={() => setPaused(!paused)}
              className="text-sm text-[#6f6a78] hover:text-[#111111] border border-[#ddd7cd] bg-white/60 px-3 py-1 rounded-full transition-colors"
            >
              {paused ? '▶ Weiter' : '⏸ Pause'}
            </button>
          )}
          {viewMode === 'one' && !submitted && (
            <span className="text-xs text-[#7d7785]">
              Aufgabe {currentTaskIndex + 1}/{exam.tasks.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {!submitted && (
            <div className="flex items-center gap-3 mb-6">
              <div className="flex rounded-lg overflow-hidden border border-[#ddd7cd]">
                <button
                  onClick={() => setViewMode('all')}
                  className={`text-xs px-3 py-1.5 transition-all ${viewMode === 'all' ? 'bg-[#6b8dff] text-white' : 'bg-white/60 text-[#6f6a78] hover:text-[#111111]'}`}
                >
                  Alle Aufgaben
                </button>
                <button
                  onClick={() => setViewMode('one')}
                  className={`text-xs px-3 py-1.5 transition-all ${viewMode === 'one' ? 'bg-[#6b8dff] text-white' : 'bg-white/60 text-[#6f6a78] hover:text-[#111111]'}`}
                >
                  Eine Aufgabe
                </button>
              </div>
              {viewMode === 'one' && (
                <div className="flex gap-1">
                  {exam.tasks.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentTaskIndex(i)}
                      className={`w-7 h-7 text-xs rounded transition-all ${
                        i === currentTaskIndex
                          ? 'bg-[#6b8dff] text-white'
                          : answers[exam.tasks[i].id]
                          ? 'bg-white/75 text-[#2e7d4f] border border-[#cce6d5]'
                          : 'bg-white/70 text-[#7d7785] border border-[#ddd7cd]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {visibleTasks.map((task) => (
            <SimTaskCard
              key={task.id}
              task={task}
              answer={answers[task.id]}
              onAnswerChange={(v) => setAnswers((prev) => ({ ...prev, [task.id]: v }))}
              submitted={submitted}
              solution={solutionMap.get(task.id)}
              selfScore={selfScores[task.id]}
              onSelfScore={(v) => setSelfScores((prev) => ({ ...prev, [task.id]: v }))}
            />
          ))}

          {submitted && (
            <div className="app-surface rounded-[1.6rem] p-6 mt-4 animate-slide-up">
              <h2 className="text-lg font-semibold text-[#111111] mb-4">Ergebnis</h2>
              <div className="flex items-center gap-6 mb-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-[#111111]">{grade}</p>
                  <p className="text-xs text-[#7d7785] mt-1">{getGradeLabel(grade)}</p>
                </div>
                <div>
                  <p className="text-sm text-[#57515e]">
                    {totalSelf} / {exam.totalPoints} Punkte
                  </p>
                  <p className="text-sm text-[#57515e]">{percent.toFixed(0)}%</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setAnswers(Object.fromEntries(exam.tasks.map((t) => [t.id, ''])));
                    setSelfScores(Object.fromEntries(exam.tasks.map((t) => [t.id, 0])));
                    setSecondsLeft(totalSeconds);
                  }}
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
                <button
                  onClick={onClose}
                  className="app-primary-btn text-white px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  Schließen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!submitted && (
        <div className="h-14 border-t border-[#e4ddd1] bg-[#f7f3ea]/95 backdrop-blur-sm flex items-center justify-center px-4 shrink-0">
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-[#fff1ed] hover:bg-[#ffe7e0] text-[#b44a35] border border-[#efc2b7] px-6 py-2 rounded-xl text-sm font-medium transition-all"
          >
            Prüfung abgeben
          </button>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-60 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="app-surface rounded-[1.6rem] p-6 max-w-sm w-full">
            <h3 className="text-[#111111] font-semibold mb-2">Prüfung abgeben?</h3>
            <p className="text-sm text-[#7d7785] mb-4">
              Verbleibende Zeit: {formatTime(secondsLeft)}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setSubmitted(true); setShowConfirm(false); setPaused(true); }}
                className="flex-1 bg-[#b44a35] hover:bg-[#9e3f2c] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Abgeben
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 app-secondary-btn px-4 py-2 rounded-xl text-sm transition-colors"
              >
                Weiter schreiben
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
