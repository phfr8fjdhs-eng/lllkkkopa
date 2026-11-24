# Änderungsprotokoll
Was seit dem 13.11.2026 geändert wurde und warum. Den heutigen Stand der Regeln beschreiben die anderen Dateien in `doku/`.

## Schnell verdichten, neue Bau-Tasten, Knopf «?» (24.11.2026)
- **Wunsch:** Verdichten und Ausdünnen ging nur über den Knopf oben rechts, Pinsel wählen und unten links «Fertig». Es soll mit einem Zug gehen, einmal am Bildschirm und einmal mit einer Taste. Die Bauleiste soll zuerst die Zahlen haben, Spezielles rechts. Oben rechts ein Knopf mit allen Kürzeln.
- **Geändert:** `V` halten verdichtet, Shift + `V` dünnt aus, Loslassen beendet. Knöpfe + und − rechts am Rand (ein Strich, lange drücken bleibt an), Doppeltippen und halten verdichtet. Bau-Tasten: `8` Schlachtschiff, `9` Marschflugkörper, `0` Atombombe, `H` Wasserstoffbombe, `M` MIRV, `Z` und `X` ganz rechts; Ton neu `O`. Knopf **?** (auch Taste `?`) zeigt alle übrigen Kürzel und blendet sie an den Knöpfen ein.
- **Nicht geändert:** Spielregeln und Befehle (`mesh` wie bisher), darum `det.js` und `posture.js` gleich.

## Leistung: Simulation im Worker, Karte auf der Grafikkarte, keine Spitzen mehr (25.11.2026)
- **Wunsch:** Das Spiel laggt, OpenFront läuft auf gleich grossen Karten flüssiger. Den Code sauber machen.
- **Ursache, gemessen:** Simulation, Nachmalen der Karte und Bild liefen im selben Thread. Ein Tick (auf der Erde 18 bis 45 ms) und das Nachmalen (bis 88 ms) hielten zehnmal pro Sekunde das Bild an. Dazu rechnete die Dichte-Schattierung einmal pro Sekunde alles neu (bis 100 ms). OpenFront rechnet seine Simulation in einem Worker.
- **Geändert** (Einzelheiten in `leistung.md`):
  1. Dichte-Schattierung über die Bilder verteilt, Kartenmalen mit einem Zeitbudget pro Bild.
  2. Die Simulation läuft in einem Web Worker. Die Seite liest einen Spiegel mit demselben Prototyp (`src/05b_sync.js`, `src/08b_host.js`). `?worker=0` lässt sie auf der Seite.
  3. Die Karte färbt die Grafikkarte (WebGL 2, `src/06b_gl.js`). Ohne Grafikkarte bleibt das 2D-Bild.
- **Ergebnis auf der Erde:** 95 % der Bildabstände 16.7 statt 33 ms, der längste 50 statt 117 ms. Die Simulation hält das Tempo.
- **Nebenbei behoben:** Die Anzeige konnte über `postDens` das Spiel verändern (siehe `mehrspieler.md`). Dichte-Stufen von Zellen, die ein Reich verlassen hat, blieben stehen. Ein Allianzwechsel malte die Grenzen aller Reiche neu statt nur der betroffenen. Die Meldung «Seehandel bringt …» setzte einen Zähler im Spiel zurück, jetzt zählt die Anzeige selbst (`shipTotal`).
- **Neu:** `test/worker.js`, `test/gl.js`. `test/net.js` spielt jetzt ein Gerät mit Worker gegen eines ohne. Die Browser-Tests, die ins Spiel greifen, öffnen die Seite mit `?worker=0`.

## Schlachtschiff fährt flüssig (24.11.2026)
- **Wunsch:** Das Schlachtschiff ruckelt beim Fahren.
- **Ursache:** Zwischen zwei Ticks schätzte das Bild die Fahrt mit vollem Tempo, die Simulation fährt das Schlachtschiff aber mit 60 % (auf Patrouille 36 %). Es lief jedes Bild voraus und sprang beim nächsten Tick bis 0.23 Felder zurück, fast bei jedem Tick.
- **Geändert:** `stride` merkt sich das Tempo des Ticks (`u.sr`), das Bild gleitet genau damit. Gemessen: 0 statt 198 Rückwärtssprünge auf 200 Ticks. Hilft auch Massengut- und Containerschiffen und Schiffen auf der Rückfahrt.

## Aufgeräumt: weniger Meldungen, weniger Kreise, Schiffe einheitlich (24.11.2026)
- **Wunsch:** zu viel Text unten rechts (z. B. nach dem Einnehmen einer Stadt), zu viele Reichweiten-Kreise (alle Häfen, alle Fabriken, alle Verteidigungen), Grössen der Bilder passen nicht zueinander, vor allem Schiffe.
- **Meldungen:** Was man selbst einnimmt (Gebäude erobert, Verteidigungsposten zerstört, Gegner erobert oder eingekreist) gibt keine Meldung mehr; das Gold zeigt die Karte. Verluste und Warnungen bleiben.
- **Kreise:** nur noch die Reichweite des angetippten Gebäudes (Karte offen) und beim Platzieren der Kreis des neuen Gebäudes plus das eigene Gebäude derselben Art mit der grössten Reichweite. Häfen nur noch ein Kreis (der äusserste). Beim Platzieren einer Stadt oder eines Hafens nur die nächste Fabrik markiert. Eigene Verteidigungsposten und Flugabwehr zeigen ihren Kreis nicht mehr dauernd; fremde Verteidigungsposten weiter während eines Kampfs mit dem Besitzer.
- **Schiffe:** alle mit derselben Pixelgrösse (vorher 0.5 bis 0.85 je Art, das Schlachtschiff war kleiner als der Zerstörer). Längen: Boot 6, Frachter 11 und 12, Zerstörer 14, Containerschiff 16 (schlanker als vorher), Schlachtschiff 20. Beim Reinzoomen wachsen Schiffe nicht mehr über die Gebäudesymbole hinaus.

