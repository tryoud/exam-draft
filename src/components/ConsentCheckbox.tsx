interface ConsentCheckboxProps {
  consentGiven: boolean;
  rightsConfirmed: boolean;
  onConsentChange: (v: boolean) => void;
  onRightsChange: (v: boolean) => void;
}

export default function ConsentCheckbox({
  consentGiven,
  rightsConfirmed,
  onConsentChange,
  onRightsChange,
}: ConsentCheckboxProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={consentGiven}
          onChange={(e) => onConsentChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-[#333333] bg-[#0a0a0a] text-blue-600 focus:ring-blue-500 focus:ring-offset-0 shrink-0 cursor-pointer"
        />
        <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors leading-relaxed">
          Ich akzeptiere die{' '}
          <a href="/terms" target="_blank" className="text-blue-400 hover:text-blue-300 underline">
            Nutzungsbedingungen
          </a>{' '}
          und{' '}
          <a href="/privacy" target="_blank" className="text-blue-400 hover:text-blue-300 underline">
            Datenschutzerklärung
          </a>
          .
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={rightsConfirmed}
          onChange={(e) => onRightsChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-[#333333] bg-[#0a0a0a] text-blue-600 focus:ring-blue-500 focus:ring-offset-0 shrink-0 cursor-pointer"
        />
        <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors leading-relaxed">
          Ich bestätige, dass ich das Urheberrecht an allen hochgeladenen Dokumenten
          halte oder die ausdrückliche Erlaubnis des Rechteinhabers besitze.
        </span>
      </label>
    </div>
  );
}
