# Änderungsprotokoll
Was seit dem 13.11.2026 geändert wurde und warum. Den heutigen Stand der Regeln beschreiben die anderen Dateien in `doku/`.

## MIRV mit etwas mehr Sprengköpfen (19.11.2026)
Die Sprengköpfe decken rund ein Drittel statt ein Viertel des Ziellandes ab, und es sind mindestens 6 statt 4. Erde: Land mit 13 000 Feldern 6 statt 5, mit 50 000 Feldern 23 statt 18, mit 140 000 Feldern 63 statt 48 Sprengköpfe. Wunsch des Besitzers: die MIRV warf zu wenige.
- Die Nationen werfen jetzt ganz selten eine MIRV, nur spät im Spiel (ab 30 Minuten, höchstens eine alle 10 Minuten für alle zusammen), auf eine der drei grössten Nationen. Vorher warfen sie gar keine. Siehe `doku/openfront-abgleich.md`.

## Bomben und Bau-Vorschau in 3D (20.11.2026)
In der Nahansicht steigen nach Atom-, Wasserstoffbomben und Sprengköpfen Pilzwolken auf, der Boden bleibt versengt, zerstörte Gebäude hinterlassen Trümmer, Marschflugkörper Feuer und Rauch. Raketen im Flug sind grösser. Die Bau-Vorschau zeigt das Gebäude als durchscheinendes Modell. Nur Bild. Siehe `doku/nahansicht.md`.

## 3D-Nahansicht beim normalen Spielen, viel grösser (20.11.2026)
Rückmeldung des Besitzers: viel zu klein, die Hälfte sieht man gar nicht. Grund: die Nahansicht begann erst bei Zoom 7, die Kamera stellt sich nach dem Start aber auf 5,6 bis 6. Jetzt ab 2,5. Gebäude doppelt so gross, Panzer grösser und weiter draussen in Gruppen, Städte unter Stufe 5 als Ortschaften mit Häusern und Kirche, Relief aus den Höhendaten, Schiffe, Boote und Züge als Modelle, Lichtreflexe auf dem Meer, Antippen der Modelle öffnet die Ausbaukarte. Weiter draussen nur die Panzer, die einen betreffen. Auf dem Handy verdecken Tempo und Meldungen weniger. Siehe `doku/nahansicht.md`.

## 3D-Nahansicht und Wachstumstempo (19.11.2026)
Wunsch des Besitzers: das Spiel soll sich realistischer anfühlen, nach Aufbau und nach Krieg, und man soll spüren, ob man schneller wächst als die anderen. Ab 7 Pixel pro Feld zeigt die Karte 3D-Modelle statt Zeichen: Städte wachsen mit der Stufe vom Dorf zur Hochhausstadt, Fabriken rauchen, Truppen stehen als Panzer (die eigenen nach dem Netz, die anderen gleichmässig), Angriffe sind feuernde Panzerreihen, umkämpftes Land hat Krater, eingegrabene Grenzen Sandsäcke, dazu Wald, Felsen und Gipfel. Nur Bild, die Simulation bleibt unberührt. Unter der Rangliste neu: dein Landgewinn der letzten Minute gegen den Schnellsten der anderen. Taste `J` oder Menü schaltet die Nahansicht aus. Siehe `doku/nahansicht.md`.

## Bomben kosten etwas weniger Truppen (18.11.2026)
Ein getroffenes Feld kostet 3 statt 5 Felder an Durchschnittstruppen. Atombombe auf Angola: 33 % statt 49 % der Truppen. Siehe `doku/openfront-abgleich.md`.

## Richtungsangriff statt Punktangriff, kein Blitzkrieg (18.11.2026)
- Der Punktangriff (Ring) war komisch. Jetzt greift statt der ganzen Front nur der Teil an, der in die gezogene Richtung schaut, und sieht aus wie die ganze Front.
- Schmale Angriffe setzen höchstens 2 Angreifer pro gegenüberstehenden Verteidiger ein; der Rest ist Nachschub. So überrennt man niemanden mehr an einer Stelle. Messwerte in `doku/pfeile.md`.

## Rohstoffe: alles auf einmal ausbauen (18.11.2026)
Knöpfe «Alles eine Stufe höher», «Alle +1» pro Rohstoff und «Alle Fabriken eine Stufe höher» in der Tabelle; grosse Listen eingeklappt. Wunsch des Besitzers: einzeln leveln war mit einem grossen Land zu mühsam. Siehe `doku/rohstoffe.md`.

## Erde: keine Inseln unter 100 Feldern mehr (18.11.2026)
`G.MIN_ISLAND` 100 statt 80, und die Ausnahme für Inseln mit einer Nation fällt weg (Wunsch des Besitzers: alle Inseln unter 100 raus). 30 Landmassen weniger; Mauritius, Komoren, Salomonen, Kap Verde, Malediven, Malta und Bahamas spielen nicht mehr mit.
## Schalter «Truppenkonzentration» (18.11.2026)
Neuer Schalter auf dem Startbildschirm. Aus: wie früher und wie OpenFront, keine Truppenverteilung, alle Truppen ein Topf, Bodenkampf nach der Formel aus dem OpenFront-Quellcode. Wunsch des Besitzers.

## Tarnturm: Ring nur beim Bauen oder nach einem Klick (18.11.2026)
Eigene Tarntürme zeigen ihren Bereich (gestrichelter türkiser Ring) und die Gebäude, die sie verstecken (gestrichelter Kreis), nur solange man baut (Baukarte offen oder ein Gebäude am Mauszeiger) oder nachdem man auf den Turm geklickt hat. Sonst ist nichts zu sehen. `drawReach` in `src/06_view.js`, `view.showCloak`, `view.cloakTap`.

