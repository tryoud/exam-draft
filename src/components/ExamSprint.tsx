import { useState, useMemo } from 'react';
import type { AnalysisResult, StudyPlan, StudyTask, StudyTaskType } from '../lib/types';
import { generateStudyPlan } from '../lib/studyPlan';

interface ExamSprintProps {
  analysis: AnalysisResult;
  initialExamDate?: string;
  onClose: () => void;
}

const taskTypeLabel: Record<StudyTaskType, string> = {
  'type-training': 'Typtraining',
  'simulation': 'Probeklausur',
  'review': 'Review',
  'mistake-review': 'Fehlerwiederholung',
  'daily-drill': 'Daily Drill',
};

const taskTypeIcon: Record<StudyTaskType, string> = {
  'type-training': '🎯',
  'simulation': '📝',
  'review': '📖',
  'mistake-review': '🔄',
  'daily-drill': '⚡',
};

const taskTypeColor: Record<StudyTaskType, string> = {
  'type-training': 'bg-[#eef2ff] border-[#d9e3ff] text-[#2f5bd2]',
  'simulation': 'bg-[#f0fdf4] border-[#bbf7d0] text-[#2e7d4f]',
  'review': 'bg-[#fefce8] border-[#fde68a] text-[#92400e]',
  'mistake-review': 'bg-[#fff7ed] border-[#fed7aa] text-[#9a3412]',
  'daily-drill': 'bg-[#f5f3ff] border-[#ddd6fe] text-[#6d28d9]',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
}

function phaseLabel(task: StudyTask, plan: StudyPlan): string {
  const phase1End = Math.round(plan.studyDays * 0.55);
  const phase2End = Math.round(plan.studyDays * 0.85);
  if (task.day <= phase1End) return 'Phase 1 · Fokus';
  if (task.day <= phase2End) return 'Phase 2 · Simulation';
  return 'Phase 3 · Finale';
}

