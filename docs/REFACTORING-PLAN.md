# Plan: Code-Review, Neustrukturierung und Performance

Start: **11.11.2026, 02:00 Uhr** · Branch: `abdul7kader/refactoring` (enthält den Stand von Runde 2)
Ziel: Jede Zeile lesen, neu strukturieren und optimieren, ohne dass für Besucher etwas kaputtgeht. Am Ende soll das Spiel auf normalen Rechnern flüssig und sparsam laufen.

---

## 1. Ausgangslage (gemessen am 10.11.2026)

Messung mit Chromium ohne GPU-Beschleunigung, 1600 × 900, Retina (2×). Gemessen wurde die Auslastung des Hauptthreads.

| Szenario | CPU | davon JavaScript | Bilder/s |
|---|---|---|---|
| Startbildschirm | 51 % | 2 % | – |
| Welt, Spieler steht still | **100 %** | 4 % | **29** |
| Welt, Spieler läuft | 100 % | 4 % | 29 |
| Dialog offen (Welt verdeckt) | 53 % | 2 % | – |
| Projekt-Viertel offen | 97 % | 1 % | – |
| Minispiel läuft | 63 % | 2 % | – |
| Gegenprobe: ohne Unschärfe-Effekte | 100 % | – | 29 |
| Gegenprobe: Auflösung 1× | 73 % | – | 60 |

**Ursachen**
1. Die ganze Welt wird **in jedem Bild komplett neu gezeichnet**: rund 260 Bäume, alle Gebäude mit Farbverläufen, Laternen, Sterne und Beschriftungen. Nur der Rasen ist zwischengespeichert. Das ist Zeichenarbeit (Rasterung), kein JavaScript, deshalb ist die Script-Zeit so niedrig.
2. Die Welt rendert **auch hinter Dialogen, im Startbildschirm und in Hintergrund-Tabs** mit voller Bildrate weiter. Zusätzlich laufen gleichzeitig eigene Schleifen für Minimap, Minispiel, Projekt-Viertel und Weltkarte.
3. **Teure Effekte pro Bild:** `shadowBlur` (Leuchtschilder, Beschriftungen), `filter: grayscale()` im Projekt-Viertel und neue Farbverläufe in jedem Bild (`createLinearGradient`/`createRadialGradient`).
4. **Retina-Auflösung ohne Begrenzung:** Die Canvas-Fläche ist viermal so groß, und die Zeichenlast wächst mit.
5. Kleinere Punkte: Partikel werden per `splice` entfernt, ein Intervall läuft alle 150 ms, und `measureText` wird pro Bild aufgerufen.

**Struktur-Probleme (Code-Review)**
- `ui.js` mischt sieben Aufgaben in 730 Zeilen: HUD, Minimap, Stationen, Finale, Suche, Lebenslauf und Inhalte. `world.js` (1300 Zeilen) und `minigames.js` (1240 Zeilen) sind ähnlich überladen.
- Koordinaten, Farben, Zeiten und Spielwerte stehen als **nackte Zahlen** mitten im Code, z. B. `x: 1500, base: 1400`, `speed = 230 + g.t * 7` oder `'#ff8a3d'` an Dutzenden Stellen.
- Globale Objekte (`window.CV`) statt sauberer Module. Die Ladereihenfolge hängt an der Reihenfolge der `<script>`-Tags.
- Eine einzige CSS-Datei mit über 900 Zeilen, später angehängte Blöcke und `!important`-Überschreibungen.
- Bilder liegen lose im Hauptordner, Daten und Code sind vermischt.
- Keine automatischen Tests, kein Linter, keine Dokumentation der Struktur.

---

## 2. Lücken aus Runde 2 (ehrliche Bestandsaufnahme)

Abdul hat zu Recht bemängelt, dass nicht alles umgesetzt ist. Diese Punkte schließe ich zuerst:

