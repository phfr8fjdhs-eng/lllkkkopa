# Leistung: Messungen, Engpässe, Plan (27.11.2026)

Die Richtlinien des Projekts zu Leistung und Aufbau (Kurzfassung in `CLAUDE.md`) und was sie für das heutige Spiel heissen. Alle Zahlen sind gemessen, nicht geschätzt. Node 22 auf einem Server, Browser = Chrome ohne Grafikkarte (headless). Auf einem Handy ist alles etwa 3- bis 5-mal langsamer. Die Zahlen sind darum zum Vergleichen da, nicht als Versprechen.

## Was «viele Objekte» in diesem Spiel heisst
Grenzland zählt Truppen als Zahl pro Land, nicht als einzelne Soldaten (siehe `vision.md`: «keine einzelnen Einheiten, die man von Hand schiebt»). Was mit dem Spiel wächst, sind darum:
- **Felder der Karte:** Weltkarte 0.9 Mio., Erde 16.3 Mio. (5600 x 2902). Das ist die grösste Zahl im Spiel.
- **Spieler:** auf der Erde bis 569 (Bots und Nationen).
- **Einheiten:** Gebäude, Schiffe, Züge, Bomben. In echten Runden heute 100 bis 300, im Stresstest bis 10 000.

Kommen einmal einzelne Soldaten, Panzer oder Flugzeuge als eigene Objekte dazu, braucht es ein anderes Datenmodell (Felder statt Objekte, siehe Plan Punkt 6). Das ist eine Entscheidung zum Spiel, nicht zur Technik.

## Aufbau seit dem 24.11.2026: drei Teile, jeder für sich
```
Worker (eigener Thread)                Seite (Haupt-Thread)                 Grafikkarte
  G.Game: die Simulation   --- Änderungen pro Tick --->  Spiegel (G.SyncIn)  --- Zahlen der Felder --->  Farben der Felder
  (src/00 bis 05b)         <--- Befehle -------------  Bedienung, Zeichnen            (src/06b_gl.js)
```
- **Simulation im Worker** (`src/05b_sync.js`, `src/08b_host.js`): Ein Tick blockiert kein Bild mehr. Der Worker schickt nach jedem Schritt nur, was sich geändert hat: Besitzer und Verstrahlung der geänderten Felder, die geänderten Werte von Spiel, Spielern, Einheiten, Schienen und den eigenen Angriffen, neue Meldungen und Effekte. Ein einfacher Wert wird direkt verglichen, eine Liste, Map oder ein Objekt über eine Prüfsumme des Inhalts.
- **Der Spiegel** ist ein Spielobjekt mit demselben Prototyp wie `G.Game`, aber ohne Simulation. Zeichnen und Bedienung lesen ihn wie vorher das Spiel, und Fragen wie `buildCheck`, `cost` oder `structNear` beantwortet er aus dem Stand des letzten Ticks. Befehle gehen als Nachrichten an den Worker und werden dort mit `game.exec` zwischen den Ticks ausgeführt, in der Reihenfolge, in der sie kommen. Mehrspieler schickt die Züge des Raums genauso.
- **Was nicht hinüber geht:** die Arbeitsspeicher der Simulation (Wegsuche, Heaps, KI, Raster) und die Angriffe anderer Reiche. Die Grenze anderer Reiche rechnet der Spiegel bei Bedarf aus den Feldern aus. Von der Aufstellung anderer Reiche kommt nur, was die Schattierung braucht (Zelle, Felder, Truppen), alle 10 Ticks.
- **Karte auf der Grafikkarte** (`src/06b_gl.js`): Die Farbe jedes Felds rechnet ein Shader, aus denselben Zahlen und nach denselben Regeln wie `View.color`. Pro Tick gehen nur die Zahlen der geänderten Felder hin, und nur diese Felder werden neu gefärbt (als Punkte). Karten, die grösser sind als die grösste Textur des Geräts, werden in Stücke mit einem Rand von einem Feld geschnitten.
- **Rückfälle:** `?worker=0` oder ein Browser ohne Worker: das Spiel läuft auf der Seite. Ohne Grafikkarte (WebGL nur in Software) oder nach Verlust der Grafikkarte: das 2D-Bild wie bisher. `?gl=1` erzwingt WebGL auch in Software (für die Tests auf einem Server ohne Grafikkarte).

## Was gut ist (bleibt so)
- **Simulation getrennt vom Zeichnen:** fester Takt von 10 Ticks pro Sekunde, das Bild zeichnet dazwischen weich (`alpha`, ab der Ankunft des letzten Ticks). Die Simulation läuft ohne Browser in Node (alle Tests tun das) und im Browser in einem Worker.
- **Gleichlauf:** gleiche Zahlen auf jedem Gerät (`G.M`, RNG mit Startwert). Damit ist Mehrspieler mit Befehlen allein möglich, und die Simulation könnte später auf einen Server oder in einen Worker umziehen.
- **Felder in typisierten Arrays** (`Uint16Array` für Besitzer usw.), nur geänderte Felder werden neu gemalt (`markDirty`, `flush`).
- **Arbeit verteilt:** Seerouten Stück für Stück (`pathStep`), Inseln und Kessel nur alle 20 Ticks und nur bei Änderung, Hafen alle 10 Ticks.
- **Schiffsbilder** einmal je Besitzer und Art gezeichnet und dann nur kopiert.

## Messungen
`node test/stress.js` (Simulation) und `node test/stress_view.js` (Bild, nach `python3 tools/build.py`). Beide spielen zuerst 1500 Ticks auf der Weltkarte mit 150 Bots und setzen dann N Schiffe dazu.

### Simulation, Zeit pro Tick (Budget: 100 ms, besser unter 20 ms)
| Schiffe dazu | vorher | nachher |
| --- | --- | --- |
| 0 | 1.7 ms | 1.6 ms |
| 1 000 | 9.4 ms | 6.6 ms |
| 5 000 | 106 ms (schlimmster Tick 569 ms) | 15.5 ms (55 ms) |
| 10 000 | 421 ms (1 793 ms) | 48 ms (404 ms) |

Ursache vorher: Jedes Kriegsschiff ging für die Zielsuche durch alle Einheiten (Kriegsschiffe mal Einheiten).

### Erde (Standardkarte), pro Tick im Browser
| | vorher | nachher |
| --- | --- | --- |
| Simulation | 14 bis 19 ms | gleich |
| Karte nachmalen (`flush`) | 16 ms | 2.7 bis 5.5 ms |

Ursache vorher: Kopiert wurde ein Rechteck um alle geänderten Felder. Bei Fronten auf der ganzen Welt war das 95 % der Karte, also 16 Mio. Pixel pro Tick für etwa 10 000 geänderte Felder.

### Bild mit vielen Schiffen (ein Bild, Chrome ohne Grafikkarte)
| Schiffe | ganze Karte | nah (Zoom 12) |
| --- | --- | --- |
| 1 000 | 13 bis 19 ms | vorher 3 bis 5 ms, nachher 0.6 ms |
| 5 000 | 54 bis 66 ms | vorher 10 bis 12 ms, nachher 4 bis 5 ms |

