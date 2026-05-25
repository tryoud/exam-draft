import { useState } from 'react';
import type { AccountState, Provider } from '../lib/types';
import { logoutAccount, startCheckout } from '../lib/account';
import { showToast } from './Toast';
import type { Locale } from '../lib/i18n';
import { appCopy } from '../lib/i18n';
import { trackEvent } from '../lib/analytics';

interface AccountSetupProps {
  account: AccountState;
  mode: 'fullscreen' | 'drawer';
  onClose?: () => void;
  onRefresh: () => Promise<unknown>;
  onUseByok: () => void;
  onUseAccount: () => void;
  activeProvider: Provider;
  locale?: Locale;
}

function checkoutErrorMessage(code: string, locale: Locale) {
  if (code === 'BILLING_NOT_CONFIGURED') {
    return locale === 'en'
      ? 'Checkout is not configured yet.'
      : 'Checkout ist noch nicht vollständig konfiguriert.';
  }
  return locale === 'en' ? 'Checkout could not be started.' : 'Checkout konnte nicht gestartet werden.';
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

export default function AccountSetup({
  account,
  mode,
  onClose,
  onRefresh,
  onUseByok,
  onUseAccount,
  activeProvider,
  locale = 'de',
}: AccountSetupProps) {
  const copy = appCopy[locale].account;
  const tagline = appCopy[locale].tagline;
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await logoutAccount();
      await onRefresh();
      showToast(locale === 'en' ? 'Signed out.' : 'Abgemeldet.', 'success');
    } catch {
      showToast(locale === 'en' ? 'Sign out failed.' : 'Abmelden fehlgeschlagen.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleBuyCredits() {
    setLoading(true);
    try {
      trackEvent('checkout_started', { credits: account.credits });
      const { url } = await startCheckout(locale);
      window.location.href = url;
    } catch (err) {
      showToast(err instanceof Error ? checkoutErrorMessage(err.message, locale) : checkoutErrorMessage('API_ERROR', locale), 'error');
    } finally {
      setLoading(false);
    }
  }

  const card = (
    <div className="app-surface auth-shell-card rounded-[1.8rem] p-6 sm:p-8 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#eef2ff] flex items-center justify-center text-[#2f5bd2] text-xl border border-[#d9e3ff]">
          ↗
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#111111]">{copy.title}</h2>
          <p className="text-xs text-[#7d7785]">{copy.subtitle}</p>
        </div>
      </div>

      {account.user ? (
        <>
          <div className="rounded-xl border border-[#e5dfd5] bg-[#f8f4ee] p-4 mb-4">
            <p className="text-xs text-[#7d7785]">{copy.signedInAs}</p>
            <p className="text-sm font-medium text-[#19161d] break-all">{account.user.email}</p>
            <p className="text-sm text-[#2e7d4f] mt-2">{account.credits} {copy.creditsAvailable}</p>
          </div>
          <button
            onClick={onUseAccount}
            disabled={activeProvider === 'examdraft'}
            className="app-primary-btn w-full disabled:opacity-60 px-4 py-2.5 rounded-xl font-medium transition-all"
          >
            {activeProvider === 'examdraft' ? copy.creditsActive : copy.useCredits}
          </button>
          <button
            onClick={onUseByok}
            className="app-secondary-btn w-full mt-3 rounded-xl px-4 py-2.5 text-sm transition-all"
          >
            {copy.useByok}
          </button>
          <button
            onClick={handleBuyCredits}
            disabled={loading}
            className="app-secondary-btn w-full mt-3 rounded-xl px-4 py-2.5 text-sm transition-all"
          >
            {copy.buyCredits}
          </button>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full mt-3 text-[#8b8593] hover:text-[#4c4754] text-sm transition-colors py-1"
          >
            {copy.logout}
          </button>
        </>
      ) : (
        <>
          <div
            role="alert"
            className="rounded-2xl border border-[#f0d9a5] bg-[#fff7df] p-4 text-[#5c4512] shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ffe8a8] text-sm font-bold text-[#8a5a00]">
                !
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#3f2f0c]">{copy.signInUnavailableTitle}</h3>
                <p className="mt-1 text-sm leading-6">{copy.signInUnavailableText}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onUseByok}
            className="app-primary-btn w-full mt-4 rounded-xl px-4 py-2.5 font-medium transition-all"
          >
            {copy.signInUnavailableAction}
          </button>
        </>
      )}

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
