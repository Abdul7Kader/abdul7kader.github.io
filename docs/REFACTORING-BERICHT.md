# Runde 4: Rückmeldung vom 12.11.2026 (13.11.2026)

Plan mit Fortschritt: `docs/PLAN-RUNDE-4.md`. Jeder Punkt ist ein eigener Commit „Runde 4 …“ mit Tests.

## Was sich geändert hat

**Fehler und Bedienung**
- **Kontaktformular:** Die Antwort von FormSubmit wird jetzt richtig ausgewertet (Erfolg nur bei `success`,
  Fehler nur bei echtem Fehlschlag, auch bei Text- statt JSON-Antwort). Nach dem Senden schließt sich das Formular
  und ein Toast bestätigt. Neuer Test `tests/contact.mjs`. Die erste Mail ohne Nachricht war FormSubmits
  Aktivierungsmail – das passiert nur einmal.
- **Farbmodus:** nur noch Hell und Dunkel; beim ersten Besuch gilt die Systemeinstellung als Startwert.
- **Knöpfe:** „Weiter zu den Fakten“ war im Dunkelmodus weiß auf weiß – behoben, Spielkarten sind jetzt im Kontrasttest.
- **Firmenfeld im Finale:** folgte dem dunklen System-Design; Eingabefelder folgen jetzt dem Seitenmodus.
- **Spielfenster:** nutzt beim Minispiel den ganzen Bildschirm (kleiner Rand), auf Handy hoch/quer und Rechner.

**Inhalte (ohne Wiederholungen)**
- Keine Flaggen mehr, nur Ländernamen. Sprachkurse in einem Eintrag (03.2015 – 04.2016, bitte bestätigen).
- Deutsch: „C2 – höchste Stufe des GER“.
- Business-Viertel: Prompt Engineering, UI/UX-Design, Programmentwicklung, Qualitätssicherung, Deployment und
  Support; KI-Agenten unterstützen – nirgends mehr „KI-generierter Code“. Minispiel-Schritt heißt „Entwicklung“.
- Telekom ohne Up-/Cross-Selling-Punkt; PSI „100 % ohne KI-Werkzeuge“ nur noch einmal.
- **Tech-Lab = Werkzeuge + GitHub:** keine Rollenkarte, keine Aufgaben. Die Leuchtwand mit den GitHub-Kacheln steht
  jetzt auf dem Tech-Lab-Dach; das Werkstatt-Gebäude ist weg, an seiner Stelle wächst wieder Wald.
- Projekt-Baustelle ohne GitHub-Karte; Rustfall ohne Filmbezug („Postapokalyptisches Handyspiel“).
- Finale: ein Knopf „Abdul Kader kontaktieren“ (Feld `contactName`, auch im Admin).
- Doppelungen inhaltlich bereinigt (Stärken, Sprüche, KI-Kompetenzen, Tools, Weltkarte); `docs/texte.md` meldet keine.

**GitHub-Zahlen**
- Das Skript holt zusätzlich Commits gesamt seit Kontoerstellung, der letzten 3/6/12 Monate, davon privat, und die
  Anzahl öffentlicher und privater Projekte – nur Zahlen, keine Namen privater Repositories.
- Im Tech-Lab: „Commits im Überblick“ und darunter das Kachel-Panel „Öffentliche Projekte“ (bzw. „Öffentliche und
  private Projekte“, sobald private Beiträge mitgezählt werden). Anleitung für das Token im README.

**Neu**
- **Projekt-Baustelle als Mini-Open-World:** kleine Stadt von oben mit Ringstraße und sechs Grundstücken. Abdul läuft
  frei (Pfeiltasten/WASD, Ziehen, Tippen – der Weg führt über die Straßen). Erkennbare Gebäude im Bauzustand:
  Werkzeugverleih (fertig, mit Kunden), Studio mit Bildschirm und Sendemast, Raffinerie in der Wüste, Stadion mit
  Flutlicht, Restaurant mit Terrasse, Fahrschule mit Übungsplatz und Fahrschulauto (Baugrube mit Bagger).
  Im Rohbau: Gerüst und drehender Kran. Vor einem Gebäude erscheint die Projektkarte. Hell/Dunkel mit Laternen.
- **Easter Egg:** Sind alle Skill-Sterne gesammelt, gibt es Feuerwerk über Abdul, Bit tanzt, und danach die Karte
  „Hinter den Kulissen“ (wie die Seite gebaut ist, mit Augenzwinkern). Danach auch über die Suche erreichbar.
  Kein Meme: Rechte an Meme-Bildern sind meist ungeklärt, und Witz altert schnell – das Feuerwerk passt zur Welt.

## Leistung (gleiche Umgebung, `main` vor Runde 4 → jetzt, Hauptthread)

| Situation | vor Runde 4 | jetzt |
|---|---|---|
| Welt, Spieler steht | 15 % | 15 % |
| Welt, Spieler läuft | 29 % | 29 % |
| Dialog offen | 1 % | 1 % |
| Projekt-Viertel offen | 20 % | **14 %** |
| Minispiel läuft | 25 % | 26 % (größeres Spielfeld, Auflösung auf 1200 px begrenzt) |