| # | Wunsch | Stand nach Runde 2 | Wird jetzt gemacht |
|---|---|---|---|
| 3 | GitHub-Aktivität **auf der Karte** sehen | nur im Dialog | Leuchtwand mit Commit-Kacheln am Tech-Lab-Gebäude in der Spielwelt |
| 7 | Weltkarte: auf die **ganze Welt** herauszoomen | nur Europa/Nahost | Weltdaten (110m) für die Gesamtansicht, Europa-Detail beim Hineinzoomen; Zoom per Mausrad/Pinch |
| 11 | Projekt-Viertel als **neue kleine Welt** beim Betreten der Baustelle, **zoombar** | Bild im Dialog, nicht zoombar | begehbare Mini-Welt (eigene Szene: Gebäude antippen, Spielfigur läuft hin); im Dialog zoom- und verschiebbar |
| 16 | Sprachschul-Gebäude **umnutzen** (GitHub-Werkstatt / Eingang Projekt-Viertel) | Gebäude nur entfernt, leere Fläche | an der Stelle steht die „GitHub-Werkstatt“ (Leuchtwand, Link zur Aktivität) |
| 14 | Link auf eine kleine **Datenschutz-Seite** im Formular | fehlt | `datenschutz.html` (Formular, Schriften, Kartendaten), verlinkt im Formular und im Fuß |
| 17 | Emojis: **nur Kapitelsymbol im Kopf** der Dialoge | Abzeichen, Kapitelübersicht und Startseite noch mit Emojis | Abzeichen und Übersicht mit Icons, Startseite schlicht (Spielwelt bleibt verspielt) |
| 18 | Linkseite `/links/` mit Pflege im Admin | gar nicht begonnen | Seite + Datenstruktur + Admin-Abschnitt fertig, nur die URLs fehlen noch |
| 10 | Doppelungen **vollständig** prüfen (Startseite, Finale, Sprüche) | teilweise | alle Texte in einer Liste sammeln und abgleichen (`docs/texte.md`) |
| 15 | PDF in **allen Browsern** testen | nur Chromium | zusätzlich Firefox und WebKit (Safari) per Playwright |

> Falls Abdul noch weitere Punkte meint, die ich übersehen habe, kommen sie in diese Tabelle und werden genauso abgearbeitet.

---

## 3. Zielstruktur

Weiterhin **ohne Build-Schritt**: GitHub Pages liefert die Dateien direkt aus. Der Code wird auf **native ES-Module** umgestellt (`<script type="module">`), sodass jede Datei ihre Abhängigkeiten selbst importiert.

```
index.html · admin.html · datenschutz.html · links/index.html
assets/
  img/            profilbild.jpg, jubelbild.jpg, jubelbild-nah.jpg
  data/           worldmap-europe.js, worldmap-world.js (Kartendaten)
data/
  resume.js       Lebenslauf-Inhalte (bisher data.js; Admin erzeugt diese Datei)
css/
  tokens.css      Farben, Abstände, Radien, Schatten, Schriften (CSS-Variablen)
  base.css        Reset, Typografie, Buttons, Formulare, Icons
  hud.css · overlays.css · station.css · cv.css · games.css
  worldmap.css · contact.css · github.css · print.css
js/
  main.js                 Einstieg: lädt Daten, startet App
  config/
    layout.js             Welt-Koordinaten: Stationen, Wege, See, Hügel, Spawn …
    theme.js              Farbpaletten (Stationen, Haut-/Kleidungsfarben, Spiele)
    timing.js             Zeiten (Toasts, Animationen, Leerlauf-Hilfe …)
    performance.js        Bildraten-Ziele, max. Auflösung, Partikel-Limits
  core/
    dom.js · format.js · store.js · rng.js · icons.js · flags.js · derive.js
    loop.js               EINE gemeinsame Render-Schleife mit Pause/Leerlauf/Tab-Erkennung
    events.js             kleiner Event-Bus statt Querverweise zwischen Modulen
  world/
    world.js              Zustand + Update (Spieler, Bewohner, Roboter, Kamera)
    pathfinding.js        A*-Wegfindung
    input.js              Tastatur, Maus, Touch-Joystick
    renderer.js           Zeichnen mit Ebenen und Sprite-Cache
    sprites/              buildings.js, people.js, nature.js, props.js
    particles.js          Partikel-Pool ohne splice
  games/
    engine.js             gemeinsame Arcade-Engine
    stamp-jet.js · word-ninja.js · prompt-factory.js · idea-rain.js · project-stacker.js · sup-slalom.js
  ui/
    hud.js · minimap.js · station.js · content/ (eine Datei je Station) · finale.js
    palette.js · journey.js · cv.js · contact.js · pdf.js · github.js · worldmap.js · project-quarter.js
vendor/           jspdf, html2canvas (unverändert)
tools/            build-worldmap.mjs, github-activity.mjs
tests/            smoke.spec.js, perf.mjs, visual.mjs (Playwright, nur zur Entwicklung)
docs/             dieser Plan, texte.md, Architektur im README
```

