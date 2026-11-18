# Schalter «Netz» und «Angriffspfeile planen» (17.11.2026)
Auf dem Startbildschirm zwei Schalter, je an oder aus (Vorgabe: beide an). Im Mehrspieler gilt die Wahl des Hosts für alle. So gibt es alle Kombinationen:

| Netz | Pfeile planen | Spiel |
| --- | --- | --- |
| aus | aus | ganz ohne: Truppen stehen gleichmässig, Pfeil greift sofort an |
| an | aus | wie bisher: Netz von Hand (Taste N, `doku/aufstellung.md`), Pfeil greift sofort an |
| aus | an | Pfeile planen, Truppen gleichmässig |
| an | an | Pfeile planen und Netz |

## Truppenkonzentration (`opts.aufstellung`, Vorgabe an)
Aus: wie OpenFront, keine Aufstellung für Menschen und Nationen, alle Truppen ein Topf, Kampf nach der OpenFront-Formel (`doku/openfront-abgleich.md`). Das Netz gibt es dann nicht.

## Netz (`opts.netz`, Vorgabe an)
Aus: der Knopf und die Taste N fehlen, der Befehl `mesh` gibt «Nicht möglich». Die Truppen eines Menschen stehen gleichmässig. Eingraben, Reserven und Kessel gelten weiter. Die Sammelpunkte mit Fahne (16.11.2026) sind wieder entfernt.

## Angriffspfeile planen (`opts.pfeile`)
- **Planen:** Mit der rechten Maustaste vom eigenen Land ins Feindesland ziehen. Der Pfeil bleibt blass und nummeriert, es passiert noch nichts. Mehrere ins gleiche Gebiet, höchstens `G.THRUST.max` (4) samt laufenden. `F` wechselt Keil und Abschnitt.
- **Starten:** Knopf «Angreifen» unter dem Regler oder Enter. Der Anteil auf dem Regler wird gleichmässig verteilt (jeder Befehl nimmt `ratio/n / (1 − ratio·i/n)` vom Rest).
- **Wegnehmen:** Klick auf einen geplanten Pfeil, oder Rücktaste für den letzten.
- **Während des Angriffs:** Klick auf einen laufenden Pfeil: «Verstärken» oder «Zurückziehen».
- **Handy:** Mit Keil oder Abschnitt plant ein Tippen auf ein Land einen Pfeil.
- Doppelklick auf Feindesland und das Kreismenü greifen wie bisher sofort mit der ganzen Front an.

Test: `node test/pfeile.js`.
