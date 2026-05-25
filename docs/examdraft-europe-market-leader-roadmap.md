# ExamDraft Roadmap: Vom aktuellen Stand zum fuehrenden Exam-Prep-Tool in Europa

Stand: 28. April 2026  
Ziel: Exportierbarer Strategie- und Umsetzungsplan fuer Produkt, Technik, Go-to-Market, Datenstrategie und Europa-Ausbau.

## Executive Summary

ExamDraft soll nicht zu einer generischen Lernplattform werden. Der Markt ist bereits voll mit "PDF zu Flashcards", "PDF zu Quiz" und "AI Tutor"-Produkten. Die staerkste Chance liegt in einer klaren Kategorie:

> ExamDraft ist die Exam Intelligence Platform fuer Studierende: Altklausuren hochladen, Pruefungslogik erkennen, realistisch ueben und bis zur echten Klausur gefuehrt werden.

Der aktuelle lokale Stand ist deutlich weiter als eine reine Beta:

- Astro + React App mit deutscher und englischer Oberflaeche.
- Cloudflare Pages Functions als Backend.
- D1-Datenbank fuer Accounts, Sessions, Credits, Zahlungen, Usage Events und Consent Contributions.
- Magic-Link-Login.
- ExamDraft Credits mit Free Starter Credit.
- Stripe Checkout Scaffold.
- BYOK als Advanced Mode fuer Anthropic/OpenRouter.
- Consent-basierte Speicherung anonymisierter Lernmaterialien.
- Analyse, Probeklausur, Typtraining, Timer, Korrektur und Export sind bereits angelegt.

Die wichtigste strategische Konsequenz:

> ExamDraft muss jetzt nicht erst "Hybrid-Modell" werden. Es muss das vorhandene Hybrid-Modell produktionsreif, messbar, vertrauenswuerdig und kaufbar machen.

## Zielbild

### Kategorie

ExamDraft fuehrt eine eigene Kategorie:

**Exam Intelligence aus Altklausuren**

Nicht:

- generische KI-Lernplattform
- reine PDF-Zusammenfassung
- Karteikarten-App
- Chatbot fuer Studienmaterial
- oeffentliche Altklausur-Datenbank

Sondern:

- Analyse von Pruefungsmustern
- Erkennung von Aufgabentypen, Themen, Punktegewichtung und Schwierigkeitslogik
- realistische Probeklausuren
- adaptives Typtraining
- Lernplan bis zur Klausur
- FocusPartner als Umsetzungs- und Retention-Layer

### Kernversprechen

> Lade deine Altklausuren hoch. ExamDraft zeigt dir in Minuten, welche Aufgabentypen wirklich zaehlen, was wahrscheinlich drankommt und wie du bis zur Klausur trainieren solltest.

### Leitmetriken

| Zeitraum | Ziel |
| --- | --- |
| 3 Monate | produktionsreifer Paid-Funnel, 1.000 aktivierte Nutzer, 100 zahlende Nutzer |
| 6 Monate | 10.000 registrierte Nutzer, 1.000 zahlende Nutzer, 10 Fachschaftspiloten |
| 12 Monate | DACH-Kategorie-Fuehrung fuer "Altklausur analysieren" und "Probeklausur generieren", 50.000 registrierte Nutzer, 5.000 zahlende Nutzer |
| 24 Monate | EU-Ausbau mit 5 Kernmaerkten, 500.000 registrierte Nutzer, 50.000 monatlich aktive Nutzer |

### Gewaehlte Defaults

- Ziel ist Kategorie-Fuehrung, nicht zuerst Umsatz- oder Reichweiten-Fuehrung.
- Wachstum erfolgt B2C-first mit Fachschaftspiloten.
- FocusPartner wird verbunden, aber nicht mit ExamDraft fusioniert.
- DACH wird zuerst gewonnen; EU-Ausbau folgt nach stabilen Funnel-Daten.
- Credit-Pack-first; Abo und Semester-Pass kommen nach validierter Wiederkehrnutzung.

## Markt- und Wettbewerbslogik

### StudyPDF

Staerken:

- sehr schneller Einstieg
- erste Nutzung ohne Anmeldung
- breite Tool-Palette: Pruefungen, Mindmaps, Flashcards, Chat-Tutor, Zusammenfassungen, Lernleitfaeden
- klare Preisanker ab niedrigem Monatsbetrag
- starke Social Proof Claims