## Tarnturm im Arsenal-Modus (17.11.2026)
- **Wunsch des Besitzers:** ein Gebäude, das andere Gebäude unsichtbar macht; die anderen sehen sie erst, wenn sie nahe herankommen. Nicht zu teuer, Radius ganz klein (ein Turm soll etwa zwei, drei Gebäude decken), nur im Modus «Arsenal».
- **Geändert:** neuer Gebäudetyp `UT.CLOAK` (Regeln in `doku/spielregeln.md`). Damit Gebäude weiterhin die kleinsten Nummern haben, stehen alle Typen ab Kriegsschiff eine Nummer weiter hinten (`G.isStruct`). Erst war die Grenze nur der Umkreis; dicht gebaut hätte ein Turm so 11 Gebäude versteckt, darum höchstens die 3 nächsten.
- Neuer Test `node test/tarn.js`; `node test/det.js arsenal` prüft den Gleichlauf mit Tarntürmen.

## MIRV schwächer (17.11.2026)
- **Warum:** Der Besitzer fand den MIRV viel zu stark: zu viele Sprengköpfe, und die ganze Armee des Ziels ist danach weg.
- **Gemessen vorher:** Ein MIRV nahm 62–74 % des Landes und 99–100 % der Truppen (Welt, Nationen nach 4000 Ticks), mit 22–110 Sprengköpfen.
- **Geändert:** Die Anzahl Sprengköpfe richtet sich nach der Grösse des Ziels, sodass sie rund 25 % seines Landes abdecken (`G.MIRV_COVER`), höchstens 120·S² (vorher 350·S²), mindestens 4; sie liegen weiter auseinander. Ein getroffenes Feld kostet 1,5 statt 5 Felder an Truppen (`G.WARHEAD_KILL`); Atom- und Wasserstoffbombe bleiben wie in OpenFront.
- **Gemessen nachher:** 7–22 % des Landes und meist 20–35 % der Truppen (bis rund 50 %, wenn das Ziel gleichzeitig im Krieg steht), mit 7–34 Sprengköpfen.
## Inseln mit dem Boot, auch während eines Landangriffs (17.11.2026)
Ein Tipp auf eine Insel eines Gegners, die man nicht übers Land berührt, schickt jetzt ein Boot statt den Landangriff zu verstärken (Regel in `doku/spielregeln.md`). Wunsch des Besitzers. Test: `node test/insel.js`.

## Erde: weniger kleine Inseln (17.11.2026)
Inseln unter 80 Feldern werden beim Laden zu Meer, ausser eine Nation startet darauf (`G.MIN_ISLAND`, siehe `doku/erde.md`). Rund 910 von 1100 Inseln fallen weg. Zuerst 100 Feldern, auf Wunsch des Besitzers 80. Wunsch des Besitzers: viel zu viele zu kleine Inseln.

## Kleine Angriffe gegen grosse Armeen schwächer, Anzeige der Angriffsstärke (17.11.2026)
- **Warum:** Der Besitzer hatte den Eindruck, dass ein Angriff mit 5K gegen seine 30K locker durchkommt und viel Land nimmt.
- **Gemessen:** Ein einzelner Angriff mit 5K gegen 30K nahm vorher 4–9 % des Landes (mehr bei dünn besetzter Grenze), nicht ein Drittel. Was täuschte: Die Zahl bei «… greift an» ist, was vom Angriff noch übrig ist. In einem Testspiel griff die Türkei mit 158K an; angezeigt waren im Schnitt nur 68K.
- **Geändert:** Wie in OpenFront kostet ein Angriff, der viel kleiner ist als die ganze Armee des Verteidigers, mehr pro Feld (`G.COMBAT.army`, siehe `doku/openfront-abgleich.md`). Jetzt nehmen 5K gegen 30K 2–5 %. Alle anderen Kampf-Szenarien bleiben wie vorher.
- **Anzeige:** Beim Angriff auf dich steht jetzt auch, wie viele Truppen insgesamt geschickt wurden, z. B. «Türkei greift an · 68K (von 158K)».
- Neue Szenarien «schwach» in `test/kampf.js` (auch Nation gegen Mensch und mit dünner Grenze).

## Restdauer der Allianz beim Namen (17.11.2026)
Bei verbündeten Ländern steht hinter dem Namen auf der Karte, wie lange die Allianz noch läuft (z. B. «✓ 4:32»). Wunsch des Besitzers.

## Raketensilo teurer und langsamer (17.11.2026)
Ein Raketensilo kostet 3M statt 1M, jede Stufe ebenso. Nach jedem Abschuss lädt der Platz 27 s statt 9 s nach (`G.SILO_RELOAD`). Wunsch des Besitzers: beides dreimal so viel.
## Bomben der Nationen nicht mehr immer auf die Flugabwehr (17.11.2026)
Marschflugkörper auf die Flugabwehr seltener (1 von 5 statt 1 von 2), und jede dritte Bombe fällt irgendwo aufs Land. Siehe `doku/openfront-abgleich.md`.
## Punktangriff als dritter Schalter, Pfeile weniger stark (17.11.2026)
- Neuer Schalter «Punktangriff»: greift nur rund um eine Stelle an, ohne Weg wie beim Pfeil. Alle drei Schalter (Netz, Punktangriff, Pfeile planen) frei kombinierbar.
- Keil und Abschnitt langsamer und an den Flanken teurer: sie nahmen mit denselben Truppen mehr Land als die ganze Front und überrannten in Sekunden. Messwerte in `doku/pfeile.md`.

## Schiffe in der Farbe des Landes, weniger Atombomben (17.11.2026)
- Handelsschiffe haben den Rumpf in der Farbe des Besitzers (vorher weiss) und die Ladung in einem dunklen Ton davon; Kriegsschiffe das Deck im dunklen Ton (vorher grau). So erkennt man, wem ein Schiff gehört.
- Nationen werfen etwa halb so viele Atombomben (`G.NUKE_PAUSE`, `G.NUKE_VOLLEY`, siehe `doku/openfront-abgleich.md`).

