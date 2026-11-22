# Zwei Kampfsysteme: Grenzland und Feste Grenzen (22.11.2026)
Auf dem Startbildschirm unter «Kampfsystem». Im Mehrspieler gilt die Wahl des Hosts. Option `opts.kampf` (`'grenzland'` oder `'grenzen'`), Code in `src/03_game.js` (Konstruktor, `this.crowd`). Ohne `kampf` (nur in Tests) entscheiden die einzelnen Schalter (`aufstellung`, `netz`, `punkt`, `kessel`, `schwung`, `crowd`).

| | Grenzland | Feste Grenzen |
| --- | --- | --- |
| Verteidigung | Netz von Hand (Taste N), Eingraben, Reserven, Kessel halten 30 s | kein Netz: deine Truppen stehen gleichmässig; Kessel fallen sofort |
| Bremse für schmale Angriffe | Schwung: sinkt mit Tiefe und Widerstand, Vorbereitung gibt mehr (`doku/testschalter.md`) | höchstens 2 Angreifer pro Verteidiger (`G.THRUST.crowd`), der Rest ist Nachschub |
| Angriffsarten | ganze Front, Keil, Abschnitt | ganze Front, Keil, Abschnitt, Richtung |
| Truppen eines Angriffs | aus dem ganzen Land | aus dem ganzen Land |

**Gemeinsam:** Kampf am Ort (`G.COMBAT`), langsame Spitze und Flankenkosten der Stösse, die durchgespielte Vorschau. Dazu die Schalter für beide: «Angriffe planen» (Pfeile planen, dann «Angreifen»), «Bahn: Lieferungen», «Häfen nach Stufe».

**Nationen:** In beiden Systemen setzen Nationen ihre Aufstellung selbst (dichter an bedrohten Grenzen), so wie «Feste Grenzen» zuletzt abgestimmt wurde (Netz aus, Aufstellung an).

**Richtungsangriff** (nur Feste Grenzen, `doku/pfeile.md`): kein Ziel und kein Weg, ein Stück der eigenen Grenze rückt in die gezogene Richtung vor, breit nach der Grösse des eigenen Landes. Der Abschnitt dagegen stösst auf ein Ziel, auf dem günstigsten Weg.

**Gemessen** (`node test/kampf.js systeme`, 400K gegen 100K mit 15 %):

| | ganze Front | Abschnitt | Keil |
| --- | --- | --- | --- |
| Grenzland | 545 Felder, 11 % des Wegs | 518 Felder, 29 % | 391 Felder, 60 % |
| Feste Grenzen | 557 Felder, 11 % | 558 Felder, 33 % | 460 Felder, 67 % |

40-Minuten-Runde nur mit Computer-Spielern (Weltkarte, `test/sim.js` mit `kampf`): Spitzenreiter nach 20 / 30 / 40 Minuten bei Grenzland 30 % / 53 % / 66 %, bei Festen Grenzen 29 % / 46 % / 61 %. Gleichlauf: `node test/det.js grenzland`, `node test/det.js grenzen`.
