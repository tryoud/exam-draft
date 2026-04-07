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

## Anthropic API Key

ExamDraft nutzt das BYOK-Modell (Bring Your Own Key):

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

| Szenario | Tokens | Kosten |
|---|---|---|
| 5 Klausuren, Text-Modus | ~200k | ~€0.06 |
| 5 Klausuren + 3 Folien, Text-Modus | ~290k | ~€0.08 |
| 5 Klausuren, Bild-Modus | ~950k | ~€0.26 |
| Pro Generierungsaufruf | ~5k | ~€0.01 |

*Preise basieren auf claude-sonnet-4 ($3.00/M Input-Tokens, Kurs: 0.92 EUR/USD)*

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

- [Astro 4](https://astro.build) + React Islands
- Tailwind CSS
- [pdfjs-dist](https://mozilla.github.io/pdf.js/) (lokale PDF-Verarbeitung)
- Claude API (direct browser access)
- Cloudflare Pages

---

## Phase 2 Roadmap

- Benutzerkonten & gespeicherte Klausuren
- Cloudflare Workers API-Proxy (kein eigener Key nötig)
- Gruppenübungen / Klausur teilen
- Export als DOCX
- Mehrsprachigkeit (EN, FR, ES)