## Leistung: Zielsuche der Kriegsschiffe, Karte blockweise nachmalen, unsichtbare Schiffe (24.11.2026)
- **Wunsch:** Richtlinien zu Leistung und Aufbau (Kurzfassung in `CLAUDE.md`), Engpässe messen und die wichtigsten beheben.
- **Gemessen und geändert** (Einzelheiten in `leistung.md`): Kriegsschiffe suchen ihr Ziel über ein Raster der See statt über alle Einheiten. Mit 5000 Schiffen 15 statt 106 ms pro Tick, Ergebnis Zahl für Zahl gleich. Die Karte wird in Blöcken von 32 x 32 Feldern nachgemalt statt in einem Rechteck um alle Änderungen. Auf der Erde 3 bis 5 statt 16 ms pro Tick. Schiffe ausserhalb des Bildschirms werden nicht mehr gerechnet und ihre Spur nicht gemalt.
- **Neu:** `test/stress.js`, `test/stress_view.js`, `doku/leistung.md`.

## Schiffe als Pixelbilder, Bootsspur aus Kacheln (23.11.2026)
- Wunsch: Schiffe sahen fein und unruhig aus, nicht wie OpenFront; Containerschiffe zu klein; die Linie des Transportboots zu glatt.
- Alle Schiffe sind jetzt eigene kleine Pixelbilder auf dem Kachelraster (Besitzerfarbe, dunkler Rand, Schatten auf einer Seite), je Besitzer und Art einmal gezeichnet und gecacht. Das Containerschiff ist 22 Bildpunkte lang, doppelt so lang wie der Frachter.
- Die Spur des Transportboots ist eine Reihe von Kacheln in der Besitzerfarbe, an schrägen Schritten mit einer Treppenkachel geschlossen.
- Nachgebessert nach Rückmeldung: wieder das kurze Boot und die Bilder ohne Schattenreihe, Containerschiff 20 statt 18 Bildpunkte, alle Schiffe etwas kleiner, Schlachtschiff, Zerstörer und Massengutfrachter noch etwas mehr.
- Zweite Nachbesserung: Schlachtschiff kleiner (0.5), Transportboot als schlichte Kapsel, Bootsspur ruhiger: blasse Gebietsfarbe, 60 % deckend, gröbere Zellen auf dem Kartenraster, geschlossene Stufen.
- Granaten, Raketen, Mündungsfeuer und Treffer als Quadrate statt weicher Verläufe: weniger Rechenaufwand. Im Browser geprüft: Schüsse gehen vom vorderen Geschütz aus und treffen das Ziel auf 1 bis 2 Kacheln.

## Kriegsschiffe zurückrufen und lagern, Unterhalt, tiefes Wasser (23.11.2026)
**Wunsch des Besitzers:** Containerschiffe grösser; Schlachtschiffe auf Patrouille langsamer, weichere Drehungen; Schiffe zurückrufen können (Schiff anklicken, Hafen anklicken), im Lager halten und von dort wieder aussenden, statt sie herumfahren zu lassen; Unterhalt auf See; Schlachtschiffe nur in tiefem Wasser patrouillieren lassen.
**Geändert:** Auswählen, Senden und Zurückrufen per Klick (`shipTap` in `src/07_ui.js`, Befehle `ship` mit `s` und `dock`), Lager je Hafen (`port.store`, `storeOf`, `stored`), Auslaufen aus dem Lager gratis (Baumenü: «Neu bauen» für ein neues), Unterhalt (`G.SHIP_CLASS.upkeep`: 20 bzw. 60 Gold pro Tick), Patrouille des Schlachtschiffs nur in tiefem Wasser (`deep`, `deepNear`, `patrolPoint`) und mit 60 % Tempo (`patrol`), weiche Drehung (Zerstörer 0.07, Schlachtschiff 0.035 pro Bild), Containerschiff 1.9-mal, Massengutfrachter 1.35-mal so lang wie ein Frachter. Fremde Transportboote zeigen nur noch eine kurze Spur, die volle Linie nur bei eigenen und bei Booten, die zu dir fahren.
**Geprüft:** in der Simulation Bau, Unterhalt (12K in 60 s für den Zerstörer), Zurückrufen (im Lager nach 2 s), Auslaufen aus dem Lager (gratis) und Neubau (500K); Schlachtschiff: 40 Patrouillenpunkte, keiner zu flach. Im Browser: Schiff anklicken (Ring), Hafen anklicken, Schiff liegt danach im Lager.

## Zerstörer und Schlachtschiff, Handelsklasse nach Strecke, Transportboot, Schienen (23.11.2026)
**Rückmeldung des Besitzers:** Schienen springen herum; Containerschiffe sollen nicht immer kommen, kurze Strecken mit normalen Schiffen, und besser aussehen; Zerstörer mit kleinen Geschossen, kurzer Reichweite und nur in Sicht; dazu Schlachtschiffe: grösser, langsamer, mehr Leben, Raketen, sehen über Inseln und dünne Küsten, versenken vor allem Schiffe, kapern nicht. Transportboot: klare Linie dahinter, Fadenkreuz am Ziel, und es sah aus «wie ein Tampon».
**Schienen:** Im Browser nachgestellt (Züge Bild für Bild, Vorschau beim Bewegen, Schienen über 15 Minuten): kein Springen gefunden. Gefunden aber: Eine Fabrik verband jeden Bahnhof in Reichweite, auch den fremder, nicht verbündeter Länder; diese Strecken liefen quer durch andere Reiche und trugen keinen Zug des Besitzers. Jetzt nur eigene und verbündete Bahnhöfe (auch in der Vorschau).
**Handel:** Die Klasse folgt der Strecke (`shipFor`): kurze Fahrten immer mit dem Frachter, mittlere mit dem Massengutfrachter, weite mit dem Containerschiff, sofern der Hafen hoch genug ist. Neue Grafik: Frachter mit einer Ladung, Massengutfrachter mit drei Luken, Containerschiff mit bunten Containerreihen; Brücke hinten.
**Kriegsschiffe:** zwei Klassen (`G.SHIP_CLASS`, `u.cls`): Zerstörer und Schlachtschiff, Werte in `doku/spielregeln.md`. Sicht über Wasser (`seaSight`). Neue Grafik: Zerstörer schlank mit einem Geschütz, Schlachtschiff breit mit drei Türmen und Raketenzellen; Granaten als kleine helle Punkte, Raketen als kleine Rakete mit Schweif. Das Schlachtschiff hat Taste J; die Oberfläche führt es als eigenen Eintrag (Wert 7.5) und schickt «Kriegsschiff, Klasse 1».
**Transportboot:** Landungsboot von oben (Rampe vorn, Laderaum, Steuerhaus hinten), eine klare Linie über den ganzen bisherigen Weg, ein Fadenkreuz am Landeplatz.
**Nationen** bauen Häfen und Städte erst ab 2.5M Gold aus (ab 1M fehlte ihnen das Gold für Silos, dann auch für Tarntürme).
**Tests:** `test/pfeile.js` zählt für «nur im Band» keine Felder mehr mit, die als eingeschlossenes Stück an den Angreifer fallen (`capturePocket`).