## Schalter «Netz» und «Angriffspfeile planen», Fahne entfernt (17.11.2026)
Statt «Kampf: Bisher / Pfeile» zwei Schalter auf dem Startbildschirm. Die Sammelpunkte mit Fahne sind wieder entfernt (Wunsch des Besitzers: wirkte komisch). Netz aus heisst ganz ohne: Truppen gleichmässig, nichts einzustellen. So gibt es alle Kombinationen; Regeln in `doku/pfeile.md`.

## Pfeile: keine Truppenzahlen auf der Karte (16.11.2026)
Die Zahlen an den Grenzzellen waren zu viele. Wo die Truppen stehen, zeigt nur noch die Färbung des eigenen Landes.

## Zwei Versionen statt fünf: Bisher und Pfeile (16.11.2026)
- **Warum:** Die fünf Kampfsysteme zum Ausprobieren (Klassisch, Auto, Fahnen, Pfeile, Netz) sind wieder entfernt. Wunsch des Besitzers: nur noch das bisherige Spiel und eine neue Pfeil-Version; die Verteidigung soll einfacher sein und man soll immer sehen, wo die Truppen stehen.
- **Startbildschirm «Kampf»:** Bisher (Pfeil greift sofort an, Netz von Hand) oder Pfeile (Pfeile planen und mit «Angreifen» gemeinsam starten, Klick auf laufenden Pfeil verstärkt; Verteidigung mit bis zu drei Sammelpunkten per Doppelklick, Truppen immer sichtbar). Regeln in `doku/pfeile.md`, Test `node test/pfeile.js`.

## Alle Bots im selben hellen Grau (16.11.2026)
Bot-Land hatte verschiedene Grautöne; jetzt haben alle Bots dasselbe helle Grau (196, 196, 196). Nationen und Menschen behalten ihre Farben. Die Grenze trennt weiterhin zwei Bots.

## Ziehen mit rechts, neuer Pfeil, Verteidigung nach echtem Vorbild (16.11.2026)
**Bedienung am PC.** Ein Stoss wird mit der rechten Maustaste gezogen: Start im eigenen Land (dort bricht er ein), Ziel im Feindesland. Vorschau beim Ziehen mit Urteil an der Spitze, Mausrad ändert den Anteil. `F` wählt Keil oder Abschnitt, Doppelklick bleibt die ganze Front, Rechtsklick ohne Ziehen das Kreismenü. Ein Klick auf einen Pfeil: verstärken oder zurückziehen. Auf dem Handy bleibt der Schalter mit drei Arten.
**Pfeil.** Statt einer gestrichelten Linie mit Kettenmuster ein gefülltes Band, das zur Spitze breiter wird, mit dunklem Rand und breiter Spitze; dick nach Truppenanteil (drei Stufen).
**Verteidigung.** Nationen haben ein Netz und setzen es selbst (dicht an bedrohten Grenzen). Eingraben bis +50 %, Reserven für angegriffene Abschnitte, Kessel ohne Küste verhungern in etwa 30 s. Marsch 2 s statt 3 s pro Zelle, Schienen beschleunigen auch zwei Zellen daneben. Einzelheiten und Messwerte: `doku/aufstellung.md`.
**Dabei gefunden.** Das Verhältnis am Ort konnte mehr Verteidiger zählen, als es gibt (die Obergrenze kam vor dem Dichtefaktor); behoben. Reserven halfen zuerst dem Angreifer, weil sie aus der Zelle kamen, in die der Keil als Nächstes stiess; jetzt schlägt der ganze Abschnitt Alarm.
**Tempo.** Erde mit 600 Bots: 14.7 ms pro Tick nach 5000 Ticks (vorher 10.2 nach 1500), höchstens 50 ms.

## Stösse, mehr Bots, ruhigere Leiste (15.11.2026)
**Gezielt angreifen.** Ein Schalter unter dem Regler (Taste `F`): ganze Front, Abschnitt oder Keil. Abschnitt und Keil stossen auf die angeklickte Stelle vor, auf dem billigsten Weg (um Gebirge und Wald herum, durch Täler), nur in ihrem Korridor; am Ziel weiten sie sich aus. Vorschau mit Weg, Breite und Urteil, Pfeil in der eigenen Farbe unterwegs, bis 4 Stösse gleichzeitig. Regeln: `doku/spielregeln.md`.
**Abgestimmt mit der Messbank** (`node test/kampf.js stoss`, 150K gegen 40K): Mit 10 % der Armee schafft die ganze Front 6 % des Wegs zum tiefsten Punkt, ein Abschnitt und ein Keil erreichen das Ziel nach etwa 6 s. Zwei Fehler dabei gefunden und behoben: Ohne Tempo-Grenze schoss der Keil in 1 s 50 Felder tief wie ein Speer; mit einer Grenze pro Tick blieb er stehen, sobald ein Feld mehr kostete als ein Tick erlaubt (jetzt summiert sich die Grenze über die Ticks). Ohne Flanken nahm der Keil fast doppelt so viele Felder wie die Front und wäre immer die beste Wahl gewesen; mit Flanken zahlt er pro Feld fast gleich viel, und sein Vorteil ist die Tiefe. Ein Gebirgszug mit einer Lücke: Der Keil quert in der Lücke.
**Ganze Front aus dem ganzen Land.** Die ganze Front nimmt ihre Truppen wieder überall gleichmässig und sofort (wie OpenFront); nur ein Stoss nimmt, was an seiner Einbruchstelle steht.
**Mehr Bots.** Ein Bot je 630 Landfelder statt je 950, höchstens 600; auf der Erde 600 statt 400 (Simulation 10.2 statt 8.9 ms pro Tick). Eine früher gespeicherte Bot-Zahl wird einmal auf die neue Vorgabe zurückgesetzt.
**Leiste unten links.** Ruhiger: Symbole in Kacheln, grössere Zahlen, schmaler flacher Armee-Balken mit der Zahl darüber statt des dicken Balkens mit Glanz, eigener schlanker Regler, Schalter für die Angriffsart.

