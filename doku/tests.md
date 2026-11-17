# Tests
Alle Tests liegen in `test/` und laufen mit `node test/<name>.js`. Mehrere brauchen das Bildmodul `sharp` unter `/opt/npm-tools` (`mkdir -p /opt/npm-tools && cd /opt/npm-tools && npm init -y && npm i sharp`). Ohne Browser: Simulation. Mit Browser (Playwright, Chrome): Bedienung und Bilder.

`node test/rail.js` (Fabriken und Gleise im Browser), `node test/sim.js` (Simulation), `node test/all.js` (alle Karten), `node test/play.js [desktop]` (Browser-Durchlauf mit Screenshots, braucht Playwright + Chrome).
`node test/det.js` (zwei Kopien desselben Spiels bleiben mit denselben Befehlen gleich), `node test/ui.js [desktop]` (Start, Kreismenü, Baumenü, Ausbau, Zielen, Beute), `node test/net.js` (zwei Browser spielen über einen lokalen Vermittler zusammen; braucht `npm install aedes websocket-stream` in /tmp/broker).

## Welcher Test wofür
| Test | Prüft |
| --- | --- |
| `sim.js` | Simulation ohne Browser: Regeln, Buchhaltung, Tempo |
| `all.js` | jede Karte kurz mit Prüfungen, dazu die erfundene Karte |
| `det.js` | zwei Kopien desselben Spiels bleiben mit denselben Befehlen gleich, auch mit Stössen |
| `posture.js` | Aufstellung: Buchhaltung, Marsch, Befehl, Stoss, Rückzug, Schienen im Umkreis, Gleichlauf |
| `kampf.js [teil des namens \| stoss \| tal]` | Messbank Bodenkampf: feste Szenarien (40K gegen 10K bis 400K gegen 100K, ein oder mehrere Klicks), erwartet erobert oder steckt, Aufstellung gegen einen Topf; Stösse: ganze Front, Abschnitt und Keil mit gleichen Truppen (Keil kommt tiefer), Tal durch einen Gebirgszug; `abwehr`: Eingraben, Reserven, Kessel |
| `human.js` | ein Skript führt alle Aktionen des menschlichen Spielers aus |
| `sea.js [karte] [routen]` | Seerouten über den Seegraphen, jedes Feld geprüft |
| `erde.js [ticks] [bots]` | die Erde ohne Browser, Tempo und Speicher (`node --max-old-space-size=4096`) |
| `res.js [ticks] [bots]` | Version «Rohstoffe» auf der Erde: Länder, Zählung, Einkommen, Gleichlauf (`node --max-old-space-size=4096`) |
| `prof.js` | zeigt, woher langsame Ticks kommen |
| `ui.js`, `feat.js`, `play.js`, `rail.js`, `rich.js`, `shot.js`, `aufstellung.js` | Browser: Bedienung, neue Funktionen, Durchlauf, Gleise, Gebäude und Raketen, Bilder, Netz; Bilder landen in `build/` |
| `pinch.js` | Browser, Handy: Zoom mit zwei Fingern bleibt am Punkt zwischen den Fingern |
| `vollbild.js` | Browser: Vollbild-Knopf, Vollbild beim Start auf dem Handy, Hinweis auf dem iPhone |
| `handel.js` | Handelsschiffe über ein langes Spiel auf der Weltkarte: Zähler stimmt, keines auf Land oder ohne Route, gekaperte fahren zu einem Hafen des neuen Besitzers |
| `rohstofftabelle.js` | Browser, Version «Rohstoffe»: Tabelle öffnen (Knopf und Gold), Anlage bauen und ausbauen, Fabrik ausbauen, zum Vorkommen fliegen; `desktop` als Argument für den Desktop, Bilder `build/rt_*.png` |
| `net.js` | zwei Browser spielen über einen lokalen Vermittler zusammen |
| `insel.js` | Tipp auf das Festland eines Gegners greift übers Land an, Tipp auf seine Insel schickt ein Boot, auch während der Landangriff läuft |
| `load.js` | Hilfsdatei, lädt die Karten für die anderen Tests (kein Test) |
- `node test/pfeile.js`: Schalter: Netz aus lässt nichts malen, Netz an wie bisher, mehrere Pfeile teilen den Anteil gleichmässig, zwei Läufe gleich.