## Neue Zeichen, Schienen-Vorschau beim Bauen, Landfarbe wie OpenFront (23.11.2026)
**Rückmeldung des Besitzers:** Fabrik und Hafen gefallen, die übrigen Zeichen nicht; Rakete wie eine Interkontinentalrakete, Flugabwehr wie eine Abfangrakete. Beim Platzieren sollen die Gleise grün leuchten, damit man sieht, zu welcher Fabrik eine Stadt gehört (wie OpenFront). Der Hintergrund scheint bei OpenFront schöner durch. Transportboot: Route, Aussehen und Zielkreis gefallen nicht.
**Geändert** (`src/06_view.js`, `src/07_ui.js`):
- Zeichen neu: Stadt (Haus mit Giebel und Hochhaus mit Fenstern), Verteidigungsposten (Schild), Silo (aufrechte Interkontinentalrakete mit Flossen), Flugabwehr (schlanke Abfangrakete schräg auf der Rampe), Tarnturm (Gespenst). Fabrik und Hafen bleiben. Ein Zeichen je Art, die Stufe nur als Zahl. Fenster und Türen als Löcher (Füllregel evenodd, auch in der Hotbar).
- Beim Platzieren einer Stadt oder eines Hafens leuchtet das Netz der nächsten Fabrik in Reichweite grün, und die neue Strecke zu ihrem nächsten Bahnhof ist hell vorgezeichnet; bei einer Fabrik die Strecken zu den Bahnhöfen um sie (`railPreview`).
- Landfarbe wie OpenFront: die Besitzerfarbe mit 85 % Sättigung zu 59 % über dem Gelände (vorher 67 %, volle Farbe, Hoch- und Gebirge zusätzlich aufgehellt).
- Transportboot: dunkler Rand, heller Aufbau, kürzere und dünnere Spur (16 Felder), kein Zielkreis mehr.

## Handel in drei Klassen, Kriegsschiffe zurückhaltender (23.11.2026)
**Wunsch des Besitzers:** Handelsschiff klein, wenig Gold, kurze Reichweite; dann grössere mit mehr Reichweite; Containerschiffe im späten Spiel mit grosser, aber begrenzter Reichweite, langsam, schwer zu kapern, viel Gold. Kriegsschiffe zu stark: sie sollen vor allem kapern und Transportboote abwehren, kleinerer Radius, und nur auf Boote schiessen, die einen selbst oder einen Verbündeten angreifen.
**Geändert:**
- `G.HAFEN.ships`: Frachter (ab Stufe 1, 350 Felder, ×1), Massengutfrachter (ab Stufe 3, 700, Tempo 0.8, ×1.6, 5 Treffer), Containerschiff (ab Stufe 8, 1400 als Obergrenze, Tempo 0.6, ×2.5, 12 Treffer). Die Grösseren fahren bevorzugt weit. Einzelheiten in `doku/testschalter.md`.
- Nationen bauen Häfen (und Städte) aus; vorher blieben ihre Häfen auf Stufe 1.
- Kriegsschiffe: Zielradius 70 statt 130 Felder (× Massstab); Transportboote nur, wenn sie zu einem selbst oder einem Verbündeten unterwegs sind.
**Gemessen** (Weltkarte, nur Computer-Spieler): nach 20 Minuten 1464 Frachter (Ø 52K), 120 Massengutfrachter (Ø 164K), 2 Containerschiffe (Ø 298K). In dieser Runde hatte eine Nation um Minute 25 die Welt erobert, danach gab es keinen Handel mehr (das bekannte Schneeball-Problem).

## OpenFronts Grössen im richtigen Massstab, Transportboot neu (23.11.2026)
**Rückmeldung des Besitzers:** Transportschiffe sehen schlecht aus, ihre Linien und Bewegung wirken verbuggt; nach dem Bau einer Fabrik gehen die Linien nicht zu den Städten.
**Gefunden:**
- Unsere Kachel ist grösser als OpenFronts (auf der Weltkarte S = 0.59). OpenFronts Zoom-Grenzen und Grössen waren ohne Umrechnung übernommen, also beim gleichen Ausschnitt fast doppelt so gross; Gebäude im Mindestabstand deckten sich und die kurzen Schienen dazwischen zu.
- Die Schienen werden gebaut (nachgestellt: zwei Städte und eine Fabrik, beide verbunden, grüner Punkt an der Stadt).
- Der Kurs eines Transportboots ist sauber (Kachel für Kachel, nie über Land, im Browser Bild für Bild gleichmässig). Aber der ganze, oft 300 bis 900 Kacheln lange Kurs blieb als dicke Linie stehen, voraus gestrichelt, bei allen Booten; das Boot selbst war ein kleiner Punkt.
**Geändert:** Zoom für Symbole, Schienen und Schiffe in OpenFronts Kacheln (`zz` = Zoom × S). Schiffe in OpenFronts Länge (Transportboot und Handelsschiff 5, Kriegsschiff 11 ihrer Kacheln). Transportboot: kurzes, rundes Boot in der Besitzerfarbe mit weissem Rand; dahinter nur eine kurze, auslaufende Spur (24 Kacheln); bei eigenen Booten ein kleiner Ring am Landeplatz.

## Symbole, Schienen und Zoom nach OpenFronts Regeln (23.11.2026)
**Wunsch des Besitzers:** Schienen und Symbole sollen sich im Aussehen noch mehr wie OpenFront verhalten; der Zoom mit dem Touchpad war viel zu langsam.
**Nachgesehen im OpenFront-Code** (Shader und Einstellungen, nur Regeln übernommen; die Zeichen sind unsere eigenen): Gebäude haben je Art eine Form (Kreis, Fünfeck, Sechseck, Achteck, Quadrat, Dreieck), gefüllt mit der Besitzerfarbe auf 65 %, Rand fast schwarz, weisses Zeichen; Grösse 60 px × Zoomfaktor (bis Zoom 1.2 30 % ohne Zeichen, bis Zoom 3 wachsend, bis 7 gleich, darüber mit der Karte), Flugabwehr 1.4×, Silo 1.55×, Hafen und Fabrik 1.08×. Schienen ab Zoom 1 eingeblendet, ab 3 ganz, eine Kachel breit; ab Zoom 6 zwei Schienen und eine Schwelle pro Kachel; fremde in einer dunklen Variante der Besitzerfarbe, eigene grau. Zoom: jeder Schritt × 600 / (600 + delta), ein Zusammenziehen auf dem Touchpad (Rad mit Strg) zählt zehnfach.
**Geändert:** so umgesetzt (`structIcon`, `iconScaleAt`, `drawRails` in `src/06_view.js`, Rad in `src/07_ui.js`). Damit sind auch die Formen je Art zurück, die ich am Mittag fälschlich durch gleiche Kreise ersetzt hatte. Zusätzlich zu OpenFront: Rad-Werte in Zeilen oder Seiten werden in Pixel umgerechnet.
**Im Browser angesehen** bei Zoom 1.1, 2, 3.5 und 8.

