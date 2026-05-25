import { useState, useEffect, useRef } from 'react';
import { showToast } from './Toast';
import {
  OPENROUTER_MODELS,
  DEFAULT_OPENROUTER_GENERATION_MODEL,
  DEFAULT_OPENROUTER_ANALYSIS_MODEL,
} from '../lib/anthropic';
import type { Provider } from '../lib/types';
import { TYPICAL_PRICE_LABEL } from '../lib/tokenEstimator';
import type { Locale } from '../lib/i18n';
import { appCopy } from '../lib/i18n';

interface ApiKeySetupProps {
  onSaved: (provider: Provider, key: string, generationModel: string, analysisModel: string) => void;
  mode: 'fullscreen' | 'drawer';
  onClose?: () => void;
  locale?: Locale;
}

function storage(key: string): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
}

function LanguageSwitch({ locale }: { locale: Locale }) {
  return (
    <div className="app-language-switch mx-auto mt-5" aria-label={locale === 'en' ? 'Language selection' : 'Sprachauswahl'}>
      <a
        href="/app?lang=de"
        onClick={() => localStorage.setItem('examdraft_locale', 'de')}
        className={`app-language-option ${locale === 'de' ? 'is-active' : ''}`}
        aria-current={locale === 'de' ? 'true' : undefined}
      >
        DE
      </a>
      <a
        href="/en/app"
        onClick={() => localStorage.setItem('examdraft_locale', 'en')}
        className={`app-language-option ${locale === 'en' ? 'is-active' : ''}`}
        aria-current={locale === 'en' ? 'true' : undefined}
      >
        EN
      </a>
    </div>
  );
}