Schwaechen gegen ExamDraft:

- eher "jedes PDF zu Lernmaterial"
- weniger spitz auf Altklausur-Logik und Pruefungsstil
- wenig defensibler Datenvorteil pro Modul

Was ExamDraft uebernehmen sollte:

- Instant Demo ohne Login
- klare Tool-Landingpages
- schnelle Time-to-Value
- einfache Sprache ohne Provider-/API-Komplexitaet

### acemate

Staerken:

- kurszentrierter Workspace
- KI-Tutor mit Quellen
- Exams, Daily Quiz, Flashcards, Podcasts, Mindmaps, Progress Tracking
- Streaks, Levels, Rewards
- Lehrenden-/Institutionen-Angebot
- starker DSGVO-/EU-Trust-Claim

Schwaechen gegen ExamDraft:

- breiter, dadurch weniger klar auf "akute Klausur aus Altklausuren"
- Institutionen-Fokus kann B2C-Speed bremsen
- "alles in einem Workspace" ist stark, aber auch komplex

Was ExamDraft uebernehmen sollte:

- Daily Drill
- Knowledge/Exam Confidence Score
- Kurs-/Modulstruktur
- Fachschafts- und spaeter Campus-Angebot
- Trust- und Datenschutz-Kommunikation

### StudyFetch

Staerken:

- All-in-one Positionierung
- Study Plan, AI Tutor, Lecture Notes, Arcade, Practice Tests
- starke Mobile-/Consumer-Kommunikation
- sehr grosse Social Proof Claims
- Institutionen- und Enterprise-Narrativ

Schwaechen gegen ExamDraft:

- sehr breit und schwer zu differenzieren
- nicht spezifisch fuer europaeische Altklausur- und Fachschaftskultur
- weniger glaubwuerdig als Spezialist fuer konkrete Modul-Pruefungslogik

Was ExamDraft uebernehmen sollte:

- Study Plan
- mobile-first Lernflow
- sichtbare Ergebnisclaims
- Research-/Evidence-Kommunikation, sobald eigene Daten vorhanden sind

## Produktstrategie

ExamDraft wird in drei Ebenen ausgebaut.

### 1. Exam Intelligence

Ziel:

- Nutzer versteht nach der Analyse, wie das Modul prueft.
- Nutzer sieht Prioritaeten, nicht nur eine Liste von Themen.

Kernfunktionen:

- Aufgabentypen
- Themenhaeufigkeit
- Punktegewichtung
- Schwierigkeitsprofil
- Dauerbrenner-Themen
- seltene, aber punktestarke Themen
- Risky Gaps
- Coverage Score
- Confidence Score
- konkrete Next Best Actions

### 2. Exam Practice

Ziel:

- Nutzer uebt nicht generisch, sondern im erkannten Pruefungsformat.

Kernfunktionen:

- volle Probeklausur
- Typtraining
- adaptive Varianten
- Simulation mit Timer
- KI-Korrektur
- Fehleranalyse
- Fehlerkarten aus eigenen Fehlern

### 3. Exam Execution

Ziel:

- Nutzer bleibt bis zur echten Klausur im System.

Kernfunktionen:

- Exam Sprint Lernplan
- Daily Drill
- FocusPartner Sessions
- Exam Confidence Score
- Fortschritt je Aufgabentyp
- Lerngruppen- und Fachschafts-Sharing

## Phasenplan

## Phase 0: Produktionsreife Basis, Woche 1-2

Ziel:

Der aktuelle lokale Stand wird launchfaehig, rechtlich konsistent und zahlungsfaehig.

### Produkt und Copy

Umsetzen:

- Landingpage so umbauen, dass gehostete ExamDraft-Credits der Standard sind.
- BYOK als "Advanced Mode" positionieren, nicht als Hauptweg.
- Alte Aussage entfernen oder umformulieren: "Kein ExamDraft-Backend fuer deine Inhalte, nur dein eigener API-Key."
- Neue Standardbotschaft:
  - "Kostenlos starten"
  - "1 Analyse gratis"
  - "Kein API-Key noetig"
  - "BYOK fuer Advanced User"
- Beta-Hinweis beibehalten, aber kaufbarer formulieren.
- Pricing prominent erklaeren:
  - Free: 1 Analyse
  - Credit Pack: 4,99 EUR fuer 30 Credits
  - Analyse: 1 Credit
  - Typtraining: 2 Credits
  - volle Klausur: 4 Credits