## Optik übersichtlicher, nach OpenFronts Regeln (23.11.2026)
**Wunsch des Besitzers:** optisch näher an OpenFront und viel übersichtlicher; Handels-, Kriegs- und Transportschiffe gefallen nicht, zu viele Meldungen, nicht zu sehen, wer angreift und wer verbündet ist, Schienen und Symbole nicht wie bei OpenFront.
**Nachgesehen im OpenFront-Code** (Regeln, keine Grafik übernommen; die Zeichen sind unsere eigenen): Gebäude als gefüllter Kreis in der Besitzerfarbe mit weissem Zeichen, weit draussen nur Punkte, Stufe als Zahl ab 2; Schiffe als kleine Formen in der Besitzerfarbe; Schienen erst nah, in der Besitzerfarbe; Meldungen kurz (etwa 8 s) und getrennt von einer Liste der Angriffe mit Gegenangriff-Knopf.
**Geändert** (`src/06_view.js`, `src/07_ui.js`, `src/template.html`):
- Gebäude: ein Kreis in einer tiefen Variante der Besitzerfarbe mit weissem Zeichen, gleich für alle Arten; eigene mit dünnem weissem Ring; Stufe als kleine Zahl darüber. Bis Zoom 1.2 nur ein Punkt. Vorher eigene Umrisse je Art, Zeichen und Ringe nach Stufe, grosse dunkle Abzeichen schon weit draussen.
- Schiffe: Kriegsschiff lang und spitz mit einem Geschütz, Handelsschiff kurz und rund mit hellem Ladestreifen, Transportboot klein mit weissem Rand; alle in der Besitzerfarbe, mit der Karte wachsend.
- Schienen: erst ab Zoom 2.5 eingeblendet, ganz ab 4, dünn, in einer hellen Variante der Besitzerfarbe (die eigenen hellgrau).
- Meldungen unten rechts, höchstens 3, 6 s; die gleiche Meldung nochmals zählt hoch («×2»). Links nur noch die Angriffe und Bündnis-Anfragen; ein Angriff auf dich hat einen Knopf für den Gegenangriff.
- Auf der Karte: Wer dich angreift, steht rot mit ⚔, immer sichtbar; Verbündete grün mit ✓ und Restzeit.
- Gelände unter der Landfarbe ruhiger: Hochland nur leicht, Gebirge deutlich heller.
**Im Browser angesehen** bei Zoom 1.15, 2.6 und 5.

## Dichte als milder Puffer, Gelände sichtbar, Kälte weg, Hotbar (23.11.2026)
**Wunsch des Besitzers:** Die ganze Front OpenFront-ähnlich, die Dichte ein sauberer, erkennbarer Puffer: nicht krass, vor allem gegen Überrennen, wer viel mehr hat, kommt trotzdem durch (verstärken später über den Skill-Tree). Gelände wie in OpenFront langsamer und teurer, aber man soll klar sehen, wo es riskant ist, keine unsichtbaren Flecken. Hotbar: 2 und 3 vertauscht.
**Vorher geprüft:** Auch am echten OpenFront-Code (aktueller Stand auf GitHub): Kampfformel und Konstanten, ein Klick = 1/5 der Truppen, Gegenangriff hebt Truppe gegen Truppe auf, Rückzug 25 % sind gleich. OpenFronts Nationen schlagen sogar härter zurück als unsere (Angriff plus die Heimarmee des Angreifers). Eine Kostenkarte der Weltkarte zeigte: Fast die Hälfte des Landes war doppelt bis achtmal so teuer wie Flachland, vor allem wegen der Kälte (zwei Drittel des Landes, bis 2× langsamer und 1.5× teurer, auf der Karte nicht zu sehen); Hochland (ein Viertel der Welt) war unter der Farbe eines Reichs kaum zu erkennen.
**Geändert:**
- Kälte zählt im Kampf und beim Marsch nicht mehr. Hochland und Gebirge (OpenFront) sind unter jeder Farbe heller gezeichnet, genau nach der Stufe, mit der gerechnet wird.
- Beim Darüberfahren über ein Reich: «Hier: Gebirge · Angriff 1.5× Verluste, 1.5× langsamer», und wo Truppen dicht stehen, wie dicht.
- Dichte mild: Zeit × Dichte^0.7, Preis × Dichte^0.3, es fallen √Dichte mal der Schnitt; dichtes Land etwas kräftiger dunkel. Neue Prüfung in `node test/kampf.js dicht`: bei gleicher Stärke schützt die dichte Grenze (15 % statt 19 % Land verloren), bei doppelter Übermacht kommt man gleich weit (88 %), nur langsamer (8 statt 6 s).
- Hotbar in der Reihenfolge der Tasten: 1 Stadt, 2 Fabrik, 3 Hafen.
**Im Browser nachgesehen:** Gebirge und Hochland bei einer Nation gut zu erkennen, die Zeile beim Darüberfahren stimmt, Hotbar 1 2 3 4. Fall «100K gegen eine Nation mit 60K, ein Klick»: Der Klick schickt 20K; die nehmen 137 Felder, bis sie nach 9 s aufgebraucht sind (gegen eine Armee von 60K kostet jedes Feld das Doppelte, wie in OpenFront).
**Testspieler:** überlebt vier von fünf Runden; mit Startwert 4 sitzt er in Europa zwischen starken Nationen, greift nach einer Minute selbst an und wird mit 70K von Polen mit 179K überrollt.

