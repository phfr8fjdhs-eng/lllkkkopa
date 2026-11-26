# Spielmodus «Langes Spiel» (seit 26.11.2026)
Ein eigener Modus neben «Klassisch» und «Arsenal», auf dem Startbildschirm unter «Spielmodus». Er ist nicht mit «Arsenal» kombinierbar. Option `opts.lang`, im Spiel `game.lang`. Das klassische Spiel bleibt unverändert: Jede Regel des Modus steht im Code hinter `this.lang`, die Zahlen in `G.LANG` (`src/03_game.js`). Code der eigenen Regeln: `src/04c_lang.js`. Test: `node test/lang.js`, Gleichlauf `node test/det.js lang`, Eingraben `node test/kampf.js lang`.

## Ziel
Ruhiger, mehr Zeit zum Planen, taktischer. Runden von etwa **70 Minuten** (festgelegt am 26.11.2026). Bündnisse, Infrastruktur im eigenen Land und Abschreckung mit Atomwaffen sollen wichtig werden, und Heer, Marine und Luftwaffe sollen gleich gut möglich sein. Das späte Spiel soll nicht aus Stapeln bestehen (Flugabwehr, Truppen), und wer einmal nicht aufpasst, soll nicht sofort verloren haben.

Die Regel aus `doku/vision.md` (Runden höchstens etwa 40 bis 45 Minuten) gilt für das klassische Spiel; dieser Modus ist bewusst länger.

## Pakete
1. Tempo, Vorbereitung, Verteidigung, Abwehr (in Arbeit)
2. Bomben, Raketen, Bedienung (Atomwaffen als Abschreckung, Reichweite ab dem Silo, Waffenleiste, Schläge planen, Zweitschlag)
3. Nebel, Aufklärung, Bündnisse
4. Forschung (Unis, Stufen, Doktrin; dazu ein Ausbau «Infrastruktur» für Versorgung und Schutz der Städte)
5. Luftwaffe
6. Marine
7. Im eigenen Land
8. Inseln als Stützpunkte

Nach jedem Paket werden ein paar Runden gespielt und die Zahlen abgestimmt. Alle Zahlen hier sind Startwerte.

## 1a. Die Welt wirkt grösser (26.11.2026)
Alles auf dem Meer und in der Luft ist langsamer und reicht weniger weit, der Bodenkampf bleibt im Tempo. So wirken Meer und Entfernungen im Verhältnis zum Land grösser, ohne dass die Karte mehr Felder bekommt.

| Was | Faktor | Erde (Massstab S = 1) |
| --- | --- | --- |
| Schiffe: Handel, Transportboote, Kriegsschiffe (`game.pace`) | `G.LANG.world` = 0.5 | 0.5 statt 1 Feld pro Tick, Atlantik etwa 160 s statt 80 s |
| Atombombe, Wasserstoffbombe, Marschflugkörper, MIRV-Sprengköpfe (`R.nukeSpeed`) | `G.LANG.air` = 0.4 | 2.4 statt 6 Felder pro Tick, Atlantik etwa 33 s statt 13 s |
| Abwehrrakete der Flugabwehr (`sammSpeed`) | 0.4 | wie die Bomben, damit das Abfangen gleich aufgeht |
| Reichweite der Flugabwehr (`samRange`) | 0.5 | 35 bis 75 statt 70 bis 150 Felder |
| Kriegsschiffe: Schussweite, Patrouille, Reparatur in Hafennähe | 0.5 | |
| Reichweite der Häfen (Frachter, Massengut, Container) | 0.5 | 175 / 350 / 700 statt 350 / 700 / 1400 |
| Züge, Granaten, Bodenkampf, Gebäudeabstand, Sprengradien | 1 | unverändert |

- Züge und Granaten haben dafür ein eigenes Tempo (`game.pace0`). Sonst würde das Bahngold halbiert, und Granaten wären langsamer als die Schiffe, die sie treffen sollen.
- Silos haben noch keine Reichweite; die kommt mit Paket 2.
- **Beobachten:** Mit der halben Hafenreichweite gibt es weniger Handelswege und damit weniger Seegold. Fehlt das spürbar, wird das Gold pro Fahrt erhöht, nicht die Reichweite (Paket 6 macht Seehandel ohnehin wertvoller).
- Szene «Änderungen» 121.