Akzeptanzkriterien:

- Nutzer versteht ohne Doku, dass kein API-Key noetig ist.
- Nutzer versteht, wann bezahlt wird.
- Nutzer versteht, warum BYOK trotzdem existiert.

### Billing und Security

Umsetzen:

- Stripe Webhook Signaturpruefung mit `STRIPE_WEBHOOK_SECRET` einbauen.
- Webhook ohne gueltige Signatur ablehnen.
- Idempotenz ueber `stripe_session_id` beibehalten.
- Checkout-Success und Checkout-Cancel in der App anzeigen.
- Nach erfolgreicher Zahlung Account/Credits neu laden.
- `BILLING_NOT_CONFIGURED` nutzerfreundlich anzeigen.

Akzeptanzkriterien:

- Zahlung kann nicht durch ungeprueften Webhook simuliert werden.
- Credits werden nur bei echter `checkout.session.completed` Zahlung vergeben.
- Nutzer sieht nach Rueckkehr von Stripe seinen aktualisierten Credit-Stand.

### Analytics

Umsetzen:

Ein minimales Event-Tracking definieren:

- `landing_view`
- `app_opened`
- `demo_opened`
- `auth_started`
- `auth_success`
- `upload_started`
- `analysis_started`
- `analysis_success`
- `paywall_shown`
- `checkout_started`
- `checkout_success`
- `generation_started`
- `generation_success`
- `generation_failed`
- `byok_selected`

Akzeptanzkriterien:

- Activation Funnel ist messbar.
- Paywall Conversion ist messbar.
- BYOK vs Credits ist messbar.

### Legal und Trust

Umsetzen:

- Privacy und Terms an tatsaechlichen Produktstand anpassen.
- Klar unterscheiden:
  - Browser Session Storage
  - Server Proxy bei ExamDraft Credits
  - BYOK Direktnutzung
  - Improvement Consent
  - keine dauerhafte Speicherung ohne Consent
- KI-Transparenz ergaenzen:
  - "KI-generiert, bitte pruefen."
  - "Keine offizielle Pruefungsvorhersage."
  - "Keine Noten-, Zulassungs- oder Pruefungsentscheidung."

Akzeptanzkriterien:

- Legal Copy widerspricht nicht mehr der technischen Architektur.
- Nutzer versteht, was gespeichert wird und was nicht.

## Phase 1: Conversion-Funnel, Woche 2-5

Ziel:

ExamDraft beweist seinen Wert innerhalb von 60 Sekunden.

### Instant Demo

Umsetzen:

- Demo-CTA auf Landingpage:
  - "Beispielanalyse ansehen"
  - "Sofort testen"
- App-Demo ohne Login:
  - fertige Demo-Analyse laden
  - Demo-Probeklausur laden
  - CTA: "Mit deinen Klausuren testen"
- Demo darf keine Paywall benoetigen.

Akzeptanzkriterien:

- Nutzer sieht vor Upload und Login, wie ExamDraft denkt.
- Demo fuehrt sichtbar zum Upload.

### Upload-Flow

Umsetzen:

- Optionales Modulformular vor oder neben Upload:
  - Modulname
  - Uni/Hochschule optional
  - Studiengang optional
  - Klausurdatum optional
  - Zielnote optional
- Consent kuerzer und lesbarer gestalten.
- Upload-Zonen klar trennen:
  - Altklausuren
  - Vorlesungskontext optional
- Anbieter-/Modellbegriffe fuer normale Nutzer verstecken.

Akzeptanzkriterien:

- Nutzer muss nicht wissen, was OpenRouter ist.
- Upload-Fortschritt und naechster Schritt sind eindeutig.

### Paywall nach Analyse

Umsetzen:

- Kostenlose Analyse als "Proof".
- Volle Probeklausur und Typtraining als bezahlter Schritt.
- Paywall Copy:
  - "Deine Analyse ist fertig."
  - "Generiere jetzt eine realistische Probeklausur aus diesen Mustern."
  - "4 Credits"
- BYOK als sekundäre Option:
  - "Advanced: eigenen API-Key nutzen"

Akzeptanzkriterien:

- Analyse-to-Purchase Conversion kann gemessen werden.
- Nutzer fuehlt sich nicht vor dem Wertbeweis blockiert.

## Phase 2: Exam Intelligence V1, Woche 4-8

Ziel:

ExamDraft wird sichtbar besser als generische PDF-zu-Quiz-Tools.

### Neue Analysefelder

`AnalysisResult` erweitern um:

- `coverageScore`: 0-100, wie gut das hochgeladene Material das Modul abdeckt.
- `confidenceScore`: 0-100, wie sicher die Analyse auf Basis der Daten ist.
- `topicLikelihoods`: Themen mit Wahrscheinlichkeit, Punktewirkung und Evidenz.
- `recurringPatterns`: Dauerbrenner, seltene Muster, moegliche neue Themen.
- `pointWeighting`: erwartete Punkteanteile nach Thema/Aufgabentyp.
- `riskGaps`: wichtige Luecken im Material oder Lernplan.
- `nextBestActions`: konkrete naechste Schritte.

### Analyse-Regeln

Umsetzen:

- Bei nur einer Klausur keine starken Prognosen behaupten.
- Jede Wahrscheinlichkeit bekommt eine Evidenznotiz.
- Vorlesungskontext darf neue Themen vorschlagen, aber klar als "moeglich" markieren.
- Analyse unterscheidet:
  - sicher aus Altklausuren belegt
  - plausibel aus Folien abgeleitet
  - unsicher wegen wenig Material

### UI

Umsetzen:

- Dashboard-Sektion: "Was kommt wahrscheinlich dran?"
- Dashboard-Sektion: "Was bringt viele Punkte?"
- Dashboard-Sektion: "Risky Gaps"
- Dashboard-Sektion: "Was du jetzt lernen solltest"
- Coverage- und Confidence-Anzeige.
- Warnung:
  - "Analyse basiert nur auf 1 Klausur. Confidence niedrig."

Akzeptanzkriterien:

- Nutzer sieht Prioritaeten statt nur Rohdaten.
- Empfehlungen sind nachvollziehbar.
- Duennere Datenlage wird ehrlich kommuniziert.

## Phase 3: Study Plan und FocusPartner, Woche 6-10

Ziel:

ExamDraft sagt nicht nur, was wichtig ist, sondern macht Lernen ausfuehrbar.

### Exam Sprint

Umsetzen:

- Button nach Analyse:
  - "Exam Sprint erstellen"
- Eingaben:
  - Klausurdatum
  - taegliche Lernzeit
  - freie Tage optional
  - Zielnote optional
- Ausgabe:
  - Tagesplan
  - konkrete Aufgaben
  - geschaetzte Dauer
  - Link zu Typtraining/Simulation
  - FocusPartner Session Link

### Study Plan Struktur

Neue Typen:

- `StudyPlan`
- `StudyTask`
- `FocusSessionLink`

Minimalfelder:

- `studyPlanId`
- `moduleId`
- `examDate`
- `dailyMinutes`
- `confidenceScoreAtCreation`
- `tasks`
- `taskTitle`
- `taskType`
- `estimatedMinutes`
- `linkedPracticeMode`
- `focusSessionUrl`
- `completionStatus`

### FocusPartner Integration

Umsetzen:

- Deep Link zu FocusPartner erzeugen.
- Parameter:
  - task title
  - duration
  - module
  - return URL zu ExamDraft
- Keine Markenfusion.
- FocusPartner bleibt Ausfuehrungs- und Retention-Layer.

Beispiele:

- "45 Min: Rechenaufgaben Typ 2 trainieren"
- "25 Min: Fehler aus letzter Probeklausur wiederholen"
- "90 Min: Simulation unter Zeitdruck"
- "15 Min: Musterloesung gegen eigene Antwort pruefen"

Akzeptanzkriterien:

- Nach jeder Analyse existiert ein naechster Lernschritt.
- Nutzer kann direkt eine Fokus-Session starten.
- ExamDraft wird vom Einmal-Generator zum Klausurphasen-System.

## Phase 4: Practice Engine, Woche 8-14

Ziel:

Ueben, Korrigieren und Wiederholen werden staerker als bei generischen Lernapps.

### Typtraining

Umsetzen:

- Immer 5 Varianten pro gewaehltem Aufgabentyp.
- Varianten muessen neue Zahlen, Kontexte oder Denkwege enthalten.
- Schwierigkeit adaptiv:
  - nach falschen Antworten leichter erklaeren
  - nach starken Antworten schwieriger machen

Akzeptanzkriterien:

- Kein Copy-Paste-Gefuehl.
- Nutzer trainiert Mustertransfer, nicht Auswendiglernen.

