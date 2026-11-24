# Schalter «Netz», «Punktangriff» und «Angriffspfeile planen» (17.11.2026)
**Seit 22.11.2026** wählt der Startbildschirm statt dieser Schalter ein Kampfsystem (`doku/kampfsysteme.md`): «Grenzland» (Netz an, kein Richtungsangriff) oder «Feste Grenzen» (Netz aus, Richtungsangriff). «Angriffe planen» war ein Schalter für beide; **seit 24.11.2026** ist es immer an. Die Regeln unten gelten weiter.
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

## Richtungsangriff (`opts.punkt`, 18.11.2026 statt des Punktangriffs)
- Dritte Angriffsart neben Keil und Abschnitt: Knopf «Richtung» bei «Rechts ziehen», Taste F wechselt Keil → Abschnitt → Richtung.
- Mit der rechten Maustaste in eine Richtung ziehen: statt der ganzen Front greift nur der Teil an, der dorthin schaut. Er sieht aus wie die ganze Front und rückt wie sie vor, ohne Pfeil und ohne Ziel. Er bleibt in einem Band so breit wie ein Abschnitt (`dirFrom`: vom eigenen Grenzfeld, das der Stelle am nächsten liegt, in Richtung der Stelle; `at.spot`, `at.dx`, `at.dy`, halbe Breite `at.rad`). Weiter als eine Abschnittsbreite von der Grenze geht nicht.
- Ein zweiter Angriff in dieselbe Richtung vom selben Teil der Grenze verstärkt ihn. Zählt zu den höchstens 4 Stössen. Mit «Angriffspfeile planen» wird er zuerst geplant (Balken mit Pfeil und Nummer).

## Kein Blitzkrieg durch eine schmale Stelle (18.11.2026)
Ein schmaler Angriff (Keil, Abschnitt, Richtung) setzt höchstens `G.THRUST.crowd` (2) Angreifer pro Verteidiger ein, dem er gegenübersteht (`use` und die Grenze für `r` in `tickAttack`). Was darüber hinausgeht, wartet als Nachschub und rückt nach, macht den Angriff aber weder schneller noch billiger. Messbank (`node test/kampf.js Stoss`), 150K gegen 40K mit 20 %: ganze Front 273 Felder, Abschnitt 273, Keil 295. Der schmale Angriff kommt tiefer, nimmt aber nicht mehr Land als die Front. Ohne Truppenkonzentration (OpenFront-Formel) gilt die Grenze nicht; dort bremst schon die kurze Front.

## Pfeile weniger stark (17.11.2026)
Ein Keil nahm mit denselben Truppen so viel oder mehr Land als die ganze Front und war in 4 bis 7 s am Ziel (`node test/kampf.js Stoss`). Jetzt `G.THRUST.speed` 0.5 (vorher 1.4: die Spitze ist langsamer) und `G.THRUST.flank` 3 (vorher 1: je tiefer, desto mehr Verteidiger an den Seiten). Messbank: 150K gegen 40K mit 20 %: Keil 79 % des Wegs, 350 Felder (Front 347); 400K gegen 100K mit 15 %: Keil 78 % des Wegs, 569 Felder (vorher 1785; Front 812). Der Keil kommt tief, nimmt aber nicht mehr Land als die Front.

## Angriffspfeile planen (`opts.pfeile`)
- **Planen:** Mit der rechten Maustaste vom eigenen Land ins Feindesland ziehen. Der Pfeil bleibt blass und nummeriert, es passiert noch nichts. Mehrere ins gleiche Gebiet, höchstens `G.THRUST.max` (4) samt laufenden. `F` wechselt Keil und Abschnitt.
- **Starten:** Knopf «Angreifen» unter dem Regler oder Enter. Der Anteil auf dem Regler wird gleichmässig verteilt (jeder Befehl nimmt `ratio/n / (1 − ratio·i/n)` vom Rest).
- **Wegnehmen:** Klick auf einen geplanten Pfeil, oder Rücktaste für den letzten.
- **Während des Angriffs:** Klick auf einen laufenden Pfeil: «Verstärken» oder «Zurückziehen».
- **Handy:** Mit Keil oder Abschnitt plant ein Tippen auf ein Land einen Pfeil.
- Ein Linksklick auf Feindesland (bis 23.11.2026 ein Doppelklick) und das Kreismenü greifen wie bisher sofort mit der ganzen Front an.

Test: `node test/pfeile.js`.

## Richtungsangriff proportional zur Landesgrösse (20.11.2026)
Die Breite des Bandes war fest (halber Abschnitt) und passte nicht zur Grösse des eigenen Landes. Jetzt ist die Bandbreite `G.THRUST.dirShare` (0.6) mal die Seite eines Quadrats mit der Fläche des Landes (`sqrt(tiles)`), mindestens halbe Breite 4. Ein kleines Land greift schmal an, ein grosses breit. Die Reichweite zum Klicken bleibt mindestens ein Abschnitt (`dirFrom`).

## Keil und Richtung natürlicher (20.11.2026, Abend)
- **Keil am Ziel:** Nach dem Fall des Ziels lief der Keil vorher ohne Gasse weiter und griff die ganze Grenze an (er «breitete sich komplett aus»). Jetzt bleibt er in seiner Gasse und nimmt nur noch einen Ring um das Ziel (Radius `G.THRUST.hold` (1.5) mal seine Breite); danach kommen die übrigen Truppen heim.
- **Keil kommt voran:** Die Flanken zählten mit jedem Feld Tiefe weiter (`flank` 3 × 2 × Tiefe), nach 30 Feldern kämpfte der Keil gegen über 200 Felder Verteidiger und kroch, während die Truppen wegschmolzen. Jetzt zählt die Tiefe höchstens `G.THRUST.deep` (4) Breiten. Messbank `Stoss`: der Keil kommt etwas tiefer (150K/40K/20 %: 62 % des Wegs, 298 Felder; Front 273), nimmt aber weiterhin kaum mehr Land als die Front.
- **Richtung als Fächer:** Statt eines geraden Bandes (sah aus wie ein Rechteck) öffnet sich der Angriff nach vorne (`G.THRUST.fan` 0.45 Felder seitlich pro Feld vorwärts, Start bei 0.6 × halbe Breite), die Mitte führt (`G.THRUST.nose`, runde Spitze), und der Rand ist unregelmässig (fester Hash pro Feld, auf jedem Gerät gleich).
- Bekannt: Die Prüfung «Reserven bremsen den Keil» in `kampf.js abwehr` war schon vorher knapp (231 gegen 230 Felder) und kippt jetzt (259 gegen 265); die Reserven wirken in diesem Szenario kaum.