Nah gezoomt hilft das Weglassen unsichtbarer Schiffe viel. Auf der ganzen Karte sind alle Schiffe sichtbar. Dort kostet jedes gedrehte Bild in Canvas 2D etwa 10 µs, ohne Grafikkarte (Messung: 5000 gedrehte Bilder 42 bis 52 ms, ungedreht 21 ms, einfache Rechtecke 3 ms).

### Erde: Speicher und Kosten der Simulation
- 410 MB in Arrays (`node --max-old-space-size=4096 test/erde.js`), das Kartenbild dazu etwa 65 MB.
- Die Zeit der Simulation verteilt sich auf den Kern des Spiels, ohne einzelne heisse Stelle: Angriffe (`tickAttack`) 15 %, Kessel (`removeClusters`) 13 %, Fronten (`addFront`) 12 %, Grenzen (`fixBorder`) 11 %, Aufstellung (`postDijkstra`, `postPockets`, `postFlow`) 15 %.

## Geändert am 24.11.2026, Mittag: Kriegsschiffe, Nachmalen
1. **Zielsuche der Kriegsschiffe über ein Raster** (`seaGrid`, `seaNear` in `src/04_units.js`). Die Schiffe werden einmal pro Tick in Zellen von 32 Feldern sortiert. Ein Kriegsschiff schaut nur die Zellen in seiner Reichweite an, in derselben Reihenfolge wie vorher. Ergebnis geprüft: Prüfsumme über alle Spieler und Einheiten (Ort, Leben, Besitzer, Ziel) vorher und nachher gleich, `det.js` (alle Varianten) und `posture.js` gleich.
2. **Karte blockweise nachmalen** (`flush` in `src/06_view.js`): nur Blöcke von 32 x 32 Feldern mit einer Änderung, nebeneinanderliegende in einem Zug. Geprüft: nach 800 Ticks stimmt jedes Pixel des Kartenbilds mit den Daten.
3. **Schiffe ausserhalb des Bildschirms** bekommen keine weiche Lage mehr berechnet und keine Spur gemalt. Ausnahme: eigene Transportboote und solche, die zu dir fahren, weil ihre ganze Linie gezeigt wird. Die Spur eines Boots ist ein Pfad mit einer Füllung statt vieler Rechtecke. Schiffe werden mit `setTransform` statt `save`/`restore` gesetzt. Im Bild sieht man keinen Unterschied (Bildschirmfoto geprüft).
4. **Zwei neue Messbänke:** `test/stress.js` und `test/stress_view.js`.

## Geändert am 24.11.2026, Nachmittag: Spitzen, Worker, Grafikkarte
Gemessen auf der Erde (Standardkarte, 770 Reiche), 40 Sekunden in Echtzeit, Chrome ohne Grafikkarte auf einem Server. Ein Bild braucht höchstens 16.7 ms, damit es 60 Bilder pro Sekunde werden.

| | vorher | 1. Spitzen verteilt | 2. mit Worker |
| --- | --- | --- | --- |
| Abstand zwischen zwei Bildern, Mittel | 19.6 ms | 17.6 ms | 16.7 ms |
| Abstand, 95 % darunter | 33.4 ms | 33.3 ms | 16.7 ms |
| längster Abstand | 117 ms | 67 ms | 50 ms |
| Simulation im Haupt-Thread pro Tick | 19 ms (bis 59) | 18 ms (bis 45) | 0 (im Worker) |
| Karte nachmalen, längster Fall | 88 ms | 11 ms | 12 ms |
| längstes Bild (`draw`) | 109 ms | 6 ms | 8 ms |
| Tick übernehmen (Spiegel) | | | 0.5 ms auspacken, Rest wie vorher Anzeige |

1. **Dichte-Schattierung verteilt** (`shadeScan`): Sie rechnete einmal pro Sekunde alle Reiche auf einmal und malte sofort, im Bild selbst. Jetzt höchstens 1.5 ms pro Bild, gemalt wird mit dem nächsten `flush`. **Kartenmalen mit Budget** (`flush(4)`): höchstens 4 ms pro Bild, der Rest folgt im nächsten.
2. **Simulation im Worker**, siehe Aufbau oben. Die Simulation hält das Tempo: 403 Ticks in 40 Sekunden.
3. **WebGL:** Hier ohne Grafikkarte nur in Software messbar, darum keine Bildzahlen in der Tabelle. Gemessen im Haupt-Thread: Nachmalen 1.1 statt 3.0 ms im Mittel, Bild 0.5 statt 1.7 ms. Die Arbeit der Grafikkarte, selbst in Software und auf das Ende gewartet: 2.4 ms pro Tick für rund 21 000 geänderte Felder, 0.1 ms pro Bild. Mit einer echten Grafikkarte ist das ein Bruchteil davon. In Software ist das Zusammensetzen der Bilder durch den Browser aber teurer als das 2D-Bild (Bildabstand im Mittel 24 statt 17 ms). Darum nimmt das Spiel dort das 2D-Bild.

**Speicher** (Erde, alle Chrome-Prozesse nach 30 s): vorher 1.6 GB, jetzt 1.9 GB. Der Haupt-Thread braucht weniger (JS-Speicher 386 statt 588 MB), aber Karte und Felder liegen nun zweimal vor, im Worker und im Spiegel. Das ist der Preis der Trennung. Auf dem Handy bleibt die Erde darum knapp (siehe Plan Punkt 1).

**Geprüft:**
- `test/worker.js`: Der Spiegel stimmt nach dem Spielen Feld für Feld und Wert für Wert mit dem Worker überein. Geprüft auf Welt, Erde und in der Version «Rohstoffe», mit Gebäuden, Schienen und Schiffen.
- `test/gl.js`: Die Grafikkarte färbt jedes der 16.25 Millionen Felder der Erde gleich wie `View.color`, auch in Stücke geschnitten.
- `test/net.js`: Ein Gerät mit Worker und eines ohne rechnen im Mehrspieler dasselbe Spiel (Prüfsummen über 400 Ticks gleich).
- `det.js` und `posture.js` sind unverändert.

**Gefunden:** Die Schattierung rief `postDens` auf, das ein Reich ohne Einheiten nebenbei ausgleicht. Das geschah nach der Uhr, auf jedem Gerät zu einer anderen Zeit, und konnte zwei Geräte im Mehrspieler auseinanderbringen. Gemerkt hat das erst der Mehrspieler-Test mit einem Gerät mit und einem ohne Worker. Die Anzeige nutzt jetzt `postDensSeen`, das nur liest. Im Worker kann die Anzeige das Spiel ohnehin nicht mehr verändern.

## Geändert am 24.11.2026, Abend: Wohin ein Tick geht, Dichte, Bots, Speicher
Abgleich mit dem Auftrag «Leistung» (Prüfung des ganzen Spiels, Dichte als wichtigster Punkt). Neue Messbank `test/phasen.js`: Zeit pro Tick je Teil der Simulation, dazu wie viele Ticks schneller sind als ... (95 %, 99 %), damit Spitzen sichtbar werden und nicht nur der Mittelwert.

