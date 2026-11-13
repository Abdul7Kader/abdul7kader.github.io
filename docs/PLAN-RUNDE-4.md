# Plan Runde 4 (Start: 13.11.2026, 06:10 Uhr)

Grundlage: Abduls Rückmeldung nach dem Testen am 12.11.2026.
Arbeitszweig: `abdul7kader/refactoring`. Am Ende wird – wie in Runde 3 gewünscht – auf `main` gemergt, damit Abdul testen kann.

**Weitermachen nach einer Unterbrechung:** Diese Datei ist der Fortschritt. Erledigte Punkte bekommen `[x]` und den
Commit-Hash. Bei „mach weiter“ zuerst `git log`, dann diese Liste lesen und beim ersten offenen Punkt fortfahren.

**Regeln:** Deutsch · jeder Punkt ein eigener Commit mit Tests (`npx eslint .`, `node tests/smoke.mjs` in DE/EN
hell/dunkel, `node tests/i18n.mjs`, `node tests/contrast.mjs`, `node tools/texte.mjs`, Screenshot-Vergleich) ·
sofort pushen · keine Doppelungen irgendwo im Spiel · alles zweisprachig und in Hell/Dunkel.

## Reihenfolge (zuerst Fehler, dann Inhalte, dann Neues)

### A – Fehler und Bedienung
- [x] **A1 Kontaktformular:** Nach dem Senden erschien „konnte nicht gesendet werden“, obwohl die Mail ankam.
  Erfolgsprüfung robuster machen (Antwort von FormSubmit auswerten: `res.ok` + `success`, Text- statt JSON-Antwort
  abfangen), Fehler nur bei echtem Fehlschlag. Nach erfolgreichem Senden schließt sich das Formular und ein Toast
  „Danke, Nachricht gesendet“ erscheint. Test mit simulierter FormSubmit-Antwort (Erfolg, Fehler, Nicht-JSON). ✓ *(Commit „Runde 4 A1: Kontaktformular schließt nach dem Senden“)*
- [x] **A2 Farbmodus nur Hell/Dunkel:** „Wie das System“ entfällt. Ein Knopf wechselt Hell ↔ Dunkel; beim allerersten
  Besuch gilt die Systemeinstellung als Startwert. Startseite: zwei Knöpfe (Sonne, Mond). ✓ *(Commit „Runde 4 A2: Farbmodus nur Hell oder Dunkel“)*
- [x] **A3 Kontrast aller Knöpfe:** „Weiter zu den Fakten“ in den Minispielen ist im Dunkelmodus weiß auf weiß.
  Alle Knöpfe in Hell und Dunkel prüfen (auch Spiel-Start-/Ergebniskarten, Werkstatt, Finale, Lebenslauf),
  Kontrasttest um Spielkarten und Knöpfe erweitern. ✓ *(Commit „Runde 4 A3: Knöpfe in Hell und Dunkel lesbar“)*
- [x] **A4 Firmenfeld im Finale (Hellmodus dunkel):** Ursache: Formularfelder folgen dem dunklen System-Design.
  `color-scheme: light` für den Hellmodus setzen, Feldfarben ausdrücklich über Tokens. ✓ *(Commit „Runde 4 A4: Eingabefelder folgen dem Seitenmodus“)*
- [x] **A5 Spielfenster responsiv:** Beim Minispiel nutzt der Dialog den ganzen Bildschirm (kleiner Rand),
  das Spielfeld skaliert auf die größtmögliche Fläche – Handy hoch/quer und Rechner. ✓ *(Commit „Runde 4 A5: Spielfenster nutzt den ganzen Bildschirm“)*

