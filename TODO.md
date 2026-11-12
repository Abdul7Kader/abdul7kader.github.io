# To-dos: Interaktiver Lebenslauf

Stand: 10.11.2026 · Die Aufgaben stammen aus den GitHub-Issues (Sammel-Issue #4, Runde 2).
Umgesetzt auf dem Branch `claude/intelligent-archimedes-1pvu41`. Die Issues bleiben offen, bis Abdul die Vorschau freigibt.

Legende: ✅ umgesetzt · ⏳ wartet auf Abdul · ☐ offen

## Spielwelt und Minispiele

- ✅ **#1 Figuren haben nur ein Auge.** Seitlich laufende Figuren werden jetzt in Dreiviertel-Ansicht gezeichnet: zwei Augen mit Glanzpunkt. Die Brille der Spielfigur hat zwei Gläser und einen Bügel. Gilt für alle Bewohner und die eigene Figur. (`js/world.js` → `drawPerson`)
- ✅ **#2 Kranarm trennt sich.** Der Ausleger hängt fest an der Mastspitze und fährt teleskopartig aus und ein (110–190), mit Gegenausleger und Gegengewicht. Laufkatze und Haken sitzen genau auf dem Arm. Bei „Bewegung reduzieren“ bleibt der Kran ruhig.
- ✅ **#8 Prompt-Fabrik.** Statt Prompt-Bausteinen fünf Schritte eines sicheren KI-Workflows: Anforderung → Plan prüfen → KI-Code → Human in the Loop → Tests & QS. Störkarten sind „Ungeprüft übernehmen“ und „Unklare Anforderung“, die Belohnung ist „Sicher ausgeliefert ✓“.
- ✅ **#11 Projekt-Stapler.** Lange Begriffe kommen zuerst (unten), kürzere oben.
- ✅ **#11 Projekt-Viertel.** Mini-Stadt in der Station „Projekt-Baustelle“ (nur dort, nicht in der ganzen Stadt). Jedes Projekt ist ein Gebäude im passenden Bauzustand mit Status-Schild und Fortschrittsbalken. Gebäude antippen markiert die Kachel darunter. Wer das Spiel gewinnt, sieht die Gebäude als Belohnung wachsen. Auf dem Handy wischbar. (`js/projects.js`)
  - Werkzeugverleih: fertig, mit Kunden davor und Schild „erweiterbar“ (100 %)
  - KI-Videos auf Social Media: Studio mit Sendeturm (95 %)
  - Rustfall (Arbeitstitel): Ölraffinerie in der Wüste (70 %)
  - Ultranisator: Fußballstadion (50 %)
  - Rest-IQ: Restaurant-Rohbau (20 %)
  - Drive Pluz: Fundament mit Bagger
- ✅ **#12 SUP-Slalom.** Das Board folgt der Maus bzw. dem Finger, kein Mehrfachklick mehr. Die Tasten ← → funktionieren weiter.

## Inhalte und Texte

- ✅ **#6 Startkarte.** Statt „2023 bei PSI“ steht jetzt „3 Jahre Full-Stack-Entwickler“. Der Wert wird automatisch aus dem frühesten Entwickler-Job berechnet. Unter dem Namen steht „Full-Stack-Entwickler · Informatikstudent“ (änderbar im Admin: `cardRole`). PSI erscheint auf der Startseite nur noch einmal, in der Tagline.
- ✅ **#8 Erzähltext im Business-Viertel.** „Ich übersetze Kundenwünsche in Lösungen: Im Kundenservice habe ich gelernt, genau hinzuhören – heute stimme ich Anforderungen direkt mit Kunden ab.“
- ✅ **#9 Gründer-Titel.** Jetzt „Mitgründer eines eigenen Unternehmens – Softwareentwicklung“, ohne „KI-gestützt“.
- ✅ **#9 PSI ohne KI.** Badge „100 % ohne KI-Werkzeuge“ plus der Satz „Bei PSI entwickle ich klassisch im Team – Java, SQL und Code-Reviews ohne KI-Unterstützung.“ Steht im Tech-Lab, im Business-Viertel, im Lebenslauf und im PDF (Felder `badge` und `note` in `data.js`).
- ✅ **#10 Doppelte Erzählungen entfernt.**
  - Das Spielziel steht nur noch im Spiel.
  - Der Ergebnistext erscheint nur einmal, kurz und mit neuem Gedanken.
  - Kein zweiter „Stärke freigeschaltet“-Toast, kein „Nächster Halt“ vom Roboter, kein doppeltes „Alles entdeckt“, kein zweites „Danke“ im Finale.
  - Neue Stationstexte, die nicht wiederholen, was darunter steht.
  - Neue Bewohner-Sprüche.
- ✅ **#13 Ehrenamt.** Jede Tätigkeit ist eine eigene Kachel, im Lebenslauf und im PDF steht sie als kompakte Liste.
  - ⏳ **Bitte prüfen:** die Texte der sechs Kacheln, vor allem ob „Warm durch die Nacht“ bleiben soll. Die Rollen und Zeiträume sind Entwürfe.
- ✅ **#16 Bildungsweg.** Sprachschule und Campus sind zu einer Station „Bildungsweg“ zusammengelegt: Zeitleiste vom Integrationskurs bis zum Studium plus Sprachbalken. Das Spiel dort ist Wort-Ninja, Abi-Sprint ist entfallen. Die Welt hat jetzt 6 statt 7 Kapitel, alle Zähler sind angepasst.
- ✅ **#17 Emojis.** In der Spielwelt und den Minispielen bleiben sie. Im HUD, im Lebenslauf, im PDF, in den Fakten und Chips stehen jetzt schlichte Linien-Icons (SVG).

## Funktionen

- ✅ **#3 GitHub-Commit-Kacheln.** Im Tech-Lab erscheinen das grüne Raster der letzten 12 Monate, die Kennzahlen (Beiträge, Serie, aktivster Tag) und die letzten Commits. Im Lebenslauf steht ein kompaktes Raster der letzten 6 Monate.
  - Die Daten kommen aus `github-activity.json`. Die erzeugt die GitHub Action `.github/workflows/github-activity.yml` täglich und nach jedem Push auf `main`.
  - Bis dahin fragt die Seite die öffentliche GitHub-API, sonst bleibt nur die Link-Karte.
  - ☐ Nach dem Merge einmal unter „Actions → GitHub-Aktivität aktualisieren → Run workflow“ starten.
  - Optional: Secret `ACTIVITY_TOKEN` anlegen, dann zählen auch private Beiträge mit.
- ✅ **#5 Syrische Flagge.** Eigene SVG-Flagge (grün-weiß-schwarz, drei rote Sterne), überall statt des veralteten Emojis. Funktioniert auch auf Windows.
- ✅ **#7 Weltkarte.** In „Ankunft & Reisen“ (nach dem Spiel und in den Fakten) zeigt eine Karte Deutschland in der Mitte mit „Heimat seit 2014“ und der Route aus Syrien.
  - Bereiste Länder sind farbig, alle anderen blass.
  - Hover oder Tippen zeigt Name und Flagge, dazu Zoom-Knöpfe. Auf dem Handy ist die Karte wischbar.
  - Die Kartendaten liegen lokal im Repo (Natural Earth).
- ✅ **#14 Kontaktformular.** Das Feld im Finale fordert „Bitte Ihren Firmennamen eingeben“. Danach erscheint „Abdul kontaktieren“.
  - Das Formular (Name, E-Mail, Unternehmen, Telefon, Nachricht, Zustimmung) läuft über FormSubmit.
  - Den Knopf „Jetzt kontaktieren“ gibt es im HUD neben der Suche, in der Suche (Strg+K) und im Lebenslauf.
  - ⏳ **Einmalig nötig:** Nach der ersten echten Anfrage schickt FormSubmit eine Aktivierungs-Mail an Abdul. Bitte bestätigen, erst danach werden Anfragen zugestellt.
  - Optional: Den Alias, den FormSubmit danach anzeigt, im Admin unter „Kontaktformular“ eintragen. Dann steht die Adresse gar nicht mehr im Code.
- ✅ **#15 Farbiges PDF.** „Als PDF speichern“ erzeugt die Datei selbst, farbig und im A4-Format. Die Umbrüche liegen zwischen den Einträgen, der Text ist auswählbar und die Links sind klickbar. Die Bibliotheken liegen lokal in `vendor/`.

## Runde 3 (Nacht 1: 11.11.2026 · Nacht 2: 12.11.2026 · Plan: `docs/REFACTORING-PLAN.md` · Bericht: `docs/REFACTORING-BERICHT.md`)

Branch `abdul7kader/refactoring`. Kein Merge auf `main` ohne Freigabe.

- ✅ **Neustrukturierung:** ES-Module in klaren Ordnern (`config/`, `core/`, `world/`, `games/`, `ui/`, `app/`, `i18n/`), benannte Konstanten statt Zahlen, eine Aufgabe pro Datei. CSS nach Bereichen in `css/`.
- ✅ **Code-Review:** ESLint sauber, gemeinsame Zeichenhilfen, aufgeräumte Listener, Fokus bleibt in Dialogen, sichtbare Fokusrahmen, `!important` nur noch, wo nötig.
- ✅ **Performance:** Hauptthread vorher → jetzt: Welt steht 100 → 13–15 %, Welt läuft 100 → 29–35 %, Dialog 53 → 1 %, Minispiel 63 → 27–30 %. Alle Zielwerte erreicht (Messung ohne Grafikkarte, siehe Bericht).
- ✅ **Englisch überall:** Oberfläche, Minispiele, Welt-Schilder, Lebenslauf, PDF, Formular, Weltkarte, Admin, Unterseiten. Umschalter DE/EN, `?lang=en`. ⏳ Abdul prüft die Übersetzung in `data/resume.en.js`.
- ✅ **Dark Mode:** System/Hell/Dunkel ohne Aufblitzen. Oberfläche, Spielwelt bei Nacht (leuchtende Laternen), Projekt-Viertel mit Sternenhimmel, Weltkarte, GitHub, Admin, Unterseiten. PDF und Druck bleiben hell. Kontrast in beiden Modi nach WCAG AA geprüft.
- ✅ **Lücken aus Runde 2:** GitHub-Werkstatt mit Leuchtwand (#3, #16), Weltkarte mit Weltansicht und Pinch-/Strg-Zoom (#7), Projekt-Viertel zoom- und verschiebbar (#11), Datenschutz-Seite (#14), Linkseite `/links/` mit Admin (#18), Abzeichen als Icons (#17), Textliste ohne Doppelungen (#10).
- ✅ **Qualität:** Tests für Smoke (DE/EN, Hell/Dunkel), Sprachen, Kontrast, Screenshots, Leistung; CI auf GitHub mit Chromium, Firefox und WebKit; README.
- ✅ **Nachtrag 12.11. morgens:** Projekt-Viertel begehbar – Abdul läuft zum angetippten Gebäude und zeigt das Projekt, Pfeiltasten und Enter gehen auch (#11). Minispiele nachts mit Sternen, Mond und dunklerer Landschaft.

## Wartet auf Abdul

- ⏳ **#18 Linksammlung.** Dafür brauche ich die Social-Media-Kanäle der KI-Videos (Plattform + URL) und später die Projekt-Links. Die Projekt-Kacheln zeigen bis dahin „Link folgt“. Die Linkseite `/links/` steht schon; leere Links zeigen „folgt“. Sobald ein `link` in `data/resume.de.js` steht, erscheint dort „Ansehen ↗“.
- ⏳ Endgültiger Name des Handyspiels (bisher „Rustfall (Arbeitstitel)“)
- ⏳ Ehrenamt-Texte bestätigen oder korrigieren (siehe #13)
- ⏳ FormSubmit-Aktivierung bestätigen (siehe #14)
- ⏳ Englische Texte in `data/resume.en.js` gegenlesen
- ⏳ Datenschutz-Seite prüfen (ggf. Impressum ergänzen, falls rechtlich nötig)
- ⏳ Vorschau prüfen und freigeben, danach Merge auf `main` und die Issues schließen