**Wohin ein Tick geht** (`node --max-old-space-size=4096 test/phasen.js erde 1500 400`, Node, Server):
| | Erde, 400 Bots | Welt, 150 Bots |
| --- | --- | --- |
| Tick im Mittel | 16.8 ms | 1.7 ms |
| 95 % / 99 % der Ticks unter | 24 / 33 ms | 3.2 / 6.6 ms |
| längster Tick | 54 ms | 11 ms |
| Eroberung (`tickAttack`, `removeClusters`, `shrinkBox`) | 77 % | 70 % |
| Dichte (`postTick`: Marsch, Taschen) | 14 % | 13 % |
| Bots und Nationen (`AI.tick`) | 7 % | 10 % |
| Einheiten, Seerouten, Bahn | 2 % | 6 % |

Ein CPU-Profil (`node --cpu-prof test/erde.js 1500`) zeigt dasselbe ohne Messaufschlag: in der Eroberung `tickAttack`, `fixBorder`, `addFront`, `removeClusters` je 11 bis 16 %, in der Dichte `postDijkstra` 5 %, `postPockets` 4 %, `postFlow` 3 %. Müllabfuhr 1.4 %.

**Truppendichte, Urteil: bleibt, ist kein Engpass.**
- Gerechnet wird nicht pro Feld, sondern pro Zelle von 16 x 16 Feldern (auf der Erde etwa 63 000 Zellen statt 16 Mio. Felder). Jedes Reich kommt nur alle `FLOW` Ticks dran, versetzt (`(T + id) % FLOW`); Feldwechsel ändern nur einen Zähler der Zelle (`postGain`, `postLose`).
- Die Anzeige rechnet einmal pro Sekunde, höchstens 1.5 ms pro Bild (`shadeScan`), und ändert nur Felder, deren Stufe wechselt. Seit dem ruhigeren Schatten (drei Stufen, geglättet) wechseln kaum noch Stufen, also wird auch kaum nachgemalt.
- Mit 14 % kostet die Dichte gut ein Sechstel dessen, was die Eroberung kostet. Sie zu entfernen brächte auf der Erde rund 2 ms pro Tick, im Worker, ohne sichtbaren Gewinn beim Bild. Darum kein Grund, sie zu vereinfachen.
- Verbessert: Die Suche nach abgeschnittenen Taschen (`postPockets`) lief bei jedem Marschschritt über alle Zellen. Die Gruppen ändern sich aber nur, wenn eine Zelle dazukommt oder wegfällt (Zähler `post.cv`). Jetzt werden sie bis dahin behalten: 0.40 statt 0.77 ms pro Tick auf der Erde, gleiches Ergebnis (Prüfsumme über Besitzer, Truppen, Gold und jede Zelle mit Truppen, Tasche und Gruppe auf Welt und Erde gleich, `det.js` in allen Varianten, `posture.js`, `SUM=1 stress.js` gleich).
- Noch möglich, falls nötig: `postDijkstra` (5 %) nur neu rechnen, wenn sich Zellen, Schienen oder Mangel geändert haben. Lohnt sich heute nicht.

**Bots, Urteil: billig.** 7 bis 10 % eines Ticks. Jeder Bot entscheidet nur alle 28 bis 52 Ticks, versetzt (`AI.rate`, `AI.off`). Einzelne Ticks mit 22 ms auf der Erde, wenn ein Bot einen Angriff startet oder ein Boot plant. Im Worker stört das kein Bild. Nichts geändert.

**Speicher:** Die Liste der geänderten Felder (`game.dirty`) hatte einen Platz für jedes Feld, auf der Erde 65 MB, gebraucht werden pro Tick etwa 10 000. Sie wächst jetzt bei Bedarf wie die des Spiegels: Arrays der Simulation auf der Erde 346 statt 410 MB, also 64 MB weniger im Worker (und ohne Worker auf der Seite). Grössere Brocken bleiben: `stamp` und `q` (je 65 MB, Arbeitsspeicher der Suchen über die Karte) und die Karte selbst.

**Was der Auftrag sonst verlangt und wie es steht:**
| Punkt | Stand |
| --- | --- |
| Prüfung des ganzen Spiels, Engpässe nach Wirkung | gemacht: diese Datei, oben die Tabellen |
| Dichte | geprüft, bleibt, Taschen-Suche schneller (oben) |
| Zeichnen: WebGL 2, wenig Zeichenaufrufe, nur Sichtbares | Karte auf der Grafikkarte, unsichtbare Schiffe weggelassen, Schiffsbilder vorgezeichnet. Einheiten bleiben Canvas 2D, bis es über 1000 gleichzeitig sichtbare werden (Plan Punkt 4) |
| Animationen | Schiffe gleiten mit dem Tempo der Simulation, Effekte nur im Bild. Nicht gemessen als eigener Posten; bei unter 300 Einheiten klein |
| Simulation: Raster statt jeder gegen jeden, Arbeit verteilt | Kriegsschiffe über Raster, Seerouten Stück für Stück, Kessel und Grenzen nur bei Änderung |
| Bots | geprüft, billig (oben) |
| Getrennte Takte | Simulation 10 Ticks/s im Worker, Bild mit der Bildrate, Dichte-Anzeige 1/s, Bots alle 3 bis 5 s, Hafen alle 10 Ticks, Kessel alle 20 |
| Speicher, Müllabfuhr | Müllabfuhr 1.4 %, `dirty` 64 MB kleiner (oben); Doppelung Worker/Spiegel bleibt der Preis der Trennung |
| Lasttests 100 bis 10 000 | `stress.js` (Schiffe), `stress_view.js` (Bild), neu `phasen.js` (Teile und Spitzen) |
| Einzelne Soldaten, Flugzeuge als eigene Objekte | gibt es im Spiel nicht (Truppen sind eine Zahl pro Zelle). Plan Punkt 6, eine Entscheidung zum Spiel |

## Messbank Wachstum (27.11.2026): womit wächst was?
Neue Messbank `test/skala.js`. Sie spielt dieselbe Runde (Startwert 7, eine Person ohne Befehle, Bots, Nationen, wo die Karte welche hat) und misst ab Tick 300 bis Tick 1200 jeden Teil des Ticks. Das Spiel läuft dabei wie im Browser in `G.simWorker`. Was der Worker schickt, wird wie von `postMessage` kopiert (`v8.serialize`) und in einen Spiegel (`G.SyncIn`) geschrieben. So sieht man auch, was der Gleichlauf zwischen Worker und Seite kostet. Jeder Lauf ist ein eigener Prozess. Node 22, Server mit 2 Kernen. Ein Handy ist 3- bis 5-mal langsamer.