## Kampf am Ort, Messbank, Vision (15.11.2026)
**Problem.** Mit 150K gegen 40K konnte man niemanden einnehmen: Die Truppen eines Klicks kamen gestaffelt aus der Aufstellung, und die Kampfformel von OpenFront verglich jede kleine Portion mit der ganzen Armee des Verteidigers. Jede Portion zahlte den schlechtesten Kurs und starb, bevor die nächste kam.
**Lösung.** Gekämpft wird am Ort: gegen die Verteidiger an der Front, nicht gegen die ganze Armee (`G.COMBAT`, Einzelheiten in `doku/aufstellung.md`). Die Dichte bleibt und wirkt jetzt sauber: Wo mehr Verteidiger stehen, ist ein Feld teurer und langsamer.
**Gemessen** (`node test/kampf.js`, alle Werte gleich mit Aufstellung und mit einem Topf): 150K gegen 40K mit fünf Klicks zu 20 % erobert in 8 s für 59K Verluste (vorher: steckt bei 66 % des Landes, 100K verloren); ein Klick 50 % in 7 s für 48K; 400K gegen 100K in 11 s für 138K (vorher 160K); gleich starke Gegner bleiben stecken. Simulation mit Bots und Nationen läuft normal, Gleichlauf geprüft.
**Rohstoffe eingefroren.** Die Version bleibt spielbar, wird aber nicht weiterentwickelt, bis der Kampf steht.
**Vision.** Wohin das Spiel geht und in welcher Reihenfolge: `doku/vision.md`.

## Gebäude- und Schiffszeichen neu (15.11.2026)
**Gebäude.** Wie in OpenFront: grösser (nah bis 40 px, weit hineingezoomt wachsen sie mit der Karte bis 64 px, vorher höchstens 32 px), Füllung in einem tiefen Ton der Spielerfarbe, fast schwarzer Rand, eigene Gebäude zusätzlich mit weissem Ring. Die Zeichen sind neu und fett gezeichnet (Hochhäuser, geteiltes Wappen, Anker, Rakete, Abschussrampe mit zwei Raketen, Fabrik mit Kamin) und füllen zwei Drittel der Form. Das Zeichen erscheint schon ab mittlerer Nähe (`z` ab 1.1). Die Stufe steht wie in OpenFront gross in weissen Ziffern mit dunklem Rand oben auf dem Gebäude statt in einem kleinen Kreis unten rechts. Im Bau: grau mit orangem Fortschrittsring. Zeichnen: `structIcon`, `levelTag` in `src/06_view.js`.
**Handelsschiffe.** Weisser Rumpf mit geradem Heck und kantigem Bug, Brücke hinten, Ladung in Spielerfarbe (nah drei Container, gelb bei gekaperten Schiffen). Grösser als vorher und auch ganz herausgezoomt sichtbar, fremde ab mittlerer Nähe statt erst ab `z` 1.7, weit draussen klein statt gar nicht (`merchant`, `tradeSize`).
**Kriegsschiffe.** Sahen aus wie Yachten (breiter, runder Rumpf, Deck in Spielerfarbe). Jetzt als Zerstörer: Rumpf fünfmal so lang wie breit, gerader spitzer Bug, gerades Heck, Rumpf in Spielerfarbe, graues Deck mit Geschützturm vorne, Raketenzellen, gestuftem Aufbau mit Brücke, Mast und Schornstein, zweitem Turm und Hubschrauberdeck hinten. Weit draussen ein schmaler Rumpf statt eines Punkts (`warship`, `warSize`). Nachgebessert: Bug stumpfer (gerade abgeschnitten statt spitz), Stahl in dunklem Marinegrau (`WAR`), damit die Landfarbe am Rumpf heraussticht. Granate und Mündungsfeuer kommen aus dem Rohr des Geschützes, das zum Ziel zeigt (vorderer Turm für Ziele voraus, hinterer für Ziele achteraus, `gunTip`); die Simulation feuert weiter aus der Mitte des Felds, nur das Bild führt die Granate auf der ersten Hälfte des Wegs vom Rohr in die Flugbahn.

## Version «Rohstoffe» (13.11.2026)
Eine zweite Seite neben dem klassischen Spiel (`docs/rohstoffe/`): Auf der Erde hat jedes der 239 Länder eigene Rohstoffe und eine Fabrikware. Rohstoffe liegen als Vorkommen an festen Stellen (wem das Feld gehört, der verdient daran), Fabriken stellen die Ware ihres Landes her. Höchstens zwei Rohstoffe pro Land, eigene gezeichnete Zeichen statt Emojis, sichtbar erst beim Hineinzoomen. Ein Klick aufs Land zeigt Besitzer, Vorkommen und Fabrikware, ein Klick aufs Gold die Einnahmen. Das klassische Spiel ist unverändert (`game.res` aus). Einzelheiten: `doku/rohstoffe.md`.
**Abbau und Ernte (13.11.2026, abends).** Ein Vorkommen allein bringt kein Gold mehr: Wem das Feld gehört, muss dort eine Anlage bauen (Mine, Bohrturm, Staudamm, Holzfällerei, Farm, Plantage, Viehhof oder Fischerei, je nach Rohstoff), mit Preis, Bauzeit und fünf Stufen. Erst die fertige Anlage zahlt. Die Anlage wechselt mit dem Feld den Besitzer. Nationen bauen selbst, Bots nicht. Gebaut wird im Länderfenster, auf der Karte zeigt ein Schild die Stufe. Wunsch des Besitzers: «jeden Rohstoff muss man abbauen oder ernten können».

