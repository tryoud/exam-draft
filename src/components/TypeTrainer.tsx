import { useState } from 'react';
import type { GeneratedExam, ExamTask, ExamSolution } from '../lib/types';
import { downloadHTML } from '../lib/examExport';

interface TypeTrainerProps {
  exam: GeneratedExam;
  typeName: string;
  onNewType: () => void;
  onRegenerate: () => void;
  isLoading: boolean;
}

function TrainerTaskCard({
  task,
  solution,
  showSolutions,
}: {
  task: ExamTask;
  solution?: ExamSolution;
  showSolutions: boolean;
}) {
  const [answer, setAnswer] = useState('');
  const [showSol, setShowSol] = useState(false);
  const revealed = showSolutions || showSol;

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  return (
    <div className="app-surface rounded-[1.5rem] overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl font-bold text-[#d0c8bb]">#{task.number}</span>
          <div>
            <h3 className="font-semibold text-[#111111]">{task.title}</h3>
            <span className="text-xs bg-[#eef2ff] text-[#2f5bd2] border border-[#d8e1ff] rounded-full px-2.5 py-0.5">
              {task.points} Punkte
            </span>
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

        {/* MC options */}
        {task.options && Object.keys(task.options).length > 0 && (
          <div className="grid gap-2 mb-4 sm:grid-cols-2">
            {Object.entries(task.options).map(([key, val]) => (
              <div key={key} className="flex items-start gap-2.5 bg-white/60 border border-[#e4ddd1] rounded-xl px-3 py-2 text-sm text-[#4a4450]">
                <span className="font-bold text-[#2f5bd2] shrink-0 w-5">{key}</span>
                <span className="font-mono text-xs leading-relaxed">{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Answer input */}
        {(!task.options || Object.keys(task.options).length === 0) && (
          <textarea
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); autoResize(e.target); }}
            placeholder="Deine Antwort hier eingeben..."
            rows={3}
            className="w-full bg-[#fcfbf8] border border-[#ddd7cd] focus:border-[#6b8dff] focus:outline-none rounded-[1.1rem] px-3 py-2 text-[#19161d] text-sm font-mono resize-none transition-colors"
          />
        )}
      </div>

      {/* Solution */}
      {solution && (
        <div className="border-t border-[#e4ddd1]">
          {!revealed ? (
            <button
              onClick={() => setShowSol(true)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm text-[#7d7785] hover:text-[#4c4754] hover:bg-white/60 transition-all"
            >
              <span>▼ Musterlösung anzeigen</span>
            </button>
          ) : (
            <div className="px-5 pb-5 pt-4 space-y-3 animate-slide-up">
              <p className="text-xs font-medium text-[#7d7785]">Musterlösung</p>
              <div className="bg-[#fcfbf8] border border-[#e4ddd1] rounded-[1.2rem] p-4 font-mono text-sm text-[#4a4450] whitespace-pre-wrap leading-relaxed">
                {solution.solution}
              </div>
              {solution.keyPoints.length > 0 && (
                <ul className="space-y-1">
                  {solution.keyPoints.map((kp, i) => (
                    <li key={i} className="text-xs text-[#2e7d4f] flex gap-2">
                      <span className="shrink-0">✓</span><span>{kp}</span>
                    </li>
                  ))}
                </ul>
              )}
              {solution.commonMistakes && solution.commonMistakes.length > 0 && (
                <ul className="space-y-1">
                  {solution.commonMistakes.map((m, i) => (
                    <li key={i} className="text-xs text-[#b44a35] flex gap-2">
                      <span className="shrink-0">✗</span><span>{m}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TypeTrainer({ exam, typeName, onNewType, onRegenerate, isLoading }: TypeTrainerProps) {
  const [showSolutions, setShowSolutions] = useState(false);
  const solutionMap = new Map(exam.solution.map((s) => [s.taskId, s]));

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="app-surface rounded-[1.8rem] p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-[#8b8593] uppercase tracking-widest mb-0.5">Aufgabentyp</p>
          <h2 className="text-lg font-semibold text-[#111111]">{typeName}</h2>
          <p className="text-sm text-[#7d7785] mt-0.5">{exam.tasks.length} Variationen</p>
        </div>
        <button
          onClick={() => setShowSolutions(!showSolutions)}
          className="app-secondary-btn px-4 py-2 rounded-xl text-sm transition-colors"
        >
          {showSolutions ? 'Lösungen ausblenden' : 'Alle Lösungen einblenden'}
        </button>
      </div>

      {/* Task cards */}
      <div className="space-y-4">
        {exam.tasks.map((task) => (
          <TrainerTaskCard
            key={task.id}
            task={task}
            solution={solutionMap.get(task.id)}
            showSolutions={showSolutions}
          />
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="app-primary-btn disabled:opacity-45 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generiere...
            </>
          ) : (
            `${exam.tasks.length} neue Variationen`
          )}
        </button>
        <div className="w-px h-5 self-center bg-[#ddd7cd]" />
        <button
          onClick={() => downloadHTML(exam, false)}
          className="app-secondary-btn px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          ⬇ Aufgaben
        </button>
        <button
          onClick={() => downloadHTML(exam, true)}
          className="app-secondary-btn px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          ⬇ Mit Lösung
        </button>
        <div className="w-px h-5 self-center bg-[#ddd7cd]" />
        <button
          onClick={onNewType}
          className="app-secondary-btn px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          Anderen Typ →
        </button>
      </div>
    </div>
  );
}
