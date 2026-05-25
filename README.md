# ExamDraft

**Lerne klüger. Übe smarter. Bestehe sicher.**

ExamDraft ist ein KI-gestützter Klausurgenerator für Studenten. Lade Altklausuren hoch, lass sie von Claude analysieren, und generiere neue Probeklausuren mit Musterlösungen — inkl. Prüfungssimulation mit Timer.

> **Screenshot**: *(coming soon)*

---

## Setup

```bash
# 1. Dependencies installieren
npm install

# 2. Dev-Server starten
npm run dev

# 3. Im Browser öffnen
open http://localhost:4321
```

---

## ExamDraft-Konto und API Keys

ExamDraft unterstützt zwei Modi:

1. **ExamDraft-Konto**: Anmeldung per Magic Link, ein kostenloser Start-Credit, API-Aufrufe laufen über den Cloudflare Worker.
2. **Advanced BYOK**: Eigener OpenRouter- oder Anthropic-Key im Browser.

Die vollständige Produktionskonfiguration steht in [docs/configuration.md](docs/configuration.md).

### Lokale Entwicklung mit Cloudflare

```bash
# D1 Datenbank anlegen und database_id in wrangler.toml eintragen
npx wrangler d1 create examdraft
npx wrangler d1 migrations apply examdraft --local

# Secrets für den Worker setzen
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put RESEND_API_KEY
```

Ohne `RESEND_API_KEY` gibt `/api/auth/start` im lokalen Development einen `devLink` zurück.
Für lokale Worker-Tests kannst du `.dev.vars.example` nach `.dev.vars` kopieren.

### Abuse-Schutz für Free Credits

Der Magic-Link-Startpunkt schützt das kostenlose Guthaben mit einfachen Cloudflare/D1-Regeln:

- Wegwerf-Mail-Domains werden blockiert.
- Magic-Link-Anfragen werden pro E-Mail, IP-Hash und Domain begrenzt.
- Eine IP kann pro Tag nur wenige unterschiedliche E-Mail-Adressen ausprobieren.
- IP-Adressen werden nicht roh gespeichert, sondern mit `AUTH_RATE_LIMIT_SALT` gehasht.

Die Grenzwerte stehen in `wrangler.toml` und können pro Umgebung angepasst werden.

### Speicherung bei Verbesserungszustimmung

Wenn Nutzer die Verbesserungsoption aktiv auswählen, speichert der Worker keinen PDF-Upload,
sondern den extrahierten Text nach einfacher Anonymisierung in `document_contributions`.
Zusätzlich werden die validierten KI-Ergebnisse in `ai_contributions` gespeichert, zum Beispiel
Analyse-JSON oder generierte Klausur inklusive Musterlösung. Neue Beiträge bekommen
`pending_review`, eine Consent-Version und Hashes, damit Duplikate vermieden werden.
Ohne diese Zustimmung wird nichts in diesen Tabellen gespeichert.

### Modell-Routing

Die Standardmodelle sind nach Preis/Leistung aus dem Artificial-Analysis-Leaderboard und
OpenRouter-Verfügbarkeit gewählt:

- Analyse, Grading und lange Dokumentinputs: `google/gemini-3-flash-preview`
- Klausurgenerierung und Musterlösungen: `anthropic/claude-sonnet-4.6`

So bleiben große Input-Prompts schnell und kontrollierbar, während die teure kreative Ausgabe
über ein stärkeres Modell läuft.

### Website Analytics

Cloudflare Web Analytics ist optional eingebunden. Setze dafür in Cloudflare Pages die
Build-Variable `PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`. Ohne Token wird kein Analytics-Script
gerendert.

### Free-to-Paid Funnel

ExamDraft folgt dem Prinzip: Free gibt den Beweis, Paid gibt die Klausur.

- Neue Accounts erhalten `1` Start-Credit.
- Die Analyse kostet `1` Credit und zeigt Aufgabentypen, Themen und Schwierigkeit.
- Die vollständige Klausurgenerierung kostet standardmäßig `4` Credits und ist nur nach einem Credit-Kauf verfügbar.
- BYOK bleibt als Advanced Mode verfügbar und umgeht ExamDraft-Credits.
- `usage_events.credits_charged` protokolliert den Credit-Verbrauch pro Operation.

### BYOK

1. Gehe zu [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. Erstelle einen neuen API Key
3. Gib den Key beim ersten Start in ExamDraft ein — er wird nur lokal in deinem Browser gespeichert

---

## Cloudflare Pages Deploy

```bash
# Build
npm run build
# Output liegt in: dist/
```

**Cloudflare Pages:**
1. Push zum GitHub-Repository
2. Cloudflare Pages → Neues Projekt → GitHub-Repo verbinden
3. Build-Einstellungen:
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
4. Deploy!

---

## Kostenübersicht

Ein typischer kompletter Durchlauf aus Analyse + Generierung liegt ungefähr bei **~€0.20**.

Je nach Modell, Bild-Modus und Umfang der PDFs kann der tatsächliche Preis etwas darunter oder darüber liegen.

---

## Wie es funktioniert

1. **Upload**: Altklausuren (PDF) hochladen, optional Vorlesungsfolien
2. **Analyse**: Claude analysiert Aufgabentypen, Schwierigkeit, Themenbereiche
3. **Generierung**: Neue Probeklausur oder gezieltes Aufgabentyp-Training
4. **Simulation**: Prüfungssimulation mit Countdown-Timer und Selbstbewertung

**Zwei PDF-Modi:**
- **Text-Modus**: Günstiger, Text wird lokal extrahiert — keine Bilder
- **Bild-Modus**: Vollständig, PDF als Bild gesendet — Diagramme sichtbar (~3x teurer)

---

## Tech Stack

- [Astro 6](https://astro.build) + React Islands
- Tailwind CSS
- [pdfjs-dist](https://mozilla.github.io/pdf.js/) (lokale PDF-Verarbeitung)
- Cloudflare Pages Functions + D1 für ExamDraft-Konten und Credits
- OpenRouter/Anthropic API über sicheren Proxy oder BYOK
- Cloudflare Pages

---

## Phase 2 Roadmap

- Benutzerkonten & gespeicherte Klausuren
- Cloudflare Workers API-Proxy (kein eigener Key nötig)
- Gruppenübungen / Klausur teilen
- Export als DOCX
- Mehrsprachigkeit (EN, FR, ES)
