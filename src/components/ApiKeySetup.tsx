import { useState, useEffect, useRef } from 'react';
import { showToast } from './Toast';
import {
  OPENROUTER_MODELS,
  DEFAULT_OPENROUTER_GENERATION_MODEL,
  DEFAULT_OPENROUTER_ANALYSIS_MODEL,
} from '../lib/anthropic';
import type { Provider } from '../lib/types';
import { TYPICAL_PRICE_LABEL } from '../lib/tokenEstimator';

interface ApiKeySetupProps {
  onSaved: (provider: Provider, key: string, generationModel: string, analysisModel: string) => void;
  mode: 'fullscreen' | 'drawer';
  onClose?: () => void;
}

function storage(key: string): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
}

export default function ApiKeySetup({ onSaved, mode, onClose }: ApiKeySetupProps) {
  const [provider, setProvider] = useState<Provider>(
    (storage('examdraft_provider') as Provider) ?? 'openrouter'
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
        setError('Der Key muss mit "sk-ant-" beginnen.');
        return;
      }
      localStorage.setItem('examdraft_api_key', anthropicKey);
      localStorage.setItem('examdraft_provider', 'anthropic');
      onSaved('anthropic', anthropicKey, openrouterGenModel, openrouterAnalysisModel);
    } else {
      if (!openrouterKey.startsWith('sk-or-')) {
        setError('Der Key muss mit "sk-or-" beginnen.');
        return;
      }
      localStorage.setItem('examdraft_openrouter_key', openrouterKey);
      localStorage.setItem('examdraft_openrouter_model', openrouterGenModel);
      localStorage.setItem('examdraft_openrouter_analysis_model', openrouterAnalysisModel);
      localStorage.setItem('examdraft_provider', 'openrouter');
      onSaved('openrouter', openrouterKey, openrouterGenModel, openrouterAnalysisModel);
    }

    setSaved(true);
    showToast('Einstellungen gespeichert', 'success');
    setTimeout(() => onClose?.(), 800);
  }

  const card = (
    <div className="app-surface rounded-[1.8rem] p-8 w-full max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#eef2ff] flex items-center justify-center text-[#2f5bd2] text-xl border border-[#d9e3ff]">
          🔑
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#111111]">API-Einstellungen</h2>
          <p className="text-xs text-[#7d7785]">Wird nur lokal gespeichert</p>
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
            Alle API-Anfragen gehen direkt von deinem Browser zu Anthropic. Dein Key wird nie an ExamDraft-Server übertragen.
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
              <span className="text-[#3e3944] font-medium">Modell:</span> claude-sonnet-4-20250514
              <span className="text-[#8b8593] ml-2">· Typischer Gesamtpreis: {TYPICAL_PRICE_LABEL} pro Durchlauf</span>
            </p>
          </div>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[#2f5bd2] hover:text-[#2448a8] text-sm mb-4 transition-colors"
          >
            Key erstellen auf console.anthropic.com →
          </a>
        </>
      ) : (
        <>
          <p className="text-sm text-[#5d5866] mb-4">
            OpenRouter ermöglicht Zugriff auf viele Modelle mit einem einzigen API-Key. Alle Anfragen gehen direkt von deinem Browser zu OpenRouter.
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
              <label className="text-xs text-[#7d7785]">Analyse-Modell</label>
              <span className="text-xs text-[#2e7d4f]">günstig — großer Input</span>
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
            <p className="text-xs text-[#8b8593] mt-1">Liest PDF-Texte aus → einfache Klassifikation, günstiges Modell reicht.</p>
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[#7d7785]">Generations-Modell</label>
              <span className="text-xs text-[#b7791f]">fähig — kreativer Output</span>
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
            <p className="text-xs text-[#8b8593] mt-1">Erstellt Aufgaben + Lösungen → bessere Modelle = bessere Klausuren.</p>
          </div>

          <div className="mb-4 bg-[#f8f4ee] border border-[#e5dfd5] rounded-xl p-3">
            <p className="text-xs text-[#7d7785]">
              ⚠ PDF-Bild-Modus wird von OpenRouter nicht unterstützt — Dateien werden als Text gesendet.
            </p>
          </div>

          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[#2f5bd2] hover:text-[#2448a8] text-sm mb-4 transition-colors"
          >
            Key erstellen auf openrouter.ai →
          </a>
        </>
      )}

      <button
        onClick={handleSave}
        disabled={saved}
        className="app-primary-btn w-full disabled:bg-[#2e7d4f] text-white px-4 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
      >
        {saved ? (
          <><span className="text-lg">✓</span> Gespeichert</>
        ) : (
          'Speichern'
        )}
      </button>

      {onClose && (
        <button
          onClick={onClose}
          className="w-full mt-3 text-[#8b8593] hover:text-[#4c4754] text-sm transition-colors py-1"
        >
          Schließen
        </button>
      )}
    </div>
  );

  if (mode === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 app-body flex items-center justify-center px-4 py-16 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#111111] mb-2">ExamDraft</h1>
            <p className="text-[#7d7785] text-sm">Lerne klüger. Übe smarter. Bestehe sicher.</p>
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