## Tempo, Kriegsschiffe, Warnungen (13.11.2026)
**Tempo.** Die Formeln sind die von OpenFront (Truppenzuwachs, Truppen-Limit, Kosten pro Feld). OpenFronts Karten haben aber zwei Millionen Felder, unsere sind kleiner (`map.S` ist der Massstab einer Seite, Weltkarte 0.61). Mit denselben Feldern pro Tick war deshalb alles hektisch: Ein Schiff war in 0.6 der Zeit über den Atlantik, eine Front in 0.6 der Zeit durch ein Land. Alles, was sich über Felder bewegt, läuft jetzt mit dem Massstab der Karte: Schiffe, Züge, Granaten (`game.pace`, Felder pro Tick) und der Vormarsch einer Front (`game.attackPace`). Ein Feld, das mehr kostet als im Tick übrig ist, wird über die nächsten Ticks abbezahlt (`at.carry`); vorher nahm jeder Angriff mindestens ein Feld pro Tick, egal wie schwach. Zum Nachstellen nach Gefühl: `G.PACE = { move, attack, growth }` in `src/03_game.js`, alle drei stehen auf 1. Der Truppenzuwachs ist unverändert der von OpenFront; `growth` unter 1 macht ihn langsamer.
**Schiffe im Bild.** Eine Route ist eine Kette von Feldern in acht Richtungen. Feld für Feld gezeichnet fuhr ein Schiff im Zickzack und der Bug sprang bei jedem Schritt um 45 Grad. Das Bild gleitet jetzt über die Route (`View.pose`): Position ist der Mittelwert eines kurzen Stücks der Route, Kurs die Richtung dieses Stücks, von Bild zu Bild geglättet. Gemessen: höchstens 2 Grad Kursänderung pro Bild.
**Kriegsschiffe.** Grauer Rumpf mit spitzem Bug, Deck in Spielerfarbe, Brücke, zwei Geschütztürme, die sich zum Ziel drehen; am Heck zwei kurze Schaumlinien statt des langen weissen Streifens. Granaten sind ein kurzer Leuchtstreifen mit Mündungsfeuer und Einschlag.
Patrouille (`tickWarship`, `patrolPoint`, nach `WarshipExecution.ts` in OpenFront): Das Schiff fährt einen Kurs rund um den Punkt, an den es geschickt wurde, jede Etappe etwa ein Drittel um einen Ring mit halber Patrouillen-Reichweite, in wechselndem Abstand zur Mitte. Ziele nahe der Küste werden übergangen (Abstand zum Land mindestens 7 Felder mal Massstab), und die Routensuche für Kriegsschiffe verteuert Felder näher als vier am Land. Die nächste Etappe wird ein paar Felder vor dem Ende der laufenden angefragt und an die alte Route angesetzt, das Schiff bleibt also nie liegen. Kurze Etappen haben eine eigene Spur in der Routensuche (`pathLane`), damit sie nicht hinter der Ozeanroute eines Handelsschiffs warten; das war der Grund fürs Stillstehen. Handelsschiffe werden nur im Patrouillengebiet gejagt, mit doppelter Fahrt und auf Abfangkurs (das Schiff zielt auf den Punkt der Handelsroute, den es rechtzeitig erreicht). Am Kai liegt ein Schiff ausserhalb des Gefechts: Es schiesst nicht und wird nicht beschossen. Gemessen auf der Weltkarte über 3000 Ticks: an der Küste 33 % -> 1 % der Zeit, ausserhalb des Gebiets 34 % -> 5 %, Stillstand nur noch zur Reparatur.
**Angriffswarnung.** Bei einem neuen Angriff auf dich blinkt der Bildschirmrand dreimal rot (`#alarm`), dazu ein Alarmton. Solange der Angriff läuft, pulsiert an der Stelle der Grenze ein roter Kreis mit Ausrufezeichen (`View.drawRaids`).
**Schienen.** Eine Strecke hat so wenige Knicke, wie das Land erlaubt (`straighten` sucht vom fernen Ende her), jeder Knick ist zu einem Bogen gerundet (`railGeo`), und Züge fahren genau auf der gezeichneten Schiene. Zwei Strecken verlassen einen Bahnhof nicht mehr fast nebeneinander: Liegt ein schon angeschlossener Bahnhof in fast derselben Richtung (unter etwa 28 Grad) und näher am neuen, zweigt die neue Strecke dort ab.
**Flugkörper.** Marschflugkörper, Atom- und Wasserstoffbombe sind gezeichnete Flugkörper mit Flügeln oder Leitwerk und Triebwerksflamme, die Nase zeigt entlang der Flugbahn.
**Farben.** Keine Nation hat einen Farbton näher als 32 Grad an der Farbe eines menschlichen Spielers; zwei Menschen mit derselben Farbe werden auseinandergerückt.

## Änderungen vom 13.11.2026
**Reichweiten.** Verteidigungsposten zeigen ihren Wirkungsradius immer auf dem Land (gestrichelter Ring, `View.drawReach`), ebenso eigene Flugabwehr. Fremde Posten schwächer.
**Stufe 100.** Alle Gebäude lassen sich bis Stufe 100 ausbauen.
**Nationen und Bomben.** Vorher feuerten Nationen nur auf Nachbarn, und die wählten sie meist unter den Bots (die nie beschossen werden); auf «Leicht» bauten sie gar kein Silo. Jetzt hat jede Nation ein Silo (reiche bauen aus), wählt ihr Ziel über `AI.nukeTarget` (Abneigung, Grösse, Mensch) unabhängig von der Nachbarschaft und feuert bis zu vier Raketen pro Zug, so viele wie die Silos laden. «Leicht» feuert seltener.
**Namen.** Jeder Name wird gegen die echten Felder geprüft (`placeName`): alle Felder unter beiden Textzeilen müssen dem Spieler gehören, sonst wird er verkleinert oder verschoben. Er liegt also immer im Land.

