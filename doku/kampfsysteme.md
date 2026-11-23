# Zwei Kampfsysteme: Grenzland und Feste Grenzen (22.11.2026)
Auf dem Startbildschirm unter «Kampfsystem». Im Mehrspieler gilt die Wahl des Hosts. Option `opts.kampf` (`'grenzland'` oder `'grenzen'`), Code in `src/03_game.js` (Konstruktor, `this.crowd`). Ohne `kampf` (nur in Tests) entscheiden die einzelnen Schalter (`aufstellung`, `netz`, `punkt`, `kessel`, `schwung`, `crowd`).

| | Grenzland | Feste Grenzen |
| --- | --- | --- |
| Verteidigung | Netz von Hand (Taste N): dort langsamer, aber es fallen auch mehr; dunkleres Land; Kessel halten 30 s | kein Netz: deine Truppen stehen gleichmässig; Kessel fallen sofort |
| Bremse für schmale Angriffe | Schwung (nur schmale Angriffe, die ganze Front hat keinen): sinkt mit Tiefe und Widerstand, Vorbereitung gibt mehr (`doku/testschalter.md`) | keine eigene (bis 23.11.2026 höchstens 2 Angreifer pro Verteidiger); die Spitze eines Stosses ist in beiden Systemen gleich schnell |
| Angriffsarten | ganze Front, Keil, Abschnitt | ganze Front, Keil, Abschnitt, Richtung |
| Truppen eines Angriffs | aus dem ganzen Land | aus dem ganzen Land |

**Gemeinsam:** seit 23.11.2026 OpenFronts Kampfformel mit der Dichte obendrauf (`tileLoss`, `doku/aufstellung.md`), die langsame Spitze der Stösse, die durchgespielte Vorschau. Dazu die Schalter für beide: «Angriffe planen» (Pfeile planen, dann «Angreifen»), «Bahn: Lieferungen», «Häfen nach Stufe».

**Nationen:** In beiden Systemen setzen Nationen ihre Aufstellung selbst (dichter an bedrohten Grenzen), so wie «Feste Grenzen» zuletzt abgestimmt wurde (Netz aus, Aufstellung an).

**Richtungsangriff** (nur Feste Grenzen, `doku/pfeile.md`): kein Ziel und kein Weg, ein Stück der eigenen Grenze rückt in die gezogene Richtung vor, breit nach der Grösse des eigenen Landes. Der Abschnitt dagegen stösst auf ein Ziel, auf dem günstigsten Weg.

**Gemessen** (`node test/kampf.js systeme`, 400K gegen 100K mit 15 %):

| | ganze Front | Abschnitt | Keil |
| --- | --- | --- | --- |
| Grenzland | 484 Felder, 9 % des Wegs | 401 Felder, 27 % | 238 Felder, 33 % |
| Feste Grenzen | 508 Felder, 9 % | 479 Felder, 27 % | 365 Felder, 55 % |

40-Minuten-Runde nur mit Computer-Spielern (Weltkarte, `test/sim.js` mit `kampf`): Spitzenreiter nach 20 / 30 / 40 Minuten bei Grenzland 20 % / 33 % / 41 %, bei Festen Grenzen 16 % / 29 % / 46 % (Stand 23.11.2026, nach der neuen Kampfformel).

**Kampfformel seit 23.11.2026** (beide Systeme, zweite Fassung): Jeder Angriff rechnet mit OpenFronts Formel; dazu kommt nur die Dichte der Zelle (Zeit × Dichte, Preis × √Dichte, höchstens dreimal der Schnitt; wer dort steht, fällt mit). Die Armee des Verteidigers zählt gegen den Angriff (wie OpenFront); Nationen stehen gleichmässig. Kein Eingraben, keine Reserven, keine Grenze von 2 Angreifern pro Verteidiger mehr (die machte einen Keil in «Feste Grenzen» doppelt so teuer und langsam). Gemessen (`node test/kampf.js echt`): mit 100 % gegen eine Nation, die seit 2 Minuten steht, 1062 bis 1116 Felder (OpenFront 1147); `dicht`: 60K gegen 30K nehmen gegen gleichmässige Verteidiger 83 %, gegen alles an der Grenze 68 % in 10 statt 6 s, und dem Verteidiger bleibt weniger übrig (3.4K statt 5.1K).

**Was es heisst** (50K gegen eine Nation mit 30K, die seit 2 Minuten steht, ganze Front, von 2000 Feldern): mit 100 % nimmt Grenzland 617, Feste Grenzen 745, OpenFront 1147 Felder; mit 20 % (10K) 55, 55 und 89. Mit wenig gegen eine grosse Armee kostet jedes Feld bis doppelt (wie in OpenFront); die Leiste warnt dann «schicke mehr». Gleichlauf: `node test/det.js grenzland`, `node test/det.js grenzen`.