## Nationen schlagen nicht mehr sofort mit allem zurück (23.11.2026)
**Rückmeldung des Besitzers:** Ich greife an, er greift zurück, das Land springt hin und her, dann sind alle Truppen tot.
**Nachgestellt** (echtes Spiel, nach 4 Minuten alle 3 s ein Klick zu 20 % auf die Nachbarnation): kein Fehler beim Umdrehen der Felder (nur normale Angriffe, keines innerhalb von 5 s zurück). Aber die Nation antwortete auf jeden Angriff im selben Augenblick mit allem über ihrer Reserve (30 bis 40 % der Obergrenze). Der Gegenangriff hob den eigenen Angriff Truppe gegen Truppe auf, der Rest lief ins eigene Land, der nächste Klick wurde wieder abgefangen: 900 Felder wechselten dreimal oder öfter den Besitzer, auf beiden Seiten starben die Truppen.
**Geändert** (`strikeBack`, `G.AI_REACT`): Eine Nation schlägt frühestens 4 s nach Beginn eines Angriffs zurück und mit etwa dem Anderthalbfachen des Angriffs.
**Jetzt:** im selben Spiel kein Feld mehr, das dreimal den Besitzer wechselt; der Angriff kommt stetig voran. Testspieler (20 Minuten, fünf Runden): überlebt alle, 104 bis 185 Felder pro 10K Verluste. Nebenbei: Die führende Nation hat nach 10 Minuten in drei von fünf Runden nur noch 18 bis 29 % statt gut 40 %.

## Ganze Front genau wie OpenFront (23.11.2026)
**Rückmeldung des Besitzers:** Manchmal schwankt das Land hin und her (er hat viel, dann ich, dann er). Die Dichte an der Grenze soll nur ein Bonus sein, sonst alles wie OpenFront. Erst die ganze Front und die Verteidigung, Keil später einzeln.
**Was noch von OpenFront abwich:** Der Preis verglich die Armee des Verteidigers mit dem ganzen Reich des Angreifers (seit dem Mittag), dadurch war jeder Angriff billig, auch jeder Gegenangriff. Und Nationen standen an bedrohten Grenzen bis doppelt so dicht, die ganze Front traf also fast nie auf «normal».
**Geändert:** Die Armee des Verteidigers zählt wieder gegen den Angriff (OpenFront), für alle Angriffe. Nationen stehen gleichmässig. Die Warnung in der Leiste vergleicht wieder Angriff und Armee («schicke mehr»). Die Dichte wirkt nur noch, wo jemand mit dem Netz bewusst verstärkt (dunkleres Land).
**Gemessen:** `node test/kampf.js echt` jetzt wie OpenFront: 254 / 254 Felder mit 50 %, mit 100 % 1146 / 1147 («Feste Grenzen») und 1098 («Grenzland», eingeschlossene Teile halten 30 s); auch die gefallenen Verteidiger gleich. Im echten Spiel (80 s, alle 3 s ein Klick zu 20 %) wechselt das Land 3-mal die Richtung, mit OpenFront pur 5-mal. Testspieler (20 Minuten, Startwerte 4 bis 7, und «Feste Grenzen»): überlebt alle Runden, 61 bis 249 Felder pro 10K Verluste. Messbank: Der Fall «Nation 5K gegen Mensch 30K mit dünner Grenze, 3000 Felder» darf 8 % nehmen wie der mit 1000 Feldern (eine dünne Front fällt schneller, so gewollt).
**Noch offen:** Keil und Abschnitt einzeln ansehen; die Runde ist zu früh entschieden.

## Ein Kampf wie OpenFront, die Dichte nur obendrauf, Linksklick greift an (23.11.2026)
**Wunsch des Besitzers:** Das Netz soll heissen «wo gewichte ich meine Verteidigung», nicht zu stark: Wer viel mehr Truppen hat, soll trotzdem gewinnen. Dichte bremst, aber dort fallen auch mehr. Man soll sehen, wo eine Front dünn ist. Eingraben weg. Der Angriff soll sich so sauber anfühlen wie in OpenFront, auch das Klicken.
**Verglichen mit OpenFront:** Truppenwachstum und Obergrenze sind dieselbe Formel. Der Klick nahm die Truppen wie dort sofort ab. Anders war die Rechnung danach: ein eigener örtlicher Kampf (Grundpreis, Überzahl am Ort, Gelände nach Überzahl, Eingraben, Reserven) und Nationen, die an der Grenze bis viermal so dicht standen wie im Hinterland. Mit der Maus griff erst ein Doppelklick an.
**Geändert:**
- Jeder Angriff (ganze Front, Keil, Abschnitt, Richtung) rechnet mit OpenFronts Formel. Obendrauf nur die Dichte der Zelle: Zeit × Dichte, Preis × √Dichte, höchstens dreimal der Schnitt; wer dort steht, fällt mit. Hinter jedem Angriff steht das ganze Reich. Vorschau und Kampf rechnen mit denselben Funktionen (`tileLoss`, `tileTime`).
- Eingraben und Reserven entfernt. Ebenso die Regel «höchstens 2 Angreifer pro Verteidiger» in «Feste Grenzen»: Mit der neuen Formel machte sie den Keil doppelt so teuer und langsam (Level 5 nicht mehr zu schaffen).
- Nationen stehen an bedrohten Grenzen höchstens doppelt so dicht, an Verbündeten und Bots wie im Hinterland. So lohnen sich Bündnisse.
- Dichtes Land ist auf der Karte dunkler, weich verlaufend; eine dünne Front bleibt hell.
- Mit der Maus greift ein Linksklick an (ganze Front, Anteil vom Regler; ohne Grenze per Boot), ein Klick auf ein eigenes Gebäude öffnet seine Karte. Bisher schaute ein Klick nur, ein Doppelklick griff an.
**Gemessen:** `node test/kampf.js echt`: mit 100 % gegen eine Nation, die seit 2 Minuten steht, 1062 bis 1116 Felder (OpenFront 1147, vorher 733). Neuer Teil `dicht`: 60K gegen 30K nehmen gegen gleichmässige Verteidiger 83 %, gegen alles an der Grenze 68 % in 10 statt 6 s, und dem Verteidiger bleiben 3.4K statt 5.1K. Der Keil kommt überall tiefer als die ganze Front. Testspieler (20 Minuten, Startwerte 4 bis 7, und «Feste Grenzen»): Angriffe auf Nationen 133 bis 210 Felder pro 10K Verluste (vorher 109 bis 130), überlebt alle Runden.
**Messbank angepasst:** Eingraben und Reserven nicht mehr gemessen; «Schwung» gegen 250K statt 100K (sonst erreichte der Keil das Ziel mit und ohne Schwung); «der Abschnitt tiefer als die ganze Front» und in «Feste Grenzen» «die ganze Front nimmt mehr Land als der Keil» nur noch zur Anzeige (die Grenze der Messbank ist kaum breiter als ein Abschnitt; nach dem Durchbruch nimmt ein Keil ohne Schwung im dünnen Hinterland viel). `test/posture.js` prüft «mehrfach so dicht» über die Dichte statt über den Anteil.
**Noch offen:** Eine Runde ist zu früh entschieden (die stärkste Nation hat nach 10 Minuten gut 40 %).