## Liste vom 13.11.2026 abends
- **Tempo am Anfang wie vor der Aufstellung:** ein Befehl hat jetzt alles «zur Hand», was im Umkreis von 4 Zellen um den Ort steht (`HAND` in `03b_posture.js`), nicht nur die eine Grenzzelle. Ein kleines Land ist damit ganz sofort verfügbar; erst grosse Länder spüren die Entfernung. Marsch 3 s pro Zelle (`BASE = 30`). Gemessen (Europa, 3 Startplätze, 3 Minuten Landnahme): gleich viele Felder wie im Stand vor der Aufstellung.
- **Gelände zählt nur so viel, wie es verteidigt ist** (`tickAttack`): freies Land nimmt 15 % des Gelände-Zuschlags (`G.TERRAIN.free`); gegen ein Reich `hold = 1.15 − 0.33 · Angreifer/Verteidiger`, begrenzt auf 0.15–1, bei Menschen zusätzlich × örtliche Dichte, wenn sie unter 1 liegt. Leeres Gebirge fällt also fast wie Ebene, und Übermacht überrollt auch Wald.
- **Maus:** einfacher Klick schaut nur (Karte ziehen), Doppelklick greift an (über Land, sonst per Boot) oder öffnet die Ausbaukarte eines eigenen Gebäudes, Rechtsklick öffnet das Kreismenü. Setzen von Gebäuden, Zielen und Startpunkt bleiben ein Klick. Handy unverändert.
- **Gegner unter der Maus:** Leiste oben mit Name, Stand (Bot, Nation, verbündet, im Krieg), Truppen, Gold, Landanteil und Zahl der Gebäude und Kriegsschiffe (`showPeek`).
- **Front-Schilder:** an der Grenze steht pro eigenem Angriff die Zahl der Truppen im Kampf und «+ unterwegs», Angriffe auf einen selbst in Rot (`drawFronts`). Ohne Schwert-Zeichen davor (am 13.11.2026 entfernt, Emoji sehen auf jedem Gerät anders aus).
- **Truppenboote:** gefahrene Route kräftig mit dunklem Rand, der Rest gestrichelt bis zum Landepunkt mit Ring.
- **Gebäude-Icons:** (überholt, siehe «Übersichtlichkeit») mindestens 15 px, auch ganz herausgezoomt.
- **Raketen:** schlanker Metallkörper ohne Umriss, glühender Abgasstrahl, blinkendes Positionslicht, Rauchspur, die nach hinten verblasst, Schatten am Boden, wächst zum Scheitel der Bahn.
- **Fabrik-Vorschau:** Schienenradius als Kreis, dazu Linien zu den Stationen in Reichweite (bei Stadt und Hafen: zur Fabrik in Reichweite).
- **Kriegsschiffe:** unter 75 % Rumpf wird die Jagd sofort abgebrochen und der Hafen angelaufen (vorher erst beim nächsten 2-Sekunden-Takt); ein Schiff in Reparatur wird als letztes für einen Marschbefehl genommen.
- **Geld am Anfang:** Menschen starten mit 250K Gold (`G.START_GOLD`), ein eroberter Bot bringt 60K statt 25K (`G.BOT_BOUNTY`), Nationen feuern in den ersten 10 Minuten keine Bomben (`G.NUKE_PEACE`).

## Übersichtlichkeit (13.11.2026, spät)
Ziel: die Karte so ruhig wie in OpenFront. Alles in `06_view.js`, die Palette in `03_game.js`.
- **Palette:** Nationen nehmen ihre Farbe aus einer festen, matten Liste (`G.PALETTE`, 48 Farben: 16 Farbtöne in drei Tönungen, Sättigung 0.28–0.36). Erst wenn alle vergeben sind, kommen dieselben Farben eine Stufe heller, dann dunkler. Bots sind blasses Grau. Die sechs Spielerfarben sind ebenfalls matt, eine Spur kräftiger.
- **Gelände und Wasser:** eine ruhige Wasserfarbe mit wenig Tiefenverlauf, Landfarben ein Viertel Richtung Grau und Richtung mittlere Helligkeit (`calm`), Relief halbiert. Besetztes Land zeigt das Gelände nur noch als Hauch.
- **Grenzen:** Landfarbe × 0.72; die eigene Grenze ist fast weiss.
- **Namen:** keine Flaggen (`G.flagOf` liefert nichts), Menschen schwarz, Nationen dunkelgrau, Bots heller grau. Gezeichnet wird nur, was auf dem Bildschirm gross genug ist (Nation 10.5 px, Bot 13 px), die Grössten zuerst, höchstens 60, und keiner über einen schon gezeichneten.
- **Gebäude:** jede Art hat eine eigene Form (`shape`): Stadt Sechseck, Hafen Fünfeck, Fabrik Quadrat, Verteidigungsposten Schild, Flugabwehr Kreis, Silo Dreieck. Nah (Zoom ≥ 2.2) mit Zeichen und Stufe, mittel nur die Form, fern (< 1.1) kleine Formen, wobei Gebäude desselben Besitzers im selben 15-px-Feld zu einer Form mit Zahl werden. Eigene haben einen weissen Rand, fremde einen hellen in ihrer Farbe. Neues Stadt-Zeichen (Hochhaus mit Fenstern statt Balken).
- **Aus der Ferne weggelassen:** fremde Züge und Handelsschiffe; fremde Kriegsschiffe und Boote sind ein Punkt; Schienen eine dünne Linie; Bootsrouten voll nur für die eigenen; Reichweite fremder Verteidigungsposten nur, solange man mit dem Besitzer kämpft.
- **Gold:** Einkommen und Gold-Meldungen auf der Karte weiss statt gelb.

