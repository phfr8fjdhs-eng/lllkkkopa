# Leistung: Messungen, Engpässe, Plan (24.11.2026)

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

## Plan: was als Nächstes, nach Wirkung
Unterschieden wird: **echt** (heute messbar), **wahrscheinlich** (kommt mit dem Wachstum) und **theoretisch** (erst bei Bedarf).

Stand 24.11.2026: Punkt 2 (Worker) ist gebaut, dazu das Zeichnen der Karte auf der Grafikkarte (Teil von Punkt 5, nur die Karte). Punkt 1 bleibt der nächste Schritt, jetzt mit dem neuen Aufbau.

1. **Erde auf dem Handy messen (echt, zuerst).** Die Erde ist die Standardkarte: 16 bis 19 ms Simulation pro Tick, 410 MB Speicher, Kartenbild 16.25 Mio. Pixel. iPhones erlauben ein Canvas von höchstens etwa 16.7 Mio. Pixeln, die Karte liegt knapp darunter. Ein Tab mit so viel Speicher kann auf dem iPhone abstürzen. Vorschlag: auf einem echten Handy die Bildrate und den Speicher messen (Safari: Entwicklermenü, Chrome: Remote Debugging). Erst danach entscheiden, ob es eine Erde in halber Auflösung für Handys braucht.
2. **Simulation in einen Web Worker (wahrscheinlich, gross).** Auf dem Handy brauchen die 16 bis 19 ms schätzungsweise 50 bis 90 ms des 100-ms-Takts, und zwar im selben Thread wie Bild und Bedienung. Das gibt Ruckler. Die Simulation braucht kein DOM und läuft schon in Node. Vorgehen: Besitzer-Array und Einheiten über `SharedArrayBuffer` teilen, oder pro Tick nur die geänderten Felder und Einheiten schicken. Das ist dieselbe Trennung, die ein späterer Server braucht. Aber: `SharedArrayBuffer` verlangt besondere Header, die GitHub Pages nicht setzt. Darum der Weg mit Nachrichten. Erst nach Punkt 1, falls das Handy ruckelt.
3. **Kern der Eroberung schneller (wahrscheinlich, Risiko für den Gleichlauf).** Laut `phasen.js` 70 bis 77 % eines Ticks und damit der grösste Hebel, der noch bleibt. `removeClusters` geht alle 20 Ticks über die ganze Grenze jedes Reichs, das sich geändert hat. Auf der Erde ist das 13 %. Möglich wäre, nur bei Änderungen in der Nähe einer Engstelle zu prüfen. Jede Änderung hier muss `det.js` und die Messbank `kampf.js` bestehen.
4. **Schiffe auf der ganzen Karte (theoretisch).** Erst ab etwa 1000 gleichzeitig sichtbaren Schiffen spürbar, heute sind es unter 300 (`G.TRADE_MAX`). Wenn nötig: Bilder in 16 Richtungen vorgedreht (spart etwa die Hälfte) oder ein WebGL-Zeichner nur für Einheiten. Die Karte bliebe Canvas 2D.
5. **WebGL für alles (theoretisch).** Heute nicht nötig: Das Kartenbild ist ein `drawImage` pro Bild. Eine Umstellung wäre gross und brächte nur bei sehr vielen Einheiten etwas.
6. **Einzelne Soldaten, Panzer, Flugzeuge (Entscheidung zum Spiel).** Falls sie kommen: Daten in Arrays pro Eigenschaft (x, y, Besitzer, Leben) statt eines Objekts pro Einheit, Suche über ein Raster wie bei den Kriegsschiffen, Zeichnen gebündelt (WebGL). Vor dem Bau festlegen.

## Wie man misst
- Wohin ein Tick geht, je Teil und mit Spitzen: `node test/phasen.js [karte] [ticks] [bots]`.
- Simulation: `node test/stress.js [karte] [N,N] [ticks]`, mit `SUM=1` zusätzlich eine Prüfsumme über Spieler und Einheiten, um vorher und nachher zu vergleichen.
- Bild: `python3 tools/build.py`, dann `node test/stress_view.js [N,N]`. Mit `HTML=/pfad/zur/datei.html` lässt sich ein älterer Stand vergleichen.
- Woher langsame Ticks kommen: `node test/prof.js` (Weltkarte) oder `node --cpu-prof test/erde.js 2000`.
- Headless-Chrome schwankt von Lauf zu Lauf um etwa 20 %. Darum vorher und nachher abwechselnd mehrmals laufen lassen.
- Seit dem Worker misst `prof.js` im Browser nur noch den Haupt-Thread. Die Simulation misst man in Node (`erde.js`, `stress.js`). Die Browser-Tests, die direkt ins Spiel greifen (`ui.js`, `stress_view.js` usw.), öffnen die Seite mit `?worker=0`.
- WebGL lässt sich hier nur in Software messen (`?gl=1`). Echte Zahlen gibt es nur auf einem Gerät mit Grafikkarte, im Browser über die Entwicklerwerkzeuge (Leistung, GPU).