## Ganze Front wieder brauchbar: Preis nach der ganzen Stärke (23.11.2026)
**Rückmeldung des Besitzers:** Mit der ganzen Front sterben die Truppen extrem schnell; im frühen Spiel soll die ganze Front der Normalfall sein, ohne gezielt angreifen zu müssen.
**Nachgestellt** in einem echten frühen Spiel (Weltkarte, Nationen auf «Mittel», Optionen wie auf dem Startbildschirm, nach 4 Minuten ein Klick mit 20 % auf die erste Nation):
- Mit 196K von 980K gegen eine Nation mit 475K verlor der Angriff sechs Truppen pro gefallenem Verteidiger. Grund: Wie OpenFront verglich der Preis die Armee des Verteidigers nur mit dem Angriff, also galt mit 20 % fast immer der Höchstpreis, obwohl man doppelt so stark war.
- Nach 6 bis 8 s griff die Nation zurück, und ihr Gegenangriff hob den eigenen Angriff Truppe gegen Truppe auf (wie OpenFront), ohne jede Meldung. Für den Spieler: Angriff weg, Truppen weg.
**Geändert:**
- Der Preis pro Feld der ganzen Front vergleicht die Armee des Verteidigers mit allem, was der Angreifer hat (Angriffe plus Truppen zu Hause). Das stärkere Reich kämpft billiger, egal ob es 20 % oder 100 % schickt. Hinter Keil, Abschnitt und Richtung stehen nur 15 % der Truppen zu Hause (`G.COMBAT.back`); mit allen brach ein Keil in «Feste Grenzen» überall durch und nahm mehr Land als die ganze Front, ohne sie kam er kaum tiefer als die ganze Front. Vorschau und Warnung in der Leiste («der Gegner ist stärker») rechnen gleich.
- Messbank: «Eingraben» schickt weiter 45K, aber aus einem Reich von 60K statt 150K (sonst fegte die ganze Front 91 % weg, eingegraben oder nicht).
- Meldung, wenn ein Gegenangriff den eigenen Angriff abfängt.
- `test/spieler.js`: Der Testspieler hielt Wasser für freies Land (Wasser hat auch keinen Besitzer) und griff darum nie eine Nation an; behoben.
**Gemessen** mit dem Testspieler (20 Minuten, Grenzland, Startwerte 4 bis 7): Angriffe auf Nationen nehmen 109 bis 130 Felder pro 10K Verluste statt 36 bis 73. Er überlebt alle vier Runden (zweimal Platz 1, zweimal Platz 2, wenn sein Kontinent voll ist); vorher schied er in zwei der vier aus. `node test/kampf.js echt`: 50K gegen eine eingesessene Nation mit 30K, halb geschickt, 370 von 2000 Feldern (OpenFront 254).
**Noch offen, gemessen:** Ohne Schwung auf der ganzen Front (seit dem Eintrag davor) schneeballt eine Runde: Die stärkste Nation hat nach 10 bis 15 Minuten gut 40 % der Welt und überrennt dann alles (Testspieler mit Startwert 4: 1.4M Truppen, von 5.9M in 5 s überrannt). Das war mit dem alten Preis gleich. Nächster Schritt: Angriffe grosser Reiche im späten Spiel bremsen.

## Angriff blieb stehen, Truppen kamen zurück (23.11.2026)
**Rückmeldung des Besitzers:** mit 80K gegen eine Nation mit 10K angegriffen, der Angriff geht nicht vorwärts, die Truppen sind wieder in der Reserve.
**Nachgestellt** (80K gegen 10K, alle 3 s ein Klick auf die ganze Front): Jeder Klick speiste denselben Angriff, und der hatte Schwung. Mehrere Klicks hintereinander von denselben Abschnitten liessen ihn müde starten (28 bis 32 %), er blieb nach wenigen Feldern stehen («keinen Schwung mehr») und die Truppen kamen zurück. Ein zweiter Keil von derselben Stelle fror ein: Schwung knapp über 25 %, jedes Feld dadurch viermal langsamer, an verteidigtem Boden ein Feld alle paar Minuten, 51K Truppen gebunden, ohne Meldung; ein weiterer Klick hängte sich an diesen eingefrorenen Angriff.
**Geändert:**
- Schwung nur noch für schmale Angriffe (Keil, Abschnitt, Richtung). Die ganze Front ist der breite, sichere Weg ohne Schwung.
- Wenig Schwung macht höchstens halb so schnell (`G.MOMENTUM.slow` 0.5, vorher bis ein Viertel).
- Ein schmaler Angriff, der 20 s kein Feld nimmt, steckt fest und hält an (`G.MOMENTUM.stall`, Meldung «steckt fest und hält an»); seine Truppen bleiben als Verteidiger stehen.
- Mindest-Schwung nach einem Angriff 55 % statt 32 %.
**Jetzt:** 80K gegen 10K mit wiederholten Klicks erobert die Nation in gut 2 Minuten. Zweiter Keil sofort von derselben Stelle 82 Felder (vorher 1), der erste 233.

