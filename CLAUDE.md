# Grenzland (lllkkkopa): Projektkarte

Echtzeit-Eroberungsspiel im Browser, Nachbau von OpenFront, als eine einzige HTML-Datei. Doku und Spieltexte deutsch (Schweizer Schreibweise: «ss», «Grösse»), Code-Kommentare englisch, Commit-Texte deutsch.

## Zuerst lesen, wenig lesen
- Nicht lesen und nicht durchsuchen: `build/index.html`, `docs/index.html`, `build/*.json` (riesige Ausgabedateien). Bei Grep `src/`, `tools/`, `test/` angeben.
- Die grossen Dateien (`03_game`, `04_units`, `06_view`, `07_ui`) nie ganz lesen: erst Grep nach dem Suchbegriff aus der Tabelle, dann nur die Stelle mit `offset`/`limit`.
- Regeln, Zahlen und Begründungen stehen in `doku/`. Nur die eine passende Datei öffnen (Tabelle unten).

## Arbeitsablauf
1. Nur `src/` ändern, nie `build/index.html` oder `docs/index.html` von Hand.
2. `python3 tools/build.py` schreibt `build/index.html` (klassisch) und `build/rohstoffe.html` (Version «Rohstoffe»); danach nach `docs/index.html` und `docs/rohstoffe/index.html` kopieren (GitHub Pages liefert `/docs` auf `main`). Alle vier mitcommitten.
3. Passenden Test laufen lassen, dann pushen. Es arbeiten mehrere Leute: vor dem Push den aktuellen `main` holen.

## Feste Regeln
- Die Simulation muss auf jedem Gerät dieselben Zahlen liefern (Mehrspieler schickt nur Befehle). Darum `const Math = G.M`, Zufall nur über den RNG mit Startwert (`src/00_util.js`), kein `Math.random` oder `Date.now` in der Simulation. `node test/det.js` und `node test/posture.js` prüfen das.
- Die Zahlen stammen aus dem OpenFront-Quellcode. Bewusste Abweichungen stehen in `doku/openfront-abgleich.md`; dort nachführen, wenn eine dazukommt.
- Die Quellenangabe der Kartendaten auf dem Startbildschirm muss bleiben (`doku/erde.md`).
- Die Reihenfolge der Dateien steht in `tools/build.py`; eine neue `src`-Datei dort eintragen (`SIM` für die Simulation, die auch im Worker läuft, `PAGE` für die Seite).
- Das Spiel läuft im Browser in einem Web Worker, die Seite liest eine Kopie, den Spiegel (`src/05b_sync.js`, `src/08b_host.js`). Die Anzeige verändert das Spiel nie, auch nicht nebenbei (siehe `postDensSeen`). Neue Felder der Simulation gehen von selbst hinüber. Reiner Arbeitsspeicher der Simulation (Heaps, Raster, Listen zum Wiederverwenden) kommt in `SKIP_GAME` und Co. `node test/worker.js` prüft, dass der Spiegel gleich bleibt.

## Leistung und Aufbau (Richtlinien, Kurzfassung)
Ziel: grosse Karten, viele Spieler und Einheiten, später Mehrspieler über einen Server, und das Spiel bleibt flüssig, auch auf dem Handy. Messungen, Engpässe und Plan: `doku/leistung.md`.
- Bei jeder neuen Funktion fragen: Was kostet sie pro Tick und pro Bild, und wie wächst das mit Feldern, Spielern und Einheiten (100, 1000, 10 000)? Was quadratisch wächst (jeder gegen jeden), braucht eine Suche über ein Raster wie `seaNear` (`src/04_units.js`).
- Simulation und Zeichnen bleiben getrennt. Die Simulation kennt kein DOM. Sie läuft im Worker und könnte so auch auf einen Server umziehen. Die Karte färbt die Grafikkarte (`src/06b_gl.js`), ohne sie das 2D-Bild. Beide folgen denselben Regeln (`View.color`), das prüft `test/gl.js`.
- Teure Arbeit nicht öfter als nötig: nur bei Änderungen (`markDirty`, `lastChange`), über Ticks verteilt (`(T + id) % n`), nur Sichtbares zeichnen.
- Im Hot Path keine unnötigen Objekte und Strings pro Einheit und Bild (Müllabfuhr).
- Erst messen, dann ändern (`test/stress.js`, `test/stress_view.js`, `test/prof.js`). Melden, was echt ist, was wahrscheinlich kommt und was nur theoretisch ist. Kein Umbau ohne messbaren Nutzen, keine Mikro-Optimierung.
- Optimieren darf keine Spielregel ändern: `det.js` und `posture.js` müssen gleich bleiben, und bei Simulationsänderungen eine Prüfsumme vorher und nachher vergleichen (`SUM=1 node test/stress.js`).
- Bedenken früh ansprechen, solange sie billig zu beheben sind.