Regeln für den neuen Code:
- **Keine nackten Zahlen.** Jede Koordinate, Farbe, Zeit und jeder Spielwert hat einen sprechenden Namen in `config/` oder als Konstante oben in der Datei, z. B. `STAMP_JET.SPEED_START`.
- **Eine Aufgabe pro Datei**, Dateien höchstens etwa 300 Zeilen.
- **Englische Bezeichner, deutsche Kommentare** (wie bisher), einheitlich `camelCase` / `UPPER_SNAKE` für Konstanten.
- **Kein Verhalten ändert sich unbeabsichtigt**: Vorher-Nachher-Screenshots jeder Ansicht werden verglichen.
- Inhalte bleiben in `data/resume.js` und sind weiter über `admin.html` pflegbar.

---

## 4. Arbeitsschritte (jeder Schritt = eigener Commit, danach Tests)

### Schritt 0: Absichern (vor jeder Änderung)
- Messskripte ins Repo: `tests/perf.mjs` (CPU/fps je Szenario) und `tests/visual.mjs` (Screenshots aller Ansichten, Desktop + iPhone).
- **Referenz-Screenshots** und **Referenz-Messwerte** des heutigen Stands speichern.
- `tests/smoke.spec.js`: alle Stationen, alle 6 Spiele, Finale, Kontakt (Versand simuliert), PDF, Suche, Admin, Weltkarte.

### Schritt 1: Performance-Sofortmaßnahmen (größter Effekt zuerst)
1. **Gemeinsame Render-Schleife** (`core/loop.js`): Nur noch eine `requestAnimationFrame`-Schleife. Jede Ansicht meldet sich an und ab.
2. **Welt pausiert, wenn sie nicht sichtbar ist**: Dialog offen → letztes Bild bleibt stehen (0 % statt 53 %). Tab im Hintergrund → Stopp.
3. **Leerlauf-Bildrate**: Steht der Spieler und passiert nichts, laufen nur die kleinen Animationen mit etwa 20 fps statt 60.
4. **Sprite-Cache**: Bäume, Gebäude, Laternen und Schilder werden **einmal** in kleine Offscreen-Bilder gezeichnet und danach nur noch kopiert. Bewegte Teile (Kran, Uhr, Wasser, Blinklichter) kommen als dünne Ebene darüber.
5. **Statische Ebene**: Rasen, Wege, Platz, See-Ufer und Landebahn landen zusammen in einem großen, einmal gerenderten Bild.
6. Kein `shadowBlur` pro Bild (vorgerenderte Leuchtschilder), kein `filter` pro Bild, **Farbverläufe einmal erzeugen** und wiederverwenden.
7. **Auflösung begrenzen**: maximal 1,5× bzw. adaptiv. Fällt die Bildrate, wird die Auflösung automatisch gesenkt.
8. **Sichtbarkeits-Culling**: Nur zeichnen, was im Bild ist (heute teils schon, jetzt konsequent).
9. Partikel-Pool, Minimap mit etwa 8 fps und zwischengespeichertem Hintergrund, Intervall durch Ereignisse ersetzen.
10. Minispiele, Projekt-Viertel und Weltkarte laufen nur, solange sie sichtbar sind (`IntersectionObserver`).

