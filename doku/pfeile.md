# Schalter «Netz», «Punktangriff» und «Angriffspfeile planen» (17.11.2026)
Auf dem Startbildschirm drei Schalter, je an oder aus (Vorgabe: alle an), frei kombinierbar. Im Mehrspieler gilt die Wahl des Hosts für alle. Netz und Pfeile planen:

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

## Punktangriff (`opts.punkt`)
- Dritte Angriffsart neben Keil und Abschnitt: Knopf «Punkt» bei «Rechts ziehen», Taste F wechselt Keil → Abschnitt → Punkt. Daneben bleibt die ganze Front (Doppelklick, Kreismenü, Handy «Ganze Front»).
- Mit der rechten Maustaste auf eine Stelle im Feindesland ziehen: die Truppen vom Regler greifen nur rund um diese Stelle an, die nächsten Felder zuerst, ohne Weg wie beim Pfeil. Der Ring reicht so weit wie die Stelle von der eigenen Grenze entfernt ist plus die Breite eines Keils (`spotRadius`); weiter als zwei Keilbreiten von der Grenze geht nicht. Ist der Ring erobert oder die Kraft aufgebraucht, kommt der Rest zurück.
- Befehl `{k:'strike', w:3}` (`attack` mit `mode` 3, Zustand `at.spot`, `at.rad`). Zählt wie ein Pfeil zu den höchstens 4. Flanken wie beim Keil. Klick auf den Ring: verstärken oder zurückziehen. Mit «Angriffspfeile planen» wird auch der Punkt erst geplant (Kreis mit Nummer).

## Pfeile weniger stark (17.11.2026)
Ein Keil nahm mit denselben Truppen so viel oder mehr Land als die ganze Front und war in 4 bis 7 s am Ziel (`node test/kampf.js Stoss`). Jetzt `G.THRUST.speed` 0.5 (vorher 1.4: die Spitze ist langsamer) und `G.THRUST.flank` 3 (vorher 1: je tiefer, desto mehr Verteidiger an den Seiten). Messbank: 150K gegen 40K mit 20 %: Keil 79 % des Wegs, 350 Felder (Front 347); 400K gegen 100K mit 15 %: Keil 78 % des Wegs, 569 Felder (vorher 1785; Front 812). Der Keil kommt tief, nimmt aber nicht mehr Land als die Front.

## Angriffspfeile planen (`opts.pfeile`)
- **Planen:** Mit der rechten Maustaste vom eigenen Land ins Feindesland ziehen. Der Pfeil bleibt blass und nummeriert, es passiert noch nichts. Mehrere ins gleiche Gebiet, höchstens `G.THRUST.max` (4) samt laufenden. `F` wechselt Keil und Abschnitt.
- **Starten:** Knopf «Angreifen» unter dem Regler oder Enter. Der Anteil auf dem Regler wird gleichmässig verteilt (jeder Befehl nimmt `ratio/n / (1 − ratio·i/n)` vom Rest).
- **Wegnehmen:** Klick auf einen geplanten Pfeil, oder Rücktaste für den letzten.
- **Während des Angriffs:** Klick auf einen laufenden Pfeil: «Verstärken» oder «Zurückziehen».
- **Handy:** Mit Keil oder Abschnitt plant ein Tippen auf ein Land einen Pfeil.
- Doppelklick auf Feindesland und das Kreismenü greifen wie bisher sofort mit der ganzen Front an.

Test: `node test/pfeile.js`.
