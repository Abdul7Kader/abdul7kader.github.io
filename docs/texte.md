# Alle sichtbaren Texte

Automatisch erzeugt mit `node tools/texte.mjs` – nicht von Hand bearbeiten.
Zweck: Wiederholungen zwischen Startseite, Stationen, Finale, Sprüchen und Lebenslauf finden.

## Deutsch (535 Texte)

### Doppelungen

Keine in den Inhalten gefunden.


Gewollt gleich (gleiche Aktion an mehreren Stellen):

- „alle kapitel entdeckt“: `ui.hud.allDone`, `ui.toast.allDone`
- „jetzt kontaktieren“: `ui.hud.contactNow`, `ui.palette.contact`
- „switch to english“: `ui.hud.langSwitch`, `ui.palette.langSub`
- „ihr unternehmen“: `ui.world.signs.yourCompany`, `ui.finale.firmLabel`, `ui.contact.companyPlaceholder`, `cv.stations.finale.title`
- „zurück zur welt“: `ui.station.backToWorld`, `ui.cv.backToWorld`
- „ki kompetenzen“: `ui.facts.aiSkills`, `ui.cv.aiSkills`
- „ehrenamtliches engagement“: `ui.facts.volunteering`, `ui.cv.volunteering`
- „kapitelübersicht“: `ui.journey.title`, `ui.palette.journey`
- „als pdf speichern“: `ui.palette.pdf`, `ui.cv.savePdf`
- „offen für neue herausforderungen“: `cv.cardStatus`, `cv.availability`

### Liste

