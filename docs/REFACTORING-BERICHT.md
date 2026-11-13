# Abschlussbericht Runde 3: Refactoring, Englisch, Dark Mode

Branch: `abdul7kader/refactoring` · Plan: `docs/REFACTORING-PLAN.md` · Zeitraum: 10.–12.11.2026
Nichts davon ist auf `main` gemergt; das entscheidet Abdul nach Durchsicht der Vorschau.

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
