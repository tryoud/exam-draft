import { useEffect, useState } from 'react';
import type { AnalysisResult, Provider } from '../lib/types';
import { estimateGenerationCostEURValue, formatEURApprox } from '../lib/tokenEstimator';
import { OPENROUTER_MODELS } from '../lib/anthropic';
import type { Locale } from '../lib/i18n';
import { appCopy } from '../lib/i18n';
import { trackEvent } from '../lib/analytics';

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
  credits?: number;
  accountPlan?: 'free' | 'credits' | 'byok';
  onBuyCredits?: () => void;
  onUseByok?: () => void;
  locale?: Locale;
}

export default function ExamConfigurator({
  analysis,
  onGenerate,
  isLoading,
  provider,
  generationModel,
  credits = 0,
  accountPlan = 'free',
  onBuyCredits,
  onUseByok,
  locale = 'de',
}: ExamConfiguratorProps) {
  const copy = appCopy[locale].configurator;
  const [mode, setMode] = useState<'random' | 'type-training' | null>(null);
  const [difficulty, setDifficulty] = useState<'easier' | 'same' | 'harder'>('same');
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [excludedTopics, setExcludedTopics] = useState<string[]>([]);
  const [showTopicFilter, setShowTopicFilter] = useState(false);

  const canGenerate =
    mode === 'random' || (mode === 'type-training' && selectedTypeId !== null);
  const generationCredits = mode === 'type-training' ? 2 : 4;
  const lacksCredits = provider === 'examdraft' && credits < generationCredits;
  const generationBlocked = lacksCredits;

  useEffect(() => {
    if (generationBlocked && mode) {
      trackEvent('paywall_shown', {
        mode,
        provider,
        credits,
        accountPlan,
        requiredCredits: generationCredits,
      });
    }
  }, [accountPlan, credits, generationBlocked, generationCredits, mode, provider]);

  function toggleTopic(topic: string) {
    setExcludedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  function handleGenerate() {
    if (!mode || !canGenerate) return;
    onGenerate(mode, difficulty, selectedTypeId ?? undefined, excludedTopics.length ? excludedTopics : undefined);
  }

  const modelName =
    provider === 'examdraft'
      ? 'ExamDraft Credits'
      : provider === 'anthropic'
      ? 'Claude Sonnet 4.5'
      : (OPENROUTER_MODELS.find((m) => m.id === generationModel)?.name ?? generationModel);

  const generationCostLabel = formatEURApprox(estimateGenerationCostEURValue(provider, generationModel));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#111111] mb-1">{copy.title}</h2>
        <p className="text-sm text-[#7d7785]">
          {copy.subtitle}
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
          <h3 className="font-semibold text-[#111111] mb-1">{copy.fullExam}</h3>
          <p className="text-xs text-[#7d7785]">
            {copy.fullExamDesc}
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
          <h3 className="font-semibold text-[#111111] mb-1">{copy.typeTraining}</h3>
          <p className="text-xs text-[#7d7785]">
            {copy.typeTrainingDesc}
          </p>
        </button>
      </div>

      {mode === 'random' && (
        <div className="animate-slide-up">
          <h3 className="text-sm font-medium text-[#57515e] mb-3">{copy.difficulty}</h3>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { id: 'easier', label: copy.easier, desc: copy.easierDesc, icon: '📗' },
                { id: 'same',   label: copy.same, desc: copy.sameDesc, icon: '📘' },
                { id: 'harder', label: copy.harder, desc: copy.harderDesc, icon: '📕' },
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
          <h3 className="text-sm font-medium text-[#57515e] mb-3">{copy.chooseType}</h3>
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
            {copy.filterTopics}
            {excludedTopics.length > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">
                {excludedTopics.length} {copy.excluded}
              </span>
            )}
          </button>

          {showTopicFilter && (
            <div className="mt-3 app-surface rounded-[1.3rem] p-4">
              <p className="text-xs text-[#7d7785] mb-3">
                {copy.filterHint}
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
                  {copy.resetAll}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between app-surface rounded-[1.3rem] p-4">
        <p className="text-xs text-[#7d7785]">
          {provider === 'examdraft' ? `${copy.usage}: ${generationCredits} Credits` : <>{copy.typicalPrice}: <span className="text-[#3e3944] font-mono">{generationCostLabel}</span></>}
          <span className="text-[#8b8593] ml-2">· {modelName} · {copy.generationNote}</span>
        </p>
      </div>

      {generationBlocked && (
        <div className="app-surface rounded-[1.3rem] p-4 border border-[#ead6a2] bg-[#fff8e8]">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-[#5f4618]">
              {copy.paywallTitle}
            </p>
            <span className="shrink-0 rounded-full bg-[#5f4618]/10 px-2.5 py-0.5 text-xs font-semibold text-[#5f4618]">
              {generationCredits} Credits
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8a7350]">
            {copy.paywallText}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onBuyCredits}
              className="app-primary-btn rounded-xl px-4 py-2 text-sm font-medium transition-all"
            >
              {copy.buyCredits}
            </button>
            <button
              type="button"
              onClick={onUseByok}
              className="app-secondary-btn rounded-xl px-4 py-2 text-sm transition-all"
            >
              {copy.useByok}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!canGenerate || isLoading || generationBlocked}
        className="app-primary-btn w-full disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {copy.generating}
          </>
        ) : (
          copy.generate
        )}
      </button>
    </div>
  );
}
