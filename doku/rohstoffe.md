# Version «Rohstoffe» (13.11.2026)
Eine eigene Spielversion neben dem klassischen Spiel: dieselbe Karte «Erde», aber jedes Land hat eigene Rohstoffe und eine eigene Fabrikware. Das klassische Spiel bleibt, wie es ist.
**Spielen:** https://phfr8fjdhs-eng.github.io/lllkkkopa/rohstoffe/ · Code: `src/03c_res.js` (Tabellen und Regeln), Länderkarte in `src/07_ui.js` (`setLand`, `renderLand`, `showIncome`), Zeichen auf der Karte `View.drawRes`.

## Regeln
- **Rohstoffe.** Land bringt Gold für die Rohstoffe des Landes, in dem es liegt, anteilig: Wer 40 % von Saudi-Arabien hält, bekommt 40 % von dessen Erdöl, Erdgas und Phosphat. Das kommt zum Grundeinkommen (100 pro Tick) dazu.
- **Monopol.** Ab 90 % eines Landes bringen dessen Rohstoffe 50 % mehr; eine Meldung sagt es an.
- **Fabrikware.** Eine Fabrik stellt die Ware des Landes her, in dem sie steht (Schweiz: Medikamente, Deutschland: Autos, Taiwan: Mikrochips) und bringt deren Preis pro Stufe und Tick. Pro Land zählen fünf Stufen (`G.RES.FACTORY_CAP`), mehr findet keine Käufer. Züge und Handel laufen wie bisher.
- **Wert eines Landes.** Summe der Rohstoffpreise mal Grössenfaktor. Der Faktor ist die Wurzel aus dem Anteil des Landes an der Landfläche, begrenzt auf 0.5 bis 3: Katar ist nicht wertlos, Russland nicht alles. Beispiele pro Sekunde bei ganzem Land: Saudi-Arabien 3.8K, DR Kongo 3.9K, Deutschland 730, Schweiz 200 (dafür Medikamente für 2.5K pro Fabrikstufe).
- **Bots** bekommen die Hälfte. Nationen und Mitspieler dasselbe wie du.
- Preise und Zuteilung stehen in `G.RAW`, `G.WARE` und der Ländertabelle `T` in `src/03c_res.js`. Länder ohne Eintrag (kleine Inseln) haben Fisch und Tourismus.

## Bedienung
- **Klick aufs Land** (Maus: Linksklick, Telefon: Tippen): Rechts erscheint die Karte des Landes mit Flagge, Besitzern samt Anteil (oder «Noch frei»), Rohstoffen mit Ertrag bei ganzem Land, der Fabrikware pro Stufe und dem eigenen Anteil. Solange der Startpunkt gewählt wird, folgt die Karte dem Mauszeiger.
- **Zeichen auf der Karte.** Länder, die gross genug im Bild sind, zeigen ihre Rohstoffe und ihre Ware als kleine Zeichen; Taste `R` blendet sie aus und ein. Ländergrenzen sind dunkel in den Boden gezeichnet.
- **Klick auf das Gold** öffnet «Einnahmen»: Grundeinkommen, Rohstoffe, Fabrikwaren und die Länder, die am meisten bringen (★ = Monopol).

## Technik
- `python3 tools/build_countries.py <geo> build` rastert die Länder aus Natural Earth 1:10 Mio. (gemeinfrei) in derselben Projektion wie die Erde, halbe Auflösung, und schreibt `build/laender.json` (239 Länder). Abhängige Gebiete mit dem Code des Mutterlands zählen zu diesem.
- `python3 tools/build.py` schreibt neben `build/index.html` auch `build/rohstoffe.html`; diese nach `docs/rohstoffe/index.html` kopieren. Die Version entsteht aus denselben Quellen plus `03c_res.js`, der Länderkarte und `G.VARIANT = 'rohstoffe'`; im klassischen Spiel ist `game.res` immer aus.
- Nur ganze Zahlen, damit im Mehrspieler alle Geräte gleich rechnen. Das Einkommen wird alle 10 Ticks neu gezählt (`resTick`). Der Raum gibt `res` weiter; alle müssen über den Einladungslink der Rohstoff-Seite kommen.
- Rohstoffe gibt es nur auf der Karte «Erde». Andere Karten laufen in dieser Version klassisch.
- Test: `node --max-old-space-size=4096 test/res.js [ticks] [bots]` (jedes Landfeld hat ein Land, Zählung pro Land und Spieler stimmt, Monopol und Fabrikgrenze, zwei Kopien bleiben gleich).