Dunkelmodus: praktisch gleich (Projekt-Viertel 16 %).

## Tests

ESLint, Smoke-Test (DE/EN × Hell/Dunkel), Sprachen, Kontrast, Kontaktformular, GitHub-Skript (neu, mit simulierter
API) – alle grün. Der Kontrasttest prüft jetzt auch Karten mit Farbverlauf und hat dabei einen echten Fehler
gefunden (aktueller Zeitleisten-Eintrag im Dunkelmodus hell mit blasser Schrift – behoben).
Screenshot-Matrix DE/EN × Hell/Dunkel × Desktop/iPhone durchgesehen.

## Was Abdul tun sollte

1. **Private GitHub-Zahlen:** Profil-Schalter „Include private contributions“ einschalten und ein Token mit nur
   Leserechten als Secret `ACTIVITY_TOKEN` speichern (README, Abschnitt „GitHub-Zahlen mit privaten Projekten“).
2. **Sprachkurse:** Zeitraum 03.2015 – 04.2016 bestätigen (du hattest 2025/2026 geschrieben).
3. **3D-Figur:** Fotos an Codex geben (Prompt vom 12.11.); die Sprites baue ich danach ein.

---

# Abschlussbericht Runde 3: Refactoring, Englisch, Dark Mode

Branch: `abdul7kader/refactoring` · Plan: `docs/REFACTORING-PLAN.md` · Zeitraum: 10.–12.11.2026
Am 12.11.2026 auf Abduls Wunsch auf `main` gemergt.

## Kurzfassung

- **Rechenlast** in allen Messpunkten deutlich gesenkt. Alle vier Zielwerte sind erreicht, auch beim Laufen durch die Welt.
- **Neue Struktur:** native ES-Module in klaren Ordnern statt elf großer Skripte mit globalem `window.CV`,
  benannte Konstanten statt verstreuter Zahlen, CSS nach Bereichen aufgeteilt.
- **Englisch überall** (Oberfläche, Spiele, Welt, Lebenslauf, PDF, Formular, Karte, Admin, Unterseiten) mit Umschalter.
- **Dark Mode überall** (System/Hell/Dunkel, Spielwelt bei Nacht), PDF und Druck bleiben hell, Kontrast nach WCAG AA.
- **Lücken aus Runde 2** geschlossen: GitHub-Werkstatt, Weltansicht der Karte, zoombares Projekt-Viertel,
  Datenschutz, Linkseite, Icons statt Emojis, Textliste ohne Doppelungen.
- **Qualität:** ESLint, Tests für Ablauf, Sprachen, Kontrast, Screenshots und Leistung, CI mit drei Browsern.

## Leistung vorher → nachher

Gemessen mit `tests/perf.mjs`: Chromium ohne Grafikkarte (Software-Rendering, also ein ungünstiger Fall),
Bildschirm mit Pixeldichte 2, Fenster 1366 × 860. **Hauptthread** = Rechenzeit des Seiten-Threads,
**CPU gesamt** = alle Browser-Prozesse zusammen (100 % = ein voller Kern). Werte schwanken zwischen Läufen um etwa ±5 Punkte.

| Situation | Hauptthread vorher | nach Schritt 1 | **jetzt** | Ziel | CPU gesamt vorher → jetzt |
|---|---|---|---|---|---|
| Startbildschirm | 47 % | 45 % | **14 %** | – | 150 % → 88 % |
| Welt, Spieler steht (Dauerzustand) | 100 % (29 Bilder/s) | 29 % | **14 %** | ≤ 15 % ✓ | 154 % → 34 % |
| Welt, Spieler läuft | 100 % | 70 % | **27 %** | ≤ 35 % ✓ | 156 % → 67 % |
| Dialog offen | 53 % | 2 % | **1 %** | ≤ 5 % ✓ | 153 % → 7 % |
| Projekt-Viertel offen | 96 % | 23 % | **20 %** | – | 146 % → 39 % |
| Weltkarte offen | 52 % | 20 % | **9 %** | – | 156 % → 51 % |
| Minispiel läuft | 63 % | 44 % | **28 %** | ≤ 35 % ✓ | 163 % → 66 % |

**Dunkelmodus** (gleiche Messung): Welt steht 13 %, Welt läuft 27 %, Dialog 1 %, Startbildschirm 14 % –
praktisch identisch mit Hell. Die Nacht kostet pro Bild nichts extra, weil Abdunklung und Laternenlicht beim
Erzeugen der Sprites bzw. der Spiel-Hintergründe einmal eingebacken werden.

Was die Last gesenkt hat:
1. **Sprites:** Bäume, Gebäude, Requisiten und Schilder werden einmal in Bildschirmauflösung gezeichnet und danach
   nur kopiert; der Boden liegt in Kacheln vor.