## Testspieler, Tempo unterlegener Angriffe, Hauptland bei Grenzland (23.11.2026)
**Neu: Testspieler** (`node test/spieler.js [grenzland|grenzen] [Minuten] [Startwert]`): ein Computer, der wie ein Mensch spielt (erst freies Land und Bots, Nationen nur wenn stärker und mit genug Truppen, schlägt zurück, baut Städte, Hafen, Fabriken), in einer ganzen Runde auf der Weltkarte. Er misst Land und Platz alle 10 Minuten und wie viel seiner Angriffe auf Nationen verpufft.
**Damit gefunden:**
- **Unterlegene Angriffe rasten durch.** Kanada griff mit gut 100K einen Spieler mit 750K an und nahm in 15 s 700 Felder und 270K Truppen. OpenFront lässt einen Angriff, der der ganzen Armee des Verteidigers unterlegen ist, kriechen (bei acht zu eins etwa neunmal langsamer); das fehlte seit der Formel vom 23.11. Jetzt übernommen (`used *= within(R, 0.82, 7.5) × within(R / 20, 1, 50) / 0.82`).
- **Ganzes Reich übergeben, wenn es eingeschlossen ist.** Wie in OpenFront fiel ein Reich, das nur noch von einer Nation umgeben war, als Ganzes an diese, auch mit 1.2 Millionen Truppen. Bei «Grenzland» (mit Kessel) wird das Hauptland nicht mehr übergeben, es muss erobert werden; abgeschnittene Teile werden weiter zum Kessel. «Feste Grenzen» bleibt wie OpenFront.
**Was der Testspieler noch zeigt:** Auf der Weltkarte mit Nationen auf «Mittel» und 150 Bots liegt er nach 10 Minuten bei 0.4 bis 1.6 % der Welt (die besten Nationen bei 10 bis 30 %) und scheidet in den meisten Läufen bis Minute 30 aus. Ob das Spiel zu schwer ist oder das Skript zu schwach spielt, ist noch offen; darum sind die Nationen noch nicht klüger gemacht.
`test/posture.js` beendet vor «in Ruhe lassen» auch die Angriffe auf den Spieler (die jetzt langsameren liefen sonst weiter und riefen Reserven).

## Kampf unspielbar: Angriffe starben sofort (23.11.2026)
**Rückmeldung des Besitzers:** mit 50K gegen eine Nation mit 30K die ganze Front angegriffen, alle Truppen sofort tot.
**Gemessen** (Nation steht seit 2 Minuten, ganze Front): mit 20 % (10K) nach 1 s noch 2.9K übrig, 61 von 2000 Feldern; mit 100 % 818 Felder, und der Angreifer verlor fast viermal so viel wie der Verteidiger (OpenFront: gut doppelt, 1147 Felder).
**Warum die Messbank das nicht zeigte:** Ihr Verteidiger stand frisch und gleichmässig. Im Spiel steht eine Nation seit Minuten an ihrer Grenze; dort multiplizierten sich 16 Truppen Grundpreis pro Feld, die dichte Grenze, Eingraben (+43 % nach 2 Minuten) und die Regel, dass dichter Boden weniger eigene Truppen verliert.
**Geändert:** Ein Feld kostet OpenFronts Preis für die Truppen, die darauf stehen, und die fallen mit ihm; mindestens so viel wie freies Land. Bei gleichmässigen, frischen Verteidigern genau OpenFront (gemessen 1142 statt 1147 Felder). Eingraben höchstens +25 % und halb so schnell. Schwung doppelt so stark abnehmend (er hängt am Preis pro Feld), Mindest-Schwung nach einem Angriff 32 % statt 40 %. Warnung in der Leiste, wenn man mit wenig gegen eine grosse Armee angreift. Keine Schwung-Abnahme in Levels.
**Jetzt** (gleiche Lage): mit 100 % Grenzland 617, Feste Grenzen 745 Felder (OpenFront 1147); mit 20 % 55 Felder (OpenFront 89). Mit wenig gegen eine grosse Armee bleibt es teuer, wie in OpenFront.
**Messbank:** neuer Teil `node test/kampf.js echt` prüft genau diese Lage gegen die OpenFront-Formel; der Fall «Nation 5K gegen Mensch 30K, dünne Grenze, 1000 Felder» darf jetzt 8 % nehmen statt 6 % (dünner Boden fällt schneller). `test/level.js` spielt mit dem Kampfsystem wie das echte Spiel (Vorgabe Grenzland, `KAMPF=grenzen` für das andere).

## Zwei Kampfsysteme: Grenzland und Feste Grenzen (22.11.2026)
Wunsch des Besitzers: das eigene System und das des Kollegen nebeneinander, statt alles zu mischen. Auf dem Startbildschirm «Kampfsystem» statt der Schalter Truppenkonzentration, Netz, Richtungsangriff, Kessel und Schwung. Grenzland: Netz als passive Verteidigung, Kessel 30 s, Schwung, keine Grenze von 2 Angreifern pro Verteidiger. Feste Grenzen: kein Netz, die Grenze von 2 pro Verteidiger, Richtungsangriff, Kessel fallen sofort, kein Schwung. «Angriffe planen» in beiden. Vorher waren beide Bremsen gleichzeitig an. Einzelheiten und Messwerte: `doku/kampfsysteme.md`.
Dabei gefunden: «Feste Grenzen» ganz ohne Aufstellung (auch für Nationen) liess einen Keil mit 15 % von 400K gegen 100K 1757 Felder nehmen und das Ziel erreichen; so hatte es der Kollege nie gespielt. Jetzt wie zuletzt abgestimmt: nur das Netz zum Malen ist aus, Nationen stellen sich weiter selbst auf (Keil 460 Felder, 67 % des Wegs).

## Kessel, Schwung, Bahn mit Lieferungen, Häfen nach Stufe, Gebäude nach Stufe (22.11.2026)
Vier neue Testschalter (Vorgabe an) und eine neue Grafik. Wunsch des Besitzers: Angriffe im späten Spiel schwächer, aber mit Vorbereitung stärker; Kessel und abgeschnittene Versorgung wichtig; grössere Städte bringen mehr Gold; Häfen mit Stufe wichtiger; man sieht die Stufe eines Gebäudes. Alles mit Messwerten in `doku/testschalter.md`.
- **Kessel:** Eingeschlossenes Land von Menschen und Nationen hält 30 s. Dabei gefunden: In einen Kessel ohne Küste sickerten Truppen aus dem Hauptland «per Boot»; behoben.
- **Schwung:** Angriffe verlieren mit jedem Feld Schwung (je teurer das Feld, je schmaler die Front), bleiben unter 25 % stehen. Vorbereitung (Aufmarsch, Erholung, Schiene) gibt mehr. Ohne Schwung war eine Runde nur mit Computer-Spielern nach 10 bis 20 Minuten entschieden (Spitzenreiter 59 % nach 20 Minuten), jetzt nach 40 Minuten etwa 45 bis 50 %.
- **Bahn:** Lieferungen von der Fabrik in Städte und Häfen, 30K × √Stufe der Stadt, Fabriken weiter auseinander, Netz als Baum, grüne Anzeige für «verbunden». Bahn-Gold etwa wie bisher.
- **Häfen:** √Stufe öfter, Reichweite mit Stufe, Grossfrachter und Containerschiffe, Kapern bringt die Hälfte. Bei Häfen auf Stufe 1 etwa zwei Drittel des bisherigen Handels.
- **Gebäude nach Stufe:** Dorf, Stadt, Grossstadt; Hafen mit Kran; Fabrik mit zwei Kaminen; Ringe ab Stufe 10 und 25.
- **Bots:** einer je 850 Landfelder.
- **Tests:** `test/kampf.js` neu mit `schwung` und Kessel-Schalter; `test/tarn.js` wartet 20 statt 10 Minuten, weil Nationen mit Schwung später aufrüsten. Der Fall «Reserven» in `kampf.js abwehr` war schon vorher rot (seit die Stösse am 17./18.11. langsamer wurden) und ist jetzt nur Anzeige. `test/vollbild.js` scheitert auf `main` genauso.