| Schlüssel | Text |
|---|---|
| `ui.meta.title` | Abdul Kader Sabouni – Interaktiver Lebenslauf |
| `ui.meta.description` | Abdul Kader Sabouni – Softwareentwickler und Informatikstudent (FH Dortmund). Mein Lebenslauf als begehbare Spielwelt mit sechs Minispielen – oder kompakt in 30 Sekunden. |
| `ui.common.close` | Schließen |
| `ui.theme.light` | Hell |
| `ui.theme.dark` | Dunkel |
| `ui.time.justNow` | gerade eben |
| `ui.time.today` | heute |
| `ui.start.hello` | Hallo, ich bin {name}. |
| `ui.start.greet` | 👋 Schön, dass Sie da sind |
| `ui.start.greetName` | 👋 Hallo {name}! |
| `ui.start.greetFirm` | 👋 Willkommen, Team {firm}! |
| `ui.start.greetNameFirm` | 👋 Hallo {name} von {firm}! |
| `ui.start.play` | Spiel starten |
| `ui.start.continue` | Weiter spielen |
| `ui.start.playSub` | ca. 3 Min. · jedes Spiel überspringbar |
| `ui.start.cv` | Lebenslauf in 30 Sek. |
| `ui.start.cvSub` | klassisch · als PDF speicherbar |
| `ui.start.player1` | Spieler 1 |
| `ui.start.langGroup` | Sprache |
| `ui.start.privacy` | Datenschutz |
| `ui.start.available` | verfügbar |
| `ui.start.languages` | Sprachen |
| `ui.start.countries` | Länder bereist |
| `ui.start.years.one` | {n} Jahr |
| `ui.start.years.other` | {n} Jahre |
| `ui.start.months` | {n} Mon. |
| `ui.start.devLabel` | Full-Stack-Entwickler |
| `ui.start.foot` | Ohne Installation · Maus, Tastatur oder Touch · kein Game Over |
| `ui.start.footBack` | Willkommen zurück – Sie haben bereits {done} von {total} Kapiteln entdeckt. |
| `ui.hud.worldAria` | Begehbare Lebenslauf-Welt |
| `ui.hud.allDone` | Alle Kapitel entdeckt 🏆 |
| `ui.hud.badgeOpen` | (noch offen) |
| `ui.hud.nextGoal` | Nächstes Ziel |
| `ui.hud.walkThere` | Hinlaufen |
| `ui.hud.autoWalk` | Automatisch hinlaufen (G) |
| `ui.hud.journeyKey` | Kapitelübersicht (M) |
| `ui.hud.search` | Suchen |
| `ui.hud.searchKey` | Suchen & springen (Strg+K) |
| `ui.hud.ctrlK` | Strg K |
| `ui.hud.contactNow` | Jetzt kontaktieren |
| `ui.hud.contactShort` | Kontakt |
| `ui.hud.contactTitle` | Kontakt aufnehmen |
| `ui.hud.cv` | Lebenslauf |
| `ui.hud.cvKey` | Lebenslauf kompakt (L) |
| `ui.hud.sound` | Soundeffekte an/aus |
| `ui.hud.music` | Musik an/aus |
| `ui.hud.minimap` | Karte – klicken zum Hinlaufen |
| `ui.hud.tokens` | Gesammelte Skill-Sterne |
| `ui.hud.badges` | Entdeckte Stärken |
| `ui.hud.langSwitch` | Switch to English |
| `ui.hud.theme` | Farbmodus: {mode} – klicken zum Wechseln |
| `ui.hud.langOther` | EN |
| `ui.hud.enter` | Betreten |
| `ui.hud.lockedOpen` | Noch {n} Kapitel offen |
| `ui.hud.hintTouch` | Ziehen zum Laufen · Tippen, um hinzulaufen |
| `ui.hud.hintKeys` | <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> laufen · Klick = hinlaufen · <kbd>Strg K</kbd> Suche |
| `ui.robot.welcome` | Hi, ich bin Bit 🤖 – {name}s Assistent. Folgen Sie dem orangen Pfeil – oder {corner} auf „Nächstes Ziel“ klicken! |
| `ui.robot.welcomeTouch` | Hi, ich bin Bit 🤖 – {name}s Assistent. Folgen Sie dem orangen Pfeil – oder {corner} auf „Nächstes Ziel“ tippen! |
| `ui.robot.welcomeBack` | Willkommen zurück! {n} Kapitel kennen Sie schon. Weiter geht’s! 🤖 |
| `ui.robot.cornerTopLeft` | oben links |
| `ui.robot.cornerBottom` | unten |
| `ui.robot.playerHello` | Kommen Sie mit – hier beginnt mein Weg! 👋 |
| `ui.robot.locked` | 🔒 Das letzte Kapitel öffnet sich erst, wenn Sie alle {total} Gebäude besucht haben – noch {n} offen. |
| `ui.robot.idleTouch` | Tipp: Auf „Nächstes Ziel“ tippen – dann laufe ich automatisch hin. |
| `ui.robot.idleKeys` | Tipp: Links oben auf „Nächstes Ziel“ klicken (oder G drücken) – dann laufe ich automatisch hin. |
| `ui.toast.allDone` | Alle Kapitel entdeckt |
| `ui.toast.allDoneTitle` | Das Finale wartet auf dem Hügel! |
| `ui.toast.collector` | Sammler |
| `ui.toast.collectorTitle` | Alle {n} Skill-Sterne gefunden! |
| `ui.world.signs.arrival` | ANKUNFT · 2014 |
| `ui.world.signs.career` | BUSINESS |
| `ui.world.signs.lab` | </> DEV |
| `ui.world.signs.projects` | PROJEKTE |
| `ui.world.signs.yourCompany` | Ihr Unternehmen? |
| `ui.world.signs.toStations` | → Stationen |
| `ui.world.signs.toStart` | Start ← |
| `ui.world.signs.githubWall` | GitHub · {n} Wochen |
| `ui.world.locked` | 🔒 Noch gesperrt |
| `ui.world.enterTouch` | „Betreten“ antippen |
| `ui.world.enterKeys` | E / Enter · Betreten |
| `ui.station.chapter` | Kapitel {n} / {total} |
| `ui.station.finale` | Finale |
| `ui.station.tells` | {name} erzählt |
| `ui.station.minigame` | Minispiel |
| `ui.station.seconds` | {n} Sek. |
| `ui.station.skipToFacts` | Ohne Spiel direkt zu den Fakten → |
| `ui.station.skipGame` | Überspringen → direkt zu den Fakten |
| `ui.station.unlocked` | Stärke freigeschaltet |
| `ui.station.result` | Ergebnis |
| `ui.station.points` | {n} Punkte |
| `ui.station.newBest` | neuer Bestwert |
| `ui.station.playAgain` | Nochmal spielen |
| `ui.station.playGame` | Minispiel spielen |
| `ui.station.next` | Weiter: {title} → |
| `ui.station.backToWorld` | Zurück zur Welt |
| `ui.facts.current` | aktuell |
| `ui.facts.countriesSeen` | Länder kennengelernt |
| `ui.facts.home` | Heimat |
| `ui.facts.myMap` | Meine Weltkarte |
| `ui.facts.countries` | Bereiste Länder |
| `ui.facts.educationPath` | Vom Integrationskurs zum Studium |
| `ui.facts.languagesToday` | Meine Sprachen heute |
| `ui.facts.experience` | Berufserfahrung |
| `ui.facts.aiSkills` | KI-Kompetenzen |
| `ui.facts.workingOn` | Woran ich gerade arbeite |
| `ui.facts.myGithub` | Mein GitHub |
| `ui.facts.open` | Öffnen |
| `ui.facts.ownCompanySince` | Eigenes Unternehmen · seit {since} |
| `ui.facts.quarter` | Mein Projekt-Viertel |
| `ui.facts.quarterReward` | Ihre Belohnung: Hier wird gerade gebaut |
| `ui.facts.quarterTap` | Gebäude antippen für Details |
| `ui.facts.project` | Projekt |
| `ui.facts.view` | Ansehen |
| `ui.facts.linkSoon` | Link folgt |
| `ui.facts.leisure` | Freizeit |
| `ui.facts.volunteering` | Ehrenamtliches Engagement |
| `ui.projects.stage.done` | Fertig |
| `ui.projects.stage.build` | Im Bau · {pct} % |
| `ui.projects.stage.base` | Fundament |
| `ui.projects.legend.done` | Fertig |
| `ui.projects.legend.build` | Im Bau |
| `ui.projects.legend.base` | Fundament |
| `ui.projects.signs.shop` | WERKZEUGVERLEIH |
| `ui.projects.expandable` | + erweiterbar |
| `ui.projects.quarterAria` | Projekt-Viertel: {list} |
| `ui.projects.walkHint` | Gebäude antippen – {name} läuft hin · Pfeiltasten laufen, Enter zeigt das Projekt |
| `ui.projects.walkRole` | begehbares Projekt-Viertel |
| `ui.worldmap.stat` | Ausgangspunkt: Deutschland |
| `ui.worldmap.zoomIn` | Hineinzoomen |
| `ui.worldmap.zoomOut` | Herauszoomen |
| `ui.worldmap.zoomAll` | Gesamt |
| `ui.worldmap.zoomAllLabel` | Ganze Karte |
| `ui.worldmap.aria` | Karte der bereisten Länder: {list} |
| `ui.worldmap.homeSince` | Heimat seit 2014 |
| `ui.worldmap.origin` | Herkunftsland |
| `ui.worldmap.visited` | bereist |
| `ui.worldmap.notVisited` | noch nicht bereist |
| `ui.worldmap.hintTouch` | Wischen zum Verschieben · mit zwei Fingern zoomen · Land antippen für den Namen |
| `ui.worldmap.hintMouse` | Mit der Maus über ein farbiges Land fahren · Strg + Mausrad zoomt |
| `ui.worldmap.views` | Kartenausschnitt |
| `ui.worldmap.europe` | Europa |
| `ui.worldmap.world` | Welt |
| `ui.github.loading` | GitHub-Aktivität wird geladen … |
| `ui.github.title` | GitHub-Aktivität |
| `ui.github.updated` | aktualisiert {ago} |
| `ui.github.public` | öffentliche Aktivität |
| `ui.github.profile` | Profil |
| `ui.github.contributions` | Beiträge {span} |
| `ui.github.spanYear` | im letzten Jahr |
| `ui.github.span6m` | in den letzten 6 Monaten |
| `ui.github.span90` | in den letzten 90 Tagen |
| `ui.github.streak.one` | Tag aktuelle Serie |
| `ui.github.streak.other` | Tage aktuelle Serie |
| `ui.github.bestDay` | am aktivsten Tag ({date}) |
| `ui.github.dayTitle.zero` | Keine Beiträge am {date} |
| `ui.github.dayTitle.one` | 1 Beitrag am {date} |
| `ui.github.dayTitle.other` | {n} Beiträge am {date} |
| `ui.github.less` | weniger |
| `ui.github.more` | mehr |
| `ui.github.latest` | Letzte Commits |
| `ui.github.pushed` | Neue Commits gepusht |
| `ui.finale.photoLabel` | Foto von {name} mit dem Firmennamen auf dem T-Shirt |
| `ui.finale.stickerBand` | MEIN NÄCHSTES KAPITEL |
| `ui.finale.firmLabel` | Ihr Unternehmen |
| `ui.finale.firmPlaceholder` | Bitte Ihren Firmennamen eingeben |
| `ui.finale.firmHint` | Er erscheint auf dem Aufkleber auf meinem T-Shirt. |
| `ui.finale.contactName` | {name} kontaktieren |
| `ui.finale.allExplored` | Sie haben meinen ganzen Weg erkundet! |
| `ui.finale.explored` | {done} von {total} Kapiteln erkundet |
| `ui.finale.insights` | Ihre Erkenntnisse über {name} |
| `ui.finale.starsTotal` | {n} / {max} Sterne in Minispielen |
| `ui.finale.cvAndPdf` | Lebenslauf kompakt & PDF |
| `ui.journey.kicker` | Mein Weg in 7 Stationen |
| `ui.journey.title` | Kapitelübersicht |
| `ui.journey.sub` | {done} von {total} Kapiteln entdeckt · ⭐ {stars} / {max} Sterne · Klick = hinlaufen |
| `ui.journey.locked` | gesperrt |
| `ui.journey.opensAfter` | öffnet nach allen {n} Kapiteln |
| `ui.journey.done` | entdeckt |
| `ui.journey.next` | nächstes Ziel |
| `ui.journey.open` | offen |
| `ui.palette.aria` | Suchen und springen |
| `ui.palette.placeholder` | Wonach suchen Sie? z. B. Java, PSI, Englisch … |
| `ui.palette.select` | auswählen |
| `ui.palette.open` | öffnen |
| `ui.palette.map` | Karte |
| `ui.palette.cvShort` | Lebenslauf |
| `ui.palette.group.actions` | Aktionen |
| `ui.palette.group.chapters` | Kapitel |
| `ui.palette.group.content` | Inhalte |
| `ui.palette.empty` | Nichts gefunden für „{q}“ – versuchen Sie z. B. „Java“ oder „PSI“. |
| `ui.palette.cv` | Lebenslauf kompakt öffnen |
| `ui.palette.cvSub` | Alle Fakten auf einer Seite |
| `ui.palette.cvQ` | lebenslauf cv kompakt resume |
| `ui.palette.pdf` | Als PDF speichern |
| `ui.palette.pdfSub` | Farbiger Lebenslauf als PDF-Datei |
| `ui.palette.pdfQ` | pdf drucken print download speichern |
| `ui.palette.journey` | Kapitelübersicht |
| `ui.palette.journeySub` | Alle Stationen & Sterne |
| `ui.palette.journeyQ` | karte map übersicht kapitel fortschritt |
| `ui.palette.next` | Zum nächsten Ziel: {title} |
| `ui.palette.nextSub` | Automatisch hinlaufen |
| `ui.palette.nextQ` | weiter nächstes ziel |
| `ui.palette.soundOn` | Ton einschalten |
| `ui.palette.soundOff` | Ton ausschalten |
| `ui.palette.soundSub` | Soundeffekte |
| `ui.palette.soundQ` | ton sound audio leise mute |
| `ui.palette.contact` | Jetzt kontaktieren |
| `ui.palette.contactSub` | Nachricht direkt an mich senden |
| `ui.palette.contactQ` | kontakt mail email anfrage formular nachricht |
| `ui.palette.lang` | Sprache: English |
| `ui.palette.langSub` | Switch to English |
| `ui.palette.langQ` | sprache language englisch english deutsch |
| `ui.palette.theme` | Farbmodus wechseln |
| `ui.palette.themeSub` | Hell ↔ Dunkel |
| `ui.palette.themeQ` | dark mode dunkel hell farbe theme nacht |
| `ui.palette.skill` | Kenntnis · {place} |
| `ui.palette.jobQ` | beruf job arbeit |
| `ui.palette.educationQ` | studium schule ausbildung |
| `ui.palette.language` | Sprache · {level} |
| `ui.palette.languageQ` | sprache |
| `ui.palette.project` | {tech} · Projekt |
| `ui.palette.projectQ` | projekt |
| `ui.palette.aiSkill` | KI-Kompetenz |
| `ui.palette.volunteer` | Ehrenamt · {date} |
| `ui.palette.volunteerQ` | ehrenamt engagement |
| `ui.palette.hobby` | Hobby |
| `ui.palette.hobbyQ` | hobby freizeit sport |
| `ui.palette.country` | Bereistes Land |
| `ui.palette.countryQ` | land reise |
| `ui.cv.aria` | Lebenslauf kompakt |
| `ui.cv.back` | Zurück |
| `ui.cv.backToWorld` | Zurück zur Welt |
| `ui.cv.contact` | Kontakt |
| `ui.cv.savePdf` | Als PDF speichern |
| `ui.cv.photoOf` | Foto von {name} |
| `ui.cv.aiSkills` | KI-Kompetenzen |
| `ui.cv.experience` | Berufliche Tätigkeiten |
| `ui.cv.education` | Bildungsweg |
| `ui.cv.volunteering` | Ehrenamtliches Engagement |
| `ui.cv.skills` | Kenntnisse |
| `ui.cv.projects` | Projekte |
| `ui.cv.languages` | Sprachen |
| `ui.cv.interests` | Interessen |
| `ui.cv.travel` | Reisen |
| `ui.cv.countries` | {n} Länder |
| `ui.cv.more` | Weitere Angaben |
| `ui.cv.playTitle` | Lust auf die spielerische Version? |
| `ui.cv.playText` | {n} kurze Kapitel – in ca. 3 Minuten. |
| `ui.cv.play` | Welt erkunden |
| `ui.cv.pdfBusy` | PDF wird erstellt … |
| `ui.cv.pdfTitle` | Lebenslauf – {name} |
| `ui.cv.pdfSubject` | Lebenslauf |
| `ui.contact.kicker` | Kontakt |
| `ui.contact.title` | Lassen Sie uns sprechen |
| `ui.contact.intro` | Schreiben Sie mir kurz – die Nachricht landet direkt in meinem Postfach. |
| `ui.contact.name` | Name |
| `ui.contact.company` | Unternehmen |
| `ui.contact.companyPlaceholder` | Ihr Unternehmen |
| `ui.contact.phoneShort` | Tel. |
| `ui.contact.optional` | (optional) |
| `ui.contact.message` | Nachricht |
| `ui.contact.messageStart` | Hallo Herr Sabouni,  wir würden Sie gern kennenlernen.  |
| `ui.contact.honeypot` | Bitte leer lassen |
| `ui.contact.privacy` | Datenschutzhinweise |
| `ui.contact.consent` | Ich bin einverstanden, dass meine Angaben zur Bearbeitung der Anfrage über den Dienst FormSubmit (formsubmit.co) per E-Mail an {name} übermittelt werden. Die Daten werden nur für diese Anfrage verwendet. |
| `ui.contact.required` | * Pflichtfelder |
| `ui.contact.send` | Nachricht senden |
| `ui.contact.sending` | Wird gesendet … |
| `ui.contact.subject` | Kontaktanfrage über den Lebenslauf |
| `ui.contact.errEmail` | Bitte eine gültige E-Mail-Adresse angeben. |
| `ui.contact.errRequired` | Bitte alle Pflichtfelder ausfüllen. |
| `ui.contact.errConsent` | Bitte der Übermittlung zustimmen, damit ich Ihre Nachricht erhalten kann. |
| `ui.contact.errSend` | Die Nachricht konnte gerade nicht gesendet werden. Bitte versuchen Sie es gleich noch einmal |
| `ui.contact.orWrite` | – oder schreiben Sie mir direkt: |
| `ui.contact.openMail` | E-Mail öffnen |
| `ui.contact.sent` | Nachricht gesendet |
| `ui.contact.thanks` | Danke! Ich antworte in der Regel innerhalb von zwei Werktagen. |
| `ui.games.play` | Spielen |
| `ui.games.seconds` | {n} Sekunden |
| `ui.games.secondsShort` | {n}s |
| `ui.games.noLimit` | ohne Zeitlimit |
| `ui.games.best` | Bestwert {n} |
| `ui.games.bestShort` | Bestwert: {n} |
| `ui.games.bestCombo` | beste Combo {n} |
| `ui.games.noGameOver` | kein Game Over – nur Spaß |
| `ui.games.praise[0]` | Gut gemacht! |
| `ui.games.praise[1]` | Stark! |
| `ui.games.praise[2]` | Richtig stark! |
| `ui.games.praise[3]` | Wahnsinn! |
| `ui.games.points` | Punkte |
| `ui.games.newRecord` | Neuer Rekord! |
| `ui.games.again` | Nochmal |
| `ui.games.toFacts` | Weiter zu den Fakten → |
| `ui.games.go` | LOS! |
| `ui.games.combo` | COMBO ×{m} |
| `ui.games.comboLost` | Combo verloren |
| `ui.games.controls.hold` | Gedrückt halten |
| `ui.games.controls.click` | Klicken |
| `ui.games.controls.tap` | Tippen |
| `ui.games.controls.swipe` | Wischen |
| `ui.games.controls.space` | Leertaste |
| `ui.games.controls.arrows` | ← → |
| `ui.games.controls.mouse` | Maus bewegen |
| `ui.games.arrival.name` | Stempel-Jet |
| `ui.games.arrival.goal` | Gedrückt halten = steigen, loslassen = sinken. Sammeln Sie Länder-Stempel ein! |
| `ui.games.arrival.result` | {n} Stempel im Pass – gleich sehen Sie, wo ich wirklich überall war. |
| `ui.games.arrival.world` | Welt |
| `ui.games.arrival.passport` | Reisepass! |
| `ui.games.arrival.turbulence` | Turbulenz! |
| `ui.games.arrival.rising` | ↑ steigen |
| `ui.games.arrival.hint` | Halten = steigen |
| `ui.games.school.name` | Wort-Ninja |
| `ui.games.school.goal` | Wischen Sie durch die fliegenden Wörter in vier Sprachen. Nur die Bomben 💣 nicht treffen! |
| `ui.games.school.result` | {n} Wörter zerlegt – ganz ohne Wörterbuch. |
| `ui.games.school.boom` | Bumm! |
| `ui.games.school.multi` | Multi-Slice! |
| `ui.games.school.missed` | verpasst |
| `ui.games.school.hint` | Durch die Wörter wischen! |
| `ui.games.career.name` | Prompt-Fabrik |
| `ui.games.career.goal` | Führen Sie den KI-Agenten sicher zur Auslieferung: Tippen Sie auf dem Fließband den Schritt an, dessen Platz gerade leuchtet. Ungeprüftes meiden! |
| `ui.games.career.result.zero` | Plan, Review, Tests – erst dann wird ausgeliefert. |
| `ui.games.career.result.other` | {n}× sicher ausgeliefert – mit Plan, Review und Tests. |
| `ui.games.career.steps.requirement` | Anforderung |
| `ui.games.career.steps.plan` | Plan prüfen |
| `ui.games.career.steps.code` | Entwicklung |
| `ui.games.career.steps.review` | Human in the Loop |
| `ui.games.career.steps.tests` | Tests & QS |
| `ui.games.career.traps.unchecked` | Ungeprüft übernehmen |
| `ui.games.career.traps.unclear` | Unklare Anforderung |
| `ui.games.career.trapMsg.unchecked` | Nie ungeprüft! |
| `ui.games.career.trapMsg.unclear` | Zu unklar! |
| `ui.games.career.firstNeed` | Erst {step}! |
| `ui.games.career.shipped` | Sicher ausgeliefert ✓ |
| `ui.games.career.agent` | KI-AGENT |
| `ui.games.career.workflow` | SICHERER KI-WORKFLOW |
| `ui.games.career.hint` | Tippen Sie den Schritt an, der oben leuchtet! |
| `ui.games.lab.name` | Ideen-Regen |
| `ui.games.lab.goal` | Bewegen Sie den Korb und fangen Sie die fallenden Ideen. Den grauen Regenwolken ausweichen! |
| `ui.games.lab.result` | {n} Ideen gefangen – die besten landen im Code. |
| `ui.games.lab.rain` | Regen! |
| `ui.games.lab.jackpot` | Volltreffer! |
| `ui.games.lab.hint` | Korb mit Maus oder Finger bewegen |
| `ui.games.projects.name` | Projekt-Stapler |
| `ui.games.projects.goal` | Tippen, um den Block abzusetzen. Stapeln Sie alle meine Projekte, Skills und Eigenschaften! |
| `ui.games.projects.result` | {n} Bausteine sicher gestapelt. |
| `ui.games.projects.base` | FH Dortmund · Praktische Informatik |
| `ui.games.projects.perfect` | Perfekt! |
| `ui.games.projects.perfectGrow` | Perfekt! Wächst! |
| `ui.games.projects.missed` | Daneben – nochmal! |
| `ui.games.projects.allDone` | Alles gestapelt! |
| `ui.games.projects.kinds.p` | Projekt |
| `ui.games.projects.kinds.s` | Skill |
| `ui.games.projects.kinds.e` | Eigenschaft |
| `ui.games.projects.hint` | Klick / Leertaste = absetzen |
| `ui.games.lake.name` | SUP-Slalom |
| `ui.games.lake.goal` | Das Board folgt Ihrer Maus oder Ihrem Finger: einfach nach links oder rechts bewegen, Felsen ausweichen und Sterne einsammeln! |
| `ui.games.lake.result` | {n} Sterne eingesammelt – Ausdauer zahlt sich aus. |
| `ui.games.lake.duck` | Quietsch! |
| `ui.games.lake.air` | Air! |
| `ui.games.lake.splash` | Platsch! |
| `ui.games.lake.hintTouch` | Finger nach links oder rechts ziehen |
| `ui.games.lake.hintMouse` | Maus nach links oder rechts bewegen |
| `cv.name` | Abdul Kader Sabouni |
| `cv.firstName` | Abdul |
| `cv.contactName` | Abdul Kader |
| `cv.title` | Informatikstudent · Softwareentwicklung mit KI-Agenten |
| `cv.cardRole` | Full-Stack-Entwickler · Informatikstudent |
| `cv.cardStatus` | offen für neue Herausforderungen |
| `cv.location` | Dortmund |
| `cv.tagline` | Vom Neuanfang 2014 zum Softwareentwickler bei PSI und eigenen Projekten – erleben Sie meinen Weg als kleine, begehbare Welt. |
| `cv.availability` | Offen für neue Herausforderungen |
| `cv.summary` | Informatikstudent (B.Sc. Praktische Informatik, FH Dortmund) mit Schwerpunkt Prompt Engineering und agentischer Softwareentwicklung: Im eigenen Unternehmen Entwicklung von Software, unterstützt von KI-Agenten wie Claude Code und OpenAI Codex – von der präzisen Aufgabenbeschreibung bis zur geprüften Auslieferung. Dazu drei Jahre Werkstudent in der Softwareentwicklung bei PSI (Java, SQL). Verfolgt neue KI-Modelle und -Tools laufend und setzt sie direkt in der Praxis ein. |
| `cv.intro` | Willkommen in meiner Welt! Laufen Sie mit WASD/Pfeiltasten oder per Klick. Jedes Gebäude ist eine Station meines Lebenslaufs. |
| `cv.strengths[0].title` | Eigenes Unternehmen |
| `cv.strengths[0].text` | Von der Idee bis zum Betrieb – KI-Agenten als Werkzeug, Qualität durch Review und Tests. |
| `cv.strengths[1].title` | Praxis seit 2023 |
| `cv.strengths[1].text` | Werkstudent bei PSI: Java, SQL und ein Lagerverwaltungssystem für Logistik-Kunden. |
| `cv.strengths[2].title` | Kommunikation & Kundenfokus |
| `cv.strengths[2].text` | Kundenservice und Vertrieb für Telekom und Samsung, Kundentermine bei PSI. |
| `cv.strengths[3].title` | Steile Lernkurve |
| `cv.strengths[3].text` | Neustart 2014 – heute Deutsch auf C2-Niveau, Abitur und Informatikstudium. |
| `cv.aiSkills[0].name` | Prompt Engineering |
| `cv.aiSkills[0].text` | Strukturierte Prompts (Rolle, Kontext, Beispiele, Ausgabeformat), Few-Shot-Prompting, Zerlegung komplexer Aufgaben, iterative Optimierung |
| `cv.aiSkills[1].name` | Agentic Coding |
| `cv.aiSkills[1].text` | Claude Code, OpenAI Codex: Planung, Umsetzung, Refactoring und Debugging – immer mit Human in the Loop |
| `cv.aiSkills[2].name` | KI-Modelle |
| `cv.aiSkills[2].text` | Claude (Anthropic), GPT/ChatGPT (OpenAI) |
| `cv.facts[0]` | Wussten Sie schon? Abdul hat sein Abitur abends gemacht – tagsüber hat er gearbeitet. |
| `cv.facts[1]` | Neue KI-Modelle testet Abdul gern sofort – und prüft kritisch, was sie wirklich können. |
| `cv.facts[2]` | Arabisch, Deutsch, Englisch, Französisch – Abdul wechselt locker zwischen vier Sprachen. |
| `cv.facts[3]` | Viele Kundengespräche am Telefon haben Abdul gelehrt, auch unter Druck freundlich zu bleiben. |
| `cv.facts[4]` | Schon gesehen? Hinter der Baustelle wächst Abduls Projekt-Viertel. |
| `cv.facts[5]` | Abdul hat schon über 20 Länder bereist. |
| `cv.stations.arrival.title` | Ankunft & Reisen |
| `cv.stations.arrival.era` | seit 10.2014 |
| `cv.stations.arrival.badge` | Weltoffen |
| `cv.stations.arrival.story` | Mein Neuanfang in Deutschland war die größte Reise meines Lebens. Seitdem entdecke ich gern neue Länder – andere Kulturen machen mich offen, neugierig und anpassungsfähig. |
| `cv.stations.school.title` | Bildungsweg |
| `cv.stations.school.era` | 2015 – heute |
| `cv.stations.school.badge` | Wissensdurst |
| `cv.stations.school.story` | Sprache war mein erster Schlüssel – danach kam Schritt für Schritt alles andere, bis zum Informatikstudium. |
| `cv.stations.career.title` | Business-Viertel |
| `cv.stations.career.era` | 2017 – heute |
| `cv.stations.career.badge` | Kundenfokus |
| `cv.stations.career.story` | Ich übersetze Kundenwünsche in Lösungen: Im Kundenservice habe ich gelernt, genau hinzuhören – heute stimme ich Anforderungen direkt mit Kunden ab. |
| `cv.stations.lab.title` | Tech-Lab |
| `cv.stations.lab.era` | Werkzeuge & GitHub |
| `cv.stations.lab.badge` | Problemlöser |
| `cv.stations.lab.story` | Mein Werkzeugkasten: Sprachen, Datenbanken, Tools und KI-Agenten – für jedes Problem das passende Werkzeug. Auf dem Dach leuchtet live, woran ich gerade auf GitHub arbeite. |
| `cv.stations.projects.title` | Projekt-Baustelle |
| `cv.stations.projects.era` | eigene Projekte |
| `cv.stations.projects.badge` | Macher |
| `cv.stations.projects.story` | Was ich anfange, baue ich fertig. In meinem Projekt-Viertel sehen Sie, was schon steht und was gerade wächst. |
| `cv.stations.lake.title` | Freizeit & Ehrenamt |
| `cv.stations.lake.era` | Freizeit |
| `cv.stations.lake.badge` | Engagement |
| `cv.stations.lake.story` | Abschalten kann ich am besten im Wasser und im Fitnessstudio. Und ich gebe gern etwas zurück – an die Stadt, die mich so gut aufgenommen hat. |
| `cv.stations.finale.title` | Ihr Unternehmen |
| `cv.stations.finale.era` | Nächstes Kapitel |
| `cv.stations.finale.story` | Danke, dass Sie sich die Zeit für meinen Weg genommen haben. Das nächste Kapitel würde ich gern mit Ihrem Team schreiben. |
| `cv.hobbies[0]` | Entwicklung von KI-Tools |
| `cv.hobbies[1]` | Fitness |
| `cv.hobbies[2]` | Schwimmen |
| `cv.hobbies[3]` | Stand-up-Paddling |
| `cv.hobbies[4]` | Reisen |
| `cv.volunteer[0].title` | Studentenverein KUMULI |
| `cv.volunteer[0].role` | Mitglied |
| `cv.volunteer[0].text` | Ich besuche mit dem Verein Kinder in der Kinderklinik des Klinikums Dortmund und mache Musik mit ihnen – ein bisschen Normalität und gute Laune im Klinikalltag. |
| `cv.volunteer[1].title` | Sprachcafé / Begegnungscafé |
| `cv.volunteer[1].role` | Kasse & Orga-Team |
| `cv.volunteer[1].text` | Im Begegnungscafé für Geflüchtete und Einheimische war ich mehrere Jahre für Kasse und Finanzen verantwortlich und habe im Orga-Team Treffen geplant und organisiert. |
| `cv.volunteer[2].title` | Deutschkurse in Kirchengemeinden |
| `cv.volunteer[2].role` | Kursleiter |
| `cv.volunteer[2].text` | In verschiedenen Kirchengemeinden habe ich Deutschkurse für Geflüchtete gegeben – die Sprache, die mir selbst den Neustart ermöglicht hat, gebe ich gern weiter. |
| `cv.volunteer[3].title` | Deutschunterricht bei der Caritas |
| `cv.volunteer[3].role` | Ehemalige Unterkunft am Ostpark |
| `cv.volunteer[3].text` | In der früheren Flüchtlingsunterkunft am Ostpark habe ich mit der Caritas Deutschunterricht für die Bewohnerinnen und Bewohner gegeben. |
| `cv.volunteer[4].title` | Seniorencafé im Bruder-Jordan-Haus |
| `cv.volunteer[4].role` | Helfer |
| `cv.volunteer[4].text` | Im Seniorencafé verbringe ich Zeit mit älteren Menschen – zuhören, erzählen, Kaffee ausschenken. |
| `cv.volunteer[5].title` | Caritas „Warm durch die Nacht“ |
| `cv.volunteer[5].role` | Helfer |
| `cv.volunteer[5].text` | Bei „Warm durch die Nacht“ habe ich die Caritas bei der Versorgung wohnungsloser Menschen in kalten Nächten unterstützt. |
| `cv.extras[0].name` | Führerschein |
| `cv.extras[0].text` | Klasse B |
| `cv.education[0].title` | Bachelor of Science Praktische Informatik |
| `cv.education[0].detail` | Fachhochschule Dortmund · voraussichtlicher Abschluss: 08/2027 |
| `cv.education[0].bullets[0]` | Schwerpunkte: Programmierung, Softwaretechnik, Algorithmen und Datenstrukturen, Datenbanken, Betriebssysteme, Rechnernetze, Informationssicherheit. |
| `cv.education[0].bullets[1]` | Projektarbeiten: IT-Service-Management mit BMC Helix ITSM (Incidents, Service und Change Requests); Scrum-basierte Website für Kinderaktivitäten der Stadt Herne; eigenständige Java-Verwaltungsanwendung. |
| `cv.education[1].title` | Allgemeine Hochschulreife |
| `cv.education[1].detail` | Westfalen-Kolleg Dortmund |
| `cv.education[2].title` | Integrations- und Sprachkurse bis B1 |
| `cv.education[2].detail` | VHS Marburg-Biedenkopf · Auslandsgesellschaft Dortmund |
| `cv.travels[0].country` | Syrien & Deutschland |
| `cv.travels[1].country` | Einreise nach Deutschland |
| `cv.travels[2].country` | Spanien, Griechenland, Italien, Algerien, Marokko, Kroatien |
| `cv.travels[3].country` | Dänemark, Belgien, Holland, Österreich, Schweiz, Luxemburg, Liechtenstein |
| `cv.travels[4].country` | Polen, Schweden, Tschechien, Ungarn, Türkei, Libanon |
| `cv.skills[0].name` | Programmierung |
| `cv.skills[0].note` | Java sehr gut · C, C++, JavaScript gut · R Grundkenntnisse |
| `cv.skills[1].name` | Datenbanken |
| `cv.skills[1].note` | SQL, Microsoft SQL Server sehr gut · SQLite gut |
| `cv.skills[2].name` | Web |
| `cv.skills[2].note` | gut |
| `cv.skills[3].name` | Tools |
| `cv.skills[3].note` | sehr gut |
| `cv.skills[4].name` | Betriebssysteme |
| `cv.skills[4].note` | Windows sehr gut · Linux gut |
| `cv.skills[5].name` | ITSM |
| `cv.skills[5].note` | BMC Helix ITSM gut · ITIL Grundkenntnisse |
| `cv.languages[0].name` | Deutsch |
| `cv.languages[1].name` | Arabisch |
| `cv.languages[2].name` | Englisch |
| `cv.languages[3].name` | Französisch |
| `cv.experience[0].role` | Mitgründer eines eigenen Unternehmens – Softwareentwicklung |
| `cv.experience[0].company` | Eigenes Unternehmen, Dortmund (nebenberuflich) |
| `cv.experience[0].bullets[0]` | Konzeption und Entwicklung eigener Softwarelösungen – von der Anforderung über Prompt Engineering, UI/UX-Design und Programmentwicklung bis zu Qualitätssicherung, Deployment und Support; KI-Agenten (Claude Code, OpenAI Codex) unterstützen dabei. |
| `cv.experience[0].bullets[1]` | Schrittweise Optimierung von Prompts und Projektanweisungen, damit die KI-Agenten verlässlich und nachvollziehbar unterstützen. |
| `cv.experience[0].bullets[2]` | Qualitätssicherung vor jeder Auslieferung: Code-Reviews und Tests auf Korrektheit, Wartbarkeit und Sicherheit. |
| `cv.experience[0].bullets[3]` | Kundenprojekt Werkzeugverleih-Software: React, Node.js, Express.js, SQLite; inklusive Kundenabstimmung, Aufwandsschätzung und Angebot. |
| `cv.experience[1].role` | Werkstudent Softwareentwicklung |
| `cv.experience[1].company` | PSI SE, Dortmund |
| `cv.experience[1].bullets[0]` | Wartung und kundenspezifische Weiterentwicklung des PSI Logistics Warehouse Management Systems (WMS) auf Basis von Jira-Tickets. |
| `cv.experience[1].bullets[1]` | Umsetzung funktionaler Erweiterungen: Benutzeroberflächen, Geschäftslogik in Java und SQL-Abfragen auf Microsoft SQL Server. |
| `cv.experience[1].bullets[2]` | Konfiguration und serverseitige Anbindung von Schnittstellen; automatisierte und manuelle Tests; Versionsverwaltung mit GitLab. |
| `cv.experience[1].bullets[3]` | Teilnahme an Kundenterminen zur Aufnahme und Abstimmung fachlicher Anforderungen. |
| `cv.experience[1].badge` | 100 % ohne KI-Werkzeuge |
| `cv.experience[2].role` | Kundenservice und Vertrieb – Telekom-Auftrag (Vollzeit) |
| `cv.experience[2].company` | Amevida, Dortmund |
| `cv.experience[2].bullets[0]` | Beratung von Telekom-Kunden zu Tarifen, Verträgen und Produkten. |
| `cv.experience[3].role` | Kundenservice und technische Beratung – Samsung-Auftrag |
| `cv.experience[3].company` | TELUS Digital, Dortmund |
| `cv.experience[3].bullets[0]` | Technische Beratung und Support zu Samsung-Geräten. |
| `cv.experience[3].bullets[1]` | Strukturierte Fehleranalyse: Ermittlung der Fehlerursache und Erarbeitung passender Lösungen. |
| `cv.experience[4].role` | Mitarbeit Reisekostenabrechnung |
| `cv.experience[4].company` | adesso SE, Dortmund |
| `cv.experience[4].bullets[0]` | Operative Bearbeitung und Begleitung der Prozesse zur Reisekostenerstattung. |
| `cv.projects[0].title` | Werkzeugverleih-Software |
| `cv.projects[0].tag` | Kundenprojekt |
| `cv.projects[0].detail` | Software für einen Werkzeugverleih – live im Einsatz, mit echten Kundinnen und Kunden. Wird laufend erweitert. |
| `cv.projects[0].stage` | Fertig · erweiterbar |
| `cv.projects[1].title` | KI-Videos auf Social Media |
| `cv.projects[1].tag` | Eigene Kanäle |
| `cv.projects[1].detail` | Eigene Social-Media-Kanäle mit KI-generierten Videos. |
| `cv.projects[2].title` | Rustfall (Arbeitstitel) |
| `cv.projects[2].tag` | Handyspiel |
| `cv.projects[2].detail` | Postapokalyptisches Handyspiel. Der endgültige Name folgt. |
| `cv.projects[3].title` | Ultranisator |
| `cv.projects[3].tag` | App |
| `cv.projects[3].detail` | App für Fußballfans: Planung und Verwaltung von Fan-Strukturen. |
| `cv.projects[4].title` | Rest-IQ |
| `cv.projects[4].tag` | Plattform |
| `cv.projects[4].detail` | Plattform, mit der Restaurants kostenlos eigene Webseiten bauen. |
| `cv.projects[5].title` | Drive Pluz |
| `cv.projects[5].tag` | Software |
| `cv.projects[5].detail` | Fahrschulverwaltung inklusive Fahrschüler-App. |
| `cv.projects[5].stage` | Fundament |
| `cv.links[0].title` | Interaktiver Lebenslauf |
| `cv.links[0].note` | Mein Weg in sieben Kapiteln |
| `cv.links[1].title` | GitHub |
| `cv.links[1].note` | Code und tägliche Aktivität |
| `cv.links[2].title` | KI-Videos |
| `cv.links[2].note` | Videos, die ich mit KI erstelle |
| `cv.links[3].title` | LinkedIn |
| `cv.links[3].note` | Beruflicher Werdegang |
| `cv.links[4].title` | Kontakt |
| `cv.links[4].note` | Schreiben Sie mir über das Formular |
| `cv.traits[0]` | Teamgeist |
| `cv.traits[1]` | Zuverlässigkeit |
| `cv.traits[2]` | Lernbereitschaft |
| `cv.traits[3]` | Kundenorientierung |
| `cv.traits[4]` | Ausdauer |
| `cv.traits[5]` | Verantwortung |
| `cv.traits[6]` | Neugier |
| `cv.traits[7]` | Eigeninitiative |