Vier Reihen, jede ändert nur eine Grösse:
- **Felder:** eine Zufallskarte gleicher Form in 0.5, 2, 8 und 16 Mio. Feldern, immer 150 Bots, keine Nationen.
- **Spieler:** Zufallskarte mit 2 Mio. Feldern, 50, 150, 400 und 1000 Bots.
- **Einheiten:** Weltkarte, 150 Bots, dazu 0, 2000 und 8000 Schiffe (wie `stress.js`; viele gehen im Kampf unter, gezählt sind die, die schwimmen).
- **Erde:** die echte Karte mit 400 und 100 Bots und allen Nationen.

### Ergebnis kurz
- **Die Grösse der Karte kostet fast keine Rechenzeit, nur Speicher.** Von 0.5 auf 16 Mio. Felder wird der Tick 2-mal langsamer (1.2 auf 2.4 ms), bei 32-mal mehr Feldern. Kein Teil des Ticks geht jeden Tick über die ganze Karte. Die Rechenzeit folgt der Länge der Grenzen und Fronten und dem, was erobert wird.
- **Die Erde ist teuer wegen ihrer Fronten, nicht wegen ihrer Fläche.** Eine Zufallskarte mit 16 Mio. Feldern und 150 Bots braucht 2.4 ms pro Tick. Die Erde mit 517 Reichen braucht 15.4 ms. Sie hat 4-mal so viel Grenze (184 000 Felder), 2.5-mal so viel Front und 3-mal so viel Eroberung pro Tick (3144 Felder).
- **Mit den Spielern wächst nichts quadratisch.** Von 62 auf 1000 Reiche wächst jeder Teil höchstens linear (Exponent 0.1 bis 0.8).
- **Mit den Einheiten wächst die Simulation fast quadratisch, aber nur dort, wo viele Schiffe dicht beieinander sind.** Kriegsschiffe auf der Weltkarte: 283 auf 788 Schiffe, `tickUnit` von 1.2 auf 12.9 ms (Exponent 1.9).
- **Neu gefunden: Der Gleichlauf Worker → Seite kostet auf der Erde 25 % zusätzlich zum Tick** (3.8 ms im Worker, 1.4 ms auf der Seite, 138 kB pro Tick). Mit vielen Schiffen wird er teurer als die Schiffe selbst: Erde mit 2065 Einheiten 12.5 ms packen, `tickUnit` nur 7 ms.

### Wohin ein Tick der Erde geht und womit es wächst
Erde, 400 Bots, 517 Reiche am Leben, Mittel über 800 Ticks. «Wächst mit» ist der Exponent aus den Reihen. 1 heisst im gleichen Schritt, 2 heisst mit dem Quadrat, 0 heisst gar nicht.

| Teil | ms pro Tick | Anteil | wächst mit | Einordnung |
| --- | ---: | ---: | --- | --- |
| **Tick, Mittel** (99 % unter, längster) | **15.4** (31.8, 50.7) | 100 % | Felder hoch 0.2, Grenze hoch 0.6 bis 1.2 | echt |
| Eroberung `tickAttack` (mit `addFront`, `conquer`, `fixBorder`) | 8.9 | 58 % | eroberte Felder und Front; Felder hoch 0.4, Spieler hoch 0.1 | echt: etwa 2.8 µs pro erobertem Feld |
| darin `refreshFront` | 0.5 | 3 % | Grenze des Angreifers (liest 2242 Grenzfelder pro Tick) | echt |
| Inseln und Kessel `removeClusters` | 2.3 | 15 % | Grenze hoch 0.8 bis 0.9 | echt: liest 6900 Grenzfelder pro Tick, **98.7 % der Aufrufe finden nichts** |
| Dichte `postTick` (`postFlow`) | 2.1 | 14 % | Zahl der Reiche mit Aufstellung (165 Nationen), nicht mit Bots oder Feldern | echt; 0.4 ms bei Feldern 0.5 → 16 Mio. gleich |
| darin `postDijkstra` | 1.1 | 7 % | gleich | echt |
| darin `postPockets` | 0.4 | 3 % | gleich | echt |
| Bots und Nationen `AI.tick` | 1.2 | 8 % | Spieler hoch 0.6 (`neighbors` liest die Grenze) | echt |
| Rest (Truppen und Gold aller Reiche) | 0.5 | 3 % | Spieler hoch 0.8 | echt |
| Einheiten, Seerouten, Bahn | 0.2 | 1 % | Einheiten (siehe unten) | heute klein |
| **Worker: Änderungen packen** (`Out.step`) | **3.8** | +25 % | Spieler hoch 0.7, Einheiten hoch 0.4 | **echt, bisher nicht gemessen** |
| Kopieren (wie `postMessage`) | 0.6 | | Grösse der Nachricht | echt |
| **Seite: Spiegel nachführen** (`In.apply`) | **1.4** | Haupt-Thread | Grenze hoch 0.7 | echt |

CPU-Profil der Erde (`node --cpu-prof test/erde.js 1200`), Anteil an der ganzen Laufzeit ohne Kartenbau: `tickAttack` selbst 17 %, `addFront` 14 %, `fixBorder` 13 %, `removeClusters` 11 %, `postDijkstra` 4 %, `postFlow` 3 %, Müllabfuhr 1.6 %. In `fixBorder` sind die Kosten fast nur `Set.add` und `Set.delete` auf der Grenze. 37 % dieser Aufrufe ändern nichts (Feld war schon drin oder schon draussen).

### Die vier Reihen
| Reihe | Tick | Eroberung | Kessel | Dichte | Bots | Worker packen | Seite | Nachricht |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Felder 0.5 Mio. | 1.16 ms | 0.40 | 0.27 | 0.15 | 0.15 | 0.88 | 0.12 | 15 kB |
| Felder 2 Mio. | 2.06 | 1.03 | 0.42 | 0.22 | 0.24 | 0.82 | 0.22 | 28 kB |
| Felder 8 Mio. | 2.61 | 1.55 | 0.45 | 0.20 | 0.25 | 0.72 | 0.30 | 39 kB |
| Felder 16 Mio. | 2.38 | 1.37 | 0.45 | 0.20 | 0.22 | 0.72 | 0.29 | 39 kB |
| Spieler 62 | 1.67 | 0.98 | 0.26 | 0.22 | 0.13 | 0.47 | 0.18 | 22 kB |
| Spieler 159 | 2.37 | 1.22 | 0.46 | 0.23 | 0.27 | 0.83 | 0.25 | 28 kB |
| Spieler 403 | 2.97 | 1.29 | 0.67 | 0.24 | 0.39 | 1.70 | 0.26 | 36 kB |
| Spieler 1000 | 3.78 | 1.31 | 0.86 | 0.22 | 0.70 | 3.18 | 0.35 | 52 kB |
| Welt, 40 Einheiten | 2.14 | 0.85 | 0.47 | 0.26 | 0.23 | 1.36 | 0.20 | 22 kB |
| Welt, 283 Einheiten | 4.75 | 0.85 | 0.35 | 0.21 | 0.21 | 2.11 | 0.36 | 38 kB |
| Welt, 788 Einheiten | 15.07 (99 %: 255) | 0.85 | 0.39 | 0.21 | 0.21 | 4.02 | 0.60 | 57 kB |
| Erde 252 Reiche | 12.00 | 6.90 | 1.66 | 2.06 | 0.86 | 2.40 | 1.09 | 110 kB |
| Erde 517 Reiche | 15.39 | 8.93 | 2.33 | 2.10 | 1.24 | 3.81 | 1.41 | 138 kB |
| Erde 517 Reiche, 854 Einheiten | 21.15 | | | | | 7.69 | | 204 kB |
| Erde 517 Reiche, 2065 Einheiten | 27.15 (99 %: 93) | | | | | 12.52 | | 255 kB |

