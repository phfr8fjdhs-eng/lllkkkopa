# Kampfsysteme (16.11.2026)
Zum Ausprobieren gibt es fünf Arten, wie Truppen stehen und wie man angreift. Gewählt wird auf dem Startbildschirm unter «Kampfsystem»; im Mehrspieler gilt die Wahl des Hosts für alle. Option `opts.kampf` (1–5), Vorgabe 5. Code: `src/03_game.js` (`this.kampf`, `exec`), `src/03b_posture.js` (`postAuto`, `postStance`, `postFlag`), Bedienung `src/07_ui.js` (`KAMPF`, `kampfUi`, `setFlag`), Fahnen zeichnen `src/06_view.js` (`drawFlags`).

| Nr. | Name | Netz | Angriff |
| --- | --- | --- | --- |
| 1 | Klassisch | keins, für niemanden (wie OpenFront) | nur ganze Front; Rechts ziehen und Taste F sind aus |
| 2 | Auto | stellt sich selbst, alle 5 s | wie gewohnt; dazu Haltung Angriff, Ausgeglichen, Verteidigung |
| 3 | Fahnen | bis zu 3 Sammelpunkte | wie gewohnt; Truppen stehen an den Fahnen |
| 4 | Pfeile | keins, für niemanden (kein Eingraben, keine Reserven, keine Kessel) | gegen Nationen und Spieler immer Keil oder Abschnitt; gegen Bots und freies Land auch ganze Front |
| 5 | Netz | von Hand malen (bisheriges Spiel, `doku/aufstellung.md`) | wie gewohnt |

- **Dichte wirkt nur in der Verteidigung:** Seit 16.11.2026 nimmt jeder Angriff seine Truppen sofort aus dem ganzen Land (`doku/aenderungen.md`, «Abfang, Schiffe, Stoss»). Netz, Haltung und Fahnen entscheiden also, wo man schwer zu knacken ist.
- **Nationen:** In 2, 3 und 5 stellen sie ihr Netz wie bisher selbst (`postAuto`, Haltung «Ausgeglichen»). In 1 und 4 haben sie keins, damit alle gleich behandelt werden.
- **Haltung (System 2)**, Befehl `{k:'stance', v:0|1|2}`, Knöpfe unter dem Angriffsregler:
  - Angriff: dicht an Grenzen zu schwächeren Nachbarn (Gewicht 1 + Stärkeverhältnis/1.5, Bots 60 %), Einbruchstellen eigener Stösse 4, Nachbarzellen 3, damit das geöffnete Land gehalten wird, Hinterland 0.6.
  - Ausgeglichen: wie die Nationen (Grenze 1 + Bedrohung, Hinterland 0.7).
  - Verteidigung: Grenze 1 + 2 × Bedrohung (bis 5), Hinterland 0.5.
- **Fahnen (System 3)**, Befehl `{k:'flag', t:Feld}`, Knopf mit der Fahne oben (Taste N): Tippen aufs eigene Land setzt eine Fahne, Tippen nahe einer Fahne (1.5 Zellen) nimmt sie weg; eine vierte verdrängt die älteste. Gewicht pro Zelle 0.5 + 5.5 × (1 − Abstand/4 Zellen), ohne Fahne überall 1. Fällt das Land unter einer Fahne, fällt die Fahne. Beim Setzen zeigt ein gelber Kreis den Sammelbereich.
- **Was gleich bleibt:** Eingraben, Reserven bei Alarm und Kessel gelten in 2, 3 und 5 wie beschrieben in `doku/aufstellung.md`.
- Test: `node test/kampfsysteme.js` (wer ein Netz hat, Haltung, Fahnen, Form des Angriffs, Gleichlauf in allen fünf).