## Englisch (535 Texte)

### Doppelungen

Keine in den Inhalten gefunden.


Gewollt gleich (gleiche Aktion an mehreren Stellen):

- „countries visited“: `ui.start.countries`, `ui.facts.countriesSeen`, `ui.facts.countries`
- „all chapters discovered“: `ui.hud.allDone`, `ui.toast.allDone`
- „auf deutsch umschalten“: `ui.hud.langSwitch`, `ui.palette.langSub`
- „back to the world“: `ui.station.backToWorld`, `ui.cv.backToWorld`
- „work experience“: `ui.facts.experience`, `ui.cv.experience`
- „under construction“: `ui.projects.stage.build`, `ui.projects.legend.build`
- „chapter overview“: `ui.journey.title`, `ui.palette.journey`
- „open to new challenges“: `cv.cardStatus`, `cv.availability`

### Liste

| Schlüssel | Text |
|---|---|
| `ui.meta.title` | Abdul Kader Sabouni – Interactive CV |
| `ui.meta.description` | Abdul Kader Sabouni – software developer and computer science student (FH Dortmund). My CV as a walkable game world with six mini-games – or as a compact page in 30 seconds. |
| `ui.common.close` | Close |
| `ui.theme.light` | Light |
| `ui.theme.dark` | Dark |
| `ui.time.justNow` | just now |
| `ui.time.today` | today |
| `ui.start.hello` | Hi, I’m {name}. |
| `ui.start.greet` | 👋 Great to have you here |
| `ui.start.greetName` | 👋 Hi {name}! |
| `ui.start.greetFirm` | 👋 Welcome, team {firm}! |
| `ui.start.greetNameFirm` | 👋 Hi {name} from {firm}! |
| `ui.start.play` | Start game |
| `ui.start.continue` | Continue |
| `ui.start.playSub` | approx. 3 min · every game can be skipped |
| `ui.start.cv` | CV in 30 seconds |
| `ui.start.cvSub` | classic · save as PDF |
| `ui.start.player1` | Player 1 |
| `ui.start.langGroup` | Language |
| `ui.start.privacy` | Privacy |
| `ui.start.available` | available |
| `ui.start.languages` | Languages |
| `ui.start.countries` | Countries visited |
| `ui.start.years.one` | {n} year |
| `ui.start.years.other` | {n} years |
| `ui.start.months` | {n} mo. |
| `ui.start.devLabel` | Full-stack developer |
| `ui.start.foot` | No installation · mouse, keyboard or touch · no game over |
| `ui.start.footBack` | Welcome back – you have already discovered {done} of {total} chapters. |
| `ui.hud.worldAria` | Walkable CV world |
| `ui.hud.allDone` | All chapters discovered 🏆 |
| `ui.hud.badgeOpen` | (still open) |
| `ui.hud.nextGoal` | Next goal |
| `ui.hud.walkThere` | Walk there |
| `ui.hud.autoWalk` | Walk there automatically (G) |
| `ui.hud.journeyKey` | Chapter overview (M) |
| `ui.hud.search` | Search |
| `ui.hud.searchKey` | Search & jump (Ctrl+K) |
| `ui.hud.ctrlK` | Ctrl K |
| `ui.hud.contactNow` | Get in touch |
| `ui.hud.contactShort` | Contact |
| `ui.hud.contactTitle` | Get in touch |
| `ui.hud.cv` | CV |
| `ui.hud.cvKey` | Compact CV (L) |
| `ui.hud.sound` | Sound effects on/off |
| `ui.hud.music` | Music on/off |
| `ui.hud.minimap` | Map – click to walk there |
| `ui.hud.tokens` | Skill stars collected |
| `ui.hud.badges` | Strengths discovered |
| `ui.hud.langSwitch` | Auf Deutsch umschalten |
| `ui.hud.theme` | Colour mode: {mode} – click to change |
| `ui.hud.langOther` | DE |
| `ui.hud.enter` | Enter |
| `ui.hud.lockedOpen` | {n} chapters still open |
| `ui.hud.hintTouch` | Drag to walk · tap to walk there |
| `ui.hud.hintKeys` | <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk · click = walk there · <kbd>Ctrl K</kbd> search |
| `ui.robot.welcome` | Hi, I’m Bit 🤖 – {name}’s assistant. Follow the orange arrow – or click “Next goal” {corner}! |
| `ui.robot.welcomeTouch` | Hi, I’m Bit 🤖 – {name}’s assistant. Follow the orange arrow – or tap “Next goal” {corner}! |
| `ui.robot.welcomeBack` | Welcome back! You already know {n} chapters. Let’s keep going! 🤖 |
| `ui.robot.cornerTopLeft` | at the top left |
| `ui.robot.cornerBottom` | at the bottom |
| `ui.robot.playerHello` | Come along – this is where my journey begins! 👋 |
| `ui.robot.locked` | 🔒 The last chapter opens once you have visited all {total} buildings – {n} still open. |
| `ui.robot.idleTouch` | Tip: tap “Next goal” – and I’ll walk there automatically. |
| `ui.robot.idleKeys` | Tip: click “Next goal” at the top left (or press G) – and I’ll walk there automatically. |
| `ui.toast.allDone` | All chapters discovered |
| `ui.toast.allDoneTitle` | The finale awaits on the hill! |
| `ui.toast.collector` | Collector |
| `ui.toast.collectorTitle` | All {n} skill stars found! |
| `ui.world.signs.arrival` | ARRIVAL · 2014 |
| `ui.world.signs.career` | BUSINESS |
| `ui.world.signs.lab` | </> DEV |
| `ui.world.signs.projects` | PROJECTS |
| `ui.world.signs.yourCompany` | Your company? |
| `ui.world.signs.toStations` | → Stations |
| `ui.world.signs.toStart` | Start ← |
| `ui.world.signs.githubWall` | GitHub · {n} weeks |
| `ui.world.locked` | 🔒 Still locked |
| `ui.world.enterTouch` | Tap “Enter” |
| `ui.world.enterKeys` | E / Enter · Enter |
| `ui.station.chapter` | Chapter {n} / {total} |
| `ui.station.finale` | Finale |
| `ui.station.tells` | {name} says |
| `ui.station.minigame` | Mini-game |
| `ui.station.seconds` | {n} sec |
| `ui.station.skipToFacts` | Skip the game, show the facts → |
| `ui.station.skipGame` | Skip → straight to the facts |
| `ui.station.unlocked` | Strength unlocked |
| `ui.station.result` | Result |
| `ui.station.points` | {n} points |
| `ui.station.newBest` | new best |
| `ui.station.playAgain` | Play again |
| `ui.station.playGame` | Play mini-game |
| `ui.station.next` | Next: {title} → |
| `ui.station.backToWorld` | Back to the world |
| `ui.facts.current` | current |
| `ui.facts.countriesSeen` | countries visited |
| `ui.facts.home` | Home |
| `ui.facts.myMap` | My world map |
| `ui.facts.countries` | Countries visited |
| `ui.facts.educationPath` | From integration course to university |
| `ui.facts.languagesToday` | My languages today |
| `ui.facts.experience` | Work experience |
| `ui.facts.aiSkills` | AI skills |
| `ui.facts.workingOn` | What I’m working on |
| `ui.facts.myGithub` | My GitHub |
| `ui.facts.open` | Open |
| `ui.facts.ownCompanySince` | Own company · since {since} |
| `ui.facts.quarter` | My project quarter |
| `ui.facts.quarterReward` | Your reward: construction in progress |
| `ui.facts.quarterTap` | Tap a building for details |
| `ui.facts.project` | Project |
| `ui.facts.view` | View |
| `ui.facts.linkSoon` | Link coming soon |
| `ui.facts.leisure` | Free time |
| `ui.facts.volunteering` | Volunteering |
| `ui.projects.stage.done` | Finished |
| `ui.projects.stage.build` | Under construction · {pct} % |
| `ui.projects.stage.base` | Foundation |
| `ui.projects.legend.done` | Finished |
| `ui.projects.legend.build` | Under construction |
| `ui.projects.legend.base` | Foundation |
| `ui.projects.signs.shop` | TOOL RENTAL |
| `ui.projects.expandable` | + expandable |
| `ui.projects.quarterAria` | Project quarter: {list} |
| `ui.projects.walkHint` | Tap a building – {name} walks there · arrow keys walk, Enter shows the project |
| `ui.projects.walkRole` | walkable project quarter |
| `ui.worldmap.stat` | Starting point: Germany |
| `ui.worldmap.zoomIn` | Zoom in |
| `ui.worldmap.zoomOut` | Zoom out |
| `ui.worldmap.zoomAll` | All |
| `ui.worldmap.zoomAllLabel` | Whole map |
| `ui.worldmap.aria` | Map of countries visited: {list} |
| `ui.worldmap.homeSince` | Home since 2014 |
| `ui.worldmap.origin` | Country of origin |
| `ui.worldmap.visited` | visited |
| `ui.worldmap.notVisited` | not visited yet |
| `ui.worldmap.hintTouch` | Swipe to pan · pinch to zoom · tap a country to see its name |
| `ui.worldmap.hintMouse` | Hover over a coloured country · Ctrl + mouse wheel zooms |
| `ui.worldmap.views` | Map view |
| `ui.worldmap.europe` | Europe |
| `ui.worldmap.world` | World |
| `ui.github.loading` | Loading GitHub activity … |
| `ui.github.title` | GitHub activity |
| `ui.github.updated` | updated {ago} |
| `ui.github.public` | public activity |
| `ui.github.profile` | Profile |
| `ui.github.contributions` | contributions {span} |
| `ui.github.spanYear` | in the last year |
| `ui.github.span6m` | in the last 6 months |
| `ui.github.span90` | in the last 90 days |
| `ui.github.streak.one` | day current streak |
| `ui.github.streak.other` | days current streak |
| `ui.github.bestDay` | on the most active day ({date}) |
| `ui.github.dayTitle.zero` | No contributions on {date} |
| `ui.github.dayTitle.one` | 1 contribution on {date} |
| `ui.github.dayTitle.other` | {n} contributions on {date} |
| `ui.github.less` | less |
| `ui.github.more` | more |
| `ui.github.latest` | Latest commits |
| `ui.github.pushed` | Pushed new commits |
| `ui.finale.photoLabel` | Photo of {name} with the company name on the T-shirt |
| `ui.finale.stickerBand` | MY NEXT CHAPTER |
| `ui.finale.firmLabel` | Your company |
| `ui.finale.firmPlaceholder` | Please enter your company name |
| `ui.finale.firmHint` | It appears on the sticker on my T-shirt. |
| `ui.finale.contactName` | Contact {name} |
| `ui.finale.allExplored` | You have explored my whole journey! |
| `ui.finale.explored` | {done} of {total} chapters explored |
| `ui.finale.insights` | What you learned about {name} |
| `ui.finale.starsTotal` | {n} / {max} stars in mini-games |
| `ui.finale.cvAndPdf` | Compact CV & PDF |
| `ui.journey.kicker` | My journey in 7 stations |
| `ui.journey.title` | Chapter overview |
| `ui.journey.sub` | {done} of {total} chapters discovered · ⭐ {stars} / {max} stars · click = walk there |
| `ui.journey.locked` | locked |
| `ui.journey.opensAfter` | opens after all {n} chapters |
| `ui.journey.done` | discovered |
| `ui.journey.next` | next goal |
| `ui.journey.open` | open |
| `ui.palette.aria` | Search and jump |
| `ui.palette.placeholder` | What are you looking for? e.g. Java, PSI, English … |
| `ui.palette.select` | select |
| `ui.palette.open` | open |
| `ui.palette.map` | Map |
| `ui.palette.cvShort` | CV |
| `ui.palette.group.actions` | Actions |
| `ui.palette.group.chapters` | Chapters |
| `ui.palette.group.content` | Content |
| `ui.palette.empty` | Nothing found for “{q}” – try e.g. “Java” or “PSI”. |
| `ui.palette.cv` | Open compact CV |
| `ui.palette.cvSub` | All facts on one page |
| `ui.palette.cvQ` | cv resume lebenslauf compact |
| `ui.palette.pdf` | Save as PDF |
| `ui.palette.pdfSub` | Colour CV as a PDF file |
| `ui.palette.pdfQ` | pdf print download save |
| `ui.palette.journey` | Chapter overview |
| `ui.palette.journeySub` | All stations & stars |
| `ui.palette.journeyQ` | map overview chapters progress |
| `ui.palette.next` | To the next goal: {title} |
| `ui.palette.nextSub` | Walk there automatically |
| `ui.palette.nextQ` | next goal continue |
| `ui.palette.soundOn` | Turn sound on |
| `ui.palette.soundOff` | Turn sound off |
| `ui.palette.soundSub` | Sound effects |
| `ui.palette.soundQ` | sound audio mute quiet |
| `ui.palette.contact` | Get in touch |
| `ui.palette.contactSub` | Send me a message directly |
| `ui.palette.contactQ` | contact mail email message form enquiry |
| `ui.palette.lang` | Sprache: Deutsch |
| `ui.palette.langSub` | Auf Deutsch umschalten |
| `ui.palette.langQ` | language sprache german deutsch english |
| `ui.palette.theme` | Change colour mode |
| `ui.palette.themeSub` | Light ↔ Dark |
| `ui.palette.themeQ` | dark mode light colour theme night |
| `ui.palette.skill` | Skill · {place} |
| `ui.palette.jobQ` | job work career |
| `ui.palette.educationQ` | university school education study |
| `ui.palette.language` | Language · {level} |
| `ui.palette.languageQ` | language |
| `ui.palette.project` | {tech} · Project |
| `ui.palette.projectQ` | project |
| `ui.palette.aiSkill` | AI skill |
| `ui.palette.volunteer` | Volunteering · {date} |
| `ui.palette.volunteerQ` | volunteering volunteer |
| `ui.palette.hobby` | Hobby |
| `ui.palette.hobbyQ` | hobby free time sport |
| `ui.palette.country` | Country visited |
| `ui.palette.countryQ` | country travel |
| `ui.cv.aria` | Compact CV |
| `ui.cv.back` | Back |
| `ui.cv.backToWorld` | Back to the world |
| `ui.cv.contact` | Contact |
| `ui.cv.savePdf` | Save as PDF |
| `ui.cv.photoOf` | Photo of {name} |
| `ui.cv.aiSkills` | AI skills |
| `ui.cv.experience` | Work experience |
| `ui.cv.education` | Education |
| `ui.cv.volunteering` | Volunteering |
| `ui.cv.skills` | Skills |
| `ui.cv.projects` | Projects |
| `ui.cv.languages` | Languages |
| `ui.cv.interests` | Interests |
| `ui.cv.travel` | Travel |
| `ui.cv.countries` | {n} countries |
| `ui.cv.more` | Further details |
| `ui.cv.playTitle` | Fancy the playful version? |
| `ui.cv.playText` | {n} short chapters – in about 3 minutes. |
| `ui.cv.play` | Explore the world |
| `ui.cv.pdfBusy` | Creating PDF … |
| `ui.cv.pdfTitle` | CV – {name} |
| `ui.cv.pdfSubject` | Curriculum vitae |
| `ui.contact.kicker` | Contact |
| `ui.contact.title` | Let’s talk |
| `ui.contact.intro` | Drop me a short note – the message goes straight to my inbox. |
| `ui.contact.name` | Name |
| `ui.contact.company` | Company |
| `ui.contact.companyPlaceholder` | Your company |
| `ui.contact.phoneShort` | Phone |
| `ui.contact.optional` | (optional) |
| `ui.contact.message` | Message |
| `ui.contact.messageStart` | Hello Mr Sabouni,  we would like to get to know you.  |
| `ui.contact.honeypot` | Please leave empty |
| `ui.contact.privacy` | Privacy notice |
| `ui.contact.consent` | I agree that my details are sent by email to {name} via the FormSubmit service (formsubmit.co) to handle this enquiry. The data is only used for this enquiry. |
| `ui.contact.required` | * required fields |
| `ui.contact.send` | Send message |
| `ui.contact.sending` | Sending … |
| `ui.contact.subject` | Contact request via the CV |
| `ui.contact.errEmail` | Please enter a valid email address. |
| `ui.contact.errRequired` | Please fill in all required fields. |
| `ui.contact.errConsent` | Please agree to the transfer so that I can receive your message. |
| `ui.contact.errSend` | The message could not be sent just now. Please try again in a moment |
| `ui.contact.orWrite` | – or write to me directly: |
| `ui.contact.openMail` | Open email |
| `ui.contact.sent` | Message sent |
| `ui.contact.thanks` | Thank you! I usually reply within two working days. |
| `ui.games.play` | Play |
| `ui.games.seconds` | {n} seconds |
| `ui.games.secondsShort` | {n}s |
| `ui.games.noLimit` | no time limit |
| `ui.games.best` | Best {n} |
| `ui.games.bestShort` | Best: {n} |
| `ui.games.bestCombo` | best combo {n} |
| `ui.games.noGameOver` | no game over – just fun |
| `ui.games.praise[0]` | Well done! |
| `ui.games.praise[1]` | Strong! |
| `ui.games.praise[2]` | Really strong! |
| `ui.games.praise[3]` | Amazing! |
| `ui.games.points` | points |
| `ui.games.newRecord` | New record! |
| `ui.games.again` | Again |
| `ui.games.toFacts` | On to the facts → |
| `ui.games.go` | GO! |
| `ui.games.combo` | COMBO ×{m} |
| `ui.games.comboLost` | Combo lost |
| `ui.games.controls.hold` | Hold |
| `ui.games.controls.click` | Click |
| `ui.games.controls.tap` | Tap |
| `ui.games.controls.swipe` | Swipe |
| `ui.games.controls.space` | Space bar |
| `ui.games.controls.arrows` | ← → |
| `ui.games.controls.mouse` | Move mouse |
| `ui.games.arrival.name` | Stamp Jet |
| `ui.games.arrival.goal` | Hold = climb, release = descend. Collect country stamps! |
| `ui.games.arrival.result` | {n} stamps in the passport – in a moment you’ll see where I’ve really been. |
| `ui.games.arrival.world` | World |
| `ui.games.arrival.passport` | Passport! |
| `ui.games.arrival.turbulence` | Turbulence! |
| `ui.games.arrival.rising` | ↑ climb |
| `ui.games.arrival.hint` | Hold = climb |
| `ui.games.school.name` | Word Ninja |
| `ui.games.school.goal` | Swipe through the flying words in four languages. Just don’t hit the bombs 💣! |
| `ui.games.school.result` | {n} words sliced – no dictionary needed. |
| `ui.games.school.boom` | Boom! |
| `ui.games.school.multi` | Multi-slice! |
| `ui.games.school.missed` | missed |
| `ui.games.school.hint` | Swipe through the words! |
| `ui.games.career.name` | Prompt Factory |
| `ui.games.career.goal` | Guide the AI agent safely to delivery: on the conveyor belt, tap the step whose slot is lit. Avoid anything unchecked! |
| `ui.games.career.result.zero` | Plan, review, tests – only then is it shipped. |
| `ui.games.career.result.other` | Shipped safely {n}× – with plan, review and tests. |
| `ui.games.career.steps.requirement` | Requirement |
| `ui.games.career.steps.plan` | Review plan |
| `ui.games.career.steps.code` | Development |
| `ui.games.career.steps.review` | Human in the Loop |
| `ui.games.career.steps.tests` | Tests & QA |
| `ui.games.career.traps.unchecked` | Accept unchecked |
| `ui.games.career.traps.unclear` | Unclear requirement |
| `ui.games.career.trapMsg.unchecked` | Never unchecked! |
| `ui.games.career.trapMsg.unclear` | Too vague! |
| `ui.games.career.firstNeed` | {step} first! |
| `ui.games.career.shipped` | Shipped safely ✓ |
| `ui.games.career.agent` | AI AGENT |
| `ui.games.career.workflow` | SAFE AI WORKFLOW |
| `ui.games.career.hint` | Tap the step that is lit at the top! |
| `ui.games.lab.name` | Idea Rain |
| `ui.games.lab.goal` | Move the basket and catch the falling ideas. Dodge the grey rain clouds! |
| `ui.games.lab.result` | {n} ideas caught – the best ones end up in code. |
| `ui.games.lab.rain` | Rain! |
| `ui.games.lab.jackpot` | Bullseye! |
| `ui.games.lab.hint` | Move the basket with mouse or finger |
| `ui.games.projects.name` | Project Stacker |
| `ui.games.projects.goal` | Tap to drop the block. Stack all my projects, skills and traits! |
| `ui.games.projects.result` | {n} blocks stacked safely. |
| `ui.games.projects.base` | FH Dortmund · Applied Computer Science |
| `ui.games.projects.perfect` | Perfect! |
| `ui.games.projects.perfectGrow` | Perfect! Growing! |
| `ui.games.projects.missed` | Missed – try again! |
| `ui.games.projects.allDone` | All stacked! |
| `ui.games.projects.kinds.p` | Project |
| `ui.games.projects.kinds.s` | Skill |
| `ui.games.projects.kinds.e` | Trait |
| `ui.games.projects.hint` | Click / space = drop |
| `ui.games.lake.name` | SUP Slalom |
| `ui.games.lake.goal` | The board follows your mouse or finger: just move left or right, dodge the rocks and collect stars! |
| `ui.games.lake.result` | {n} stars collected – stamina pays off. |
| `ui.games.lake.duck` | Squeak! |
| `ui.games.lake.air` | Air! |
| `ui.games.lake.splash` | Splash! |
| `ui.games.lake.hintTouch` | Drag your finger left or right |
| `ui.games.lake.hintMouse` | Move the mouse left or right |
| `cv.name` | Abdul Kader Sabouni |
| `cv.firstName` | Abdul |
| `cv.contactName` | Abdul Kader |
| `cv.title` | Computer science student · Software development with AI agents |
| `cv.cardRole` | Full-stack developer · Computer science student |
| `cv.cardStatus` | open to new challenges |
| `cv.location` | Dortmund |
| `cv.tagline` | From a fresh start in 2014 to software developer at PSI and my own projects – experience my journey as a small, walkable world. |
| `cv.availability` | Open to new challenges |
| `cv.summary` | Computer science student (B.Sc. Applied Computer Science, FH Dortmund) focusing on prompt engineering and agentic software development: in my own company I develop software, supported by AI agents such as Claude Code and OpenAI Codex – from a precise task description to a reviewed delivery. Plus three years as a working student in software development at PSI (Java, SQL). I keep up with new AI models and tools and put them into practice right away. |
| `cv.intro` | Welcome to my world! Walk with WASD/arrow keys or by clicking. Every building is a station of my CV. |
| `cv.strengths[0].title` | Own company |
| `cv.strengths[0].text` | From idea to operation – AI agents as tools, quality through review and tests. |
| `cv.strengths[1].title` | Hands-on since 2023 |
| `cv.strengths[1].text` | Working student at PSI: Java, SQL and a warehouse management system for logistics customers. |
| `cv.strengths[2].title` | Communication & customer focus |
| `cv.strengths[2].text` | Customer service and sales for Telekom and Samsung, customer meetings at PSI. |
| `cv.strengths[3].title` | Steep learning curve |
| `cv.strengths[3].text` | Fresh start in 2014 – today German at C2 level, university entrance qualification and a computer science degree. |
| `cv.aiSkills[0].name` | Prompt engineering |
| `cv.aiSkills[0].text` | Structured prompts (role, context, examples, output format), few-shot prompting, breaking down complex tasks, iterative optimisation |
| `cv.aiSkills[1].name` | Agentic coding |
| `cv.aiSkills[1].text` | Claude Code, OpenAI Codex: planning, implementation, refactoring and debugging – always with a human in the loop |
| `cv.aiSkills[2].name` | AI models |
| `cv.aiSkills[2].text` | Claude (Anthropic), GPT/ChatGPT (OpenAI) |
| `cv.facts[0]` | Did you know? Abdul earned his university entrance qualification at evening school – while working during the day. |
| `cv.facts[1]` | Abdul likes to try new AI models straight away – and checks critically what they can really do. |
| `cv.facts[2]` | Arabic, German, English, French – Abdul switches easily between four languages. |
| `cv.facts[3]` | Many customer calls taught Abdul to stay friendly under pressure. |
| `cv.facts[4]` | Seen it yet? Abdul’s project quarter is growing behind the construction site. |
| `cv.facts[5]` | Abdul has already travelled to more than 20 countries. |
| `cv.stations.arrival.title` | Arrival & Travel |
| `cv.stations.arrival.era` | since 10.2014 |
| `cv.stations.arrival.badge` | Open-minded |
| `cv.stations.arrival.story` | My fresh start in Germany was the biggest journey of my life. Since then I love discovering new countries – other cultures make me open, curious and adaptable. |
| `cv.stations.school.title` | Education |
| `cv.stations.school.era` | 2015 – today |
| `cv.stations.school.badge` | Thirst for knowledge |
| `cv.stations.school.story` | Language was my first key – after that, everything else followed step by step, all the way to studying computer science. |
| `cv.stations.career.title` | Business District |
| `cv.stations.career.era` | 2017 – today |
| `cv.stations.career.badge` | Customer focus |
| `cv.stations.career.story` | I translate customer wishes into solutions: in customer service I learned to listen carefully – today I align requirements directly with customers. |
| `cv.stations.lab.title` | Tech Lab |
| `cv.stations.lab.era` | Tools & GitHub |
| `cv.stations.lab.badge` | Problem solver |
| `cv.stations.lab.story` | My toolbox: languages, databases, tools and AI agents – the right tool for every problem. The wall on the roof shows live what I am working on at GitHub. |
| `cv.stations.projects.title` | Project Site |
| `cv.stations.projects.era` | own projects |
| `cv.stations.projects.badge` | Doer |
| `cv.stations.projects.story` | What I start, I finish. In my project quarter you can see what is already standing and what is still growing. |
| `cv.stations.lake.title` | Free Time & Volunteering |
| `cv.stations.lake.era` | free time |
| `cv.stations.lake.badge` | Commitment |
| `cv.stations.lake.story` | I switch off best in the water and at the gym. And I like to give something back – to the city that welcomed me so well. |
| `cv.stations.finale.title` | Your Company |
| `cv.stations.finale.era` | Next chapter |
| `cv.stations.finale.story` | Thank you for taking the time to follow my journey. I would love to write the next chapter with your team. |
| `cv.hobbies[0]` | Building AI tools |
| `cv.hobbies[1]` | Fitness |
| `cv.hobbies[2]` | Swimming |
| `cv.hobbies[3]` | Stand-up paddling |
| `cv.hobbies[4]` | Travelling |
| `cv.volunteer[0].title` | Student association KUMULI |
| `cv.volunteer[0].role` | Member |
| `cv.volunteer[0].text` | With the association I visit children in the children’s hospital of Klinikum Dortmund and make music with them – a bit of normality and good spirits in everyday hospital life. |
| `cv.volunteer[1].title` | Language café / meeting café |
| `cv.volunteer[1].role` | Cash desk & organising team |
| `cv.volunteer[1].text` | At the meeting café for refugees and locals I was responsible for the cash desk and finances for several years and planned and organised meetings in the organising team. |
| `cv.volunteer[2].title` | German courses in church parishes |
| `cv.volunteer[2].role` | Course leader |
| `cv.volunteer[2].text` | I taught German courses for refugees in various church parishes – I like passing on the language that made my own fresh start possible. |
| `cv.volunteer[3].title` | German lessons with Caritas |
| `cv.volunteer[3].role` | Former shelter at Ostpark |
| `cv.volunteer[3].text` | At the former refugee shelter at Ostpark I gave German lessons to the residents together with Caritas. |
| `cv.volunteer[4].title` | Seniors’ café at Bruder-Jordan-Haus |
| `cv.volunteer[4].role` | Helper |
| `cv.volunteer[4].text` | At the seniors’ café I spend time with older people – listening, chatting, serving coffee. |
| `cv.volunteer[5].title` | Caritas “Warm through the night” |
| `cv.volunteer[5].role` | Helper |
| `cv.volunteer[5].text` | In “Warm through the night” I supported Caritas in caring for homeless people on cold nights. |
| `cv.extras[0].name` | Driving licence |
| `cv.extras[0].text` | Category B |
| `cv.education[0].title` | Bachelor of Science in Applied Computer Science |
| `cv.education[0].detail` | Dortmund University of Applied Sciences and Arts · expected graduation: 08/2027 |
| `cv.education[0].bullets[0]` | Focus: programming, software engineering, algorithms and data structures, databases, operating systems, computer networks, information security. |
| `cv.education[0].bullets[1]` | Projects: IT service management with BMC Helix ITSM (incidents, service and change requests); Scrum-based website for children’s activities of the city of Herne; standalone Java management application. |
| `cv.education[1].title` | University entrance qualification (Abitur) |
| `cv.education[1].detail` | Westfalen-Kolleg Dortmund |
| `cv.education[2].title` | Integration and language courses up to B1 |
| `cv.education[2].detail` | VHS Marburg-Biedenkopf · Auslandsgesellschaft Dortmund |
| `cv.travels[0].country` | Syria & Germany |
| `cv.travels[1].country` | Arrival in Germany |
| `cv.travels[2].country` | Spain, Greece, Italy, Algeria, Morocco, Croatia |
| `cv.travels[3].country` | Denmark, Belgium, Netherlands, Austria, Switzerland, Luxembourg, Liechtenstein |
| `cv.travels[4].country` | Poland, Sweden, Czechia, Hungary, Turkey, Lebanon |
| `cv.skills[0].name` | Programming |
| `cv.skills[0].note` | Java very good · C, C++, JavaScript good · R basic |
| `cv.skills[1].name` | Databases |
| `cv.skills[1].note` | SQL, Microsoft SQL Server very good · SQLite good |
| `cv.skills[2].name` | Web |
| `cv.skills[2].note` | good |
| `cv.skills[3].name` | Tools |
| `cv.skills[3].note` | very good |
| `cv.skills[4].name` | Operating systems |
| `cv.skills[4].note` | Windows very good · Linux good |
| `cv.skills[5].name` | ITSM |
| `cv.skills[5].note` | BMC Helix ITSM good · ITIL basic |
| `cv.languages[0].name` | German |
| `cv.languages[1].name` | Arabic |
| `cv.languages[2].name` | English |
| `cv.languages[3].name` | French |
| `cv.experience[0].role` | Co-founder of my own company – software development |
| `cv.experience[0].company` | Own company, Dortmund (part-time) |
| `cv.experience[0].bullets[0]` | Design and development of own software solutions – from requirements via prompt engineering, UI/UX design and software development to quality assurance, deployment and support, supported by AI agents (Claude Code, OpenAI Codex). |
| `cv.experience[0].bullets[1]` | Step-by-step optimisation of prompts and project instructions so that the AI agents provide reliable and traceable support. |
| `cv.experience[0].bullets[2]` | Quality assurance before every delivery: code reviews and tests for correctness, maintainability and security. |
| `cv.experience[0].bullets[3]` | Customer project tool rental software: React, Node.js, Express.js, SQLite; including customer coordination, effort estimation and quotation. |
| `cv.experience[1].role` | Working student software development |
| `cv.experience[1].company` | PSI SE, Dortmund |
| `cv.experience[1].bullets[0]` | Maintenance and customer-specific development of the PSI Logistics Warehouse Management System (WMS) based on Jira tickets. |
| `cv.experience[1].bullets[1]` | Implementation of functional extensions: user interfaces, business logic in Java and SQL queries on Microsoft SQL Server. |
| `cv.experience[1].bullets[2]` | Configuration and server-side integration of interfaces; automated and manual tests; version control with GitLab. |
| `cv.experience[1].bullets[3]` | Participation in customer meetings to gather and align functional requirements. |
| `cv.experience[1].badge` | 100 % without AI tools |
| `cv.experience[2].role` | Customer service and sales – Telekom account (full-time) |
| `cv.experience[2].company` | Amevida, Dortmund |
| `cv.experience[2].bullets[0]` | Advising Telekom customers on tariffs, contracts and products. |
| `cv.experience[3].role` | Customer service and technical support – Samsung account |
| `cv.experience[3].company` | TELUS Digital, Dortmund |
| `cv.experience[3].bullets[0]` | Technical advice and support for Samsung devices. |
| `cv.experience[3].bullets[1]` | Structured troubleshooting: identifying the cause of faults and working out suitable solutions. |
| `cv.experience[4].role` | Assistant in travel expense accounting |
| `cv.experience[4].company` | adesso SE, Dortmund |
| `cv.experience[4].bullets[0]` | Operational processing and support of travel expense reimbursement processes. |
| `cv.projects[0].title` | Tool rental software |
| `cv.projects[0].tag` | Customer project |
| `cv.projects[0].detail` | Software for a tool rental business – live and used by real customers. Continuously extended. |
| `cv.projects[0].stage` | Finished · expandable |
| `cv.projects[1].title` | AI videos on social media |
| `cv.projects[1].tag` | Own channels |
| `cv.projects[1].detail` | Own social media channels with AI-generated videos. |
| `cv.projects[2].title` | Rustfall (working title) |
| `cv.projects[2].tag` | Mobile game |
| `cv.projects[2].detail` | Post-apocalyptic mobile game. The final name will follow. |
| `cv.projects[3].title` | Ultranisator |
| `cv.projects[3].tag` | App |
| `cv.projects[3].detail` | App for football fans: planning and managing fan structures. |
| `cv.projects[4].title` | Rest-IQ |
| `cv.projects[4].tag` | Platform |
| `cv.projects[4].detail` | Platform that lets restaurants build their own websites for free. |
| `cv.projects[5].title` | Drive Pluz |
| `cv.projects[5].tag` | Software |
| `cv.projects[5].detail` | Driving school management including a learner driver app. |
| `cv.projects[5].stage` | Foundation |
| `cv.links[0].title` | Interactive CV |
| `cv.links[0].note` | My journey in seven chapters |
| `cv.links[1].title` | GitHub |
| `cv.links[1].note` | Code and daily activity |
| `cv.links[2].title` | AI videos |
| `cv.links[2].note` | Videos I create with AI |
| `cv.links[3].title` | LinkedIn |
| `cv.links[3].note` | Professional background |
| `cv.links[4].title` | Contact |
| `cv.links[4].note` | Write to me via the form |
| `cv.traits[0]` | Team spirit |
| `cv.traits[1]` | Reliability |
| `cv.traits[2]` | Willingness to learn |
| `cv.traits[3]` | Customer orientation |
| `cv.traits[4]` | Stamina |
| `cv.traits[5]` | Responsibility |
| `cv.traits[6]` | Curiosity |
| `cv.traits[7]` | Initiative |
