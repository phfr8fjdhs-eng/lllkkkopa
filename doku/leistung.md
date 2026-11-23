# Leistung: Messungen, Engpässe, Plan (24.11.2026)

Die Richtlinien des Projekts zu Leistung und Aufbau (Kurzfassung in `CLAUDE.md`) und was sie für das heutige Spiel heissen. Alle Zahlen sind gemessen, nicht geschätzt. Node 22 auf einem Server, Browser = Chrome ohne Grafikkarte (headless). Auf einem Handy ist alles etwa 3- bis 5-mal langsamer. Die Zahlen sind darum zum Vergleichen da, nicht als Versprechen.

## Was «viele Objekte» in diesem Spiel heisst
Grenzland zählt Truppen als Zahl pro Land, nicht als einzelne Soldaten (siehe `vision.md`: «keine einzelnen Einheiten, die man von Hand schiebt»). Was mit dem Spiel wächst, sind darum:
- **Felder der Karte:** Weltkarte 0.9 Mio., Erde 16.3 Mio. (5600 x 2902). Das ist die grösste Zahl im Spiel.
- **Spieler:** auf der Erde bis 569 (Bots und Nationen).
- **Einheiten:** Gebäude, Schiffe, Züge, Bomben. In echten Runden heute 100 bis 300, im Stresstest bis 10 000.

Kommen einmal einzelne Soldaten, Panzer oder Flugzeuge als eigene Objekte dazu, braucht es ein anderes Datenmodell (Felder statt Objekte, siehe Plan Punkt 6). Das ist eine Entscheidung zum Spiel, nicht zur Technik.

## Was gut ist (bleibt so)
- **Simulation getrennt vom Zeichnen:** fester Takt von 10 Ticks pro Sekunde, das Bild zeichnet dazwischen weich (`alpha`). Die Simulation läuft ohne Browser in Node (alle Tests tun das).
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

## Geändert am 24.11.2026
1. **Zielsuche der Kriegsschiffe über ein Raster** (`seaGrid`, `seaNear` in `src/04_units.js`). Die Schiffe werden einmal pro Tick in Zellen von 32 Feldern sortiert. Ein Kriegsschiff schaut nur die Zellen in seiner Reichweite an, in derselben Reihenfolge wie vorher. Ergebnis geprüft: Prüfsumme über alle Spieler und Einheiten (Ort, Leben, Besitzer, Ziel) vorher und nachher gleich, `det.js` (alle Varianten) und `posture.js` gleich.
2. **Karte blockweise nachmalen** (`flush` in `src/06_view.js`): nur Blöcke von 32 x 32 Feldern mit einer Änderung, nebeneinanderliegende in einem Zug. Geprüft: nach 800 Ticks stimmt jedes Pixel des Kartenbilds mit den Daten.
3. **Schiffe ausserhalb des Bildschirms** bekommen keine weiche Lage mehr berechnet und keine Spur gemalt. Ausnahme: eigene Transportboote und solche, die zu dir fahren, weil ihre ganze Linie gezeigt wird. Die Spur eines Boots ist ein Pfad mit einer Füllung statt vieler Rechtecke. Schiffe werden mit `setTransform` statt `save`/`restore` gesetzt. Im Bild sieht man keinen Unterschied (Bildschirmfoto geprüft).
4. **Zwei neue Messbänke:** `test/stress.js` und `test/stress_view.js`.

## Plan: was als Nächstes, nach Wirkung
Unterschieden wird: **echt** (heute messbar), **wahrscheinlich** (kommt mit dem Wachstum) und **theoretisch** (erst bei Bedarf).

1. **Erde auf dem Handy messen (echt, zuerst).** Die Erde ist die Standardkarte: 16 bis 19 ms Simulation pro Tick, 410 MB Speicher, Kartenbild 16.25 Mio. Pixel. iPhones erlauben ein Canvas von höchstens etwa 16.7 Mio. Pixeln, die Karte liegt knapp darunter. Ein Tab mit so viel Speicher kann auf dem iPhone abstürzen. Vorschlag: auf einem echten Handy die Bildrate und den Speicher messen (Safari: Entwicklermenü, Chrome: Remote Debugging). Erst danach entscheiden, ob es eine Erde in halber Auflösung für Handys braucht.
2. **Simulation in einen Web Worker (wahrscheinlich, gross).** Auf dem Handy brauchen die 16 bis 19 ms schätzungsweise 50 bis 90 ms des 100-ms-Takts, und zwar im selben Thread wie Bild und Bedienung. Das gibt Ruckler. Die Simulation braucht kein DOM und läuft schon in Node. Vorgehen: Besitzer-Array und Einheiten über `SharedArrayBuffer` teilen, oder pro Tick nur die geänderten Felder und Einheiten schicken. Das ist dieselbe Trennung, die ein späterer Server braucht. Aber: `SharedArrayBuffer` verlangt besondere Header, die GitHub Pages nicht setzt. Darum der Weg mit Nachrichten. Erst nach Punkt 1, falls das Handy ruckelt.
3. **Kern der Eroberung schneller (wahrscheinlich, Risiko für den Gleichlauf).** `removeClusters` geht alle 20 Ticks über die ganze Grenze jedes Reichs, das sich geändert hat. Auf der Erde ist das 13 %. Möglich wäre, nur bei Änderungen in der Nähe einer Engstelle zu prüfen. Jede Änderung hier muss `det.js` und die Messbank `kampf.js` bestehen.
4. **Schiffe auf der ganzen Karte (theoretisch).** Erst ab etwa 1000 gleichzeitig sichtbaren Schiffen spürbar, heute sind es unter 300 (`G.TRADE_MAX`). Wenn nötig: Bilder in 16 Richtungen vorgedreht (spart etwa die Hälfte) oder ein WebGL-Zeichner nur für Einheiten. Die Karte bliebe Canvas 2D.
5. **WebGL für alles (theoretisch).** Heute nicht nötig: Das Kartenbild ist ein `drawImage` pro Bild. Eine Umstellung wäre gross und brächte nur bei sehr vielen Einheiten etwas.
6. **Einzelne Soldaten, Panzer, Flugzeuge (Entscheidung zum Spiel).** Falls sie kommen: Daten in Arrays pro Eigenschaft (x, y, Besitzer, Leben) statt eines Objekts pro Einheit, Suche über ein Raster wie bei den Kriegsschiffen, Zeichnen gebündelt (WebGL). Vor dem Bau festlegen.

## Wie man misst
- Simulation: `node test/stress.js [karte] [N,N] [ticks]`, mit `SUM=1` zusätzlich eine Prüfsumme über Spieler und Einheiten, um vorher und nachher zu vergleichen.
- Bild: `python3 tools/build.py`, dann `node test/stress_view.js [N,N]`. Mit `HTML=/pfad/zur/datei.html` lässt sich ein älterer Stand vergleichen.
- Woher langsame Ticks kommen: `node test/prof.js` (Weltkarte) oder `node --cpu-prof test/erde.js 2000`.
- Headless-Chrome schwankt von Lauf zu Lauf um etwa 20 %. Darum vorher und nachher abwechselnd mehrmals laufen lassen.
