# Version «Rohstoffe» (13.11.2026)
Eine eigene Spielversion neben dem klassischen Spiel: dieselbe Karte «Erde», aber jedes Land hat Rohstoffe zum Abbauen und eine eigene Fabrikware. Das klassische Spiel bleibt, wie es ist.
**Spielen:** https://phfr8fjdhs-eng.github.io/lllkkkopa/rohstoffe/ · Code: `src/03c_res.js` (Tabellen und Regeln), Länderkarte in `src/07_ui.js` (`setLand`, `renderLand`, `showIncome`), Zeichen auf der Karte `View.drawRes`.

## Regeln
Es gibt zwei Arten von Gütern, pro Land höchstens zwei Rohstoffe und genau eine Fabrikware.
- **Abbauen (Rohstoffe).** Jeder Rohstoff eines Landes liegt als Vorkommen an einer festen Stelle auf der Karte. Wem das Feld gehört, der verkauft den Rohstoff und bekommt dessen Gold pro Tick, zusätzlich zum Grundeinkommen (100). Eine Meldung sagt, wenn ein Vorkommen erobert oder verloren wurde.
- **Herstellen (Fabrikware).** Jede Fabrik stellt die Ware des Landes her, in dem sie steht (Schweiz: Medikamente, Deutschland: Autos, Taiwan: Mikrochips) und bringt deren Preis pro Stufe und Tick. Pro Land zählen fünf Stufen (`G.RES.FACTORY_CAP`). Züge und Handel laufen wie bisher.
- **Wert eines Vorkommens.** Preis des Rohstoffs mal Grössenfaktor des Landes (Wurzel aus dem Anteil an der Landfläche, begrenzt auf 0.5 bis 3). Beispiele pro Sekunde: Erdöl in Saudi-Arabien 1.8K, Edelsteine in der DR Kongo 1.5K, Wasserkraft in der Schweiz 140 (dafür Medikamente für 2.5K pro Fabrikstufe).
- **Bots** bekommen die Hälfte. Nationen und Mitspieler dasselbe wie du.
- 20 Rohstoffe (`G.RAW`), 20 Fabrikwaren (`G.WARE`), Zuteilung in der Ländertabelle `T` in `src/03c_res.js`. Länder ohne Eintrag (kleine Inseln) haben Fisch und Lebensmittel. Die Stellen der Vorkommen kommen aus einer festen Streufunktion der Feldnummer: auf jedem Gerät gleich, im Landesinnern, zwei Vorkommen eines Landes möglichst weit auseinander.

## Bedienung
- **Weltkarte bleibt ruhig.** Herausgezoomt sind nur die Ländergrenzen zu sehen (dunkel im Boden). Ab Zoom 3 (`G.RES.ZOOM`) erscheinen die Vorkommen als helle runde Marken mit eigenem Zeichen an ihrer Stelle (grüner Ring: gehört dir) und unter dem Land ein Schild mit der Fabrikware; ab Zoom 4 stehen die Namen dabei. Taste `R` blendet beides aus und ein.
- **Zeichen.** Keine Emojis: Die Zeichen der Rohstoffe sind selbst gezeichnet (`G.RES_ICON`, Pfade auf 24 x 24), die Karte malt sie auf die Leinwand, das Länderfenster als SVG.
- **Klick aufs Land** (Maus: Linksklick, Telefon: Tippen): Rechts erscheint das Länderfenster mit Besitzern, «Abbauen» (Vorkommen, wem sie gehören, Ertrag) und «Herstellen» (Fabrikware pro Stufe). Die Vorkommen des gewählten Landes werden auch herausgezoomt hervorgehoben; ein Klick auf ein Vorkommen im Fenster fliegt dorthin. Solange der Startpunkt gewählt wird, folgt das Fenster dem Mauszeiger.
- **Klick auf das Gold** öffnet «Einnahmen»: Grundeinkommen, Rohstoffe, Fabrikwaren, nach Land.

## Technik
- `python3 tools/build_countries.py <geo> build` rastert die Länder aus Natural Earth 1:10 Mio. (gemeinfrei) in derselben Projektion wie die Erde, halbe Auflösung, und schreibt `build/laender.json` (239 Länder). Abhängige Gebiete mit dem Code des Mutterlands zählen zu diesem.
- `python3 tools/build.py` schreibt neben `build/index.html` auch `build/rohstoffe.html`; diese nach `docs/rohstoffe/index.html` kopieren. Die Version entsteht aus denselben Quellen plus `03c_res.js`, der Länderkarte und `G.VARIANT = 'rohstoffe'`; im klassischen Spiel ist `game.res` immer aus.
- Nur ganze Zahlen, damit im Mehrspieler alle Geräte gleich rechnen. Das Einkommen wird alle 10 Ticks neu gezählt (`resTick`). Der Raum gibt `res` weiter; alle müssen über den Einladungslink der Rohstoff-Seite kommen.
- Rohstoffe gibt es nur auf der Karte «Erde». Andere Karten laufen in dieser Version klassisch.
- Test: `node --max-old-space-size=4096 test/res.js [ticks] [bots]` (jedes Landfeld hat ein Land, jedes Vorkommen liegt in seinem Land, Einkommen ist genau Vorkommen plus Fabriken, zwei Kopien bleiben gleich).
