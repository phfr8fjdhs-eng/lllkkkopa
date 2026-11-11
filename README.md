# Grenzland (OpenFront 2.0)
Eigene Umsetzung eines Echtzeit-Eroberungsspiels. Offline gegen Bots, Karten aus Natural Earth (Public Domain).
Bauen: `python3 tools/build.py` -> build/index.html (einzelne Datei, im Browser öffnen).
Karten neu erzeugen: `python3 tools/build_maps.py geo build`.

## Tests
`node test/sim.js` (Simulation), `node test/all.js` (alle Karten), `node test/play.js [desktop]` (Browser-Durchlauf mit Screenshots, braucht Playwright + Chrome).
