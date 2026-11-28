# Tests
Alle Tests liegen in `test/` und laufen mit `node test/<name>.js`. Seit dem 24.11.2026 läuft das Spiel im Browser in einem Worker: Browser-Tests, die direkt ins Spiel greifen (`G.debug.game.tick()`, Gold setzen usw.), öffnen die Seite mit `?worker=0`. Ohne Grafikkarte zeichnet die Seite die Karte in 2D; `?gl=1` erzwingt WebGL. Mehrere brauchen das Bildmodul `sharp` unter `/opt/npm-tools` (`mkdir -p /opt/npm-tools && cd /opt/npm-tools && npm init -y && npm i sharp`). Ohne Browser: Simulation. Mit Browser (Playwright, Chrome): Bedienung und Bilder.

`node test/rail.js` (Fabriken und Gleise im Browser), `node test/sim.js` (Simulation), `node test/all.js` (alle Karten), `node test/play.js [desktop]` (Browser-Durchlauf mit Screenshots, braucht Playwright + Chrome).
`node test/det.js` (zwei Kopien desselben Spiels bleiben mit denselben Befehlen gleich), `node test/ui.js [desktop]` (Start, Kreismenü, Baumenü, Ausbau, Zielen, Beute), `node test/net.js` (zwei Browser spielen über einen lokalen Vermittler zusammen; braucht `npm install aedes websocket-stream` in /tmp/broker).

