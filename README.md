# Grenzland (OpenFront 2.0)
Eigene Umsetzung eines Echtzeit-Eroberungsspiels. Allein gegen Bots und Nationen oder mit Freunden über einen Einladungslink. Karten aus Natural Earth (Public Domain).
Bauen: `python3 tools/build.py` -> build/index.html (einzelne Datei, im Browser öffnen). Für GitHub Pages danach nach docs/index.html kopieren.
Karten neu erzeugen: `python3 tools/build_maps.py geo build`.

## Tests
`node test/rail.js` (Fabriken und Gleise im Browser), `node test/sim.js` (Simulation), `node test/all.js` (alle Karten), `node test/play.js [desktop]` (Browser-Durchlauf mit Screenshots, braucht Playwright + Chrome).
`node test/ui.js [desktop]` (Start, Kreismenü, Baumenü, Ausbau, Zielen, Beute), `node test/net.js` (zwei Browser spielen über einen lokalen Vermittler zusammen; braucht `npm install aedes websocket-stream` in /tmp/broker).

## Zusammen spielen
Alle Geräte rechnen dasselbe Spiel aus demselben Startwert. Übertragen werden nur die Befehle der Spieler: der Gastgeber sammelt sie, nummeriert sie in Zügen und schickt sie an alle (`src/08_net.js`). Die Nachrichten laufen über einen öffentlichen MQTT-Vermittler (Liste `G.RELAYS`), weil die Seite keinen eigenen Server hat. Die Simulation rechnet mit `G.M` statt `Math`, damit jedes Gerät auf dieselben Zahlen kommt. Noch nicht geprüft: die echten öffentlichen Vermittler und gemischte Geräte (iPhone mit Android oder Computer).
