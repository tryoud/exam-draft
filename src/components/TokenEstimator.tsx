import type { ExtractedFile, Provider } from '../lib/types';
import {
  estimateTotalTokens,
  estimateTypicalWorkflowCostEURValue,
  formatEURApprox,
  getCostLevel,
  formatTokens,
} from '../lib/tokenEstimator';
import { OPENROUTER_MODELS } from '../lib/anthropic';
import type { Locale } from '../lib/i18n';
import { appCopy } from '../lib/i18n';

interface TokenEstimatorProps {
  examFiles: ExtractedFile[];
  slideFiles: ExtractedFile[];
  includeSlides: boolean;
  examCount: number;
  slideCount: number;
  examTextCount: number;
  examImageCount: number;
  provider: Provider;
  analysisModel: string;
  generationModel: string;
  locale?: Locale;
}

export default function TokenEstimator({
  examFiles,
  slideFiles,
  includeSlides,
  examCount,
  slideCount,
  examTextCount,
  examImageCount,
  provider,
  analysisModel,
  generationModel,
  locale = 'de',
}: TokenEstimatorProps) {
  const copy = appCopy[locale].token;
  const totalTokens = estimateTotalTokens(examFiles, slideFiles, includeSlides);
  const cost = formatEURApprox(
    estimateTypicalWorkflowCostEURValue(totalTokens, provider, analysisModel, generationModel)
  );
  const level = getCostLevel(totalTokens, provider, analysisModel, generationModel);
  const examTokens = examFiles.reduce((s, f) => s + f.tokenEstimate, 0);
  const slideTokens = includeSlides ? slideFiles.reduce((s, f) => s + f.tokenEstimate, 0) : 0;

  const modelName =
    provider === 'examdraft'
      ? 'ExamDraft Credits'
      : provider === 'anthropic'
      ? 'Claude Sonnet 4'
      : (OPENROUTER_MODELS.find((m) => m.id === generationModel)?.name ?? generationModel);

  const levelConfig = {
    low:    { label: copy.low,  color: 'text-green-400', dots: '●●●○○' },
    medium: { label: copy.medium,  color: 'text-amber-400', dots: '●●●●○' },
    high:   { label: copy.high,    color: 'text-red-400',   dots: '●●●●●' },
  }[level];

  return (
    <div className="app-surface rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#3e3944]">
          {copy.title}
        </h3>
        <span className="text-xs text-[#8b8593] font-mono">{modelName}</span>
      </div>

      <div className="space-y-2 text-sm font-mono mb-4">
        <div className="flex justify-between items-start">
          <span className="text-[#706a78]">
            {copy.oldExams}:{' '}
            <span className="text-[#3e3944]">{examCount} {examCount === 1 ? copy.file : copy.files}</span>
          </span>
          <span className="text-[#3e3944]">~{formatTokens(examTokens)} Tokens</span>
        </div>
        {examCount > 0 && (examTextCount > 0 || examImageCount > 0) && (
          <div className="pl-3 text-xs text-[#8b8593]">
            → {examTextCount > 0 && `${examTextCount}× ${copy.textMode}`}
            {examTextCount > 0 && examImageCount > 0 && ', '}
            {examImageCount > 0 && `${examImageCount}× ${copy.imageMode}`}
          </div>
        )}

        {includeSlides && (
          <div className="flex justify-between items-start">
            <span className="text-[#706a78]">
              {copy.lectureSlides}:{' '}
              <span className="text-[#3e3944]">{slideCount} {slideCount === 1 ? copy.file : copy.files}</span>
            </span>
            <span className="text-[#3e3944]">~{formatTokens(slideTokens)} Tokens</span>
          </div>
        )}

        <div className="border-t border-[#e3ddd3] pt-2 mt-2 flex justify-between items-center">
          <span className="text-[#3e3944] font-semibold">{copy.total}:</span>
          <div className="flex items-center gap-3">
            <span className="text-[#3e3944]">~{formatTokens(totalTokens)} Tokens</span>
            {provider === 'examdraft' ? (
              <span className="font-semibold text-[#2e7d4f]">{copy.analysisCredit}</span>
            ) : (
              <>
                <span className={`font-semibold ${levelConfig.color}`}>{cost}</span>
                <span className={`text-xs ${levelConfig.color}`}>
                  {levelConfig.dots} {levelConfig.label}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-[#f8f4ee] rounded-xl p-3">
        <span className="text-[#2f5bd2] text-xs shrink-0">ℹ</span>
        <p className="text-xs text-[#8b8593]">
          {copy.extracted} {provider === 'examdraft' ? copy.examdraftHint : copy.byokHint}
        </p>
      </div>
    </div>
  );
}