Bei den Feldern ab 8 Mio. bleibt alles gleich, weil 150 Bots in 1200 Ticks nur einen Teil des Landes einnehmen (gleiches Tempo der Eroberung ab 2 Mio. Feldern, `map.S` höchstens 1).

**Schiffe im Einzelnen** (`stress.js welt 2000,8000 200` mit Zählern): Ein Kriegsschiff sucht alle 5 Ticks ein Ziel. `seaNear` gibt im Mittel 212 Schiffe aus den Zellen um es zurück, nur 22 % davon sind in Reichweite. Die Liste wird jedes Mal sortiert. `seaNear` allein ist 35 % der Zeit der Kriegsschiffe. Quadratisch wird es mit der **Dichte**: Doppelt so viele Schiffe im selben Meer heisst doppelt so viele Kandidaten pro Schiff. Auf der Erde (grösseres Meer) sind 2065 Einheiten 7 ms, auf der Welt 788 schon 13 ms.

**Was die Nachricht ausmacht** (Erde, 400 Bots, 152 kB pro Tick im Mittel): Felder 97 kB (64 %), Spieler 52 kB (davon Aufstellung der anderen 20 kB, Truppen 6 kB, Gold 3 kB, Rest kleine Werte), Spiel 2 kB, Einheiten 1 kB. Pro Tick gehen etwa 13 900 Felder hinüber, erobert werden aber nur 3144. Der Rest sind Nachbarn, die `fixBorder` zum Nachmalen markiert, weil sich ihre Grenzfarbe ändern kann. Ihr Besitzer ist unverändert. 10 Ticks pro Sekunde machen 1.4 MB/s. Im Browser ist das nur Kopieren im Speicher, über ein Netz wäre es zu viel.

### Speicher pro Feld (Erde, 16.25 Mio. Felder)
Gezählt mit `skala.js erde`: jedes typisierte Array ab 64 kB, das an Karte, Spiel und Spiegel hängt. Dazu die Arrays des Bilds und der Grafikkarte aus dem Code (`src/06_view.js`, `src/06b_gl.js`). Im Browser liegt die Karte zweimal vor, im Worker und auf der Seite.

| Wo | Array | Byte pro Feld | MB | Braucht es jedes Feld? |
| --- | --- | ---: | ---: | --- |
| Karte (×2) | `land`, `mag`, `shore`, `cover`, `feat`, `snow` | 6 × 1 | 6 × 16 | Nur Landfelder haben Gelände. `snow` liest nur das Bild, die Simulation nie. `land`, `shore` und `mag` zusammen brauchen 7 Bit |
| Karte (×2) | `wcomp` (Gewässer) | 2 | 33 | nur Wasserfelder; die Seite liest es über `buildCheck` und Co. |
| Karte (×2) | `hgt` (Höhe, ein Viertel der Auflösung) | 0.25 | 4 | |
| Simulation | `owner` | 2 | 33 | ja (Wasser bleibt 0) |
| Simulation | `stamp` (Marke der Suchen) | 4 | 65 | Arbeitsspeicher. Eine Marke mit 16 Bit und Neubeginn beim Überlauf ergibt dasselbe |
| Simulation | `q` (Warteschlange der Suchen) | 4 | 65 | Arbeitsspeicher. Gebraucht wird höchstens so viel, wie das grösste Reich Felder hat. Auf der Erde sind das wenige 100 000 |
| Simulation | `fallout`, `dirtyFlag` | 2 × 1 | 2 × 16 | `dirtyFlag` ist ein Bit |
| Simulation | Grenzen als `Set` (222 000 Einträge, etwa 26 Byte) | 0.4 | 6 | nur Grenzfelder |
| Spiegel | `owner`, `fallout`, `dirtyFlag` | 4 | 65 | ja |
| Spiegel | `dirty` | klein | | In `skala.js` wuchs es auf 4 Mio., weil dort niemand malt und die Liste nie geleert wird. Im Browser leert das Bild sie jedes Mal (Korrektur vom 27.11., Abend) |
| Bild | `View.base` (Grundfarbe) | 4 | 65 | mit WebGL nur beim Hochladen nötig |
| Bild | `MapGL.word` | 2 | 33 | ja (vergleicht, was neu gefärbt werden muss) |
| Bild | beim Start von WebGL: `rgba` der ganzen Karte | 4 | 65 | nur kurz, aber eine Spitze. Ein Stück nach dem anderen reicht |
| Bild ohne WebGL | Bilddaten und Canvas | 8 | 130 | nur im Rückfall |
| Grafikkarte | Besitzer R16UI, Grund RGBA, Farbe RGBA | 10 | 162 | |
| **Zusammen** | Worker 329 MB, Seite 313 MB (ohne Rückfall), Grafikkarte 162 MB | | | dazu JS-Speicher (Worker in Node 164 MB) |

Das passt zur Messung im Browser vom 24.11. (alle Chrome-Prozesse 1.9 GB).

### Bild mit vielen Schiffen
`node test/stress_view.js 0,1000,5000,10000` (Weltkarte, Chrome ohne Grafikkarte, 2D-Bild, ein Bild):

| Schiffe | ganze Karte | mittel (Zoom 3) | nah (Zoom 12) |
| --- | ---: | ---: | ---: |
| 0 | 0.7 ms | 0.4 ms | 0.1 ms |
| 1 000 | 13.4 ms | 9.2 ms | 0.4 ms |
| 5 000 | 41.6 ms | 23.7 ms | 7.8 ms |
| 10 000 | 90.2 ms | 51.8 ms | 18.4 ms |

Etwa 9 µs pro sichtbares Schiff. Ab rund 1000 sichtbaren Schiffen reicht ein Bild nicht mehr für 60 Bilder pro Sekunde, auf dem Handy schon früher.