### Korrektur

Umsetzen:

- Punktevergabe mit Begruendung.
- Fehlende Konzepte markieren.
- Typische Fehler kategorisieren.
- Naechste passende Uebung empfehlen.

Fehlerkategorien:

- Konzept nicht verstanden
- Rechenfehler
- Begründung fehlt
- falsches Verfahren
- Zeitmanagement
- Diagramm/Interpretation

### Fehlerkarten

Umsetzen:

- Flashcards nicht generisch bauen.
- Nur aus eigenen Fehlern erzeugen.
- Jede Karte verlinkt zur urspruenglichen Aufgabe.

Akzeptanzkriterien:

- Fehler werden zu Wiederholung.
- Confidence Score steigt nur durch echte Leistung, nicht durch Generieren.

## Phase 5: Altklausur- und Fachschaftsnetzwerk, Monat 3-6

Ziel:

ExamDraft baut einen defensiblen Datenvorteil auf, ohne eine riskante oeffentliche Altklausur-Datenbank zu werden.

Grundsatz:

> Originale schuetzen, Muster lernen, neue Uebungen erzeugen.

### Nicht bauen

- keine oeffentliche Altklausur-Suche
- kein Download-Archiv fremder Klausuren
- kein ungeprueftes Teilen von Original-PDFs
- kein Training ohne Rechte- und Consent-Grundlage

### Bauen

- Fachschafts-Pools
- private Modulraeume
- Rechte- und Consent-Workflow
- Review-Queue fuer Beitraege
- Pattern-Datenbank statt PDF-Datenbank

### Neue Datenmodelle

`Module`

- Uni
- Land
- Sprache
- Modulname
- Studiengang
- Fachbereich

`ExamContribution`

- Upload-Metadaten
- Hash
- Status
- Rechtebestaetigung
- Consent-Version

`ExamPatternSnapshot`

- Aufgabentypen
- Themen
- Punkte
- Haeufigkeit
- Confidence
- Jahr/Semester

`PartnerOrganization`

- Fachschaft
- Tutorium
- Uni-Gruppe
- Kontaktperson
- Verifizierungsstatus

`PartnerModulePool`

- private Materialsammlung
- Zugriffscodes
- erlaubte Nutzergruppen
- Ablaufdatum optional

### Fachschaftsangebot

Angebot:

- kostenloser Pilot pro Fachschaft
- private Modul-Analyse
- keine Veroeffentlichung der Originale
- Rabattcodes fuer Studierende
- anonymisierte Insights fuer die Fachschaft

Pitch:

> Ihr behaltet Kontrolle ueber euer Archiv. ExamDraft veroeffentlicht keine Originalklausuren. Wir machen daraus private Analyse, Uebungsklausuren und Lernpfade fuer eure Studierenden.

Akzeptanzkriterien:

- Fachschaften behalten Kontrolle.
- ExamDraft kann Muster ueber Kohorten verbessern.
- Nutzer profitieren von besseren Insights, ohne fremde Originale zu sehen.

## Phase 6: Sharing, Virality und Lerngruppen, Monat 4-7

Ziel:

Distribution wird ins Produkt eingebaut.

Umsetzen:

- Share-Link fuer generierte Probeklausur ohne Loesungen.
- Share-Link fuer Typtraining.
- Lerngruppe mit gemeinsamem Exam Sprint.
- Fachschaftscode fuer private Modulraeume.
- Referral-System:
  - beide Nutzer erhalten Credits
  - Missbrauchsschutz ueber E-Mail/IP/Payment-Signale
- Public Preview Page:
  - Titel
  - Modul
  - Anzahl Aufgaben
  - Dauer
  - keine Originalinhalte
  - CTA: "Eigene Klausur generieren"

Akzeptanzkriterien:

- Ein Nutzer kann seine Lerngruppe organisch einladen.
- Geteilte Inhalte enthalten keine urheberrechtlich riskanten Originale.
- Referral erzeugt messbare Activation.

## Phase 7: Go-To-Market Maschine, Monat 1-12

Ziel:

ExamDraft wird in der Pruefungsphase sichtbar.

### Kanaele

Prioritaet:

1. TikTok/Reels fuer akute Klausurpanik.
2. SEO fuer dauerhaften Intent.
3. Fachschaften fuer Vertrauen.
4. Uni-nahe Communities fuer Distribution.
5. Paid Ads erst nach validierten Landingpages.

