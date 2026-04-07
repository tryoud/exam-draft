import { useState, useRef, useCallback, useEffect } from 'react';
import type { ExtractedFile } from '../lib/types';
import { analyzePDF } from '../lib/pdfExtractor';
import { formatTokens } from '../lib/tokenEstimator';
import { showToast } from './Toast';
import { getProvider } from '../lib/anthropic';

export interface PendingFile {
  id: string;
  file: File;
  useImage: boolean;
  extracted: ExtractedFile | null;
}

interface FileCardWrapperProps {
  pendingFile: PendingFile;
  type: 'exam' | 'slides';
  onRemove: () => void;
  onModeChange: (useImage: boolean) => void;
}

function FileCardWrapper({ pendingFile, type, onRemove, onModeChange }: FileCardWrapperProps) {
  const { file } = pendingFile;
  const [analyzing, setAnalyzing] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const [hasSignificantImages, setHasSignificantImages] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [tokenEstimate, setTokenEstimate] = useState(0);

  useEffect(() => {
    analyzePDF(file)
      .then((result) => {
        setPageCount(result.pageCount);
        setImageCount(result.imageCount);
        setHasSignificantImages(result.hasSignificantImages);
        const useImage = result.hasSignificantImages;
        setIsImageMode(useImage);
        if (pendingFile.useImage !== useImage) {
          onModeChange(useImage);
        }
        const tokens = useImage ? result.pageCount * 750 : Math.ceil(file.size / 40);
        setTokenEstimate(tokens);
        setAnalyzing(false);
      })
      .catch(() => {
        setAnalyzing(false);
        showToast('PDF konnte nicht gelesen werden. Ist die Datei beschädigt?', 'error');
      });
  }, [file, onModeChange, pendingFile.useImage]);

  function handleToggle(useImage: boolean) {
    setIsImageMode(useImage);
    const tokens = useImage ? pageCount * 750 : Math.ceil(file.size / 40);
    setTokenEstimate(tokens);
    onModeChange(useImage);
  }

  const sizeKB = (file.size / 1024).toFixed(0);
  const nameTruncated = file.name.length > 30 ? file.name.slice(0, 27) + '...' : file.name;

  if (analyzing) {
    return (
      <div className="app-surface rounded-[1.3rem] p-4 animate-pulse">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="h-4 bg-[#e5dfd5] rounded w-3/4 mb-2" />
            <div className="h-3 bg-[#ece7de] rounded w-1/2" />
          </div>
          <div className="w-6 h-6 bg-[#ece7de] rounded" />
        </div>
        <div className="h-8 bg-[#ece7de] rounded mb-2" />
        <div className="h-3 bg-[#ece7de] rounded w-1/3" />
      </div>
    );
  }

  return (
    <div className="app-surface rounded-[1.3rem] p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-sm font-medium text-[#19161d] truncate" title={file.name}>
            {nameTruncated}
          </p>
          <p className="text-xs text-[#7f7987] mt-0.5">
            {sizeKB} KB · {pageCount} Seiten · {imageCount} Bilder erkannt
          </p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 w-6 h-6 flex items-center justify-center text-[#8d8794] hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
          aria-label="Datei entfernen"
        >
          ✕
        </button>
      </div>

      {hasSignificantImages ? (
        <span className="inline-flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-2 py-1 mb-2">
          ⚠ Enthält Diagramme (~{imageCount} Bilder)
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded px-2 py-1 mb-2">
          ✓ Hauptsächlich Text
        </span>
      )}

      <div className="flex rounded-xl overflow-hidden border border-[#d8d2c8] bg-white/65 mb-2 mt-2">
        <button
          onClick={() => handleToggle(false)}
          className={`flex-1 text-xs py-1.5 px-2 transition-all ${
            !isImageMode ? 'bg-[#6b8dff] text-white' : 'text-[#6f6a78] hover:text-[#19161d]'
          }`}
        >
          Text-Modus {!isImageMode && '✓'}
        </button>
        <button
          onClick={() => handleToggle(true)}
          className={`flex-1 text-xs py-1.5 px-2 transition-all ${
            isImageMode ? 'bg-[#6b8dff] text-white' : 'text-[#6f6a78] hover:text-[#19161d]'
          }`}
        >
          Bild-Modus {isImageMode && '✓'}
        </button>
      </div>

      <p className="text-xs text-[#8d8794] mb-1">
        {isImageMode
          ? hasSignificantImages
            ? 'Vollständig, ~3x mehr Tokens'
            : 'Falls Diagramme fehlen sollten'
          : hasSignificantImages
          ? 'Günstiger, Diagramme fehlen'
          : 'Empfohlen für diese Datei'}
      </p>

      {isImageMode && getProvider() === 'openrouter' && (
        <p className="text-xs text-amber-600 mt-1">
          ⚠ OpenRouter: PDF-Bilder werden als Text gesendet. Wechsle zu Anthropic für vollständige Diagramm-Unterstützung.
        </p>
      )}

      <p className="text-xs text-[#7f7987]">~{formatTokens(tokenEstimate)} Tokens</p>
    </div>
  );
}

interface UploadZoneProps {
  type: 'exam' | 'slides';
  files: PendingFile[];
  onFilesChange: (files: PendingFile[]) => void;
  disabled?: boolean;
  maxFiles: number;
}

export default function UploadZone({ type, files, onFilesChange, disabled, maxFiles }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndAdd = useCallback(
    (incoming: File[]) => {
      const pdfs = incoming.filter((f) => f.type === 'application/pdf');
      if (pdfs.length !== incoming.length) {
        showToast('Nur PDF-Dateien werden unterstützt.', 'error');
      }

      const valid = pdfs.filter((f) => {
        if (f.size > 32 * 1024 * 1024) {
          showToast(`${f.name}: Datei zu groß (max. 32MB pro PDF).`, 'error');
          return false;
        }
        return true;
      });

      const remaining = maxFiles - files.length;
      if (valid.length > remaining) {
        showToast(
          type === 'exam'
            ? 'Maximal 10 Altklausuren erlaubt.'
            : 'Maximal 20 Vorlesungsfolien erlaubt.',
          'warning'
        );
      }

      const toAdd = valid.slice(0, remaining);
      const newEntries: PendingFile[] = toAdd.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        useImage: false,
        extracted: null,
      }));

      onFilesChange([...files, ...newEntries]);
    },
    [files, maxFiles, onFilesChange, type]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      validateAndAdd(Array.from(e.dataTransfer.files));
    },
    [disabled, validateAndAdd]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        validateAndAdd(Array.from(e.target.files));
        e.target.value = '';
      }
    },
    [validateAndAdd]
  );

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`rounded-[1.6rem] p-8 text-center transition-all duration-200 ${
          disabled
            ? 'border-2 border-dashed border-[#d9d4cb] opacity-40 cursor-not-allowed bg-white/45'
            : dragging
            ? 'border-2 border-dashed border-[#6b8dff] bg-[#eef2ff] shadow-lg shadow-[#6b8dff]/10 cursor-pointer'
            : 'border-2 border-dashed border-[#d5d0c6] bg-white/55 hover:border-[#bcb5c8] hover:bg-white/72 cursor-pointer'
        }`}
      >
        <div className="text-3xl mb-3 select-none">📄</div>
        {disabled ? (
          <p className="text-sm text-[#8b8593]">Deaktiviert</p>
        ) : (
          <>
            <p className="text-sm text-[#5d5866]">
              PDFs hier ablegen oder{' '}
              <span className="text-[#2f5bd2] underline">klicken</span>
            </p>
            <p className="text-xs text-[#8b8593] mt-1">
              Max. {maxFiles} Dateien · 32 MB pro Datei
            </p>
          </>
        )}
      </div>
      {!disabled && (
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={onInputChange}
        />
      )}

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((pf, i) => (
            <FileCardWrapper
              key={pf.id}
              pendingFile={pf}
              type={type}
              onRemove={() => onFilesChange(files.filter((_, idx) => idx !== i))}
              onModeChange={(useImage) =>
                onFilesChange(files.map((f, idx) => (idx === i ? { ...f, useImage } : f)))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
