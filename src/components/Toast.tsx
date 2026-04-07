import { useState, useEffect, useCallback } from 'react';

export const ERROR_MESSAGES: Record<string, string> = {
  NO_API_KEY: 'Kein API-Key gesetzt. Bitte trage deinen Key ein.',
  INVALID_API_KEY: 'Ungültiger API-Key. Prüfe deinen Key auf console.anthropic.com.',
  OPENROUTER_INVALID_API_KEY: 'Ungültiger API-Key. Prüfe deinen Key auf openrouter.ai/keys.',
  RATE_LIMIT: 'API-Limit erreicht. Bitte kurz warten.',
  API_OVERLOADED: 'Anthropic ist überlastet. Bitte in 30 Sekunden erneut versuchen.',
  API_ERROR: 'API-Fehler. Bitte erneut versuchen.',
  FILE_TOO_LARGE: 'Datei zu groß (max. 32MB pro PDF).',
  TOO_MANY_EXAM_FILES: 'Maximal 10 Altklausuren erlaubt.',
  TOO_MANY_SLIDE_FILES: 'Maximal 5 Vorlesungsfolien erlaubt.',
  INVALID_FILE_TYPE: 'Nur PDF-Dateien werden unterstützt.',
  PDF_PARSE_ERROR: 'PDF konnte nicht gelesen werden. Ist die Datei beschädigt?',
  PDF_WORKER_ERROR: 'PDF-Worker konnte nicht geladen werden. Bitte Seite neu laden.',
  JSON_PARSE_ERROR: 'Fehler beim Verarbeiten der AI-Antwort. Bitte erneut versuchen.',
  NETWORK_ERROR: 'Netzwerkfehler. Bitte Internetverbindung prüfen.',
};

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const colors = {
    error: 'bg-[#fff4f1] border-[#efc2b7] text-[#6f2d1f]',
    success: 'bg-[#eef8f1] border-[#b8dec4] text-[#1f5a32]',
    warning: 'bg-[#fff8eb] border-[#ead2a5] text-[#7a5415]',
    info: 'bg-[#eef3ff] border-[#c9d8ff] text-[#26479c]',
  };

  const icons = {
    error: '✕',
    success: '✓',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm max-w-sm shadow-lg animate-slide-up ${colors[toast.type]}`}
    >
      <span className="shrink-0 font-bold">{icons[toast.type]}</span>
      <div className="flex-1">
        <p>{toast.message}</p>
        {toast.actionLabel && toast.onAction && (
          <button
            onClick={() => {
              toast.onAction?.();
              onRemove(toast.id);
            }}
            className="mt-2 inline-flex items-center rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-medium hover:bg-white transition-colors"
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Schließen"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

let _addToast: ((message: string, type: ToastType, options?: { actionLabel?: string; onAction?: () => void }) => void) | null = null;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info', options?: { actionLabel?: string; onAction?: () => void }) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type, actionLabel: options?.actionLabel, onAction: options?.onAction }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = null; };
  }, [addToast]);

  return { toasts, addToast, removeToast };
}

export function showToast(message: string, type: ToastType = 'info', options?: { actionLabel?: string; onAction?: () => void }) {
  if (_addToast) _addToast(message, type, options);
}

export function showError(code: string) {
  if (code in ERROR_MESSAGES) {
    showToast(ERROR_MESSAGES[code], 'error');
  } else {
    // code is the raw error message from the API (e.g. OpenRouter-specific errors)
    // Show it directly but cap length to avoid giant toasts
    const msg = code.length <= 150 ? code : ERROR_MESSAGES['API_ERROR'];
    showToast(msg, 'error');
  }
}
