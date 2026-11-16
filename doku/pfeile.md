# Version «Pfeile» (16.11.2026)
Auf dem Startbildschirm unter «Kampf» gibt es zwei Versionen. Im Mehrspieler gilt die Wahl des Hosts für alle. Option `opts.pfeile` (Vorgabe in der Bedienung: an).

| | Bisher | Pfeile |
| --- | --- | --- |
| Angriff | Pfeil mit rechter Maustaste greift sofort an | Pfeile planen, dann gemeinsam starten |
| Verteidigung | Netz von Hand malen (Taste N, `doku/aufstellung.md`) | bis zu 3 Sammelpunkte per Doppelklick |
| Truppen sehen | nur im Netz-Modus deutlich | immer: Färbung des eigenen Landes und Zahlen an der Grenze |

## Angriff
- **Planen:** Mit der rechten Maustaste vom eigenen Land ins Feindesland ziehen. Der Pfeil bleibt blass und nummeriert auf der Karte, es passiert noch nichts. Mehrere Pfeile ins gleiche Gebiet sind möglich, höchstens `G.THRUST.max` (4) samt laufenden. `F` wechselt Keil und Abschnitt.
- **Starten:** Knopf «Angreifen» unter dem Regler oder Enter. Der Anteil auf dem Regler wird gleichmässig auf alle Pfeile verteilt (jeder Befehl nimmt `ratio/n / (1 − ratio·i/n)` vom Rest, so bekommt jeder gleich viel).
- **Wegnehmen:** Klick auf einen geplanten Pfeil, oder Rücktaste für den letzten.
- **Während des Angriffs:** Klick auf einen laufenden Pfeil öffnet «Verstärken» (schickt den Anteil auf dem Regler nach) und «Zurückziehen».
- **Handy:** Mit Keil oder Abschnitt auf dem Schalter plant ein Tippen auf ein Land einen Pfeil (Weg vom nächsten eigenen Rand). Mit «Ganze Front» greift Tippen sofort an.
- Doppelklick auf Feindesland und das Kreismenü greifen wie bisher sofort mit der ganzen Front an.

## Verteidigung: Sammelpunkte
- **Doppelklick aufs eigene Land** (Handy: Kreismenü, Knopf «Sammeln») setzt einen Sammelpunkt. Die Truppen ziehen dorthin (Marsch wie beim Netz) und stehen im Umkreis von 4 Zellen dicht: Gewicht `0.4 + 5.6 × (1 − Abstand/4)`, ausserhalb 0.4. Ein Doppelklick auf einen Punkt (1,5 Zellen) nimmt ihn weg. Ein vierter verdrängt den ältesten. Ohne Punkt stehen die Truppen gleichmässig.
- Befehl `{k:'rally', t:Feld}`, Regeln `postRally`, `postRallyAuto` in `src/03b_posture.js`; Zustand `p.post.rally`. Fällt das Land unter einem Punkt, fällt der Punkt.
- Wirkt nur auf die Verteidigung: Pfeile nehmen ihre Truppen aus dem ganzen Land. Eingraben, Reserven bei Alarm und Kessel gelten wie in `doku/aufstellung.md`. Das Netz malen (`mesh`) ist in dieser Version aus.
- **Sichtbar:** Das eigene Land ist rot getönt, wo viele Truppen stehen, und dunkel, wo wenige stehen (immer, nicht nur im Netz-Modus). Nah herangezoomt steht an jeder Grenzzelle die Zahl der Truppen. Sammelpunkte zeigen eine gelbe Fahne und ihren Kreis (`drawRally` in `src/06_view.js`).

Test: `node test/pfeile.js`.