function TaskCard({ task, plan }: { task: StudyTask; plan: StudyPlan }) {
  const [status, setStatus] = useState<'pending' | 'done' | 'skipped'>(task.completionStatus);
  const phase = phaseLabel(task, plan);

  return (
    <div className={`rounded-[1.1rem] border p-4 transition-opacity ${status === 'done' ? 'opacity-60' : ''} ${taskTypeColor[task.taskType]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-lg shrink-0">{taskTypeIcon[task.taskType]}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70">{formatDate(task.date)} · {taskTypeLabel[task.taskType]}</p>
            <p className="text-sm font-medium mt-0.5 leading-5">{task.title}</p>
            <p className="text-xs opacity-60 mt-0.5">{task.estimatedMinutes} Min</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5 items-end">
          <a
            href={task.focusSessionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="app-primary-btn rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap"
          >
            FocusPartner →
          </a>
          <button
            onClick={() => setStatus(s => s === 'done' ? 'pending' : 'done')}
            className="text-[10px] opacity-60 hover:opacity-100 transition-opacity"
          >
            {status === 'done' ? '↩ Rückgängig' : '✓ Erledigt'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PhaseGroup({ label, tasks, plan }: { label: string; tasks: StudyTask[]; plan: StudyPlan }) {
  const [collapsed, setCollapsed] = useState(false);
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center gap-2 w-full text-left"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#57515e]">{label}</p>
        <span className="text-[10px] text-[#9e98a4]">({tasks.length} {tasks.length === 1 ? 'Tag' : 'Tage'})</span>
        <span className="ml-auto text-[#9e98a4] text-xs">{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <div className="space-y-2">
          {tasks.map(t => <TaskCard key={t.id} task={t} plan={plan} />)}
        </div>
      )}
    </div>
  );
}

export default function ExamSprint({ analysis, initialExamDate, onClose }: ExamSprintProps) {
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().slice(0, 10);

  const [examDate, setExamDate] = useState(initialExamDate ?? '');
  const [dailyMinutes, setDailyMinutes] = useState(45);
  const [plan, setPlan] = useState<StudyPlan | null>(null);

  function handleGenerate() {
    if (!examDate) return;
    setPlan(generateStudyPlan(analysis, examDate, dailyMinutes));
  }

  const phase1Tasks = useMemo(() => plan?.tasks.filter(t => phaseLabel(t, plan) === 'Phase 1 · Fokus') ?? [], [plan]);
  const phase2Tasks = useMemo(() => plan?.tasks.filter(t => phaseLabel(t, plan) === 'Phase 2 · Simulation') ?? [], [plan]);
  const phase3Tasks = useMemo(() => plan?.tasks.filter(t => !['Phase 1 · Fokus', 'Phase 2 · Simulation'].includes(phaseLabel(t, plan))) ?? [], [plan]);

  const minuteOptions = [20, 30, 45, 60, 90];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#111111]">Exam Sprint</h2>
          <p className="text-sm text-[#7d7785] mt-0.5">{analysis.subject} · Lernplan bis zur Klausur</p>
        </div>
        <button onClick={onClose} className="text-sm text-[#8b8593] hover:text-[#4c4754] transition-colors">
          ✕ Schließen
        </button>
      </div>

      {/* Input form */}
      <div className="app-surface rounded-[1.3rem] p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#57515e]">Klausurdatum</label>
            <input
              type="date"
              value={examDate}
              min={minDateStr}
              onChange={e => setExamDate(e.target.value)}
              className="w-full rounded-xl border border-[#ddd7cd] bg-white/70 px-3 py-2 text-sm text-[#19161d] focus:border-[#6b8dff] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#57515e]">Tägliche Lernzeit</label>
            <div className="flex gap-2 flex-wrap">
              {minuteOptions.map(m => (
                <button
                  key={m}
                  onClick={() => setDailyMinutes(m)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${
                    dailyMinutes === m
                      ? 'border-[#6b8dff] bg-[#eef2ff] text-[#2f5bd2] font-medium'
                      : 'border-[#ddd7cd] bg-white/70 text-[#4c4754] hover:border-[#bdb6c5]'
                  }`}
                >
                  {m} Min
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!examDate}
          className="app-primary-btn w-full disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 font-medium transition-all"
        >
          {plan ? 'Plan neu erstellen →' : 'Exam Sprint erstellen →'}
        </button>
      </div>

      {/* Generated plan */}
      {plan && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Tage bis Klausur', value: String(plan.totalDays) },
              { label: 'Lerntage', value: String(plan.studyDays) },
              { label: 'Min pro Tag', value: String(plan.dailyMinutes) },
            ].map(s => (
              <div key={s.label} className="app-surface rounded-[1.1rem] p-3 text-center">
                <p className="text-lg font-bold text-[#111111]">{s.value}</p>
                <p className="text-[11px] text-[#7d7785] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Confidence note */}
          {plan.confidenceScoreAtCreation < 60 && (
            <div className="rounded-xl border border-[#ead6a2] bg-[#fff8e8] px-4 py-3 text-xs text-[#8a7350]">
              Analyse-Confidence bei Planerstellung: {plan.confidenceScoreAtCreation}% — mit mehr Klausuren wächst die Planqualität.
            </div>
          )}

          {/* Phase groups */}
          <PhaseGroup label="Phase 1 · Fokus auf Aufgabentypen" tasks={phase1Tasks} plan={plan} />
          <PhaseGroup label="Phase 2 · Simulationen" tasks={phase2Tasks} plan={plan} />
          <PhaseGroup label="Phase 3 · Finale & Review" tasks={phase3Tasks} plan={plan} />

          <p className="text-[11px] text-[#9e98a4] text-center">
            FocusPartner-Links öffnen eine fokussierte Lernsession mit Rücksprung zu ExamDraft.
          </p>
        </div>
      )}
    </div>
  );
}
