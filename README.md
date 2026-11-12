# Grenzland (OpenFront 2.0)
Eigene Umsetzung eines Echtzeit-Eroberungsspiels. Allein gegen Bots und Nationen oder mit Freunden über einen Einladungslink. Karten aus Natural Earth (Public Domain).
Bauen: `python3 tools/build.py` -> build/index.html (einzelne Datei, im Browser öffnen). Für GitHub Pages danach nach docs/index.html kopieren.
Karten neu erzeugen: `python3 tools/build_maps.py geo build`.

## Tests
`node test/rail.js` (Fabriken und Gleise im Browser), `node test/sim.js` (Simulation), `node test/all.js` (alle Karten), `node test/play.js [desktop]` (Browser-Durchlauf mit Screenshots, braucht Playwright + Chrome).
`node test/det.js` (zwei Kopien desselben Spiels bleiben mit denselben Befehlen gleich), `node test/ui.js [desktop]` (Start, Kreismenü, Baumenü, Ausbau, Zielen, Beute), `node test/net.js` (zwei Browser spielen über einen lokalen Vermittler zusammen; braucht `npm install aedes websocket-stream` in /tmp/broker).

## Zusammen spielen
Alle Geräte rechnen dasselbe Spiel aus demselben Startwert. Übertragen werden nur die Befehle der Spieler: der Gastgeber sammelt sie, nummeriert sie in Zügen und schickt sie an alle (`src/08_net.js`). Die Nachrichten laufen über einen öffentlichen MQTT-Vermittler (Liste `G.RELAYS`), weil die Seite keinen eigenen Server hat. Die Simulation rechnet mit `G.M` statt `Math`, damit jedes Gerät auf dieselben Zahlen kommt. Noch nicht geprüft: die echten öffentlichen Vermittler und gemischte Geräte (iPhone mit Android oder Computer).

## Karten, Ton und Tasten
Neben den Erdkarten gibt es Spezialkarten (`G.SPECIAL_MAPS` in `src/01_map.js`): erfundene Welten mit festem Startwert, die auf jedem Gerät gleich entstehen. Musik und Töne werden im Browser erzeugt (`src/06a_audio.js`), es wird keine Tondatei geladen; beides lässt sich im Menü, über den Lautsprecher-Knopf oder mit `M` abschalten.
Tastenkürzel wie in OpenFront (gelten für die Stelle unter dem Mauszeiger): `1` Stadt, `2` Fabrik, `3` Hafen, `4` Verteidigungsposten, `5` Silo, `6` Flugabwehr, `7` Kriegsschiff, `8` Atombombe, `9` Wasserstoffbombe, `0` MIRV, `G` angreifen, `B` Boot, `T`/`Y` Truppenanteil, `K`/`L` Allianz anfragen/brechen, `I` Info, `Q`/`E` Zoom, `WASD` schieben, `C` eigenes Gebiet, `P` Pause, `,`/`.` Tempo, Strg+Klick Baumenü. Eigene Zusätze: `V` Marschflugkörper, `Z` Satellitenstrahl, `U` ausbauen, `Enter` abfeuern, `M` Ton.
Kriegsschiffe versenken nicht mehr, sie nehmen ein: Handelsschiffe samt Gold, Boote samt der Hälfte der Truppen, besiegte Kriegsschiffe wechseln die Seite. Züge zahlen je Bahnhof 10K (eigen), 25K (Handelspartner) oder 35K (Verbündete).
`node test/feat.js` prüft das alles im Browser und legt Bilder nach `build/`.

## Bots, Tippen, Ausbau, Arsenal
Bots greifen niemanden an, bauen nichts und wachsen nur langsam bis zu einer kleinen Grösse; wer einen erobert, bekommt sein Gold und 75K Prämie (`G.BOT_BOUNTY`). Ein Tipp auf freies Land oder einen Bot greift sofort an, Nationen und Mitspieler nur über das Menü; lange drücken öffnet das Menü überall.
Ein Tipp auf ein eigenes Gebäude öffnet die Ausbaukarte mit «+1», «+5» und «Max». Städte gehen bis Stufe 100 (`G.CITY_MAX_LEVEL`), alles andere bis 5. Wie in OpenFront zählt jede Stufe wie ein weiteres Gebäude: Stadt 125K, 250K, 500K, danach je 1M, pro Stufe +25K Truppen-Limit. `Shift`+`1`–`6` baut das nächste Gebäude dieser Art aus.
Spielmodus «Arsenal» (`opts.arsenal`): zusätzlich der Satellitenstrahl (`UT.LASER`, Taste `Z`, 600K, 45 s Nachladen, kein Silo, nicht abfangbar, keine Verstrahlung). Auch Nationen setzen ihn ein.

## Abgleich mit OpenFront
Die Zahlen stammen aus dem OpenFront-Quellcode (`packages/engine-lib/src/configuration/Config.ts`, `packages/engine/src/configuration/EngineConfig.ts`, Stand 11.11.2026): Baukosten (Hafen und Fabrik teilen sich eine Preisleiter, MIRV +15M je bereits gestartetem MIRV), Bauzeiten, Truppen-Limit und -Zuwachs, Stärke der Nationen je Schwierigkeit, Allianzdauer 5 Minuten, Nachladezeit von Silo und Flugabwehr 9 s, Reichweite der Flugabwehr je Stufe, Verteidigungsposten (Verluste x5, Tempo x3), Zug-Gold, Handelsschiff-Gold, Bombenradien. Bewusst anders: Bots (schwächer, greifen nicht an, 75K Prämie), Kriegsschiffe nehmen ein statt zu versenken, Städte höchstens Stufe 100, Marschflugkörper und Satellitenstrahl gibt es nur hier.