export default function ApiKeySetup({ onSaved, mode, onClose, locale = 'de' }: ApiKeySetupProps) {
  const copy = appCopy[locale].apiKey;
  const tagline = appCopy[locale].tagline;
  const storedProvider = storage('examdraft_provider');
  const [provider, setProvider] = useState<Provider>(
    storedProvider === 'anthropic' ? 'anthropic' : 'openrouter'
  );
  const [anthropicKey, setAnthropicKey] = useState(storage('examdraft_api_key') ?? '');
  const [openrouterKey, setOpenrouterKey] = useState(storage('examdraft_openrouter_key') ?? '');
  const [openrouterGenModel, setOpenrouterGenModel] = useState(
    storage('examdraft_openrouter_model') ?? DEFAULT_OPENROUTER_GENERATION_MODEL
  );
  const [openrouterAnalysisModel, setOpenrouterAnalysisModel] = useState(
    storage('examdraft_openrouter_analysis_model') ?? DEFAULT_OPENROUTER_ANALYSIS_MODEL
  );
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [provider]);

  function handleSave() {
    setError('');

    if (provider === 'anthropic') {
      if (!anthropicKey.startsWith('sk-ant-')) {
        setError(copy.invalidAnthropic);
        return;
      }
      localStorage.setItem('examdraft_api_key', anthropicKey);
      localStorage.setItem('examdraft_provider', 'anthropic');
      onSaved('anthropic', anthropicKey, openrouterGenModel, openrouterAnalysisModel);
    } else {
      if (!openrouterKey.startsWith('sk-or-')) {
        setError(copy.invalidOpenrouter);
        return;
      }
      localStorage.setItem('examdraft_openrouter_key', openrouterKey);
      localStorage.setItem('examdraft_openrouter_model', openrouterGenModel);
      localStorage.setItem('examdraft_openrouter_analysis_model', openrouterAnalysisModel);
      localStorage.setItem('examdraft_provider', 'openrouter');
      onSaved('openrouter', openrouterKey, openrouterGenModel, openrouterAnalysisModel);
    }

    setSaved(true);
    showToast(copy.savedToast, 'success');
    setTimeout(() => onClose?.(), 800);
  }

  const card = (
    <div className="app-surface auth-shell-card rounded-[1.8rem] p-6 sm:p-8 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#eef2ff] flex items-center justify-center text-[#2f5bd2] text-xl border border-[#d9e3ff]">
          🔑
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#111111]">{copy.title}</h2>
          <p className="text-xs text-[#7d7785]">{copy.subtitle}</p>
        </div>
      </div>

      {/* Provider tabs */}
      <div className="flex rounded-xl overflow-hidden border border-[#d8d2c8] bg-white/65 mb-6">
        <button
          onClick={() => { setProvider('openrouter'); setError(''); setSaved(false); }}
          className={`flex-1 py-2 text-sm font-medium transition-all ${
            provider === 'openrouter'
              ? 'bg-[#6b8dff] text-white'
              : 'text-[#6f6a78] hover:text-[#19161d]'
          }`}
        >
          OpenRouter
        </button>
        <button
          onClick={() => { setProvider('anthropic'); setError(''); setSaved(false); }}
          className={`flex-1 py-2 text-sm font-medium transition-all ${
            provider === 'anthropic'
              ? 'bg-[#6b8dff] text-white'
              : 'text-[#6f6a78] hover:text-[#19161d]'
          }`}
        >
          Anthropic
        </button>
      </div>

      {provider === 'anthropic' ? (
        <>
          <p className="text-sm text-[#5d5866] mb-4">
            {copy.anthropicIntro}
          </p>
          <div className="mb-4">
            <input
              ref={inputRef}
              type="password"
              value={anthropicKey}
              onChange={(e) => { setAnthropicKey(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="sk-ant-api03-..."
              className="w-full bg-[#fcfbf8] border border-[#ddd7cd] focus:border-[#6b8dff] focus:outline-none rounded-xl px-3 py-2.5 text-[#19161d] font-mono text-sm transition-colors"
            />
            {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
          </div>
          <div className="mb-5 bg-[#f8f4ee] border border-[#e5dfd5] rounded-xl p-3">
            <p className="text-xs text-[#7d7785]">
              <span className="text-[#3e3944] font-medium">{copy.model}:</span> claude-sonnet-4-20250514
              <span className="text-[#8b8593] ml-2">· {copy.typicalTotal}: {TYPICAL_PRICE_LABEL} {copy.perRun}</span>
            </p>
          </div>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[#2f5bd2] hover:text-[#2448a8] text-sm mb-4 transition-colors"
          >
            {copy.createAnthropicKey}
          </a>
        </>
      ) : (
        <>
          <p className="text-sm text-[#5d5866] mb-4">
            {copy.openrouterIntro}
          </p>

          <div className="mb-4">
            <label className="block text-xs text-[#7d7785] mb-1.5">API-Key</label>
            <input
              ref={inputRef}
              type="password"
              value={openrouterKey}
              onChange={(e) => { setOpenrouterKey(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="sk-or-v1-..."
              className="w-full bg-[#fcfbf8] border border-[#ddd7cd] focus:border-[#6b8dff] focus:outline-none rounded-xl px-3 py-2.5 text-[#19161d] font-mono text-sm transition-colors"
            />
            {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[#7d7785]">{copy.analysisModel}</label>
              <span className="text-xs text-[#2e7d4f]">{copy.cheapLargeInput}</span>
            </div>
            <select
              value={openrouterAnalysisModel}
              onChange={(e) => setOpenrouterAnalysisModel(e.target.value)}
              className="w-full bg-[#fcfbf8] border border-[#ddd7cd] focus:border-[#6b8dff] focus:outline-none rounded-xl px-3 py-2.5 text-[#19161d] text-sm transition-colors"
            >
              {OPENROUTER_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <p className="text-xs text-[#8b8593] mt-1">{copy.analysisHint}</p>
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[#7d7785]">{copy.generationModel}</label>
              <span className="text-xs text-[#b7791f]">{copy.capableCreative}</span>
            </div>
            <select
              value={openrouterGenModel}
              onChange={(e) => setOpenrouterGenModel(e.target.value)}
              className="w-full bg-[#fcfbf8] border border-[#ddd7cd] focus:border-[#6b8dff] focus:outline-none rounded-xl px-3 py-2.5 text-[#19161d] text-sm transition-colors"
            >
              {OPENROUTER_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <p className="text-xs text-[#8b8593] mt-1">{copy.generationHint}</p>
          </div>

          <div className="mb-4 bg-[#f8f4ee] border border-[#e5dfd5] rounded-xl p-3">
            <p className="text-xs text-[#7d7785]">
              ⚠ {copy.openrouterPdfWarning}
            </p>
          </div>

          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[#2f5bd2] hover:text-[#2448a8] text-sm mb-4 transition-colors"
          >
            {copy.createOpenrouterKey}
          </a>
        </>
      )}

      <button
        onClick={handleSave}
        disabled={saved}
        className="app-primary-btn w-full disabled:bg-[#2e7d4f] text-white px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
      >
        {saved ? (
          <><span className="text-lg">✓</span> {copy.saved}</>
        ) : (
          copy.save
        )}
      </button>

      {onClose && (
        <button
          onClick={onClose}
          className="w-full mt-3 text-[#8b8593] hover:text-[#4c4754] text-sm transition-colors py-1"
        >
          {copy.close}
        </button>
      )}
    </div>
  );

  if (mode === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 app-body flex w-screen max-w-[100vw] items-center justify-center overflow-x-hidden overflow-y-auto px-4 py-16">
        <div className="auth-shell-card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#111111] mb-2">ExamDraft</h1>
            <p className="mx-auto max-w-xs px-2 text-[#7d7785] text-sm leading-6">{tagline}</p>
            <LanguageSwitch locale={locale} />
          </div>
          {card}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      {card}
    </div>
  );
}