### B – Inhalte (keine Doppelungen)
- [x] **B1 Flaggen entfernen:** Syrien-Flagge raus, überall nur Ländernamen (Länderliste, Weltkarten-Tooltip, Suche). ✓ *(Commit „Runde 4 B1: Flaggen entfernt, nur Ländernamen“)*
- [x] **B2 Sprachkurse zusammenlegen:** Integrationskurs VHS und Sprachkurs B1 → ein Eintrag „Integrations- und
  Sprachkurse bis B1“, Zeitraum **03.2015 – 04.2016** (Abdul schrieb „3.2025 bis 4.2026“ – ich gehe von 2015/2016 aus,
  weil die Kurse vor dem Abitur lagen; bitte bestätigen). ✓ *(Commit „Runde 4 B2: Sprachkurse in einem Eintrag“)*
- [x] **B3 Deutsch C2:** Statt „verhandlungssicher“ die Bezeichnung des Gemeinsamen europäischen Referenzrahmens:
  „C2 – höchste Stufe des GER (kompetente Sprachverwendung)“, EN „C2 – Mastery, highest CEFR level“.
  (Der Europarat betont, dass C2 nicht „muttersprachlich“ bedeutet; „verhandlungssicher“ ist eine Lebenslauf-Floskel,
  meist C1–C2.) ✓ *(Commit „Runde 4 B3: Deutsch C2 mit GER-Bezeichnung“)*
- [x] **B4 Business-Viertel (eigenes Unternehmen):** „Prompt-Design und Code-Generierung“ → „Prompt Engineering,
  UI/UX-Design, Programmentwicklung, Qualitätssicherung, Deployment und Support“. Nirgends „KI-generierter Code“:
  Formulierungen so, dass Abdul entwickelt und KI-Agenten unterstützen (auch Minispiel „Prompt-Fabrik“: Schritt
  „KI-Code“ → „Entwicklung“, KI-Kompetenzen, Kurzprofil, Stärken – Deutsch und Englisch). ✓ *(Commit „Runde 4 B4: Business-Viertel: Abdul entwickelt, KI unterstützt“)*
- [x] **B5 Telekom:** Punkt „Bedarfsorientierter Verkauf … (Up- und Cross-Selling)“ löschen. ✓ *(Commit „Runde 4 B5: Telekom ohne Up-/Cross-Selling-Punkt“)*
- [x] **B6 PSI nur einmal:** Werkstudent PSI steht nur im Business-Viertel – dort einmal „100 % ohne KI-Werkzeuge“
  (der doppelte Satz „Code-Reviews ohne KI-Unterstützung“ entfällt). ✓ *(Commit „Runde 4 B6: PSI-Hinweis nur einmal“)*
- [x] **B7 Tech-Lab = Werkzeuge + GitHub:** Im Tech-Lab nur noch Technologien und Werkzeuge (Sprachen, Datenbanken,
  Web, Tools, Betriebssysteme, ITSM, KI-Werkzeuge) und die GitHub-Ansicht – keine Rollenkarte, keine Aufgaben.
  Die GitHub-Werkstatt wird mit dem Tech-Lab zusammengelegt: Die Leuchtwand zieht aufs Tech-Lab-Dach, das separate
  Werkstatt-Gebäude entfällt (an seinem Platz wächst wieder Wald). Neuer Erzähltext ohne PSI-Wiederholung. ✓ *(Commit „Runde 4 B7: Tech-Lab mit GitHub zusammengelegt“)*
- [x] **B8 Projekt-Baustelle ohne GitHub-Karte** (steht jetzt nur noch im Tech-Lab). ✓ *(Commit „Runde 4 B8: Projekt-Baustelle ohne GitHub-Karte“)*
- [x] **B9 Rustfall:** „im Stil von Mad Max“ → „postapokalyptisches Handyspiel“ (ohne Filmbezug). ✓ *(Commit „Runde 4 B9: Rustfall ohne Filmbezug“)*
- [x] **B10 Finale:** Knopf „Abdul Kader kontaktieren“ (Feld `contactName`), der doppelte Knopf „Kontakt aufnehmen“ entfällt. ✓ *(Commit „Runde 4 B10: Finale mit einem Knopf „Abdul Kader kontaktieren““)*
- [x] **B11 Doppelungs-Prüfung** über die ganze Welt (Startseite, Stationen, Sprüche, Finale, Lebenslauf) –
  Werkzeug `tools/texte.mjs` plus inhaltliche Durchsicht; Ergebnis in `docs/texte.md`. ✓ *(Commit „Runde 4 B11: Doppelungen inhaltlich bereinigt“)*

