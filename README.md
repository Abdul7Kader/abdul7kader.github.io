# Interaktiver Lebenslauf – Abdul Kader Sabouni

Ein Lebenslauf als kleine, begehbare Spielwelt mit sechs Minispielen, oder kompakt als eine Seite mit PDF-Export.
Statische Seite für GitHub Pages: kein Build-Schritt, keine Abhängigkeiten im Browser.
Die Seite gibt es auf Deutsch und Englisch, hell und dunkel.

- **Seite:** `index.html` · **Linkseite:** `links/` · **Datenschutz:** `datenschutz.html` · **Pflege:** `admin.html`

## Inhalte pflegen

Alle Lebenslauf-Inhalte stehen in zwei Dateien:

| Datei | Inhalt |
|---|---|
| `data/resume.de.js` | Deutsche Fassung (Grundlage) |
| `data/resume.en.js` | Englische Fassung. Was hier fehlt, wird aus der deutschen übernommen (Objekte feldweise, Listen ganz). |

Am bequemsten geht das über `admin.html`. Dort oben die Sprache wählen, Felder ändern, „generieren“ klicken und
den Code in die angezeigte Datei kopieren. Im Admin gibt es außerdem einen Generator für personalisierte
Bewerbungslinks (`?firma=Musterfirma`, optional `&lang=en`).

Oberflächentexte (Knöpfe, Hinweise, Minispiele) stehen in `js/i18n/de.js` und `js/i18n/en.js`, beide mit denselben
Schlüsseln. Fehlt ein Schlüssel, zeigt die Seite den deutschen Text und warnt in der Konsole.

## Aufbau

```
index.html            Seite (lädt css/*.css, data/resume.*.js und js/main.js als ES-Modul)
css/                  Stile nach Bereichen; tokens.css = Farben/Abstände, dark.css = Dunkelmodus
data/                 Lebenslauf-Inhalte (Deutsch/Englisch)
assets/img/           Fotos
assets/data/          Kartendaten (Europa, Welt) – werden erst beim Öffnen geladen
js/main.js            Einstieg: verbindet Welt, Spielstand und Oberfläche
js/core/              Hilfen: DOM, Mathe, Speicher, Ereignisse, i18n, Farbmodus, Audio, Icons
js/config/            Stellschrauben: Weltaufbau, Zeiten, Leistung, Farben (Tag/Nacht)
js/world/             Spielwelt: Aufbau, Wegfindung, Eingabe, Renderer, Sprites (Gebäude, Menschen, Natur)
js/games/             Minispiel-Engine und die sechs Spiele
js/ui/                Dialoge, HUD, Lebenslauf, PDF, Kontakt, Weltkarte, GitHub, Projekt-Viertel
js/app/               Spielstand und Inhalte der aktuellen Sprache
js/i18n/              Oberflächentexte
links/                Linkseite
vendor/               jsPDF und html2canvas (lokal, nur für „Als PDF speichern“)
tests/                Smoke-, Sprach-, Kontrast-, Screenshot- und Leistungstests
tools/                Entwicklungswerkzeuge (Server, Kartendaten, Textliste, ungenutztes CSS)
docs/                 Plan, Bericht, Textliste
```

## Entwickeln

Voraussetzung: Node.js 20 oder neuer. Für die Tests zusätzlich Playwright (`npm install --no-save playwright`
und `npx playwright install chromium`).

```bash
npm install          # nur Entwicklungswerkzeuge (ESLint)
npm run serve        # http://127.0.0.1:8080 (ES-Module brauchen einen Server, file:// geht nicht)
npm run lint         # ESLint
npm test             # Smoke-Test (DE hell, EN dunkel), Sprachen, Kontrast, Kontakt, GitHub-Skript
npm run perf         # Rechenlast messen (Hauptthread, CPU)
npm run texte        # docs/texte.md neu erzeugen und Doppelungen melden
```

Nützliche Adressen beim Testen: `?lang=en`, `?theme=dark`, `?firma=Musterfirma`, `#lebenslauf`, `#kontakt`.

Die GitHub Action `ci.yml` prüft jede Änderung: Linter, Smoke-Test in Chromium, Firefox und WebKit, Sprachen,
Kontrast, Kontaktformular, GitHub-Skript und ob `docs/texte.md` aktuell ist. `github-activity.yml` aktualisiert
täglich `github-activity.json` für die Beitrags-Kacheln, die Leuchtwand auf dem Tech-Lab und „Commits im Überblick“.

## GitHub-Zahlen mit privaten Projekten (einmalig einrichten)

Ohne weitere Einstellung zeigt die Seite nur öffentliche Zahlen. Damit Commits aus privaten Repositories mitzählen:

1. **Profil:** GitHub → Profilbild → *Settings* → *Public profile* → *Contributions & activity* →
   „Include private contributions on my profile“ einschalten.
2. **Token anlegen:** *Settings* → *Developer settings* → *Personal access tokens* → *Fine-grained tokens* →
   *Generate new token*. Name z. B. `cv-activity`, Ablauf nach Wunsch (danach neu anlegen),
   *Repository access:* „All repositories“, *Permissions → Repository permissions:* „Contents: Read-only“ und
   „Metadata: Read-only“. Keine Schreibrechte.
3. **Als Secret speichern:** in diesem Repository *Settings* → *Secrets and variables* → *Actions* →
   *New repository secret*, Name `ACTIVITY_TOKEN`, Wert = das Token.
4. **Testen:** *Actions* → „GitHub-Aktivität aktualisieren“ → *Run workflow*. Im Log steht danach
   „Commits gesamt … (davon privat …)“.

Gespeichert werden nur Zahlen (Commits gesamt, letzte 3/6/12 Monate, davon privat, Anzahl der Projekte) –
keine Namen privater Repositories und keine Commit-Texte daraus. Die Liste „Letzte Commits“ zeigt weiterhin nur
öffentliche Repositories.

## Leistung

Die Welt zeichnet nur, was sich ändert: Unbewegliches liegt vorgerendert in Sprites und einer statischen Ebene.
Die Bildrate richtet sich nach der Lage (60 Bilder/s beim Laufen, 15 im Stand, 0 hinter Dialogen), beim Fahren
der Kamera wird mit geringerer Pixeldichte gezeichnet. Messwerte stehen in `docs/REFACTORING-BERICHT.md`.