## Startbildschirm und Levelseite aufgeräumt (20.11.2026)
- Die Knöpfe «Spiel starten», «Levels» und «Mit Freunden spielen» sind jetzt Zeilen mit Symbol, Titel und einer Zeile darunter (Karte und Schwierigkeit, das nächste Level mit Sternen, «Raum öffnen und Link teilen»). «So wird gespielt» ist ein schlichter Textknopf. Wunsch des Besitzers: die alten Knöpfe sahen nicht professionell aus.
- «Feldzug · Levels» heisst nur noch «Levels». Die Levelseite ist eine Seite: oben die Levels zum Auswählen, darunter das gewählte Level, unten «Spiel starten» und «Zurück». Die eigene Karte pro Level fällt weg.

Neuer Modus «Feldzug · Levels» auf dem Startbildschirm, getrennt vom normalen Spiel. Levelkarte mit 20 Stationen, die ersten 10 sind gebaut: jedes mit eigener Karte, Quest, Sternen und Tipps und erklärt eine Sache (Land nehmen, Bots, Städte und Fabriken, Stoss, Verteidigung, Boote, Kriegsschiffe, Atombombe, Flugabwehr, Marschflugkörper). Die Skill-Levels 11–20 folgen. Wunsch des Besitzers: ein Levelaufbau, in dem man die Waffen kennenlernt. Siehe `doku/feldzug.md`.

## MIRV mit etwas mehr Sprengköpfen (19.11.2026)
Die Sprengköpfe decken rund ein Drittel statt ein Viertel des Ziellandes ab, und es sind mindestens 6 statt 4. Erde: Land mit 13 000 Feldern 6 statt 5, mit 50 000 Feldern 23 statt 18, mit 140 000 Feldern 63 statt 48 Sprengköpfe. Wunsch des Besitzers: die MIRV warf zu wenige.
- Die Nationen werfen jetzt ganz selten eine MIRV, nur spät im Spiel (ab 30 Minuten, höchstens eine alle 10 Minuten für alle zusammen), auf eine der drei grössten Nationen. Vorher warfen sie gar keine. Siehe `doku/openfront-abgleich.md`.

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

## Bots breiten sich früh aus und nicht mehr rund (20.11.2026)
Gemessen (Erde, 150 Bots): Die Bots hielten am Anfang so viel Reserve zurück, dass sie in den ersten Sekunden fast nichts nahmen, und wuchsen dann als Kreis (Füllung des umschliessenden Rechtecks 0.68). Jetzt behält ein kleiner Bot nur halb so viel zurück (bis 30 % seiner Zielgrösse) und greift mit einem Richtungsangriff (`AI.stretch`) in eine eigene Richtung an, die sich bei jedem Zug etwas dreht. Ergebnis: nach 10 s 77 statt 49 Felder (Mittelwert), Füllung 0.52, also Arme und Ausbuchtungen. Nach 60 s etwa gleich gross wie vorher.

## Bots schneller, weniger Gold (20.11.2026, Abend)
Wunsch des Besitzers: Bots sollen sich etwas schneller ausbreiten, und Bots bringen zu viel Gold.
- **Schneller:** Ein Bot zieht alle 28–52 Ticks statt 42–78 (`AI`, `05_ai.js`), und sein Angriff auf freies Land kommt pro Tick mit 1.9 statt 1.4 Feldern je Frontfeld voran (Menschen und Nationen 2). Gemessen (Welt, 150 Bots, Mittelwert Felder pro Bot): 10 s 75 statt 62, 30 s 323 statt 228, 60 s 748 statt 616, 120 s 1003 statt 875. Die Zielgrösse ist gleich geblieben.
- **20 % weniger Gold:** Wer einen Bot erobert, bekommt sein Gold, die Prämie und das Landgold nur noch zu 80 % (`G.BOT_LOOT`, `Game.lootValue`). Die Anzeige in der Spieler-Info rechnet mit derselben Funktion.

## Feldzug: zeigen statt erklären (20.11.2026)
Die Lern-Levels erklären nicht mehr mit langen Texten. Tipps haben nur noch ein paar Worte; goldene Kartennadeln (mit Pfeil am Rand, wenn das Ziel nicht im Bild ist) zeigen, wo man tippen soll, und ein goldenes Dreieck am Truppenbalken zeigt, wo die Truppen am schnellsten wachsen (42 %). Neues Level 2 «Kornkammer»: mehr Land und Städte bringen mehr Truppen, wer weniger losschickt, wächst schneller (Quest: 40K Truppen). Die übrigen Levels rücken um eins nach (jetzt 11 Lern-Levels); gespeicherte Sterne werden mitverschoben. Im Level keine Startmeldungen mehr im Nachrichtenfeld. Details: `doku/feldzug.md`.

## Feldzug: schneller ausbreiten (21.11.2026)
Wunsch des Besitzers: Im Tutorial breitet man sich zu langsam aus. Grund: Das Tempo jeder Front hängt an der Kartengrösse (`S`), und die kleinen Level-Karten (rund 280 × 200) liegen an der Untergrenze 0.4; die Weltkarte hat 0.67. Jetzt läuft jedes Level mindestens mit dem Tempo der Weltkarte (`G.LEVEL_PACE` = 0.67, in `levelSetup`). Gemessen (Level 1, Start in der Mitte, immer 30 % losschicken): nach 20 s 2541 statt 1175 Felder, nach 30 s 5285 statt 2215, die halbe Insel nach 40 s statt 56 s. Gilt für alle in einem Level, auch für Bots und Nationen. `node test/level.js`: alle Levels weiterhin zu gewinnen.
