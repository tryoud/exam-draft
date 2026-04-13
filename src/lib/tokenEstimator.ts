import type { ExtractedFile, Provider } from './types';

// Input token pricing in USD per million tokens
const MODEL_INPUT_PRICES_USD: Record<string, number> = {
  anthropic:                            3.00,
  'anthropic/claude-sonnet-4-5':        3.00,
  'anthropic/claude-3.5-sonnet':        3.00,
  'openai/gpt-4o':                      2.50,
  'openai/gpt-4o-mini':                 0.15,
  'google/gemini-2.5-flash':            0.15,
  'meta-llama/llama-3.3-70b-instruct':  0.23,
};

// Output token pricing in USD per million tokens (typically 3–5× the input price)
const MODEL_OUTPUT_PRICES_USD: Record<string, number> = {
  anthropic:                            15.00,
  'anthropic/claude-sonnet-4-5':        15.00,
  'anthropic/claude-3.5-sonnet':        15.00,
  'openai/gpt-4o':                      10.00,
  'openai/gpt-4o-mini':                  0.60,
  'google/gemini-2.5-flash':             3.50,
  'meta-llama/llama-3.3-70b-instruct':   0.90,
};

const EUR_RATE = 0.92;
export const TYPICAL_PRICE_EUR = 0.40;
export const TYPICAL_PRICE_LABEL = '~€0.40';
export const GENERATION_INPUT_TOKENS = 10_500;
export const GENERATION_OUTPUT_TOKENS = 25_000;
const ESTIMATE_SAFETY_MULTIPLIER = 1.15;

export function getModelInputPriceUSD(provider: Provider, model: string): number {
  if (provider === 'anthropic') return MODEL_INPUT_PRICES_USD['anthropic'] ?? 3.00;
  return MODEL_INPUT_PRICES_USD[model] ?? 3.00;
}

export function getModelOutputPriceUSD(provider: Provider, model: string): number {
  if (provider === 'anthropic') return MODEL_OUTPUT_PRICES_USD['anthropic'] ?? 15.00;
  return MODEL_OUTPUT_PRICES_USD[model] ?? 15.00;
}

export function estimateTotalTokens(
  examFiles: ExtractedFile[],
  slideFiles: ExtractedFile[],
  includeSlides: boolean
): number {
  const examTokens = examFiles.reduce((s, f) => s + f.tokenEstimate, 0);
  const slideTokens = includeSlides
    ? slideFiles.reduce((s, f) => s + f.tokenEstimate, 0)
    : 0;
  return examTokens + slideTokens + 300; // ~300 tokens for instruction block overhead
}

export function formatEURApprox(eur: number): string {
  if (eur < 0.01) return '<€0.01';
  return `~€${eur.toFixed(2)}`;
}

export function estimateInputCostEURValue(
  tokens: number,
  provider: Provider = 'anthropic',
  model = ''
): number {
  const priceUSD = getModelInputPriceUSD(provider, model);
  return (tokens / 1_000_000) * priceUSD * EUR_RATE;
}

export function estimateGenerationCostEURValue(
  provider: Provider = 'anthropic',
  model = ''
): number {
  const inputPriceUSD = getModelInputPriceUSD(provider, model);
  const outputPriceUSD = getModelOutputPriceUSD(provider, model);
  return (
    ((GENERATION_INPUT_TOKENS / 1_000_000) * inputPriceUSD) +
    ((GENERATION_OUTPUT_TOKENS / 1_000_000) * outputPriceUSD)
  ) * EUR_RATE;
}

export function estimateTypicalWorkflowCostEURValue(
  analysisTokens: number,
  provider: Provider = 'anthropic',
  analysisModel = '',
  generationModel = analysisModel
): number {
  const analysisCostEUR = estimateInputCostEURValue(analysisTokens, provider, analysisModel);
  const generationCostEUR = estimateGenerationCostEURValue(provider, generationModel);
  return (analysisCostEUR + generationCostEUR) * ESTIMATE_SAFETY_MULTIPLIER;
}

export function estimateCostEUR(
  tokens: number,
  provider: Provider = 'anthropic',
  model = ''
): string {
  return formatEURApprox(estimateInputCostEURValue(tokens, provider, model));
}

export function getCostLevel(
  tokens: number,
  provider: Provider = 'anthropic',
  analysisModel = '',
  generationModel = analysisModel
): 'low' | 'medium' | 'high' {
  const eur = estimateTypicalWorkflowCostEURValue(tokens, provider, analysisModel, generationModel);
  if (eur < 0.15) return 'low';
  if (eur < 0.35) return 'medium';
  return 'high';
}

export function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`;
}