## 1b. Marsch und Grenze (26.11.2026)
- **Marsch langsamer:** 4 s statt 2 s pro Zelle offenes Land (`G.LANG.march` = 40 Ticks). Schienen helfen weiter, aber weniger: in der Zelle der Schiene 0.3, eine daneben 0.5, zwei daneben 0.8 (klassisch 0.2 / 0.45 / 0.75, `G.LANG.rail`). Grosse Länder brauchen damit von selbst länger, um Truppen über weite Wege zu verlegen.
- **Dichte des Nachbarn nur an der Grenze:** Die dunklere Schattierung dichter Truppen zeigt ein fremdes Reich nur bis 2 Zellen (32 Felder) hinter der eigenen Grenze (`G.LANG.seeCells`), ebenso die Angabe «Truppen … × so dicht» beim Darüberfahren. Verbündete ganz. Nur Anzeige (`shadeScan` in `src/06_view.js`, `shadeNear`); tiefer sieht man mit Aufklärung (Paket 3).
- **Meldung «Truppen sammeln sich an deiner Grenze (X)»** (`langMass` in `src/04c_lang.js`): Alle 5 s misst die Simulation, wie dicht ein Nachbar entlang der gemeinsamen Grenze steht (1 = sein Schnitt). Gemeldet wird, wenn diese Dichte gegenüber dem dünnsten Moment der letzten Minute um mindestens 50 % steigt, über dem 1.5-Fachen seines Schnitts liegt und dort mindestens 3 % der eigenen Armee dazugekommen sind; dann 90 s Ruhe für diesen Nachbarn. Wachstum des ganzen Reichs zählt nicht, es hebt alle Zellen gleich. Nationen stehen gleichmässig und lösen sie darum nicht aus.
- Szene 122.

## 1c. Abnutzung bei Überdichte (26.11.2026)
- `langWear` in `src/04c_lang.js`, alle 5 s je Reich mit Netz. **Front** sind die eigenen Zellen, die an das Land eines Menschen oder einer Nation grenzen, mit der man nicht verbündet ist.
- Ab Minute 20 (`G.LANG.wearFrom`) verliert eine Frontzelle, die mehr als doppelt so dicht steht wie der Schnitt der eigenen Front (`wearOver`), 1 % des Überschusses pro Minute (`wear`):

  Verlust pro Minute = 0.01 · (1 − Versorgung) · (Truppen der Zelle − 2 · Frontschnitt).
- **Versorgung** 0 bis 1 (`langSupply`): Schiene in der Zelle 1, daneben 0.7, zwei daneben 0.3; eigene Stadt in derselben oder der Nachbarzelle 0.4 + 0.15 · Stufe (ab Stufe 4 voll), zwei Zellen weg die Hälfte; Hafen 0.6. Volle Versorgung heisst keine Abnutzung.
- Eine Meldung sagt es, höchstens alle 5 Minuten.
- Gleichmässige Dichte kostet nie etwas, ebenso alles bis zum Doppelten. Ein eigenes Versorgungsdepot kommt mit der Forschung (Ausbau «Infrastruktur», Paket 4).
- Szene 123 (dort gilt die Abnutzung sofort).

## 1d. Eingraben und Verteidigungsposten (26.11.2026)
- **Eingraben** (`digOf`, `digLose`): Jede Zelle eines Reichs mit Netz gräbt sich in 2 Minuten ein (`digTicks`), neues Land beginnt bei 0. Ganz eingegraben verliert ein Angreifer dort 3-mal so viele Truppen (1 + `digLoss` 2) und braucht 1.75-mal so lange (1 + `digTime` 0.75). Jedes verlorene Feld nimmt der Zelle 0.4 % davon (`digDrop`): Ein Durchbruch gräbt die Verteidigung auf.
- **Verteidigungsposten:** Radius 1.5-mal so gross (`postR`), Verluste des Angreifers × (5 + 3 · Stufe) statt × (3 + 2 · Stufe), Zeit × (1 + 3 · Stufe) statt × (1 + 2 · Stufe); ein Feld in seinem Umkreis zählt mindestens doppelt so dicht (`postDens`), auch wenn dort kaum Truppen stehen. Kosten wie bisher in Gold.
- Beim Darüberfahren über eigenes Land steht «eingegraben X %».
- **Gemessen** (`node test/kampf.js lang`, ganze Front mit allen Truppen gegen eine Nation mit 80K auf 3000 Feldern):