### Content Pillars

- "Altklausuren richtig analysieren"
- "Was kommt wahrscheinlich dran?"
- "3 Tage vor der Klausur"
- "Warum Auswendiglernen von Altklausuren gefaehrlich ist"
- "Probeklausur aus echten Mustern"
- "So findest du punktestarke Themen"

### Short-Form Hooks

- "Ich habe 6 Altklausuren analysiert. Diese 3 Aufgabentypen kamen jedes Jahr dran."
- "3 Tage vor Statistik? Erst das hier machen."
- "Hoer auf, eine Altklausur auswendig zu lernen."
- "Deine Lernapp kennt den Stoff. ExamDraft kennt die Klausur."
- "Diese Themen bringen viele Punkte, werden aber oft zu spaet gelernt."

### SEO-Seiten

Initial bauen:

- `/de/altklausur-analysieren`
- `/de/probeklausur-erstellen`
- `/de/pruefungsmuster-erkennen`
- `/de/statistik-1-klausur-vorbereiten`
- `/de/bwl-klausur-vorbereiten`

Regeln:

- Keine illegalen Download-Claims.
- Keine fremden Originalklausuren veroeffentlichen.
- Tool-Intent statt Archiv-Intent.

### Ambassador-Programm

Umsetzen:

- 20 Campus Ambassadors in DACH.
- Credits, Tracking-Link und Content-Vorlagen.
- Fokus auf:
  - Wirtschaft
  - Informatik
  - Ingenieurwesen
  - Statistik
  - Mathematik
  - Medizin-Vorklinik vorsichtig und mit rechtlichem Blick

### Fachschafts-Pilotpaket

Paket:

- eine Landingpage pro Fachschaft
- ein privater Modulpool
- 100 kostenlose Analyse-Credits
- 20 Prozent Rabattcode fuer Studierende
- Feedback-Call nach Pruefungsphase

Akzeptanzkriterien:

- Jede Woche entstehen neue organische Uploads.
- SEO-Seiten ranken fuer Tool-Intent.
- Campus-Piloten liefern Modul- und Conversion-Daten.

## Phase 8: Europa-Ausbau, Monat 9-24

Ziel:

DACH-Spezialisierung wird zu europaeischer Kategorie-Fuehrung.

### Marktreihenfolge

1. Deutschland, Oesterreich, Schweiz
2. Niederlande
3. Frankreich
4. Spanien
5. Italien
6. Polen oder Nordics je nach Pull

### Lokalisierung

Umsetzen:

- App Copy vollstaendig uebersetzen.
- Legal Review pro Zielmarkt.
- SEO-Cluster pro Sprache.
- lokale Uni-/Modul-Metadaten.
- Payment-Lokalisierung ueber Stripe, sofern ausreichend.

### Lokale Begrifflichkeit

- DE: Altklausur
- EN: past exam
- FR: annales
- ES: examenes anteriores
- IT: esami passati
- NL: oude tentamens

Akzeptanzkriterien:

- Jeder neue Markt hat eigene Landingpage, App Copy, Legal Review und SEO-Cluster.
- Expansion startet erst nach stabilem DACH-Funnel.
- Kein Markt wird halb uebersetzt gelauncht.

## Technische Zielarchitektur

### Frontend

Bestehende Basis:

- Astro 6
- React Islands
- Tailwind CSS
- PDF-Verarbeitung im Browser

Ausbauen:

- Demo-Modus als eigener Einstieg.
- Intelligence Dashboard.
- Study Plan View.
- FocusPartner Deep Links.
- Share Preview Pages.
- SEO Landing Pages.

### Backend

Bestehende Basis:

- Cloudflare Pages Functions
- D1
- Magic Link Auth
- Credit Ledger
- Stripe Checkout Scaffold
- OpenRouter Proxy
- Consent Contributions

Ausbauen:

- Stripe Signature Verification.
- Module API.
- Study Plan API.
- Attempts API.
- Share API.
- Partner Apply API.
- Module Intelligence API.

### Neue API-Endpunkte

`POST /api/modules`

- erstellt oder findet Modulkontext.

`POST /api/study-plan`

- erzeugt Plan aus Analyse, Deadline und verfuegbarer Lernzeit.

`POST /api/attempts`

- speichert Uebungs- und Korrekturergebnisse.

`POST /api/share`

- erzeugt sichere Share Links.

`POST /api/partner/apply`