## Welcher Test wofür
| Test | Prüft |
| --- | --- |
| `sim.js` | Simulation ohne Browser: Regeln, Buchhaltung, Tempo |
| `all.js` | jede Karte kurz mit Prüfungen, dazu die erfundene Karte |
| `det.js [arsenal]` | zwei Kopien desselben Spiels bleiben mit denselben Befehlen gleich, auch mit Stössen; mit `arsenal` auch mit Tarntürmen |
| `neu.js` | «Änderungen»: jede Szene baut sich, alle starten mit Land und Gebäuden, zwei Kopien bleiben gleich, keine endet, und was sie zeigen soll, passiert in 90 s |
| `pixel.js` | Pixel-Stil: jedes Bild aus `src/06d_pixart.js` und `src/06e_pixfx.js` (Gebäude A bis E, Zustände, Züge, Flugzeuge in 8 Richtungen, Effekte) nur in den Farben der Palette (plus Spielerfarbe und Schatten), innerhalb der Grössen aus dem Plan, beim zweiten Bauen gleich; Stufe → Bild A bis E |
| `level.js` | Feldzug: jedes Level baut sich, alle starten mit Land und ihren Gebäuden, zwei Kopien bleiben gleich, ein einfaches Skript gewinnt jedes Level |
| `tarn.js` | Tarnturm: nur im Arsenal-Modus, was er versteckt (höchstens 3 Gebäude), vor wem, wann es sichtbar wird, Nationen bauen ihn |
| `spieler.js [grenzland\|grenzen] [min] [start]` | Testspieler: ein Computer spielt wie ein Mensch eine ganze Runde auf der Weltkarte; Land, Platz, verpuffte Angriffe |
| `posture.js` | Aufstellung: Buchhaltung, Marsch, Befehl, Stoss, Rückzug, Schienen im Umkreis, Gleichlauf |
| `kampf.js [teil des namens \| stoss \| tal]` | Messbank Bodenkampf: feste Szenarien (40K gegen 10K bis 400K gegen 100K, ein oder mehrere Klicks), erwartet erobert oder steckt, Aufstellung gegen einen Topf; Stösse: ganze Front, Abschnitt und Keil mit gleichen Truppen (Keil kommt tiefer), Tal durch einen Gebirgszug; `abwehr`: Eingraben, Reserven, Kessel und Kessel-Schalter; `schwung`: Schwung an und aus, zweiter Keil von derselben Stelle, Aufmarsch; `echt`: 50K gegen eine Nation, die seit 2 Minuten steht, gegen die OpenFront-Formel (mindestens 45 % ihrer Felder); `systeme`: beide Kampfsysteme |
| `human.js` | ein Skript führt alle Aktionen des menschlichen Spielers aus |
| `sea.js [karte] [routen]` | Seerouten über den Seegraphen, jedes Feld geprüft |
| `erde.js [ticks] [bots]` | die Erde ohne Browser, Tempo und Speicher (`node --max-old-space-size=4096`) |
| `res.js [ticks] [bots]` | Version «Rohstoffe» auf der Erde: Länder, Zählung, Einkommen, Gleichlauf (`node --max-old-space-size=4096`) |
| `prof.js` | zeigt, woher langsame Ticks kommen |
| `stress.js [karte] [N,N] [ticks]` | Last der Simulation: N Schiffe zusätzlich (halb Kriegsschiffe, halb Handel), Zeit pro Tick und je Teil; `SUM=1` gibt eine Prüfsumme über Spieler und Einheiten zum Vergleich vorher/nachher |
| `phasen.js [karte] [ticks] [bots]` | Wohin ein Tick der Simulation geht: Eroberung, Dichte, Bots, Einheiten, je Mittel und längster Tick, dazu 95 % und 99 % der Ticks; Erde mit `node --max-old-space-size=4096` |
| `skala.js [felder\|spieler\|einheiten\|erde\|alle] [ticks]` | Wachstum: dieselbe Runde auf Karten verschiedener Grösse, mit verschieden vielen Bots und Schiffen; je Teil des Ticks die Zeit und ob sie mit Feldern, Grenze, Spielern oder Einheiten wächst, dazu Speicher pro Feld und was der Worker pro Tick an die Seite schickt. Mit `node --max-old-space-size=6144`, `JSON=datei` schreibt die Zahlen |
| `stress_view.js [N,N]` | Browser: Zeit für ein Bild mit N Schiffen, ganze Karte, mittel, nah; `HTML=datei` für einen anderen Build; `GL=1` Karte und Schiffsrümpfe auf der Grafikkarte (hier in Software), dazu `SHIPS2D=1` die Rümpfe in 2D |
| `ui.js`, `feat.js`, `play.js`, `rail.js`, `rich.js`, `shot.js`, `aufstellung.js` | Browser: Bedienung, neue Funktionen, Durchlauf, Gleise, Gebäude und Raketen, Bilder, Netz; Bilder landen in `build/` |
| `pinch.js` | Browser, Handy: Zoom mit zwei Fingern bleibt am Punkt zwischen den Fingern |
| `vollbild.js` | Browser: Vollbild-Knopf, Vollbild beim Start auf dem Handy, Hinweis auf dem iPhone |
| `handel.js` | Handelsschiffe über ein langes Spiel auf der Weltkarte: Zähler stimmt, keines auf Land oder ohne Route, gekaperte fahren zu einem Hafen des neuen Besitzers |
| `rohstofftabelle.js` | Browser, Version «Rohstoffe»: Tabelle öffnen (Knopf und Gold), Anlage bauen und ausbauen, Fabrik ausbauen, zum Vorkommen fliegen; `desktop` als Argument für den Desktop, Bilder `build/rt_*.png` |
| `net.js` | zwei Browser spielen über einen lokalen Vermittler zusammen: der Gastgeber mit dem Spiel im Worker, der Gast ohne (`GUEST_WORKER=1` beide mit, `HOST_LOCAL=1` beide ohne); die Prüfsummen jedes 100. Ticks müssen gleich sein |
| `worker.js [karte] [sekunden]` | Browser: das Spiel im Worker, die Seite liest den Spiegel. Spielt in Echtzeit (angreifen, bauen mit unbegrenztem Gold) und prüft danach, dass der Spiegel Feld für Feld und Wert für Wert dem Worker gleicht; `HTML=build/rohstoffe.html` für die Version «Rohstoffe» |
| `gl.js [karte] [sekunden]` | Browser: die Karte auf der Grafikkarte. Liest die Farbe jedes Felds zurück und vergleicht sie mit `View.color`, auch in Stücke geschnitten, dazu der Rückfall auf das 2D-Bild, wenn die Grafikkarte verloren geht. Läuft auch ohne Grafikkarte (`?gl=1`). Dazu die Schiffsrümpfe auf der Grafikkarte (`G.ShipGL`) gegen dasselbe Bild in 2D, Pixel für Pixel, auf drei Zoomstufen |
| `insel.js` | Tipp auf das Festland eines Gegners greift übers Land an, Tipp auf seine Insel schickt ein Boot, auch während der Landangriff läuft |
| `lang.js` | Spielmodus «Langes Spiel»: Tempo und Reichweiten auf dem Meer und in der Luft gegenüber dem klassischen Spiel, Bodenkampf unverändert (`doku/langes-spiel.md`); Gleichlauf mit `node test/det.js lang` |
| `inseln.js` | «Langes Spiel», Paket 8: Die 25 Stützpunkt-Inseln (`G.ISLES`) haben auf der Erde Land, die klassische Erde bleibt gleich, keine Nation startet auf einer (braucht `build/erde.json`, viel Speicher) |
| `load.js` | Hilfsdatei, lädt die Karten für die anderen Tests (kein Test) |
- `node test/pfeile.js`: Schalter: Netz aus lässt nichts malen, Netz an wie bisher, mehrere Pfeile teilen den Anteil gleichmässig, zwei Läufe gleich. Punktangriff: nimmt nur Land im Ring um die Stelle.
- `node test/pinsel.js`: schnelles Verdichten/Ausdünnen (Taste V, Knöpfe + und −, Doppelklick halten), Knopf «?» mit allen Kürzeln, Reihenfolge der Bauleiste (braucht den Build, Playwright und Chrome).