## Karte von `src/` (Reihenfolge wie im Build, Zeilen ungefähr)
| Datei | Zeilen | Inhalt, Suchbegriffe |
| --- | --- | --- |
| `00_util.js` | 130 | RNG mit Startwert, `G.M` (Math, überall gleich), `G.fmt`, `G.within` |
| `01_map.js` | 270 | Karten laden und erzeugen, `G.SPECIAL_MAPS`, `G.COVER`, Gelände, Klima (`G.CLIMATE`, `G.addClimate`, `G.rowLats`, `map.elevOf`, `map.tempOf`, `map.coldOf`) |
| `02_path.js` | 270 | Seerouten (A*), `G.SeaGraph` |
| `03_game.js` | 1100 | Spielkern `G.Game`, Spielertypen `PT`, Einheiten `UT` (Gebäude zuerst, `G.isStruct`), Eroberung und Angriff (`conquer`, `attack`, `tickAttack`), Konstanten `G.COMBAT` (Bodenkampf), `G.MOMENTUM` (Schwung), `G.KESSEL`, `G.TERRAIN`, `G.groundSpeed`, `G.groundLoss`, `G.PACE`, `G.START_GOLD`, `G.BOT_BOUNTY`, `G.LAND_GOLD`, `G.NUKE_PEACE`, `pathLane` |
| `03c_res.js` | 270 | nur Version «Rohstoffe» (eingefroren): `G.RAW`, `G.WARE`, `G.RES_ICON`, Ländertabelle, Vorkommen (`attachCountries`, `map.deposits`), Anlagen auf Vorkommen (`G.DIG`, `G.DIG_OF`, `digCheck`, `dig`, `digGold`, `digAuto`, Zustand `game.dg`), `resTick`, `wareOf`; im klassischen Build nicht enthalten |
| `03b_posture.js` | 330 | Aufstellung (Truppen-Netz): `postEffect`, `HAND` |
| `03d_level.js` | 440 | Feldzug: Levels als Daten `G.LEVELS`, `G.levelMap`, `levelSetup`, `levelTick`, `levelAllows`, Zustand `game.lv` |
| `04_units.js` | 1050 | Gebäude und Ausbau (`G.MAX_LEVEL`, `G.BUILD_TICKS`), Tarnturm (`cloakScan`, `hiddenFrom`, `seenCount`, `G.CLOAK_COVER`), Bomben, Flugabwehr (`G.CRUISE_RANGE`), Häfen nach Stufe (`G.HAFEN`, `tickPort`, `shipKind`), Kriegsschiffe (`tickWarship`, `patrolPoint`, `shipboom`, `G.WARSHIP_CAPTURE`) |
| `04b_rail.js` | 330 | Fabrik, Schienen, Züge: `railPath` (nur waagrecht und senkrecht), `rebuildRails`; Lieferungen `G.BAHN`, `tickDeliveries`, `railGuess` |
| `05_ai.js` | 370 | Bots und Nationen: `AI.nukeTarget` |
| `05b_sync.js` | 490 | Simulation im Worker: Änderungen pro Tick (`G.SyncOut`), Spiegel auf der Seite (`G.SyncIn`), Felder, die nicht hinüber gehen (`SKIP_GAME`, `SKIP_PLAYER`, `SKIP_ATTACK`), Karte kopieren (`G.mapPack`), Worker-Schleife (`G.simWorker`), Vergleich für Tests (`G.syncDump`) |
| `06a_audio.js` | 190 | Ton und Musik aus dem Browser: `G.Audio` |
| `06b_gl.js` | 440 | Karte auf der Grafikkarte (WebGL 2): `G.MapGL`, Shader `FS_TILE` (Regeln wie `View.color`), Stücke (`chunks`), Schattierung pro Zelle (`shade`), Rückfall ohne Grafikkarte (`MapGL.wanted`, `?gl=0`, `?gl=1`) |
| `06_view.js` | 2480 | Zeichnen: `View.color` (Farbe eines Felds), `flush`, `shadeScan`, `View.pose`, `drawReach`, `drawRaids`, `drawFronts`, `drawNet`, `railGeo`, `worldColors`, `placeName`, `G.ICON` |
| `07_ui.js` | 1560 | Bedienung: Tasten, Menüs, Touch, `#hotbar`, `view.ghost`, `showPeek` |
| `08_net.js` | 310 | Mehrspieler über MQTT: `G.RELAYS` |
| `08b_host.js` | 110 | Wo das Spiel läuft: `G.Host` (Worker oder mit `?worker=0` auf der Seite), `exec`, `order`, `step`, `ready` |
| `07b_level.js` | 210 | Feldzug auf dem Bildschirm: `G.Feldzug` (Levelseite, Quest-Leiste `#lvBar`, Tipps `#lvTip`, Endfenster); nutzt `G.ui` aus `07_ui.js` |
| `template.html` | | Seitengerüst (HTML und CSS) |