## Erkennbarkeit (14.11.2026)
- **Gebäude:** Körper in einem tiefen Ton der Spielerfarbe (× 0.46), Rand weiss (eigene dicker), Zeichen weiss. Vorher war der Körper × 0.72 auf Land von × 0.95, also nur ein Viertel dunkler als der Untergrund: darum wirkten die Zeichen durchsichtig. Ein Gebäude steht immer auf dem Land seines Besitzers, also sagt das Land, wem es gehört; das Zeichen muss nur gesehen werden. Grössen: nah 18–30 (Zeichen ab Zoom 1.6 statt 2.2), mittel 14, fern 9.
- **Schiffe:** Rumpf in der Spielerfarbe mit tiefem Rand derselben Farbe, kein weisser Rumpf mehr. Beim Handelsschiff sitzt die Ladung als heller Punkt mittschiffs. Vorher war der Rumpf cremeweiss mit einer 1.6-px-Linie in der Spielerfarbe: die Linie verschwand und alle Handelsschiffe sahen gleich aus. OpenFront macht es umgekehrt, dort ersetzt der Zeichner vier Graustufen des Sprites durch Land- und Grenzfarbe des Besitzers.
- **Verbündete:** deren Grenze wird zu 45 % mit Grün gemischt (`View.borderColors`), neu berechnet, sobald eine Allianz entsteht oder zerbricht (`checkAllies`, einmal pro Bild).
- **Bevölkerungsbalken:** unter den Zahlen, Truppen durch Höchststand, zweiter Abschnitt für die Truppen in Angriffen und auf Booten, Beschriftung «X + Y / Max».
- **Schienen:** aus der Nähe gedämpfter, damit sie nicht über der Landschaft liegen.

## Antarktis und Klima (14.11.2026)
- **Antarktis auf beiden Weltkarten:** «Erde» reicht bis 80° Süd (5600 x 2902, vorher bis 57.5°), aus echten Küsten- und Höhendaten; die kleine Weltkarte ebenfalls bis 80° Süd (1126 x 800). Einzelheiten und Neubau: `doku/erde.md`. `tools/build_maps.py <geo> build welt` baut nur die genannten kleinen Karten neu; jede trägt jetzt `lat`/`lon` ihres Ausschnitts.
- **Klima auf allen Karten:** Höhe in Metern, Temperatur aus Breite und Höhe, Kälte bremst Angriff und Marsch (bis doppelt so langsam bei −45 °C, zusätzlich zur Bedeckung). Formeln und Beispiele in `doku/erde.md`, Abschnitt «Klima».
- **Hilfetext:** «alle Gebäude bis Stufe 100» (stand noch auf Stufe 5).

## Schienen wie ein Plan, Fabrik lesbar (14.11.2026, Nachmittag)
- **Gleise nur waagrecht und senkrecht** (`railPath` in `04b_rail.js`): Suche über vier Nachbarn statt acht, jeder Richtungswechsel kostet 3 Felder, Uferfelder 2 extra (Dijkstra über Feld und Fahrtrichtung). Das sind OpenFronts Regeln (`AStar.Rail.ts`: vier Nachbarn, `directionChangePenalty = 3`). `straighten` und `landLine` gibt es nicht mehr: vorher zog `straighten` Geraden in beliebigem Winkel, daher die treppigen Schrägen. Eine Strecke ist höchstens 2 × Reichweite lang, sonst wird sie nicht gebaut.
- **Zeichnen:** Schienen erscheinen erst ab Zoom 1.7 und sind ab 2.6 voll da (OpenFront: `railMinZoom 3`). Eigene und verbündete Strecken dunkel mit hellem Kern, fremde eine dünne graue Linie. Schwellen erst ab Zoom 5. Züge nur, wo Schienen zu sehen sind; Lok im tiefen Ton, Wagen in der Spielerfarbe, keine weissen Kästen mehr.
- **Handelsschiffe:** fremde erst ab Zoom 1.7 und kleiner; die Goldzahl nur über den eigenen.
- **Geld getrennt:** «Seehandel bringt …» und «Züge bringen …» sind zwei Meldungen (`h.shipTotal`, `h.trainTotal` laufen in der Simulation mit). Unter dem Balken steht eine Zeile: Stationen im eigenen Netz und was Züge und Schiffe in der letzten Minute gebracht haben.
- **Fabrik-Vorschau:** neben dem Preis steht, wie viele Stationen in Reichweite liegen und was das ungefähr pro Minute bringt (ein Zug alle 23 s, 10K an bis zu vier Halten).
- **Gebäude:** OpenFronts Umrisse (Stadt Kreis, Hafen Fünfeck, Fabrik Sechseck, Posten Achteck, Flugabwehr Quadrat, Silo Dreieck), Körper im satten tiefen Ton der Spielerfarbe statt in grauem Dunkel, weisser Rand, etwas grösser (nah 20–32, mittel 15, fern 10).

## Zoom mit zwei Fingern (15.11.2026)
- **Der Punkt zwischen den Fingern bleibt dort:** beim Aufsetzen des zweiten Fingers merkt sich die Bedienung den Kartenpunkt zwischen den Fingern und den Zoom; jede Bewegung legt genau diesen Punkt wieder zwischen die Finger (`View.zoomTo`, `startPinch` in `07_ui.js`). Vorher wurden viele kleine Schritte aufaddiert.
- **Hängengebliebener Finger:** meldete das Handy das Abheben eines Fingers nicht, blieb er in der Liste, und der nächste einzelne Finger galt als Zoom gegen einen Punkt, an dem nichts war. Der erste Finger einer neuen Berührung räumt die Liste jetzt auf; `lostpointercapture` zählt als Abheben.
- **Seite zoomt nicht mehr mit:** Safari auf dem iPhone beachtet «user-scalable=no» nicht. Lag ein Finger auf einer Leiste, zoomte die ganze Seite statt der Karte. Jetzt `touch-action: pan-x pan-y` auf der Seite und die `gesture`-Ereignisse sind abgestellt.
- **Am Anschlag:** am nächsten und am fernsten Zoom wird neu gemessen, Umkehren zoomt sofort.
- Test: `node test/pinch.js`.

