# Zwei Kampfsysteme: Grenzland und Feste Grenzen (22.11.2026)
Auf dem Startbildschirm unter «Kampfsystem». Im Mehrspieler gilt die Wahl des Hosts. Option `opts.kampf` (`'grenzland'` oder `'grenzen'`), Code in `src/03_game.js` (Konstruktor, `this.crowd`). Ohne `kampf` (nur in Tests) entscheiden die einzelnen Schalter (`aufstellung`, `netz`, `punkt`, `kessel`, `schwung`, `crowd`).

| | Grenzland | Feste Grenzen |
| --- | --- | --- |
| Verteidigung | Netz von Hand (Taste N), Eingraben, Reserven, Kessel halten 30 s | kein Netz: deine Truppen stehen gleichmässig; Kessel fallen sofort |
| Bremse für schmale Angriffe | Schwung (nur schmale Angriffe, die ganze Front hat keinen): sinkt mit Tiefe und Widerstand, Vorbereitung gibt mehr (`doku/testschalter.md`) | höchstens 2 Angreifer pro Verteidiger (`G.THRUST.crowd`), der Rest ist Nachschub |
| Angriffsarten | ganze Front, Keil, Abschnitt | ganze Front, Keil, Abschnitt, Richtung |
| Truppen eines Angriffs | aus dem ganzen Land | aus dem ganzen Land |

**Gemeinsam:** Kampf am Ort (`G.COMBAT`), langsame Spitze und Flankenkosten der Stösse, die durchgespielte Vorschau. Dazu die Schalter für beide: «Angriffe planen» (Pfeile planen, dann «Angreifen»), «Bahn: Lieferungen», «Häfen nach Stufe».

**Nationen:** In beiden Systemen setzen Nationen ihre Aufstellung selbst (dichter an bedrohten Grenzen), so wie «Feste Grenzen» zuletzt abgestimmt wurde (Netz aus, Aufstellung an).

**Richtungsangriff** (nur Feste Grenzen, `doku/pfeile.md`): kein Ziel und kein Weg, ein Stück der eigenen Grenze rückt in die gezogene Richtung vor, breit nach der Grösse des eigenen Landes. Der Abschnitt dagegen stösst auf ein Ziel, auf dem günstigsten Weg.

**Gemessen** (`node test/kampf.js systeme`, 400K gegen 100K mit 15 %):

| | ganze Front | Abschnitt | Keil |
| --- | --- | --- | --- |
| Grenzland | 484 Felder, 9 % des Wegs | 401 Felder, 27 % | 238 Felder, 33 % |
| Feste Grenzen | 508 Felder, 9 % | 479 Felder, 27 % | 365 Felder, 55 % |

40-Minuten-Runde nur mit Computer-Spielern (Weltkarte, `test/sim.js` mit `kampf`): Spitzenreiter nach 20 / 30 / 40 Minuten bei Grenzland 20 % / 33 % / 41 %, bei Festen Grenzen 16 % / 29 % / 46 % (Stand 23.11.2026, nach der neuen Kampfformel).

**Kampfformel seit 23.11.2026** (beide Systeme): Ein Feld kostet OpenFronts Preis für die Truppen, die wirklich darauf stehen, und diese fallen mit dem Feld; mindestens so viel wie freies Land. Bei gleichmässig stehenden, frischen Verteidigern ist der Kampf genau OpenFront (gemessen: 50K gegen 30K, 1142 statt 1147 Felder). Dazu nur noch Eingraben (höchstens +25 %, nach 2 Minuten zwei Drittel) und abgeschnittene Zellen. Vorher kamen 16 Truppen pro Feld obendrauf, dichter Boden verlor weniger als darauf stand, und Eingraben gab bis +50 % nach einer Minute: Gegen eine Nation, die zwei Minuten an ihrer Grenze stand, verlor ein Angreifer fast viermal so viel wie der Verteidiger. In Levels gibt es keinen Schwung (ein Lern-Level verlangt einen Keil 230 Felder tief).

**Was es heisst** (50K gegen eine Nation mit 30K, die seit 2 Minuten steht, ganze Front, von 2000 Feldern): mit 100 % nimmt Grenzland 617, Feste Grenzen 745, OpenFront 1147 Felder; mit 20 % (10K) 55, 55 und 89. Mit wenig gegen eine grosse Armee kostet jedes Feld bis doppelt (wie in OpenFront); die Leiste warnt dann «schicke mehr». Gleichlauf: `node test/det.js grenzland`, `node test/det.js grenzen`.