### Echt, wahrscheinlich, theoretisch
| | Befund | Einordnung |
| --- | --- | --- |
| Erde: 15.4 ms Simulation + 3.8 ms packen = 19 ms im Worker pro Tick | auf dem Handy 60 bis 95 ms von 100 ms. Im Mehrspieler bremst das langsamste Gerät alle | **echt** |
| Erde: rund 640 MB Arrays (Worker und Seite) + 160 MB Grafikkarte, 1.9 GB im Browser | ein Handy-Tab kann daran sterben | **echt** (auf einem echten Handy noch nicht gemessen) |
| Gleichlauf: 138 kB pro Tick, 1.4 ms Haupt-Thread | wächst mit Einheiten schneller als die Simulation | **echt** |
| Kessel-Prüfung liest jede 20 Ticks die ganze Grenze, fast immer ohne Ergebnis | 15 % des Ticks | **echt** |
| Kriegsschiffe bei Dichte fast quadratisch | heute unter 300 Schiffe in echten Runden; mit langsameren Schiffen und mehr Einheiten | **wahrscheinlich** |
| Bild: 9 µs pro sichtbares Schiff in Canvas 2D | ab 1000 sichtbaren Schiffen | **wahrscheinlich** |
| quadratisch mit Spielern | nicht gefunden (Exponenten bis 0.8). Schleifen über alle Spieler gibt es nur im Zug einer Nation (alle 28 bis 52 Ticks) und alle 10 Ticks in `tickDiplomacy` | **theoretisch** |
| Karte grösser als die Erde | nur Speicher (rund 40 Byte pro Feld im Arbeitsspeicher, 10 auf der Grafikkarte), kaum Rechenzeit | **theoretisch** |

## Geändert am 27.11.2026: Punkt 1, Gleichlauf Worker → Seite schlanker
1. **Nur Felder, die sich ändern:** Die Simulation merkt sich in `dirtyFlag`, warum ein Feld neu gemalt wird: 1 = Nachbar eines geänderten Felds (`fixAround`), 2 = Besitzer oder Verstrahlung gewechselt (`conquer`, `relinquish`, Bombe), 3 = nur malen (`dirtyDisc`). Die Simulation liest diese Marke nie. Hinüber gehen nur Felder mit 2 (mit Besitzer, die Verstrahlung nur, wenn eines der Felder welche hat) und mit 3 (nur als Liste). Die Seite malt die Nachbarn der geänderten Felder selbst nach, wie `fixAround` sie im Worker markiert.
2. **Vergleich nach Platz statt nach Namen** (`Out.diff`): Was zuletzt geschickt wurde, steht pro Objekt in zwei Listen in der Reihenfolge der Felder. Bisher war es eine Map mit Nachschlagen pro Feld. Felder, die nie hinüber gehen, werden an ihrem Platz übersprungen. Kommt ein Feld dazu oder fällt eines weg, wird ab dort nach Namen verglichen. Die Nachricht ist dieselbe.

Gemessen mit `skala.js` (Erde, 400 Bots, Ticks 400 bis 1200; vorher und nachher nacheinander auf derselben Maschine):

| | vorher | nachher |
| --- | ---: | ---: |
| Nachricht pro Tick | 133 kB | **74 kB** (−45 %) |
| grösste Nachricht | 480 kB | 394 kB |
| Worker: Änderungen packen | 4.9 ms | **3.6 ms** (−27 %) |
| Kopieren (wie `postMessage`) | 0.66 ms | 0.60 ms |
| Seite: Spiegel nachführen | 1.41 ms | 1.25 ms (−11 %) |
| mit 2000 Schiffen dazu (854 schwimmen): Nachricht / packen | 205 kB / 8.4 ms | 131 kB / 7.1 bis 7.6 ms |

Weniger als im Plan geschätzt (packen etwa 1.5 ms). Was bleibt: Jeder Spieler kostet beim Vergleich etwa 5 µs, jede Einheit etwa 3 µs (Erde: 570 Spieler, 889 Einheiten). Das sind die Prüfsummen der Listen und Maps eines Objekts (`units`, `cnt`, `allies`, `path`, Verweise) und das Durchgehen der Felder. Schneller ginge das nur, wenn die Simulation selbst sagt, was sich geändert hat (eine Nummer pro Änderung). Das wäre ein Eingriff an vielen Stellen, darum nicht jetzt. Bei vielen Einheiten bleibt der Gleichlauf ein Posten (Punkt 5 und der Server, unten).

Geprüft: Prüfsumme `SUM=1 stress.js welt 0,2000,8000` gleich, `det.js` (alle fünf Varianten) und `posture.js` Zeichen für Zeichen gleich. `worker.js` auf Welt, Erde und «Rohstoffe»: Spiegel = Worker in jedem Feld und Wert, Kartenbild Feld für Feld richtig. `gl.js` grün. In beiden Tests schlägt hier nur «keine Fehler auf der Seite» fehl, weil der Server ohne Internet eine Quelle nicht laden kann (`ERR_TUNNEL_CONNECTION_FAILED`). Das tut auch der Stand vor der Änderung.

## Geändert am 27.11.2026: Punkt 2, Grenze auch als Bit pro Feld
`game.edge` hat ein Bit pro Feld: Das Feld steht in der Grenze seines Besitzers. Es ist immer gleich wie `players[owner[t]].border.has(t)`. Nachgeführt wird es überall, wo eine Grenze sich ändert (`fixBorder`, `conquer`, `relinquish`, `kill`). Die Sets behalten Inhalt und Reihenfolge. `fixBorder` ruft `Set.add`/`delete` nur noch, wenn sich etwas ändert. `removeClusters` fragt das Bit statt `border.has`. Speicher: 2 MB auf der Erde. Arbeitsspeicher des Workers, geht nicht hinüber (`SKIP_GAME`).

Gemessen mit `skala.js` (Erde, 400 Bots), fünfmal abwechselnd vorher und nachher, weil der Server stark schwankt:

| | vorher (5 Läufe) | nachher (5 Läufe) |
| --- | --- | --- |
| `removeClusters` | 2.44 bis 2.75 ms | **1.45 bis 1.57 ms** (−41 %, in jedem Paar etwa −1 ms) |
| `tickAttack` | 8.44 bis 9.73 ms | 8.20 bis 9.05 ms (im Rauschen) |
| Tick, Mittel | 15.1 bis 17.2 ms | 13.9 bis 15.1 ms (Median der Paare −1.3 ms, −8 %) |

Weniger als geschätzt (2 bis 3 ms). Das Überspringen der leeren Set-Operationen in `fixBorder` bringt kaum etwas, der Gewinn kommt aus `removeClusters`.

Geprüft: Prüfsumme `SUM=1 stress.js` gleich, `det.js` (alle fünf Varianten) und `posture.js` Zeichen für Zeichen gleich, `sim.js`, `all.js`, `level.js`, `neu.js` grün, `worker.js` (Welt, Erde) und `gl.js` grün bis auf die fehlende Internetquelle.

## Geändert am 27.11.2026: Punkt 3, weniger Speicher pro Feld
1. **Marken der Suchen mit 16 Bit** (`stamp`): `nextSid` beginnt nach 65 000 Suchen neu und löscht dabei alle Marken. Keine Suche läuft in einer anderen, darum ergibt das dieselben Antworten. Geprüft mit Neubeginn schon nach 300 Suchen: Prüfsummen über 8000 Ticks Welt und 3000 Ticks Erde gleich.
2. **Warteschlange der Suchen wächst bei Bedarf** (`qFor`). Jede Suche sagt, wie viel sie höchstens braucht: `capturePocket` die Felder des Reichs, `tnTouches` und `portSite` die Raute ihres Radius, `boatPlan` 4 × 6000 + 1.
3. **Karte im Worker ohne `snow`** (`G.mapPack(map, true)`): nur das Bild liest es.
4. **Grundfarben mit WebGL nur auf der Grafikkarte** (`View.ground`): Die Kopie auf der Seite wird nach dem Hochladen freigegeben. Das 2D-Bild (auch nach Verlust der Grafikkarte) und `View.color` machen sie bei Bedarf neu.
5. **WebGL-Start in Streifen von 256 Zeilen** statt mit einer Kopie der ganzen Karte.