## Vollbild (16.11.2026)
- **Knopf in der Leiste oben rechts** (`#bFull`, vor dem Menü): schaltet Vollbild ein und aus, das Symbol wechselt. Die Karte nimmt danach die neue Grösse an (`fullscreenchange` ruft `view.resize`).
- **Handy:** ein Tippen auf «Start» schaltet gleich auf Vollbild (nur bei Touch, `pointer: coarse`); am Desktop bleibt das Fenster, wie es ist.
- **iPhone:** Safari kann eine Seite auf dem iPhone nicht ins Vollbild schalten. Der Knopf erklärt dort «Teilen → Zum Home-Bildschirm»; dank `apple-mobile-web-app-capable` startet das Spiel von dort ohne Leisten. Läuft es so schon, ist der Knopf ausgeblendet.
- Keine eigene Taste (am Desktop gibt es F11; `N` ist die Aufstellung).
- Test: `node test/vollbild.js`.

## Abfang, Schiffe, Stoss (16.11.2026)
- **Flugabwehr trifft sichtbar:** Die Bombe fliegt im Bild auf einem Bogen (bis 70 Felder hoch), die Abwehrrakete flog im Bild aber am Boden zum Punkt unter der Bombe und «traf» den Schatten. Jetzt steigt die Rakete mit Rauchspur vom Werfer zur Bombe auf ihren Bogen (`drawInterceptor`), und der Abschuss ist ein Blitz mit Ring und Rauch dort oben (`fx` mit `air`). Die Simulation ist unverändert.
- **Gekaperte Handelsschiffe:** Die Ladung trägt immer die Farbe des jetzigen Besitzers (vorher blieb sie nach dem Kapern goldgelb); ein kleiner goldener Punkt auf der Brücke zeigt, dass es gekapert ist.
- **Kein Schaum mehr hinter Schiffen:** Kriegs- und Handelsschiffe ziehen keine Spur mehr. Der Kurs der Truppenboote bleibt.
- **Dichte nur für die Verteidigung:** Ein Stoss nimmt seine Truppen wie die ganze Front sofort aus dem ganzen Land (`attack`), nichts marschiert mehr nach. Grund: Die Idee des Netzes ist die Verteidigung; ein Stoss aus einer dünnen Ecke blieb sonst stecken, bevor die Truppen da waren.
- **Weg des Stosses in acht Richtungen** (`thrustRoute`): Mit vier Richtungen kosten alle Treppen gleich viel, und der Weg kam als L heraus (erst quer, dann gerade hoch). Jetzt mit Schrägschritten (Kosten √2, nicht über eine fremde Ecke).
- **Vorschau ehrlich** (`thrustEstimate`): Vorher rechnete sie mit den vollen Truppen bis zum Ziel und ohne Flanken: «reicht etwa 60 %», im Spiel kam der Keil 10 % weit. Jetzt spielt sie den Kampf auf einer Schattenkopie des Korridors Tick für Tick durch, mit derselben Reihenfolge der Felder (eigener Würfel, damit der Spielwürfel unberührt bleibt), dem Tempo der Spitze, der Front-Länge, schrumpfenden Truppen beim Angreifer und beim Verteidiger, dünner werdenden Zellen und grob den Reserven. Gemessen (`node test/kampf.js stoss`): Vorschau und echt treffen in fünf von sechs Fällen auf 10 % genau (z. B. Keil 10 %: 64 % / 67 %). Grün heisst jetzt: kommt an und hat noch ein Viertel übrig.

## Handelsschiffe nach dem Kapern (16.11.2026, Abend)
- **Kein Sprung mehr beim Kapern:** `captureTrade` löschte die Route; das Bild fiel auf die rohe Kachel zurück, und die neue Route begann meist in Gegenrichtung. Gemessen 37 Sprünge im Moment der Kaperung und 38 beim Anhängen der neuen Route in 32 s. Jetzt behält das Schiff seine Route, und die neue wird 6 Felder voraus angehängt (`tradeHome`, wie `sail` bei Kriegsschiffen). 6 statt 3 Felder, weil das Bild die Lage über 3.5 Felder vor und zurück mittelt (`View.pose`); bei 3 sprang der Mittelwert, sobald die neue Route dran war. Danach: 1 Sprung bei gekaperten Schiffen, 0 Auffälligkeiten bei den übrigen.
- **Neues Ziel, wenn der Hafen fällt:** Ein gekapertes Schiff fuhr weiter auf seinen Zielhafen zu, auch wenn dieser zerstört war oder einem anderen gehörte (gemessen 479 Schiff-Ticks), und verschwand dann samt Gold. Jetzt wendet es zum nächsten Hafen seines Besitzers (`portNear`); gibt es keinen mehr, wird das Gold gutgeschrieben.
- **Kapern nur mit Hafen:** Ein Kriegsschiff jagt Handelsschiffe nur, wenn sein Besitzer im selben Gewässer einen Hafen hat. Vorher wurde auch ohne Hafen gekapert (22 Fälle), und das Schiff verschwand auf offener See.
- Test: `node test/handel.js`.

## Tabelle «Rohstoffe» (17.11.2026)
- **Neu in der Version «Rohstoffe»:** eine Tabelle mit allem, was man an Rohstoffen und Fabrikwaren hat, und Knöpfen zum Leveln direkt dort (Anlagen auf Vorkommen und die Fabriken pro Land). Einzelheiten in `doku/rohstoffe.md`. Nur Bedienung, keine neuen Regeln; `03c_res.js` ist unverändert.
- **Behoben:** `showIncome` gab es zweimal in `07_ui.js`, die zweite (Zeile unter dem Balken) überschrieb die erste, darum öffnete ein Klick aufs Gold nichts. Und «Weiterspielen» in der Hilfe schloss das Fenster nicht (`act === 'resume'` statt `what === 'resume'`).
- Test: `node test/rohstofftabelle.js [desktop]`.