- nimmt Fachschafts- oder Partneranfragen an.

`GET /api/module-intelligence/:moduleId`

- liefert aggregierte, freigegebene Pattern Insights.

### Datenprinzipien

- Ohne Consent keine dauerhafte Speicherung von Lernmaterial.
- Mit Consent bevorzugt anonymisierte Extraktion und Pattern Snapshots speichern.
- Original-PDFs nur bei explizitem Partnervertrag und privatem Zugriff.
- Jede KI-Ausgabe bleibt Lernhilfe, keine offizielle Pruefungsvorhersage.
- Loeschung und Consent-Widerruf muessen technisch vorbereitet werden.

## Monetarisierung

### Startmodell

| Paket | Zielgruppe | Preis | Inhalt |
| --- | --- | --- | --- |
| Free | Neugierige Nutzer | 0 EUR | 1 Analyse, Demo, BYOK moeglich |
| Credit Pack | Klausurphase | 4,99 EUR | 30 Credits |
| Exam Sprint Pass | intensive Klausurphase | 9,99 EUR | Credits + Study Plan + FocusPartner Bundle |
| Fachschaft Pilot | Gruppen | kostenlos oder niedrigpreisig | privater Modulpool, Codes, Insights |
| Campus License | spaeter | individuell | institutionelle Nutzung |

### Credit Defaults

- Analyse: 1 Credit
- Typtraining: 2 Credits
- volle Klausur: 4 Credits
- Korrektur: 1 Credit oder im Exam Sprint enthalten
- Study Plan: kostenlos nach Analyse oder 1 Credit bei Wiedererzeugung

### Warum Credit-Pack-first

- Studenten sind in Klausurphasen zahlungsbereit, aber abosensibel.
- Einmalzahlung ist leichter als Abo.
- Credits passen zu API-Kosten.
- Abo kann spaeter als Semester-Pass eingefuehrt werden.

## Recht, Vertrauen und EU AI Act

Prioritaet:

EU-Vertrauen wird ein Wettbewerbsvorteil.

Umsetzen:

- KI-Transparenz sichtbar machen.
- Keine offizielle Noten-, Zulassungs- oder Pruefungsentscheidung.
- Keine institutionelle Leistungsbewertung in v1.
- EU AI Act Risikobewertung dokumentieren.
- DSGVO-Prozesse vorbereiten:
  - Auskunft
  - Loeschung
  - Export
  - Consent-Widerruf
- DPA-Vorlage fuer Fachschafts-/Uni-Piloten.
- TOMs fuer technische und organisatorische Massnahmen.
- Admin-Review fuer Pattern-Pools.
- Prompt-Evaluation mit Golden Test Sets.

Wichtige Grenze:

> Solange ExamDraft ein studentisches Uebungs- und Vorbereitungstool bleibt, ist das Risiko niedriger. Sobald ExamDraft fuer offizielle Bewertung, Zugang, Noten oder institutionelle Lernstandsentscheidungen genutzt wird, steigt der regulatorische Aufwand erheblich.

## Testplan

### Produktionsbasis

Testfaelle:

- Stripe Checkout Success.
- Stripe Checkout Cancel.
- Webhook mit gueltiger Signatur.
- Webhook mit ungueltiger Signatur.
- Credit-Verbrauch bei Analyse.
- Credit-Refund bei LLM-Fehler.
- Magic Link Login.
- Logout.
- BYOK Fallback.
- Consent true speichert anonymisierte Contributions.
- Consent false speichert keine Contributions.

### Exam Intelligence

Testfaelle:

- Analyse mit 1 Klausur erzeugt niedrige Confidence.
- Analyse mit 5 Klausuren erzeugt Dauerbrenner und Muster.
- Analyse mit Folienkontext markiert neue Themen als moeglich, nicht sicher.
- Analyse mit bildlastigen PDFs gibt Hinweis und Fallback.
- Ungueltige LLM-Ausgabe wird abgefangen.

### Practice

Testfaelle:

- Typtraining generiert 5 Varianten.
- Varianten wiederholen nicht nur die gleiche Aufgabe.
- Korrektur vergibt Punkte plausibel.
- Fehlerkategorien werden gesetzt.
- Fehlerkarten entstehen aus Feedback.
- Confidence Score steigt nur nach Uebung.

### FocusPartner

Testfaelle:

