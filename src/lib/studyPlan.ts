import type { AnalysisResult, StudyPlan, StudyTask, StudyTaskType } from './types';

const FOCUSPARTNER_BASE = 'https://focuspartner.app/start';

export function buildFocusPartnerLink(params: {
  taskTitle: string;
  durationMinutes: number;
  subject: string;
  returnUrl?: string;
}): string {
  const p = new URLSearchParams({
    task: params.taskTitle,
    min: String(params.durationMinutes),
    subject: params.subject,
  });
  if (params.returnUrl) p.set('return', params.returnUrl);
  return `${FOCUSPARTNER_BASE}?${p.toString()}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function makeTask(
  day: number,
  date: Date,
  title: string,
  taskType: StudyTaskType,
  estimatedMinutes: number,
  subject: string,
  opts?: { linkedPracticeMode?: 'random' | 'type-training'; linkedTypeId?: string }
): StudyTask {
  return {
    id: `task_${day}_${taskType}`,
    day,
    date: isoDate(date),
    title,
    taskType,
    estimatedMinutes,
    linkedPracticeMode: opts?.linkedPracticeMode,
    linkedTypeId: opts?.linkedTypeId,
    focusSessionUrl: buildFocusPartnerLink({
      taskTitle: title,
      durationMinutes: estimatedMinutes,
      subject,
      returnUrl: typeof window !== 'undefined' ? window.location.href : 'https://examdraft.com/app',
    }),
    completionStatus: 'pending',
  };
}

export function generateStudyPlan(
  analysis: AnalysisResult,
  examDate: string,
  dailyMinutes: number
): StudyPlan {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
  exam.setHours(0, 0, 0, 0);

  const totalDays = Math.max(1, Math.round((exam.getTime() - today.getTime()) / 86_400_000));
  // Leave the last day as rest/review-only; count study days as all until then
  const studyDays = Math.max(1, totalDays - 1);

  const subject = analysis.subject;
  const confidence = analysis.confidenceScore ?? 50;

  // Sort task types: highest frequency first, then highest points
  const sorted = [...analysis.taskTypes].sort(
    (a, b) => b.frequency - a.frequency || b.avgPoints - a.avgPoints
  );

  // Phase boundaries (fraction of study days)
  const phase1End = Math.max(1, Math.round(studyDays * 0.55)); // deep focus on task types
  const phase2End = Math.max(phase1End + 1, Math.round(studyDays * 0.85)); // simulations
  // phase3 = remaining days = final drill

  const tasks: StudyTask[] = [];
  let typeIndex = 0;

  for (let i = 0; i < studyDays; i++) {
    const dayNum = i + 1;
    const date = addDays(today, i);

    if (i < phase1End) {
      // Phase 1: cycle through task types in priority order
      const taskType = sorted[typeIndex % sorted.length];
      typeIndex++;
      const sessionMin = Math.min(dailyMinutes, taskType.difficulty >= 4 ? 60 : 45);
      tasks.push(makeTask(
        dayNum,
        date,
        `${taskType.name} — Typtraining (${taskType.frequency}% Gewichtung)`,
        'type-training',
        sessionMin,
        subject,
        { linkedPracticeMode: 'type-training', linkedTypeId: taskType.id }
      ));
    } else if (i < phase2End) {
      // Phase 2: full simulations
      const simMin = Math.min(dailyMinutes, analysis.estimatedDuration ?? 90);
      tasks.push(makeTask(
        dayNum,
        date,
        `Probeklausur-Simulation — vollständig unter Zeitdruck`,
        'simulation',
        simMin,
        subject,
        { linkedPracticeMode: 'random' }
      ));
    } else {
      // Phase 3: final drill — rotate between daily drill and mistake review
      const isDrill = (i - phase2End) % 2 === 0;
      const drillMin = Math.min(dailyMinutes, 30);
      tasks.push(makeTask(
        dayNum,
        date,
        isDrill
          ? `Daily Drill — schwächste Aufgabentypen wiederholen`
          : `Fehler aus letzter Probeklausur aufarbeiten`,
        isDrill ? 'daily-drill' : 'mistake-review',
        drillMin,
        subject
      ));
    }
  }

  // Final day: light review
  if (totalDays > 1) {
    tasks.push(makeTask(
      studyDays + 1,
      addDays(today, studyDays),
      `Finaler Review — Kernthemen und Aufgabentypen überblicken`,
      'review',
      Math.min(30, dailyMinutes),
      subject
    ));
  }

  return {
    id: crypto.randomUUID(),
    moduleSubject: subject,
    examDate,
    dailyMinutes,
    confidenceScoreAtCreation: confidence,
    createdAt: new Date().toISOString(),
    tasks,
    totalDays,
    studyDays,
  };
}