| Angreifer | frisch | eingegraben |
| --- | --- | --- |
| 1.5-fach | erobert | steckt bei 23 % |
| 2-fach | erobert | steckt bei 43 % |
| 2.5-fach | erobert | steckt bei 71 % |
| 3-fach | erobert | erobert |

  Erste Fassung (Verluste × 2, Zeit × 1.5, 2 % pro verlorenem Feld): eingegraben reichte schon das Doppelte, weil die breite Front jede Zelle schnell aufgrub.

## 1e. Zwei Flugabwehren (26.11.2026)
Im klassischen Spiel gibt jede Stufe einer Flugabwehr einen Abfangschuss mehr: Eine einzelne der Stufe 10 hält alles auf, verteilte der Stufe 1 bringen nichts. Im Modus gibt es darum zwei Arten (`samCan`, `samShotsOf`, `samReload` in `src/04c_lang.js`; im Spiel Flugabwehr mit `u.cls` 0 oder 1, auf der Seite die Nummer 4.5 für die Raketenabwehr wie 7.5 für das Schlachtschiff):

| | kleine Flugabwehr (Taste `6`) | Raketenabwehr (Taste `J`) |
| --- | --- | --- |
| trifft | Marschflugkörper (später Flugzeuge, Kurzstreckenraketen) | Atombombe, Wasserstoffbombe, MIRV-Sprengköpfe |
| Schüsse pro Salve | 2 pro Stufe (`samShots`) | 1 + ⌊Stufe / 4⌋: Stufe 1: 1, 4: 2, 8: 3, 10: 3 |
| Nachladen | 9 s | 9 s · 8 / (Stufe + 7): Stufe 1: 9 s, 10: 4.2 s |
| Reichweite | wie bisher mit der Stufe, × 0.5 (1a) | ebenso |
| Preis | wie bisher | × 1.5 (`abmCost`), teilt die Preisleiter mit der kleinen |

- **Abnehmender Schutz:** Steht eine eigene Flugabwehr derselben Art schon in Reichweite, lädt die neuere halb so schnell nach, bei zwei älteren ein Viertel so schnell und so weiter (`abmStack` 0.5). Gerechnet nur, wenn eine gebaut, zerstört oder erobert wird (`samSig`).
- Die kleine schiesst auf Bomber später nur auf das Flugzeug, nicht auf seine Bomben (kommt mit Paket 5).
- Bauleiste: Die Zahl auf der Flugabwehr zeigt die Abwehrschüsse dieser Art zusammen. Auf der Karte ist die Raketenabwehr ein Sechseck mit zwei Raketen, die kleine bleibt die Raute.
- Nationen bauen im Modus zuerst eine Raketenabwehr, dann eine kleine.
- Szene 124.

## Geplant für Paket 1 (abgesprochen 26.11.2026, noch nicht gebaut)
- **1f Evakuieren und Schutzräume:** Bombe auf eine Stadt nimmt ihr Stufen (Sprengkopf ¼, Atombombe ½, Wasserstoffbombe alle, mindestens eine), ihre Bevölkerung (ihr Anteil am Truppen-Limit, so voll wie das Land) stirbt. Evakuiert sterben nur 33 % der Bevölkerung der neuen Stufe; dafür wächst die Stadt 60 s nicht, danach kommt ihr Wachstum über 3 Minuten langsam zurück. Schutzräume (Ausbau der Stadt) halbieren verlorene Stufen und Tote.
