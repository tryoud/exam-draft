import { useState, useEffect } from 'react';
import type { AnalysisResult, TaskType } from '../lib/types';

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
            value: <StarRating value={result.averageDifficulty} />,
          },
          { label: 'Prüfungsdauer', value: `${result.estimatedDuration} Min` },
          { label: 'Gesamtpunkte', value: `${result.totalPoints} Pkt` },
        ].map((stat) => (
          <div key={stat.label} className="app-surface rounded-[1.2rem] p-4">
            <p className="text-xs text-[#7d7785] mb-1">{stat.label}</p>
            <p className="text-lg font-semibold text-[#19161d]">{stat.value}</p>
          </div>
        ))}
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

      <button
        onClick={onContinue}
        className="app-primary-btn w-full px-4 py-3 rounded-xl font-medium transition-all duration-200"
      >
        Klausur konfigurieren →
      </button>
    </div>
  );
}