Nicht gemacht: `dirtyFlag` als Bits. Es trägt seit Punkt 1 den Grund (0 bis 3). Die 4 Mio. von `dirty` im Spiegel waren ein Fehler der Messbank (siehe Tabelle oben).

Gemessen im Browser (Chrome ohne Grafikkarte, Erde, 25 Sekunden gespielt, Summe des Speichers aller Chrome-Prozesse, je zwei Läufe):

| | vorher | nachher |
| --- | ---: | ---: |
| mit WebGL (`?gl=1`, wie auf dem Handy mit Grafikkarte) | 2264 bis 2274 MB | **2045 bis 2077 MB** (−190 bis −230 MB) |
| mit WebGL, Spitze | 2403 bis 2417 MB | **2055 bis 2181 MB** (−240 bis −350 MB) |
| mit WebGL, JS-Speicher der Seite | 372 MB | 285 bis 303 MB |
| 2D-Bild | 1911 bis 1913 MB | 1873 bis 1902 MB (−10 bis −40 MB) |
| 2D-Bild, Spitze | 2155 MB | 2059 bis 2101 MB |

Weniger als die 220 MB aus der Liste der Arrays, und mit 2D-Bild fast nichts. Der Grund: Ein Array, in das nie geschrieben wird, belegt beim Betriebssystem keinen Speicher. Die alte Warteschlange `q` mit 65 MB war fast leer und kostete darum kaum echten Speicher. Echt gespart haben die Grundfarben auf der Seite und die Kopie beim WebGL-Start. In Software rechnet hier auch die Grafikkarte im Arbeitsspeicher; die Zahlen enthalten sie.

Geprüft: Prüfsumme `SUM=1 stress.js`, `det.js` (alle Varianten), `posture.js` gleich; lange Runden (oben) gleich; `gl.js` (WebGL wie `View.color`, in Stücke geschnitten, Verlust der Grafikkarte) und `worker.js` (Welt, Erde) grün bis auf die fehlende Internetquelle.

## Plan (27.11.2026), nach Nutzen. Wartet auf OK
Ersetzt den Plan vom 24.11. Dessen Punkt 2 (Worker) ist gebaut, die übrigen Punkte gehen hier auf. Ziel: die Erde auf einem mittleren Handy, mit Platz für mehr Einheiten. Heute braucht der Worker 19 ms pro Tick, im Speicher liegen rund 640 MB Arrays.

Bei jedem Punkt steht, ob die Simulation berührt wird. Wenn ja, müssen die Prüfsumme (`SUM=1 node test/stress.js`), `det.js` (alle Varianten) und `posture.js` vorher und nachher gleich sein. Immer müssen `worker.js` und `gl.js` grün bleiben. Ein Punkt, der in der Messung weniger bringt als erwartet, wird verworfen und nicht committet.

| # | Was | Erwarteter Gewinn (aus den Messungen oben) | Aufwand | Risiko |
| --- | --- | --- | --- | --- |
| 1 ✓ | **Gleichlauf schlanker** (gebaut 27.11., Ergebnis oben: Nachricht −45 %, packen −27 %) (`src/05b_sync.js`): Felder nur schicken, wenn der Besitzer oder die Verstrahlung wechselt (die Seite markiert die Nachbarn selbst zum Nachmalen), Verstrahlung nur wenn nicht 0. Die Zahlen, die sich jeden Tick ändern (Truppen, Gold, Felder der Spieler, Lage der fahrenden Einheiten), gehen gepackt in einem Array statt Feld für Feld mit Prüfsumme | Nachricht 138 → etwa 45 kB (Felder 97 → etwa 25 kB). Packen im Worker 3.8 → etwa 1.5 ms. Spiegel auf der Seite 1.4 → etwa 0.6 ms. Mit 2000 Einheiten packen 12.5 → etwa 3 ms. Ist zugleich das Format für den Server (unten) | mittel | Spiel unberührt. Gefahr: Spiegel weicht ab (`worker.js`), Rand falsch gemalt (`gl.js`, Pixelvergleich) |
| 2 ✓ | **Grenze auch als Bit pro Feld** (gebaut 27.11.: Kessel-Prüfung −41 %, Tick etwa −8 %) (ein Bit «gehört zur Grenze seines Besitzers»): `removeClusters` fragt das Bit statt `Set.has`, `fixBorder` überspringt `Set.add`/`delete`, die nichts ändern (37 %) | `removeClusters` 2.3 → etwa 1 ms, `fixBorder` etwa ein Drittel weniger. Zusammen etwa 2 bis 3 ms von 15.4 (15 bis 20 %). Schätzung aus dem Profil, zuerst messen | klein | Simulation: Die Sets behalten Inhalt und Reihenfolge, das Ergebnis ist darum dasselbe. Jede Stelle, die eine Grenze ändert (`conquer`, `relinquish`, `fixBorder`, `kill`), muss das Bit mitführen. Prüfsumme |
| 3 ✓ | **Weniger Speicher pro Feld** (gebaut 27.11.: im Browser mit WebGL −0.2 GB, Spitze −0.3 GB): `stamp` mit 16 Bit und Neubeginn beim Überlauf (−32 MB), `q` wächst bei Bedarf (−65 MB), Karte im Worker ohne `snow` (−16 MB), `View.base` mit WebGL nach dem Hochladen freigeben (−65 MB), WebGL-Start Stück für Stück statt ganze Karte auf einmal (−65 MB Spitze), `dirty` des Spiegels ohne Sprung auf 4 Mio. (−15 MB), `dirtyFlag` als Bits auf beiden Seiten (−28 MB) | Erde: −220 MB von 640 (−35 %), dazu −65 MB Spitze beim Start | mittel | `stamp` und `q` sind Arbeitsspeicher der Simulation: Prüfsumme. Die Teile auf der Seite: `gl.js`, `worker.js` und der Rückfall ohne Grafikkarte |
| 4 | **Zielsuche der Kriegsschiffe genauer**: `seaNear` filtert schon nach Abstand (mit Rand für die Bewegung im Tick) und sortiert nicht mehr. Das beste Ziel wird nach (Wert, Platz in `units`) gewählt, also wie heute | Bei dichten Schiffen etwa die halbe Zeit für Kriegsschiffe (heute 212 Kandidaten pro Suche, nur 22 % in Reichweite, `seaNear` 35 % der Zeit). Welt 788 Einheiten `tickUnit` 13 → etwa 6 ms, Erde 2065 Einheiten 7 → etwa 3.5 ms | klein | Simulation: Prüfsumme von `stress.js` mit 1000 bis 10 000 Schiffen |
| 5 | **Einheiten über die Grafikkarte** (`src/06b_gl.js`): die schon vorgezeichneten Schiffsbilder als Textur, alle Schiffe einer Art in einem Zeichenaufruf, gedreht im Shader. Spuren, Linien und Effekte bleiben 2D. Ohne WebGL bleibt alles wie heute | 1000 Schiffe auf der ganzen Karte 13.4 → unter 2 ms pro Bild, 5000: 42 → wenige ms (Schätzung; ohne Grafikkarte hier nicht messbar, nur in Software) | gross | Bild: muss gleich aussehen. Neuer Pixelvergleich 2D gegen WebGL in `gl.js`. Lohnt sich, sobald echte Runden 1000 sichtbare Einheiten haben (langsamere Schiffe, Flugzeuge). Darum nach 1 bis 4 |
| — | Quadratisch mit Spielern | nichts zu tun (gemessen: höchstens linear) | — | — |
| — | Nicht vorgeschlagen: Kern der Eroberung (58 %). `addFront` zieht Zufall in der Reihenfolge der Grenze; jede andere Ordnung ändert das Spiel. Kessel-Prüfung nur bei Änderung: Das Ergebnis hängt an der Reihenfolge und am grössten Stück, «gleich» lässt sich nicht sicher zeigen, darum Punkt 2. `postDijkstra` nur bei Änderung: 7 %, betrifft heute nur Nationen | | | |