**Ziel:** Welt im Stand ≤ 15 % CPU bei 60 fps (Messskript), Welt beim Laufen ≤ 35 %, Dialog offen ≤ 5 %, Minispiel ≤ 35 %.

### Schritt 2: Neue Ordnerstruktur und ES-Module
- Dateien gemäß Abschnitt 3 aufteilen und verschieben, `window.CV` auflösen, Bilder nach `assets/img/`, `data.js` → `data/resume.js` (Admin-Seite und Hinweise anpassen).
- Danach: Smoke-Test und Screenshot-Vergleich müssen identisch sein.

### Schritt 3: Konstanten statt Zahlen
- **Welt-Layout** (`config/layout.js`): alle Stationen, Wege, Türen, See, Hügel, Landebahn, Spawn und NPC-Startpunkte mit Namen.
- **Farben** (`config/theme.js` + `css/tokens.css`): eine Palette, keine verstreuten Hex-Werte.
- **Spielwerte** je Minispiel als benanntes Objekt: Geschwindigkeiten, Schwerkraft, Spawn-Intervalle, Sterne-Schwellen.
- **Zeiten** (`config/timing.js`): Toast-Dauer, Tipp-Verzögerung, Leerlauf-Hilfe usw.
- Zeichenfunktionen der Gebäude arbeiten mit relativen, benannten Maßen.

### Schritt 4: Code-Review Zeile für Zeile
- Jede Datei lesen und dabei korrigieren:
  - doppelte Logik, toter Code (z. B. ungenutzte Skill-Emojis, alte Abi-Sprint-Reste)
  - Event-Listener ohne Aufräumen, mögliche Speicherlecks bei Dialog-Wechseln
  - `innerHTML` nur mit escapten Daten, Fehlerbehandlung bei `fetch`
  - Barrierefreiheit: Fokus im Dialog, `aria`, Tastaturbedienung
- Kurze Kommentare dort, wo etwas nicht selbsterklärend ist.

### Schritt 5: CSS neu ordnen
- Aufteilen nach Bereichen, Design-Tokens als Variablen, `!important` nur noch im Druck-CSS, ungenutzte Selektoren entfernen (automatisch geprüft), Animationen nur mit `transform`/`opacity`.

### Schritt 6: Lücken aus Runde 2 schließen (Abschnitt 2)
- GitHub-Werkstatt mit Leuchtwand in der Welt, Projekt-Viertel als begehbare Mini-Welt und zoombar, Weltkarte mit Weltansicht, Datenschutz-Seite, Linkseite, Emoji-Rest, Textliste gegen Doppelungen, PDF in Firefox/Safari.

### Schritt 7: Werkzeuge für dauerhafte Qualität
- `package.json` nur für Entwicklung (ESLint, Prettier, Playwright). Für die Webseite ist nichts zu installieren.
- GitHub Action **CI**: Linter und Smoke-Test bei jedem Push und Pull Request.
- `.editorconfig`, `README.md` mit Struktur, Datenpflege und Entwicklung.

### Schritt 8: Abnahme
- Messskript: alle Ziele aus Schritt 1 erreicht. Vorher-Nachher-Tabelle in den Abschlussbericht.
- Screenshot-Vergleich aller Ansichten (Desktop + iPhone): nur gewollte Unterschiede.
- Smoke-Test in Chromium, Firefox und WebKit grün.
- `TODO.md` aktualisieren, Abschlussbericht `docs/REFACTORING-BERICHT.md`, Push auf `abdul7kader/refactoring`.
- Kein Merge auf `main` ohne Abduls Freigabe. Ein Pull Request nur auf Wunsch.

---

## 5. Hinweise
- Neue Branches enthalten kein „claude“ im Namen. Gearbeitet wird auf `abdul7kader/refactoring`.
- Der alte Arbeits-Branch `claude/intelligent-archimedes-1pvu41` bleibt unverändert bestehen. Er kann gelöscht werden, sobald Abdul das möchte.
