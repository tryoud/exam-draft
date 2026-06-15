import type { Locale } from '../lib/i18n';
import { appCopy } from '../lib/i18n';

interface ConsentCheckboxProps {
  consentGiven: boolean;
  rightsConfirmed: boolean;
  improvementConsent: boolean;
  onConsentChange: (v: boolean) => void;
  onRightsChange: (v: boolean) => void;
  onImprovementConsentChange: (v: boolean) => void;
  locale?: Locale;
}

export default function ConsentCheckbox({
  consentGiven,
  rightsConfirmed,
  improvementConsent,
  onConsentChange,
  onRightsChange,
  onImprovementConsentChange,
  locale = 'de',
}: ConsentCheckboxProps) {
  const copy = appCopy[locale].consent;
  const termsHref = locale === 'en' ? '/en/terms' : '/terms';
  const privacyHref = locale === 'en' ? '/en/privacy' : '/privacy';
  const requiredChecked = consentGiven && rightsConfirmed;

  function handleRequiredChange(checked: boolean) {
    onConsentChange(checked);
    onRightsChange(checked);
  }

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={requiredChecked}
          onChange={(e) => handleRequiredChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-[#d0cabf] bg-[#fcfbf8] text-[#2f5bd2] focus:ring-[#6b8dff] focus:ring-offset-0 shrink-0 cursor-pointer"
        />
        <span className="text-sm text-[#5d5866] group-hover:text-[#3f3a45] transition-colors leading-relaxed">
          {copy.requiredPrefix}{' '}
          <a href={termsHref} target="_blank" rel="noopener noreferrer" className="text-[#2f5bd2] hover:text-[#2448a8] underline">
            {copy.terms}
          </a>{' '}
          {copy.and}{' '}
          <a href={privacyHref} target="_blank" rel="noopener noreferrer" className="text-[#2f5bd2] hover:text-[#2448a8] underline">
            {copy.privacy}
          </a>
          .
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={improvementConsent}
          onChange={(e) => onImprovementConsentChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-[#d0cabf] bg-[#fcfbf8] text-[#2f5bd2] focus:ring-[#6b8dff] focus:ring-offset-0 shrink-0 cursor-pointer"
        />
        <span className="text-sm text-[#5d5866] group-hover:text-[#3f3a45] transition-colors leading-relaxed">
          {copy.improvementPrefix}{' '}(
          <a href={privacyHref} target="_blank" rel="noopener noreferrer" className="text-[#2f5bd2] hover:text-[#2448a8] underline">
            {copy.privacy}
          </a>
          ).
        </span>
      </label>
    </div>
  );
}
