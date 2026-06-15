import { useState, useEffect } from 'react';
import type { AnalysisResult, TaskType, TopicLikelihood, RiskGap } from '../lib/types';

const LOADING_MESSAGES = [
  'Extrahiere Text aus PDFs...',
  'Sende Daten an Claude...',
  'Erkenne Aufgabentypen...',
  'Analysiere Themenbereiche...',
  'Schätze Schwierigkeit ein...',
  'Finalisiere Ergebnisse...',
];

interface AnalysisDashboardProps {
  isLoading: boolean;
  result: AnalysisResult | null;
  examCount: number;
  slideCount: number;
  imageFilesCount: number;
  onContinue: () => void;
  onExamSprint?: () => void;
  initialExamDate?: string;
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="text-[#d2a33d]">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(value) ? 'text-[#d2a33d]' : 'text-[#d8d2c8]'}>
          ★
        </span>
      ))}
    </span>
  );
}

function TaskTypeRow({ task }: { task: TaskType }) {
  const [expanded, setExpanded] = useState(false);

  const freqColor =
    task.frequency > 50
      ? 'bg-blue-500'
      : task.frequency > 25
      ? 'bg-teal-500'
      : 'bg-gray-600';

  return (
    <div className="app-surface rounded-[1.2rem] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-white/80 transition-colors text-left"
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${freqColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#19161d]">{task.name}</span>
            {task.hasdiagramContext && (
              <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5">
                📊 Diagramme
              </span>
            )}
          </div>
          <p className="text-xs text-[#7d7785] mt-0.5 truncate">{task.description}</p>
        </div>
        <div className="shrink-0 flex items-center gap-4 text-xs text-[#7d7785]">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 h-1.5 bg-[#e4dfd7] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${freqColor}`}
                style={{ width: `${task.frequency}%` }}
              />
            </div>
            <span>{task.frequency}%</span>
          </div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i <= task.difficulty ? 'bg-[#6b8dff]' : 'bg-[#d7d1c8]'
                }`}
              />
            ))}
          </div>
          <span className="text-[#4e4956]">{task.avgPoints} Pkt</span>
          <span className="text-[#9e98a4]">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#e3ddd3] px-4 py-3 bg-[#f8f4ee]">
          <p className="text-xs text-[#7d7785] mb-2">Beispielaufgabe:</p>
          <p className="text-sm text-[#494451] font-mono leading-relaxed">
            {task.exampleQuestion}
          </p>
          {task.hasdiagramContext && (
            <p className="text-xs text-amber-400 mt-2">
              📊 Diese Aufgabe enthält typischerweise Diagrammelemente
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalysisDashboard({
  isLoading,
  result,
  examCount,
  slideCount,
  imageFilesCount,
  onContinue,
  onExamSprint,
}: AnalysisDashboardProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-[#6f6a78] mb-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            {LOADING_MESSAGES[msgIndex]}
          </div>
          <p className="text-xs text-[#8b8593]">
            Analysiere {examCount} Altklausuren
            {slideCount > 0 ? ` + ${slideCount} Vorlesungsfolien` : ''}...
          </p>
          {imageFilesCount > 0 && (
            <p className="text-xs text-[#8b8593] mt-1">
              {imageFilesCount} {imageFilesCount === 1 ? 'Datei' : 'Dateien'} im Bild-Modus
              (vollständig analysiert)
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="h-8 bg-[#ece7de] rounded w-2/3 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-[#ece7de] rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-[#ece7de] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const safeDifficulty =
    typeof result.averageDifficulty === 'number' && Number.isFinite(result.averageDifficulty)
      ? result.averageDifficulty
      : result.taskTypes.length > 0
      ? result.taskTypes.reduce((sum, task) => sum + task.difficulty, 0) / result.taskTypes.length
      : 3;
  const safeTotalPoints =
    typeof result.totalPoints === 'number' && Number.isFinite(result.totalPoints) && result.totalPoints > 0
      ? result.totalPoints
      : result.taskTypes.reduce((sum, task) => sum + task.avgPoints, 0);
  const safeDuration =
    typeof result.estimatedDuration === 'number' && Number.isFinite(result.estimatedDuration) && result.estimatedDuration > 0
      ? result.estimatedDuration
      : 120;
  const sortedByFrequency = [...result.taskTypes].sort((a, b) => b.frequency - a.frequency);
  const sortedByPoints = [...result.taskTypes].sort((a, b) => b.avgPoints - a.avgPoints);
  const topLikely = sortedByFrequency.slice(0, 3);
  const highValue = sortedByPoints[0];

  // Use LLM-supplied scores when available, fall back to computed values
  const computedConfidence = Math.min(95, Math.max(35, result.examCount * 18 + (result.hasSlideContext ? 10 : 0) + Math.min(result.totalTaskTypes, 6) * 4));
  const confidence = result.confidenceScore ?? computedConfidence;
  const coverageScore = result.coverageScore;
  const coverageLabel = confidence >= 75 ? 'hoch' : confidence >= 55 ? 'solide' : 'niedrig';
  const coverageText = result.examCount >= 4
    ? 'Mehrere Altklausuren geben eine robuste Struktur.'
    : result.examCount >= 2
    ? 'Genug Material für erste Muster, aber weitere Jahrgänge würden die Sicherheit erhöhen.'
    : 'Nur eine Klausur: Nutze die Analyse als Orientierung, nicht als Prognose.';

  const computedNextActions = [
    highValue ? `${highValue.name} zuerst üben: hoher Punktehebel (${highValue.avgPoints} Pkt).` : '',
    topLikely[0] ? `${topLikely[0].name} kommt im Material am häufigsten vor (${topLikely[0].frequency}%).` : '',
    result.hasSlideContext ? 'Vorlesungskontext ist einbezogen: gleiche die Folienthemen mit den Aufgabentypen ab.' : 'Optional Folien-/Themenkontext ergänzen, um neue mögliche Themen besser einzugrenzen.',
  ].filter(Boolean);
  const nextActions = result.nextBestActions?.length ? result.nextBestActions : computedNextActions;

  const likelihoodColors: Record<TopicLikelihood['likelihood'], string> = {
    high: 'bg-green-500/10 border-green-500/25 text-green-400',
    medium: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
    low: 'bg-[#e4dfd7]/60 border-[#d5d0c6] text-[#8b8593]',
  };
  const likelihoodLabel: Record<TopicLikelihood['likelihood'], string> = {
    high: 'wahrscheinlich',
    medium: 'möglich',
    low: 'unsicher',
  };
  const severityColors: Record<RiskGap['severity'], string> = {
    critical: 'bg-red-500/10 border-red-500/25 text-red-400',
    important: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    minor: 'bg-[#e4dfd7]/60 border-[#d5d0c6] text-[#8b8593]',
  };
  const severityLabel: Record<RiskGap['severity'], string> = {
    critical: 'kritisch',
    important: 'wichtig',
    minor: 'gering',
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-semibold text-[#111111] mb-1">{result.subject}</h1>
        <p className="text-[#7d7785] text-sm">{result.examCount} Klausur{result.examCount !== 1 ? 'en' : ''} analysiert</p>

        <div className="flex flex-wrap gap-2 mt-3">
          {result.hasSlideContext && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-3 py-1">
              ✓ Vorlesungskontext einbezogen
            </span>
          )}
          {imageFilesCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-3 py-1">
              ✓ {imageFilesCount} {imageFilesCount === 1 ? 'Datei' : 'Dateien'} mit Diagrammen vollständig analysiert
            </span>
          )}
        </div>

        {result.hadImageOnlyContent && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <p className="text-xs text-amber-400">
              Hinweis: Einige Diagramme waren im Text-Modus nicht lesbar. Generierte Aufgaben
              wurden entsprechend angepasst.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Aufgabentypen', value: result.totalTaskTypes },
          {
            label: 'Schwierigkeit',
            value: <StarRating value={safeDifficulty} />,
          },
          { label: 'Prüfungsdauer', value: `${safeDuration} Min` },
          { label: 'Gesamtpunkte', value: `${safeTotalPoints} Pkt` },
        ].map((stat) => (
          <div key={stat.label} className="app-surface rounded-[1.2rem] p-4">
            <p className="text-xs text-[#7d7785] mb-1">{stat.label}</p>
            <p className="text-lg font-semibold text-[#19161d]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="app-surface rounded-[1.3rem] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#7b7685]">Was wahrscheinlich zählt</p>
          <div className="mt-4 space-y-3">
            {topLikely.map((task, index) => (
              <div key={task.id} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#111113] text-xs font-bold text-white">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#19161d]">{task.name}</p>
                  <p className="text-xs text-[#7d7785]">{task.frequency}% Gewichtung, Ø {task.avgPoints} Punkte</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="app-surface rounded-[1.3rem] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#7b7685]">Analysesicherheit</p>
          <div className="mt-4 flex items-end gap-3">
            <p className="text-4xl font-bold tracking-[-0.04em] text-[#111111]">{confidence}%</p>
            <p className="pb-1 text-sm text-[#6f6a78]">{coverageLabel}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e4dfd7]">
            <div className="h-full rounded-full bg-[#6b8dff]" style={{ width: `${confidence}%` }} />
          </div>
          {coverageScore !== undefined && (
            <>
              <p className="mt-3 text-xs text-[#7b7685]">Materialabdeckung</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e4dfd7]">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${coverageScore}%` }} />
              </div>
              <p className="mt-1 text-xs text-[#8b8593]">{coverageScore}%</p>
            </>
          )}
          <p className="mt-3 text-xs leading-6 text-[#6f6a78]">{coverageText}</p>
          {result.examCount === 1 && (
            <p className="mt-2 text-xs text-amber-400">
              Analyse basiert auf 1 Klausur — Confidence niedrig. Weitere Jahrgänge verbessern die Muster deutlich.
            </p>
          )}
        </div>
      </div>

      {result.topicLikelihoods && result.topicLikelihoods.length > 0 && (
        <div className="app-surface rounded-[1.3rem] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#7b7685]">Was kommt wahrscheinlich dran</p>
          <div className="mt-4 space-y-2">
            {result.topicLikelihoods.map((tl) => (
              <div key={tl.topic} className="flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${likelihoodColors[tl.likelihood]}`}>
                  {likelihoodLabel[tl.likelihood]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#19161d]">{tl.topic}</p>
                  <p className="text-xs text-[#8b8593]">{tl.evidenceNote}</p>
                </div>
                {tl.pointImpact === 'high' && (
                  <span className="shrink-0 text-xs text-[#d2a33d]">★ hohe Punkte</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.riskGaps && result.riskGaps.length > 0 && (
        <div className="app-surface rounded-[1.3rem] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#7b7685]">Risky Gaps</p>
          <div className="mt-4 space-y-2">
            {result.riskGaps.map((rg) => (
              <div key={rg.gap} className="flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityColors[rg.severity]}`}>
                  {severityLabel[rg.severity]}
                </span>
                <p className="text-sm text-[#3f3a45]">{rg.gap}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.recurringPatterns && result.recurringPatterns.length > 0 && (
        <div className="app-surface rounded-[1.3rem] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#7b7685]">Prüfungsmuster</p>
          <ul className="mt-4 space-y-2">
            {result.recurringPatterns.map((pattern) => (
              <li key={pattern} className="flex items-start gap-2 text-sm text-[#3f3a45]">
                <span className="mt-1 shrink-0 text-[#6b8dff]">→</span>
                {pattern}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="app-surface rounded-[1.3rem] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-[#7b7685]">Was du jetzt tun solltest</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {nextActions.map((action) => (
            <div key={action} className="rounded-xl border border-[#ddd7cd] bg-white/70 p-3">
              <p className="text-sm leading-6 text-[#3f3a45]">{action}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-[#57515e] mb-3">Aufgabentypen</h2>
        <div className="space-y-2">
          {result.taskTypes.map((task) => (
            <TaskTypeRow key={task.id} task={task} />
          ))}
        </div>
      </div>

      {result.topicAreas.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[#57515e] mb-2">Themenbereiche</h2>
          <div className="flex flex-wrap gap-2">
            {result.topicAreas.map((topic) => (
              <span
                key={topic}
                className="text-xs bg-white/75 border border-[#ddd7cd] text-[#4f4a56] rounded-full px-3 py-1"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.hasSlideContext && result.slideTopics.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[#57515e] mb-2">Vorlesungsthemen</h2>
          <div className="flex flex-wrap gap-2">
            {result.slideTopics.map((topic) => (
              <span
                key={topic}
                className="text-xs bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full px-3 py-1"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={onContinue}
          className="app-primary-btn px-4 py-3 rounded-xl font-medium transition-all duration-200"
        >
          Klausur konfigurieren →
        </button>
        {onExamSprint && (
          <button
            onClick={onExamSprint}
            className="app-secondary-btn px-4 py-3 rounded-xl font-medium transition-all duration-200"
          >
            📅 Exam Sprint erstellen
          </button>
        )}
      </div>
    </div>
  );
}