- Deep Link enthaelt Tasktitel.
- Deep Link enthaelt Dauer.
- Deep Link enthaelt Modul.
- Ruecksprung zu ExamDraft funktioniert.
- Session-Start verliert keine ExamDraft-Daten.

### Fachschaft

Testfaelle:

- Partnerpool ist privat.
- Zugriffscode funktioniert.
- Zugriff ohne Code wird blockiert.
- Share-Link zeigt keine Originalinhalte.
- Beitrag ohne Rechtebestaetigung wird blockiert.
- Consent-Widerruf entfernt nutzbare Contributions.

### SEO und GTM

Testfaelle:

- Landingpages haben klare CTAs.
- Keine Seite suggeriert illegale Altklausur-Downloads.
- DE/EN Copy ist konsistent.
- Tracking Events feuern im Funnel.

## Operativer 90-Tage-Plan

### Woche 1

- Stripe Webhook absichern.
- Billing Return States in App.
- Landingpage Copy auf Credits/BYOK korrigieren.
- Privacy/Terms angleichen.

### Woche 2

- Analytics Events einbauen.
- Demo CTA auf Landingpage.
- Demo-Modus in App prominenter machen.
- Production Checklist finalisieren.

### Woche 3

- Upload-Flow vereinfachen.
- Modulname/Uni/Klausurdatum als optionale Felder.
- Paywall Copy und Credit-Erklaerung verbessern.

### Woche 4

- AnalysisResult um Intelligence-Felder erweitern.
- Analyseprompt umbauen.
- Fallbacks fuer alte Analyseergebnisse.

### Woche 5

- Intelligence Dashboard bauen.
- Coverage Score.
- Confidence Score.
- High Value Topics.
- Risky Gaps.

### Woche 6

- Exam Sprint UI.
- Study Plan Typen.
- Study Plan Generator.

### Woche 7

- FocusPartner Deep Links.
- Daily Plan Cards.
- "Heute lernen" Einstieg.

### Woche 8

- Typtraining auf 5 Varianten schaerfen.
- Korrekturfeedback erweitern.
- Fehlerkategorien definieren.

### Woche 9

- Practice Attempts speichern.
- Confidence Score mit Attempts verbinden.
- Fehlerkarten MVP.

### Woche 10

- Sharing MVP fuer Probeklausur ohne Loesungen.
- Public Preview Page.
- Referral-Konzept technisch vorbereiten.

### Woche 11

- Fachschafts-Partnerformular.
- Partner-Pilotpaket Landing Copy.
- erste 20 Fachschaften manuell targeten.

### Woche 12

- SEO-Seiten v1.
- TikTok/Reels Content Plan.
- Ambassador Tracking Links.
- 90-Tage-Metriken auswerten und Phase 2 priorisieren.

## Quellenbasis

- StudyPDF Feature- und Pricing-Positionierung: <https://studypdf.net/de>
- acemate Feature-Set und Learning Platform: <https://help.acemate.ai/en/help/articles/1557637-welcome-to-acemate-your-ai-learning-platform>
- acemate Educators: <https://www.acemate.ai/de/educators>
- StudyFetch Positionierung und Feature-Breite: <https://www.studyfetch.com/>
- KI-Nutzung von Studierenden in Deutschland, CHE, 12. Juni 2025: <https://www.che.de/en/2025/a-quarter-of-students-in-germany-use-artificial-intelligence-on-a-daily-basis/>
- EU AI Act, Regulation 2024/1689: <https://eur-lex.europa.eu/eli/reg/2024/1689/oj>

## Schlussfolgerung

ExamDraft hat die beste Chance, wenn es nicht versucht, StudyFetch, acemate oder StudyPDF vollstaendig nachzubauen. Die Gewinnstrategie ist enger und tiefer:

> Aus Altklausuren wird Pruefungsintelligenz. Aus Pruefungsintelligenz wird ein Lernplan. Aus dem Lernplan wird echte Uebung bis zur Klausur.

Die Reihenfolge ist entscheidend:

1. Paid Funnel und Vertrauen produktionsreif machen.
2. Time-to-Value durch Demo und klare Analyse senken.
3. Exam Intelligence sichtbar besser machen.
4. Study Plan und FocusPartner als Retention-Layer verbinden.
5. Practice Engine adaptiv ausbauen.
6. Fachschaften und Pattern-Datenbank als defensiblen Vorteil aufbauen.
7. DACH gewinnen.
8. Erst danach Europa skalieren.

