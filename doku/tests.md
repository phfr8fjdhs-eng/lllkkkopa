# Tests
Alle Tests liegen in `test/` und laufen mit `node test/<name>.js`. Ohne Browser: Simulation. Mit Browser (Playwright, Chrome): Bedienung und Bilder.

`node test/rail.js` (Fabriken und Gleise im Browser), `node test/sim.js` (Simulation), `node test/all.js` (alle Karten), `node test/play.js [desktop]` (Browser-Durchlauf mit Screenshots, braucht Playwright + Chrome).
`node test/det.js` (zwei Kopien desselben Spiels bleiben mit denselben Befehlen gleich), `node test/ui.js [desktop]` (Start, Kreismenü, Baumenü, Ausbau, Zielen, Beute), `node test/net.js` (zwei Browser spielen über einen lokalen Vermittler zusammen; braucht `npm install aedes websocket-stream` in /tmp/broker).

## Welcher Test wofür
| Test | Prüft |
| --- | --- |
| `sim.js` | Simulation ohne Browser: Regeln, Buchhaltung, Tempo |
| `all.js` | jede Karte kurz mit Prüfungen, dazu die erfundene Karte |
| `det.js` | zwei Kopien desselben Spiels bleiben mit denselben Befehlen gleich |
| `posture.js` | Aufstellung: Buchhaltung, Marsch, Befehl, Rückzug, Gleichlauf |
| `human.js` | ein Skript führt alle Aktionen des menschlichen Spielers aus |
| `sea.js [karte] [routen]` | Seerouten über den Seegraphen, jedes Feld geprüft |
| `erde.js [ticks] [bots]` | die Erde ohne Browser, Tempo und Speicher (`node --max-old-space-size=4096`) |
| `prof.js` | zeigt, woher langsame Ticks kommen |
| `ui.js`, `feat.js`, `play.js`, `rail.js`, `rich.js`, `shot.js`, `aufstellung.js` | Browser: Bedienung, neue Funktionen, Durchlauf, Gleise, Gebäude und Raketen, Bilder, Netz; Bilder landen in `build/` |
| `net.js` | zwei Browser spielen über einen lokalen Vermittler zusammen |
| `load.js` | Hilfsdatei, lädt die Karten für die anderen Tests (kein Test) |
