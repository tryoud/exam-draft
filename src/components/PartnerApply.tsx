import { useState } from 'react';

type OrgType = 'fachschaft' | 'tutorium' | 'uni_group' | 'other';

interface Locale { lang: 'de' | 'en' }

const copy = {
  de: {
    title: 'Fachschafts-Pilotprogramm',
    subtitle: 'Kostenloser Zugang für Fachschaften, Tutorien und Uni-Gruppen.',
    orgName: 'Name der Organisation',
    orgNamePlaceholder: 'z.B. Fachschaft Informatik TU Berlin',
    contactEmail: 'Kontakt-E-Mail',
    contactEmailPlaceholder: 'vorstand@fachschaft-beispiel.de',
    orgType: 'Typ',
    types: { fachschaft: 'Fachschaft', tutorium: 'Tutorium', uni_group: 'Uni-Gruppe', other: 'Anderes' },
    university: 'Universität / Hochschule (optional)',
    universityPlaceholder: 'z.B. TU Berlin',
    subjects: 'Relevante Fächer (optional)',
    subjectsPlaceholder: 'z.B. Statistik, Mathematik, BWL',
    notes: 'Anmerkungen (optional)',
    notesPlaceholder: 'Was erhofft ihr euch von ExamDraft?',
    submit: 'Pilotanfrage senden',
    submitting: 'Wird gesendet...',
    successTitle: 'Anfrage eingegangen.',
    successText: 'Wir melden uns innerhalb von 3 Werktagen. Schreib uns gerne auch direkt an',
    duplicateText: 'Diese E-Mail-Adresse hat bereits eine Anfrage gestellt. Wir melden uns bald.',
    errorText: 'Etwas ist schiefgelaufen. Versuche es erneut oder schreib uns direkt.',
  },
  en: {
    title: 'Student Union Pilot Program',
    subtitle: 'Free access for student unions, tutoring groups, and university organisations.',
    orgName: 'Organisation name',
    orgNamePlaceholder: 'e.g. Computer Science Student Union',
    contactEmail: 'Contact email',
    contactEmailPlaceholder: 'board@union-example.com',
    orgType: 'Type',
    types: { fachschaft: 'Student union', tutorium: 'Tutoring group', uni_group: 'University group', other: 'Other' },
    university: 'University (optional)',
    universityPlaceholder: 'e.g. TU Berlin',
    subjects: 'Relevant subjects (optional)',
    subjectsPlaceholder: 'e.g. Statistics, Mathematics, Business',
    notes: 'Notes (optional)',
    notesPlaceholder: 'What are you hoping to get from ExamDraft?',
    submit: 'Send pilot request',
    submitting: 'Sending...',
    successTitle: 'Request received.',
    successText: 'We will get back to you within 3 business days. You can also write to us directly at',
    duplicateText: 'This email address has already submitted a request. We will be in touch soon.',
    errorText: 'Something went wrong. Please try again or write to us directly.',
  },
};

export default function PartnerApply({ lang = 'de' }: Locale) {
  const t = copy[lang];
  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [orgType, setOrgType] = useState<OrgType>('fachschaft');
  const [university, setUniversity] = useState('');
  const [subjects, setSubjects] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'duplicate' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/partner/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: orgName.trim(),
          contactEmail: contactEmail.trim(),
          orgType,
          university: university.trim() || null,
          subjects: subjects.trim() ? subjects.split(',').map((s) => s.trim()).filter(Boolean) : null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus('error'); return; }
      setStatus(data.duplicate ? 'duplicate' : 'success');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success' || status === 'duplicate') {
    return (
      <div className="legal-card rounded-[1.8rem] p-8 text-center space-y-3">
        <div className="text-4xl">✓</div>
        <h2 className="text-xl font-semibold text-[#111111]">{t.successTitle}</h2>
        <p className="text-sm text-[#7d7785] max-w-md mx-auto">
          {status === 'duplicate' ? t.duplicateText : (
            <>{t.successText} <a href="mailto:partner@examdraft.com" className="underline text-[#2f5bd2]">partner@examdraft.com</a>.</>
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="legal-card rounded-[1.8rem] p-6 sm:p-8 space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#57515e]">{t.orgName} *</label>
          <input
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder={t.orgNamePlaceholder}
            maxLength={200}
            className="w-full rounded-xl border border-[#ddd7cd] bg-white/70 px-3 py-2 text-sm text-[#19161d] placeholder-[#b1abb4] focus:border-[#6b8dff] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#57515e]">{t.contactEmail} *</label>
          <input
            required
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder={t.contactEmailPlaceholder}
            maxLength={200}
            className="w-full rounded-xl border border-[#ddd7cd] bg-white/70 px-3 py-2 text-sm text-[#19161d] placeholder-[#b1abb4] focus:border-[#6b8dff] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#57515e]">{t.orgType} *</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(t.types) as OrgType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setOrgType(type)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${
                orgType === type
                  ? 'border-[#6b8dff] bg-[#eef2ff] text-[#2f5bd2] font-medium'
                  : 'border-[#ddd7cd] bg-white/70 text-[#4c4754] hover:border-[#bdb6c5]'
              }`}
            >
              {t.types[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#57515e]">{t.university}</label>
          <input
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            placeholder={t.universityPlaceholder}
            maxLength={200}
            className="w-full rounded-xl border border-[#ddd7cd] bg-white/70 px-3 py-2 text-sm text-[#19161d] placeholder-[#b1abb4] focus:border-[#6b8dff] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#57515e]">{t.subjects}</label>
          <input
            value={subjects}
            onChange={(e) => setSubjects(e.target.value)}
            placeholder={t.subjectsPlaceholder}
            maxLength={300}
            className="w-full rounded-xl border border-[#ddd7cd] bg-white/70 px-3 py-2 text-sm text-[#19161d] placeholder-[#b1abb4] focus:border-[#6b8dff] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#57515e]">{t.notes}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.notesPlaceholder}
          rows={3}
          maxLength={1000}
          className="w-full rounded-xl border border-[#ddd7cd] bg-white/70 px-3 py-2 text-sm text-[#19161d] placeholder-[#b1abb4] focus:border-[#6b8dff] focus:outline-none resize-none"
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-[#b44a35]">{t.errorText}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="app-primary-btn w-full disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-3 font-medium transition-all"
      >
        {status === 'submitting' ? t.submitting : t.submit}
      </button>
    </form>
  );
}