Weitere Ordner: `tools/` (Bauen und Kartenerzeugung, Python), `test/` (Tests, Node), `build/` und `docs/` (Ausgabe).

## Welche Datei in `doku/`
| Frage | Datei |
| --- | --- |
| Tasten, Bots, Ausbau, Flugabwehr, Schienen, Bomben-Anzeige, Arsenal (Satellitenstrahl, Tarnturm) | `spielregeln.md` |
| Netz, Marsch, Dichte und ihre Wirkung | `aufstellung.md` |
| Schalter «Truppenkonzentration», «Netz», «Richtungsangriff», «Angriffspfeile planen» | `pfeile.md` |
| Kampfsysteme «Grenzland» und «Feste Grenzen» | `kampfsysteme.md` |
| Kessel, Schwung, «Bahn: Lieferungen», «Häfen nach Stufe», Gebäude nach Stufe | `testschalter.md` |
| Erdkarte, Daten, Lizenzen der Daten, Gelände | `erde.md` |
| Mehrspieler, Vermittler | `mehrspieler.md` |
| Version «Rohstoffe»: Länder, Preise, Länderkarte | `rohstoffe.md` |
| Herkunft der Zahlen, Abweichungen von OpenFront | `openfront-abgleich.md` |
| Welcher Test wofür | `tests.md` |
| Feldzug: Levels, Quests, Sterne, wie man ein Level anlegt | `feldzug.md` |
| Was wann und warum geändert wurde | `aenderungen.md` |
| Wohin das Spiel geht, Reihenfolge der nächsten Schritte | `vision.md` |
| Leistung: Messungen, Engpässe, Plan | `leistung.md` |

## Welcher Test
- Regeln und Zahlen: `node test/sim.js`, `node test/all.js`
- Bodenkampf: `node test/kampf.js` (Messbank; `systeme` vergleicht die zwei Kampfsysteme), Gleichlauf je System: `node test/det.js grenzland`, `node test/det.js grenzen`
- Gleichlauf auf allen Geräten: `node test/det.js`, `node test/det.js arsenal`, `node test/posture.js`
- Tarnturm: `node test/tarn.js`
- Schalter (Truppenkonzentration, Netz, Richtung, Pfeile): `node test/pfeile.js`
- Version «Rohstoffe»: `node --max-old-space-size=4096 test/res.js`
- Feldzug (jedes Level baut sich, bleibt gleich, ist zu gewinnen): `node test/level.js`
- Bedienung im Browser: `node test/ui.js` (braucht Playwright und Chrome), schnelles Verdichten, Kürzel, Bauleiste: `node test/pinsel.js`
- Leistung: `node test/stress.js` (Simulation mit 100 bis 10 000 Schiffen), `node test/stress_view.js` (Bild, nach dem Build)
- Worker und Spiegel: `node test/worker.js [karte] [sekunden]`, Karte auf der Grafikkarte: `node test/gl.js` (beide nach dem Build). Browser-Tests, die direkt ins Spiel greifen, öffnen die Seite mit `?worker=0`.