### C – GitHub-Zahlen inklusive privater Beiträge
- [x] **C1 Datenquelle:** Die GitHub Action `github-activity.yml` holt per GraphQL zusätzlich: Beiträge gesamt seit
  Kontoerstellung, Beiträge der letzten 3/6/12 Monate, davon privat (`restrictedContributionsCount`), Anzahl
  öffentlicher und privater Repositories (nur Zahl, keine Namen). Ohne Token bleiben nur öffentliche Zahlen. ✓ *(Commit „Runde 4 C1: GitHub-Übersichtszahlen inklusive privater Commits“)*
- [x] **C2 Anzeige im Tech-Lab:** Kacheln-Panel als „Öffentliche Projekte“ beschriften; darüber eine Übersicht
  „Commits gesamt · letzte 6 Monate · davon privat · Projekte (öffentlich/privat)“. Leuchtwand nutzt dieselben Daten. ✓ *(Commit „Runde 4 C2: GitHub-Übersicht im Tech-Lab“)*
- [x] **C3 Anleitung für Abdul** (README + Bericht): Token anlegen (fine-grained, nur Lesen), als Secret
  `ACTIVITY_TOKEN` speichern, in GitHub „Private contributions“ im Profil einschalten. ✓ *(Commit „Runde 4 C3: Anleitung für private GitHub-Zahlen“)*

### D – Neues
- [x] **D1 Projekt-Baustelle als Mini-Open-World (Draufsicht 2D):** eigene kleine Szene im Dialog:
  Straßen, Grundstücke, Figur läuft frei (WASD/Pfeile, Ziehen, Tippen = hinlaufen). Jedes Projekt als erkennbares
  Gebäude von oben im aktuellen Bauzustand: Werkzeugverleih (Laden mit Werkzeugen), KI-Videos (Studio mit
  Antenne/Bildschirm), Rustfall (Raffinerie in Wüste), Ultranisator (Stadion mit Rasen und Tribünen), Rest-IQ
  (Restaurant mit Terrasse), Drive Pluz (Fahrschule mit Übungsplatz, Fahrschulauto). Vor einem Gebäude: Infokarte.
  Bauzustand sichtbar (Gerüst, Kran, Fundament). Hell/Dunkel, DE/EN, ≤ 30 Bilder/s, nur zeichnen wenn sichtbar. ✓ *(Commit „Runde 4 D1: Projekt-Baustelle als Mini-Open-World von oben“)*
- [ ] **D2 Easter Egg (alle Skill-Sterne gesammelt):** Feuerwerk über dem See, Roboter Bit tanzt, und eine
  „Hinter den Kulissen“-Karte (wie die Seite entstanden ist, ein paar Zahlen, witzig formuliert). Kein Meme –
  Begründung siehe Antwort an Abdul; falls er doch ein Meme möchte, wird es hier ergänzt.

### E – Abschluss
- [ ] **E1** Alle Tests, Leistungsmessung (darf nicht schlechter werden), Screenshot-Matrix DE/EN × Hell/Dunkel × Desktop/iPhone.
- [ ] **E2** `docs/REFACTORING-BERICHT.md` (Abschnitt Runde 4), `TODO.md`, README aktualisieren, pushen.
- [ ] **E3** Merge auf `main`, CI und Pages-Build prüfen, kurze Zusammenfassung für Abdul.

## Braucht Abdul (nicht automatisierbar)
- Token für private GitHub-Zahlen (Schritt C3), sonst nur öffentliche Werte.
- Bestätigung Zeitraum der Sprachkurse (B2).
- Fotos für das 3D-Modell (separater Codex-Auftrag, siehe Antwort vom 12.11.).
