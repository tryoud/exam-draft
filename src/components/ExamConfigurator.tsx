import { useState } from 'react';
import type { AnalysisResult, Provider } from '../lib/types';
import { getModelInputPriceUSD, getModelOutputPriceUSD } from '../lib/tokenEstimator';
import { OPENROUTER_MODELS } from '../lib/anthropic';

interface ExamConfiguratorProps {
  analysis: AnalysisResult;
  onGenerate: (
    mode: 'random' | 'type-training',
    difficulty: 'easier' | 'same' | 'harder',
    typeId?: string,
    excludedTopics?: string[]
  ) => void;
  isLoading: boolean;
  provider: Provider;
  generationModel: string;
}

export default function ExamConfigurator({
  analysis,
  onGenerate,
  isLoading,
  provider,
  generationModel,
}: ExamConfiguratorProps) {
  const [mode, setMode] = useState<'random' | 'type-training' | null>(null);
  const [difficulty, setDifficulty] = useState<'easier' | 'same' | 'harder'>('same');
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [excludedTopics, setExcludedTopics] = useState<string[]>([]);
  const [showTopicFilter, setShowTopicFilter] = useState(false);

  const canGenerate =
    mode === 'random' || (mode === 'type-training' && selectedTypeId !== null);

  function toggleTopic(topic: string) {
    setExcludedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  function handleGenerate() {
    if (!mode || !canGenerate) return;
    onGenerate(mode, difficulty, selectedTypeId ?? undefined, excludedTopics.length ? excludedTopics : undefined);
  }

  // Generation cost: plan + task batches + solution batches
  // Realistic estimate: ~10k input tokens + ~13k output tokens across all phases
  const GEN_INPUT_TOKENS  = 10_500;
  const GEN_OUTPUT_TOKENS = 13_000;
  const inputPriceUSD  = getModelInputPriceUSD(provider, generationModel);
  const outputPriceUSD = getModelOutputPriceUSD(provider, generationModel);
  const genCostEUR =
    ((GEN_INPUT_TOKENS / 1_000_000) * inputPriceUSD +
     (GEN_OUTPUT_TOKENS / 1_000_000) * outputPriceUSD) * 0.92;
  const genCostLabel =
    genCostEUR < 0.01
      ? '<€0.01'
      : `~€${genCostEUR.toFixed(2)}`;

  const modelName =
    provider === 'anthropic'
      ? 'Claude Sonnet 4.5'
      : (OPENROUTER_MODELS.find((m) => m.id === generationModel)?.name ?? generationModel);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#111111] mb-1">Klausur konfigurieren</h2>
        <p className="text-sm text-[#7d7785]">
          Wähle, was du generieren möchtest
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => { setMode('random'); setSelectedTypeId(null); }}
          className={`text-left p-5 rounded-lg border-2 transition-all duration-200 ${
            mode === 'random'
              ? 'border-[#6b8dff] bg-[#eef2ff]'
              : 'border-[#ddd7cd] hover:border-[#c7c0cf] bg-white/70'
          }`}
        >
          <div className="text-2xl mb-2">📝</div>
          <h3 className="font-semibold text-[#111111] mb-1">Neue Probeklausur</h3>
          <p className="text-xs text-[#7d7785]">
            Vollständige neue Klausur basierend auf deinen Altklausuren
          </p>
        </button>

        <button
          onClick={() => setMode('type-training')}
          className={`text-left p-5 rounded-lg border-2 transition-all duration-200 ${
            mode === 'type-training'
              ? 'border-[#6b8dff] bg-[#eef2ff]'
              : 'border-[#ddd7cd] hover:border-[#c7c0cf] bg-white/70'
          }`}
        >
          <div className="text-2xl mb-2">🎯</div>
          <h3 className="font-semibold text-[#111111] mb-1">Aufgabentyp trainieren</h3>
          <p className="text-xs text-[#7d7785]">
            5 Variationen eines Aufgabentyps zum gezielten Üben
          </p>
        </button>
      </div>

      {mode === 'random' && (
        <div className="animate-slide-up">
          <h3 className="text-sm font-medium text-[#57515e] mb-3">Schwierigkeit</h3>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { id: 'easier', label: 'Einfacher', desc: 'Kleinere Zahlen, mehr Hinweise, weniger Kombinationen', icon: '📗' },
                { id: 'same',   label: 'Gleich schwer', desc: 'Entspricht dem Niveau deiner Altklausuren', icon: '📘' },
                { id: 'harder', label: 'Schwerer', desc: 'Komplexere Aufgaben, keine Hinweise, Kombinationsaufgaben', icon: '📕' },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                  difficulty === d.id
                    ? 'border-[#6b8dff] bg-[#eef2ff]'
                    : 'border-[#ddd7cd] hover:border-[#c7c0cf] bg-white/70'
                }`}
              >
                <div className="text-xl mb-1">{d.icon}</div>
                <p className="text-sm font-medium text-[#111111]">{d.label}</p>
                <p className="text-xs text-[#7d7785] mt-1">{d.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'type-training' && (
        <div className="animate-slide-up">
          <h3 className="text-sm font-medium text-[#57515e] mb-3">Aufgabentyp wählen</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.taskTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTypeId(t.id)}
                className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-all duration-200 ${
                  selectedTypeId === t.id
                    ? 'border-[#6b8dff] bg-[#eef2ff] text-[#2f5bd2]'
                    : 'border-[#d5d0c6] text-[#4c4754] hover:border-[#bdb6c5] bg-white/70'
                }`}
              >
                {t.hasdiagramContext && <span>📊</span>}
                {t.name}
                <span className="text-xs text-[#8b8593]">({t.avgPoints} Pkt)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Topic filter — only for full exam mode */}
      {mode === 'random' && analysis.topicAreas.length > 0 && (
        <div className="animate-slide-up">
          <button
            onClick={() => setShowTopicFilter((v) => !v)}
            className="flex items-center gap-2 text-sm text-[#7d7785] hover:text-[#4c4754] transition-colors"
          >
            <span>{showTopicFilter ? '▲' : '▼'}</span>
            Themenbereiche filtern
            {excludedTopics.length > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">
                {excludedTopics.length} ausgeschlossen
              </span>
            )}
          </button>

          {showTopicFilter && (
            <div className="mt-3 app-surface rounded-[1.3rem] p-4">
              <p className="text-xs text-[#7d7785] mb-3">
                Markierte Themen werden bei der Generierung ausgeschlossen.
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.topicAreas.map((topic) => {
                  const excluded = excludedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      onClick={() => toggleTopic(topic)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${
                        excluded
                          ? 'border-red-500/40 bg-red-500/10 text-red-500 line-through'
                          : 'border-[#d5d0c6] text-[#4c4754] hover:border-[#bdb6c5] bg-white/70'
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
              {excludedTopics.length > 0 && (
                <button
                  onClick={() => setExcludedTopics([])}
                  className="mt-3 text-xs text-[#8b8593] hover:text-[#4c4754] transition-colors"
                >
                  Alle zurücksetzen
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between app-surface rounded-[1.3rem] p-4">
        <p className="text-xs text-[#7d7785]">
          Generierung: <span className="text-[#3e3944] font-mono">{genCostLabel}</span>
          <span className="text-[#8b8593] ml-2">· {modelName} · nur JSON, keine PDFs</span>
        </p>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!canGenerate || isLoading}
        className="app-primary-btn w-full disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generiere...
          </>
        ) : (
          'Klausur generieren →'
        )}
      </button>
    </div>
  );
}
