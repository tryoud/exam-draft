import type { ExtractedFile, Provider } from '../lib/types';
import {
  estimateTotalTokens,
  estimateTypicalWorkflowCostEURValue,
  formatEURApprox,
  getCostLevel,
  formatTokens,
} from '../lib/tokenEstimator';
import { OPENROUTER_MODELS } from '../lib/anthropic';

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
}: TokenEstimatorProps) {
  const totalTokens = estimateTotalTokens(examFiles, slideFiles, includeSlides);
  const cost = formatEURApprox(
    estimateTypicalWorkflowCostEURValue(totalTokens, provider, analysisModel, generationModel)
  );
  const level = getCostLevel(totalTokens, provider, analysisModel, generationModel);
  const examTokens = examFiles.reduce((s, f) => s + f.tokenEstimate, 0);
  const slideTokens = includeSlides ? slideFiles.reduce((s, f) => s + f.tokenEstimate, 0) : 0;

  const modelName =
    provider === 'anthropic'
      ? 'Claude Sonnet 4'
      : (OPENROUTER_MODELS.find((m) => m.id === generationModel)?.name ?? generationModel);

  const levelConfig = {
    low:    { label: 'günstig',  color: 'text-green-400', dots: '●●●○○' },
    medium: { label: 'moderat',  color: 'text-amber-400', dots: '●●●●○' },
    high:   { label: 'teuer',    color: 'text-red-400',   dots: '●●●●●' },
  }[level];

  return (
    <div className="app-surface rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#3e3944]">
          Konservative Gesamtkostenschätzung
        </h3>
        <span className="text-xs text-[#8b8593] font-mono">{modelName}</span>
      </div>

      <div className="space-y-2 text-sm font-mono mb-4">
        <div className="flex justify-between items-start">
          <span className="text-[#706a78]">
            Altklausuren:{' '}
            <span className="text-[#3e3944]">{examCount} {examCount === 1 ? 'Datei' : 'Dateien'}</span>
          </span>
          <span className="text-[#3e3944]">~{formatTokens(examTokens)} Tokens</span>
        </div>
        {examCount > 0 && (examTextCount > 0 || examImageCount > 0) && (
          <div className="pl-3 text-xs text-[#8b8593]">
            → {examTextCount > 0 && `${examTextCount}× Text-Modus`}
            {examTextCount > 0 && examImageCount > 0 && ', '}
            {examImageCount > 0 && `${examImageCount}× Bild-Modus`}
          </div>
        )}

        {includeSlides && (
          <div className="flex justify-between items-start">
            <span className="text-[#706a78]">
              Vorlesungsfolien:{' '}
              <span className="text-[#3e3944]">{slideCount} {slideCount === 1 ? 'Datei' : 'Dateien'}</span>
            </span>
            <span className="text-[#3e3944]">~{formatTokens(slideTokens)} Tokens</span>
          </div>
        )}

        <div className="border-t border-[#e3ddd3] pt-2 mt-2 flex justify-between items-center">
          <span className="text-[#3e3944] font-semibold">Gesamt:</span>
          <div className="flex items-center gap-3">
            <span className="text-[#3e3944]">~{formatTokens(totalTokens)} Tokens</span>
            <span className={`font-semibold ${levelConfig.color}`}>{cost}</span>
            <span className={`text-xs ${levelConfig.color}`}>
              {levelConfig.dots} {levelConfig.label}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-[#f8f4ee] rounded-xl p-3">
        <span className="text-[#2f5bd2] text-xs shrink-0">ℹ</span>
        <p className="text-xs text-[#8b8593]">
          Text wird lokal extrahiert — keine Bilder werden gesendet außer bei aktiviertem
          Bild-Modus. Die Preisschätzung rechnet bewusst etwas höher, damit sie eher zu hoch als zu niedrig ist.
        </p>
      </div>
    </div>
  );
}
