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
- Die Reihenfolge der Dateien steht in `tools/build.py`; eine neue `src`-Datei dort eintragen.

## Karte von `src/` (Reihenfolge wie im Build, Zeilen ungefähr)
| Datei | Zeilen | Inhalt, Suchbegriffe |
| --- | --- | --- |
| `00_util.js` | 130 | RNG mit Startwert, `G.M` (Math, überall gleich), `G.fmt`, `G.within` |
| `01_map.js` | 270 | Karten laden und erzeugen, `G.SPECIAL_MAPS`, `G.COVER`, Gelände, Klima (`G.CLIMATE`, `G.addClimate`, `G.rowLats`, `map.elevOf`, `map.tempOf`, `map.coldOf`) |
| `02_path.js` | 270 | Seerouten (A*), `G.SeaGraph` |
| `03_game.js` | 1100 | Spielkern `G.Game`, Spielertypen `PT`, Einheiten `UT`, Eroberung und Angriff (`conquer`, `attack`, `tickAttack`), Konstanten `G.TERRAIN`, `G.groundSpeed`, `G.groundLoss`, `G.PACE`, `G.START_GOLD`, `G.BOT_BOUNTY`, `G.LAND_GOLD`, `G.NUKE_PEACE`, `pathLane` |
| `03c_res.js` | 270 | nur Version «Rohstoffe»: `G.RAW`, `G.WARE`, `G.RES_ICON`, Ländertabelle, Vorkommen (`attachCountries`, `map.deposits`), Anlagen auf Vorkommen (`G.DIG`, `G.DIG_OF`, `digCheck`, `dig`, `digGold`, `digAuto`, Zustand `game.dg`), `resTick`, `wareOf`; im klassischen Build nicht enthalten |
| `03b_posture.js` | 330 | Aufstellung (Truppen-Netz): `postEffect`, `HAND` |
| `04_units.js` | 980 | Gebäude und Ausbau (`G.MAX_LEVEL`, `G.BUILD_TICKS`), Bomben, Flugabwehr (`G.CRUISE_RANGE`), Kriegsschiffe (`tickWarship`, `patrolPoint`, `shipboom`, `G.WARSHIP_CAPTURE`) |
| `04b_rail.js` | 250 | Fabrik, Schienen, Züge: `railPath` (nur waagrecht und senkrecht), `rebuildRails` |
| `05_ai.js` | 370 | Bots und Nationen: `AI.nukeTarget` |
| `06a_audio.js` | 190 | Ton und Musik aus dem Browser: `G.Audio` |
| `06_view.js` | 1570 | Zeichnen: `View.pose`, `drawReach`, `drawRaids`, `drawFronts`, `drawNet`, `railGeo`, `worldColors`, `placeName`, `G.ICON` |
| `07_ui.js` | 1560 | Bedienung: Tasten, Menüs, Touch, `#hotbar`, `view.ghost`, `showPeek` |
| `08_net.js` | 310 | Mehrspieler über MQTT: `G.RELAYS` |
| `template.html` | | Seitengerüst (HTML und CSS) |

Weitere Ordner: `tools/` (Bauen und Kartenerzeugung, Python), `test/` (Tests, Node), `build/` und `docs/` (Ausgabe).

## Welche Datei in `doku/`
| Frage | Datei |
| --- | --- |
| Tasten, Bots, Ausbau, Flugabwehr, Schienen, Bomben-Anzeige | `spielregeln.md` |
| Netz, Marsch, Dichte und ihre Wirkung | `aufstellung.md` |
| Erdkarte, Daten, Lizenzen der Daten, Gelände | `erde.md` |
| Mehrspieler, Vermittler | `mehrspieler.md` |
| Version «Rohstoffe»: Länder, Preise, Länderkarte | `rohstoffe.md` |
| Herkunft der Zahlen, Abweichungen von OpenFront | `openfront-abgleich.md` |
| Welcher Test wofür | `tests.md` |
| Was wann und warum geändert wurde | `aenderungen.md` |

## Welcher Test
- Regeln und Zahlen: `node test/sim.js`, `node test/all.js`
- Gleichlauf auf allen Geräten: `node test/det.js`, `node test/posture.js`
- Version «Rohstoffe»: `node --max-old-space-size=4096 test/res.js`
- Bedienung im Browser: `node test/ui.js` (braucht Playwright und Chrome)
