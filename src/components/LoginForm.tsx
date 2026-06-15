import { useState } from 'react';
import { startMagicLink } from '../lib/account';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const [devLink, setDevLink] = useState('');

  const errorMessages: Record<string, string> = {
    INVALID_EMAIL: 'Bitte gib eine gültige E-Mail-Adresse ein.',
    DISPOSABLE_EMAIL: 'Bitte nutze eine dauerhafte E-Mail-Adresse.',
    EMAIL_RATE_LIMITED: 'Für diese E-Mail wurden gerade zu viele Links angefragt. Bitte später erneut versuchen.',
    IP_RATE_LIMITED: 'Von diesem Netzwerk wurden gerade zu viele Links angefragt. Bitte später erneut versuchen.',
    TOO_MANY_EMAILS: 'Von diesem Netzwerk wurden heute bereits mehrere E-Mail-Adressen verwendet.',
    DOMAIN_RATE_LIMITED: 'Für diese E-Mail-Domain wurden heute viele Links angefragt.',
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }
    setError('');
    setState('sending');
    try {
      const res = await startMagicLink(normalized, 'de');
      setState('sent');
      if (res.devLink) setDevLink(res.devLink);
    } catch (err) {
      setState('idle');
      const code = err instanceof Error ? err.message : 'API_ERROR';
      setError(errorMessages[code] ?? 'Etwas ist schiefgelaufen. Bitte erneut versuchen.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f0e8] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#111111]">ExamDraft</h1>
          <p className="text-sm text-[#7d7785] mt-1">Interner Beta-Zugang</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5dfd5] shadow-sm p-6">
          {state === 'sent' ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#eefaf3] flex items-center justify-center mx-auto mb-4 text-[#2e7d4f] text-xl">✓</div>
              <h2 className="text-base font-semibold text-[#111111] mb-1">Link gesendet</h2>
              <p className="text-sm text-[#7d7785]">Prüfe dein Postfach — der Link ist 15 Minuten gültig.</p>
              {devLink && (
                <a
                  href={devLink}
                  className="mt-4 block text-xs text-[#2f5bd2] underline break-all"
                >
                  Dev-Link: {devLink}
                </a>
              )}
              <button
                onClick={() => { setState('idle'); setEmail(''); setDevLink(''); }}
                className="mt-4 text-sm text-[#8b8593] hover:text-[#4c4754] transition-colors"
              >
                Andere E-Mail verwenden
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-[#111111] mb-1">Anmelden</h2>
                <p className="text-sm text-[#7d7785]">Wir schicken dir einen Magic Link per E-Mail.</p>
              </div>
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  autoComplete="email"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#d0cabf] bg-[#fcfbf8] text-sm text-[#19161d] placeholder:text-[#b0a9b8] focus:outline-none focus:border-[#6b8dff] focus:ring-1 focus:ring-[#6b8dff] transition-colors"
                />
                {error && <p className="mt-1.5 text-xs text-[#c0392b]">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={state === 'sending'}
                className="w-full py-2.5 rounded-xl bg-[#2f5bd2] hover:bg-[#2448a8] text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {state === 'sending' ? 'Sende Link...' : 'Login-Link senden'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-[#a09aab] mt-6">
          Nur für interne Tests — nicht verlinkt
        </p>
      </div>
    </div>
  );
}
