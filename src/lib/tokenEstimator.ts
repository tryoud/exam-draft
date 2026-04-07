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

export function estimateCostEUR(
  tokens: number,
  provider: Provider = 'anthropic',
  model = ''
): string {
  const priceUSD = getModelInputPriceUSD(provider, model);
  const eur = (tokens / 1_000_000) * priceUSD * EUR_RATE;
  if (eur < 0.01) return '<€0.01';
  return `~€${eur.toFixed(2)}`;
}

export function getCostLevel(
  tokens: number,
  provider: Provider = 'anthropic',
  model = ''
): 'low' | 'medium' | 'high' {
  const priceUSD = getModelInputPriceUSD(provider, model);
  const eur = (tokens / 1_000_000) * priceUSD * EUR_RATE;
  if (eur < 0.10) return 'low';
  if (eur < 0.50) return 'medium';
  return 'high';
}

export function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`;
}