Wenn 1 bis 4 halten, was die Messung verspricht: Worker auf der Erde 19 → etwa 14 ms pro Tick, Speicher 640 → etwa 420 MB, Nachricht 138 → etwa 45 kB. Danach auf einem echten Handy messen (alter Plan Punkt 1). Erst dann entscheiden, ob es mehr braucht, zum Beispiel die Bytes der Karte zusammenpacken (`land`, `shore`, `mag`, `cover`, `feat` in 2 statt 5 Byte, −97 MB). Das berührt rund 100 Lesestellen, viele in heissen Schleifen.

### Nur beschrieben: die Simulation auf einem Server, jeder sieht nur, was er sieht
**Heute:** Jedes Gerät rechnet das ganze Spiel. Der Mehrspieler über MQTT schickt nur Befehle (Gleichlauf). Im Browser rechnet ein Worker, die Seite liest einen Spiegel, den der Worker mit Änderungen nachführt (`G.SyncOut`/`G.SyncIn`).

**Später:** Der Server rechnet `G.Game` in Node (das tun alle Tests schon heute). Jedes Gerät hat nur noch den Spiegel. Was heute `postMessage` zwischen Worker und Seite ist, wird eine WebSocket-Verbindung zwischen Server und Gerät. Die Befehle gehen wie heute als `exec` hin. Ein Gerät kann so nichts mehr sehen oder rechnen, was es nicht bekommt. Der Nebel wird dann echt und nicht nur Anzeige.

**Was dafür heute schon richtig aufgebaut sein muss:**
1. **Die Nachricht ist das Protokoll.** Sie muss klein und in Zahlen gepackt sein (Punkt 1). Heute sind es 1.4 MB/s pro Gerät, über ein Netz sollten es höchstens einige 10 kB/s sein. Dazu eine Versionsnummer und eine ganze Erstnachricht für den Einstieg und nach einem Abbruch (`first` gibt es schon).
2. **Für wen eine Nachricht ist, steht schon heute im Code:** `SKIP_OTHER` und «Angriffe nur der eigenen Person». Daraus wird eine Regel «was sieht Spieler X», vor dem Packen angewandt. Die Felder kommen nur im Sichtbereich, fremde Einheiten nur in Sichtweite, fremde Zahlen nur so genau, wie man sie sehen darf.
3. **Die Sicht muss Regel der Simulation sein, nicht der Anzeige.** Heute rechnet die Seite den Nebel (`fogScan`, `fogHides` in `06_view.js`). Er gehört in eine reine Funktion des Spielstands, ohne DOM, damit der Server sie anwenden kann. Und er muss über Zellen gerechnet werden (zum Beispiel die 16 x 16 Felder der Aufstellung), nicht Feld für Feld für jeden Spieler. Sonst wird es Spieler mal Felder.
4. **Das Gerät darf nichts brauchen, was es nicht sieht.** Die Fragen der Bedienung (`buildCheck`, `cost`, `structNear`) laufen auf dem Spiegel. Sie dürfen nur eigene und sichtbare Daten brauchen. Was mehr braucht, entscheidet der Server beim Befehl, wie heute schon `exec`.
5. **Nichts auf der Seite schreibt ins Spiel** (gilt schon: `postDensSeen`). Die Seite rechnet keine Spielregeln nach, die vom Spielstand anderer abhängen.
6. **Gleiche Zahlen auf jedem Gerät** bleiben nützlich: für Wiederholungen, Tests und einen Server, der neu starten kann. Für die Geräte braucht es sie dann nicht mehr.
7. **Kosten auf dem Server:** ein Spiel auf der Erde braucht heute etwa 19 ms pro Tick, also 19 % eines Kerns. Punkt 1 bis 4 senken das. Die Sicht pro Spieler kommt dazu.

## Wie man misst
- Womit was wächst (Felder, Grenze, Spieler, Einheiten), Speicher pro Feld, Nachricht Worker → Seite: `node --max-old-space-size=6144 test/skala.js [felder|spieler|einheiten|erde|alle] [ticks]` (alle Reihen etwa 10 Minuten).
- Wohin ein Tick geht, je Teil und mit Spitzen: `node test/phasen.js [karte] [ticks] [bots]`.
- Simulation: `node test/stress.js [karte] [N,N] [ticks]`, mit `SUM=1` zusätzlich eine Prüfsumme über Spieler und Einheiten, um vorher und nachher zu vergleichen.
- Bild: `python3 tools/build.py`, dann `node test/stress_view.js [N,N]`. Mit `HTML=/pfad/zur/datei.html` lässt sich ein älterer Stand vergleichen.
- Woher langsame Ticks kommen: `node test/prof.js` (Weltkarte) oder `node --cpu-prof test/erde.js 2000`.
- Headless-Chrome schwankt von Lauf zu Lauf um etwa 20 %. Darum vorher und nachher abwechselnd mehrmals laufen lassen.
- Seit dem Worker misst `prof.js` im Browser nur noch den Haupt-Thread. Die Simulation misst man in Node (`erde.js`, `stress.js`). Die Browser-Tests, die direkt ins Spiel greifen (`ui.js`, `stress_view.js` usw.), öffnen die Seite mit `?worker=0`.
- WebGL lässt sich hier nur in Software messen (`?gl=1`). Echte Zahlen gibt es nur auf einem Gerät mit Grafikkarte, im Browser über die Entwicklerwerkzeuge (Leistung, GPU).