2. **Statische Ebene:** Boden, Bäume und Gebäude als ein vorgerendertes Bild; pro Bild kommen nur Bewegtes und davor stehende Objekte dazu.
3. **Bildrate nach Lage:** 60 Bilder/s beim Laufen, 15 im Stand, 24 hinter dem Startbildschirm, 0 hinter Dialogen
   (dort ein einmal weichgezeichnetes Standbild statt CSS-Unschärfe).
4. **Pixeldichte beim Fahren:** Solange die Kamera fährt, wird mit Pixeldichte 1 gezeichnet, im Stand wieder scharf.
   Die Sprites beider Auflösungen bleiben im Speicher, der Wechsel ruckelt nicht (längste Bildpause beim Laufen 17 ms).
5. **CSS:** keine `backdrop-filter` über der bewegten Welt, Puls-Effekte nur mit `transform`/`opacity`, Animationen pausieren hinter Dialogen.
6. **Minispiele und Projekt-Viertel:** zwischengespeicherte Hintergründe, begrenzte Pixeldichte, Zeichnen nur, solange sichtbar.

## Neue Struktur

```
js/main.js         Einstieg; verbindet Module über Ereignisse (core/events.js)
js/core/           DOM, Mathe, Canvas-Grundformen, Speicher, Ereignisse, i18n, Farbmodus, Audio, Icons, Ableitungen
js/config/         Weltaufbau (layout), Zeiten (timing), Leistung (performance), Farben Tag/Nacht (theme)
js/world/          Aufbau, Wegfindung, Eingabe, Partikel, Renderer, Sprites (Gebäude, Menschen, Requisiten, Natur)
js/games/          Engine + sechs Spiele, je eine Datei
js/ui/             Station, Finale, Kapitelübersicht, Suche, Lebenslauf, PDF, Kontakt, Weltkarte, GitHub, Projekt-Viertel, HUD, Start
js/app/            Spielstand (progress) und Inhalte der aktuellen Sprache (content)
js/i18n/           de.js und en.js mit denselben 374 Texten
css/               20 Dateien nach Bereichen; tokens.css (Variablen), dark.css (Dunkelmodus)
data/              resume.de.js, resume.en.js
assets/            Bilder, Kartendaten (Europa 1:50m, Welt 1:110m) – Karten erst bei Bedarf geladen
tools/, tests/     Entwicklungswerkzeuge und Tests (siehe README)
```

## Abnahme

| Prüfung | Ergebnis |
|---|---|
| ESLint (Seite, Tests, Werkzeuge) | ohne Befund |
| Smoke-Test Chromium: Deutsch/Englisch × Hell/Dunkel × Desktop/iPhone (alle Stationen, Spiele, Finale, Kontakt, Suche, Kapitelübersicht, Lebenslauf, PDF, Admin, Unterseiten) | grün |
| Sprachtest: gleiche Schlüssel und Platzhalter, kein deutscher Text im englischen Modus, Umschalten ohne Neuladen | grün |
| Kontrast WCAG AA, hell und dunkel, alle Ansichten | grün |
| Screenshot-Vergleich nach jedem Umbau | nur gewollte Änderungen (Zeit-/Zufallsunterschiede in der Welt) |
| PDF Deutsch und Englisch, auch im Dunkelmodus hell | geprüft |
| CI auf GitHub (`ci.yml`): Lint, Chromium, Firefox, WebKit (Safari) – Smoke Deutsch hell inkl. PDF-Download und Englisch dunkel | grün in allen drei Browsern (Lauf 1 auf GitHub Actions) |
| Textliste `docs/texte.md` | keine Doppelungen in den Inhalten |

## Offene Punkte

- Keine Punkte aus dem Plan offen. Nachgetragen am Morgen des 12.11.: Das Projekt-Viertel ist begehbar (Abdul läuft zum
  angetippten Gebäude, Pfeiltasten/Enter), und die Minispiele haben nachts Sterne, Mond und dunklere Landschaft.
- Das Projekt-Viertel ist eine begehbare Straße im Dialog, keine zweite große Welt; das hält Bedienung und Rechenlast klein.
- Messung ohne Grafikkarte ist ein ungünstiger Fall; auf echten Geräten mit GPU liegt die Last deutlich niedriger.

## Was Abdul prüfen sollte

1. Englische Texte in `data/resume.en.js` (von mir übersetzt).
2. Datenschutz-Seite `datenschutz.html` – keine Rechtsberatung; ggf. Impressum ergänzen.
3. Links für `/links/` (KI-Video-Kanäle, LinkedIn) im Admin eintragen.
4. Vorschau ansehen (Hell/Dunkel, DE/EN, Handy), danach Merge auf `main`.
5. Private GitHub-Zahlen (Runde 4): Profil-Schalter „Include private contributions“ einschalten und ein Token mit
   nur Leserechten als Secret `ACTIVITY_TOKEN` speichern – Schritt für Schritt im README unter
   „GitHub-Zahlen mit privaten Projekten“.
