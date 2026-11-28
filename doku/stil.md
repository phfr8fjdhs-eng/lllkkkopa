# Pixel-Stil («Langes Spiel»)

Im Modus «Langes Spiel» soll alles auf der Karte aussehen wie im Vorbild 2 (`docs/assets/vorbild2.jpg`, obere Reihe; Vorbild 1 zeigt denselben Stil von der Seite). Klassisches Spiel, «Rohstoffe» und Feldzug bleiben, wie sie sind. Im Code: `PIXEL = !!game.lang` (kommt mit Runde 3).

Stand: Runde 2, Züge neu (Testseite `docs/pixel-test.html`: Vorbilder, alle Schiffe, alle Gebäude in Bild A bis E und ihren Zuständen, Züge und Schienen, Flugzeuge in 8 Richtungen, Effekte). Noch nicht im Spiel; Raketen, Bomben und das Raketen-Silo folgen später.

## Regeln für jede Grafik
- **Pixelgrösse:** 1 Kunstpixel = 1 Pixel im Sprite (im Vorbild 2 sind es 2.7 Bildpixel).
- **Blickwinkel:** schräg von oben. Gebäude streng isometrisch: Grundfläche als Raute 2 : 1, Kanten als 2-zu-1-Treppen, sichtbar Dach, linke Wand (hell) und rechte Wand (dunkler). Schiffe liegen diagonal wie im Vorbild, Kutter und Frachter waagrecht.
- **Licht von oben links.** Pro Material 3 bis 4 Stufen: Oberseite hell, linke Wand mittel, rechte Wand dunkler, unterste Pixelreihe dunkel. Obere Vorderkanten mit 1 Pixel Glanzlinie.
- **Umriss:** 1 Pixel, nie Schwarz: `#16273b` für Grau, Blau, Weiss; `#2e2118` für Rot und Braun. Innen nur dunklere Kanten (eine Stufe dunkler, wo ein Teil vor einem anderen steht).
- **Farben:** nur die 199 gemessenen Farben (`src/assets/palette.js`, `G.PIX_PAL`), dazu die Spielerfarbe. Keine Verläufe. Transparenz nur für Schatten (Schwarz 35 %), Rauch, Nebel. `node test/pixel.js` prüft das für alles, was in `src/06d_pixart.js` gebaut wird.
- **Schatten:** Gebäude werfen 2 Pixel nach rechts unten auf ihre Grundplatte. Schiffe haben stattdessen Schaum wie auf dem Sheet: mattes Hellblau (`#7692ac`, `#88a7c3`, `#a1bdd7`) dicht am Rumpf, wo er das Wasser berührt, rund um beide Enden, mit Lücken; am Bug etwas Gischt (`#cbd0d3`), hinter dem Heck ein kurzes Kielwasser. Kein eigener weisser Strich.
- **Gedämpft wie die Schiffe:** kaum reines Weiss (helle Flächen `#a4acb1`, Glanz höchstens `#b1bdd0`), Glas dunkel blau-grau (`#607e93` bis `#33465b`), beleuchtete Fenster matt (`#a49e50`, `#9d9e5e`), Ziegel dunkel rotbraun mit dunkleren Fugen.
- **Gebrauchsspuren:** auf Dächern, Wänden und Platten hie und da ein Pixel eine Stufe dunkler oder heller (`wear`), Schmutzstreifen unter einzelnen Fenstern, Russ oben an Schornsteinen, nackte Erde im Rasen.
- **Grundplatte:** jedes Gebäude steht auf einer isometrischen Platte, 2 Pixel dick: Rasen, Pflaster (Stadt ab Bild D) oder Beton (Fabrik). Ankerpunkt unten Mitte.
- **Grösse:** Gebäude Bild A etwa 32 × 28, Bild E höchstens 96 × 80 (Platte 8, 11, 14, 18, 24 Felder breit). Schiffe wie im Sheet: Kutter 51, Containerschiff 71 × 55, Träger 111 × 98.

## Gebäude wachsen in 5 Bildern
| Bild | A | B | C | D | E |
|---|---|---|---|---|---|
| Stufe | 1 | 2–4 | 5–9 | 10–29 | 30+ |

`G.PixArt.stage(level)` rechnet das um; die Zahl über dem Gebäude bleibt.

## Spielerfarbe
- **Kriegsschiffe und militärische Gebäude:** die roten Akzente sind die Spielerfarbe. Auf dem Sheet gilt als rot: Farbton höchstens 20° neben Rot, Sättigung über 0.36, Helligkeit über 0.3. (Die Startregel aus dem Plan, `r > 110 && r > 1.9·g && r > 1.7·b`, liess die schattierten und matten Rottöne stehen: Turm und Deckrand des Trägers, Streifen des Zerstörers, die dunkle Seite der Kuppeln.) Jeder Rotton wird zur Spielerfarbe mit derselben Helligkeit und Sättigung.
- **Handelsschiffe, Stadt, Fabrik, Hafen** behalten ihre Farben. Den Besitzer zeigen eine **Flagge** (1 Pixel Stange in Hellgrau `#a4acb1`, damit man sie auf dem Wasser sieht; das Tuch hängt oben an der Stange, 4 × 3 in Spielerfarbe ×1.2 / ×1 / ×0.6; Schiffe am höchsten Punkt, Gebäude auf dem Dach) und ein **Streifen** von 1 Pixel (Schiffe an der Reling, Gebäude an der Dachkante).
- Im Sprite stehen dafür Platzhalter (Alpha 254, `PC1`–`PC3`, Rottöne des Sheets ab Code 10). `G.Pixel.canvas(pix, rgb)` setzt die Farbe ein und merkt sich das Bild pro Farbe.

## Aufbau im Code
- `src/assets/palette.js`: die Palette. `src/assets/schiffe-sheet.png`: die 8 Schiffe, kommt beim Bauen als Data-URL in `G.PIX_SHEET`.
- `src/06c_pixel.js`: Pixelpuffer `Pix` (ohne DOM), isometrische Formen (`Iso.box`, `obox`, `gable`, `cyl`, `face`, `stamp`), Flagge `FLAG`, Abschluss (`finish`: Kontaktkanten, Schatten, Umriss), Spielerfarbe, die Schiffe des Sheets (`SHIPS`, `loadShips`).
- `src/06d_pixart.js`: Gebäude und Truppenboot (`city`, `factory`, `port`, `defense`, `sam0`, `sam1`, `radar`, `airfield`, `cloak`, `building`, `boat`; Teile wie `house`, `block`, `tower`, `hall`, `chimney`, `tank`, `crane`, `dish`, `lattice`).
- `src/06e_pixfx.js`: Abwehrschiff, Seemine, Zielmarke, Züge, Schienen, Flugzeuge, Effekte (`G.PixFx`).
- `tools/build.py` baut daraus `build/pixel-test.html`, das nach `docs/pixel-test.html` kopiert wird.

## Was es gibt (Runde 2)
- **Gebäude** (`G.PixArt`, je Bild A bis E): `city`, `factory`, `port` (Steg, Lagerhaus, Hafenkran, Container; Platte ist das Land, Steg und Kräne ragen nach rechts unten ins Wasser), `defense` (Sandsäcke mit MG, Bunker mit Schiessscharte, Stacheldraht, Geschützturm, Festung), `sam0` (Flugabwehr: Fahrzeuge mit Rampe und Raketen, Radarschüssel), `sam1` (Raketenabwehr: Gestell mit stehenden Abfangraketen, Kontrollhaus, Radar-Panel), `radar` (Gittermast mit Schüssel, Kuppeln in Spielerfarbe), `airfield` (Piste, Hangars, Tower, Jets), `cloak` (nur A und B: Turm unter Tarnnetz). Militärische Gebäude haben kleinere, vollere Platten (`MSIZE`).
- **Zustände:** `G.PixArt.building(kind, st, { build: true })` (Bild A halb, Holzgerüst, kleiner Kran), `{ damage: 1 | 2 }` (Brandflecken, 1–2 Rauchsäulen). Unter eigenem Tarnturm zeichnet die Anzeige blasser (Alpha), der Bahnhof-Punkt bleibt eine Anzeige darüber.
- **Drehende Schüsseln:** `sam0(st, frame)` und `radar(st, frame)` mit `frame` 0–3.
- **Schiffe** (`G.PixFx`): `war4` (Abwehrschiff: der Zerstörer des Sheets, Geschütze ersetzt durch 2 Startkästen mit Deckeln in Spielerfarbe und eine weisse Radarkuppel), `mine` (Seemine 12 × 12), `target` (Zielmarke, rot-weiss, keine Spielerfarbe).
- **Züge** (neu gezeichnet 28.11.2026): `car(kind, dir)` mit `kind` `'loco'`, `0` (Flachwagen mit zwei Containern), `1` (Kesselwagen), `2` (offener Wagen mit Kisten) und `dir` `'h'` (nach rechts), `'l'` (nach links, neu gezeichnet statt gespiegelt, damit Licht und Schatten bleiben), `'d'` (nach unten), `'u'` (nach oben). Blick schräg von oben wie bei allem anderen: oben das Dach, darunter die Wand zum Betrachter (waagrecht die lange Seite mit Drehgestellen und Rädern, senkrecht die Stirnseite: vorne Frontscheibe und Lampen, hinten das Rückfenster). Die Grundfläche ist gleich gross wie auf der Karte (7 Pixel quer zur Strecke), die Höhe kommt dazu. Anker `ax, ay`: Mitte der Grundfläche auf der Mittellinie der Schiene. Die Lok trägt die Spielerfarbe (Wände und Führerstand-Dach, grauer Motorvorbau mit zwei Lüftern), die Wagen behalten die Farben ihrer Ladung. Schatten 1 Pixel nach rechts unten. Vorher (Runde 2): reine Seitenansicht auf einer Schiene von oben, senkrecht nur ein Stapel Wagenenden; das passte nicht zum Rest. `loco`, `wagon`, `trainEnd` gibt es weiter als Kurzformen. `rail('h' | 'v' | 'x' | 'c0'–'c3')` als Kacheln von 12 Pixeln, gerade von oben wie die Karte; die Kurven haben dasselbe Schotterbett, dieselben Schwellen und dieselben zwei Schienen wie die Geraden, so dass sie nahtlos anschliessen. Die Testseite zeigt eine Rundstrecke, auf der der Zug fährt.
- **Flugzeuge:** `plane(kind, dir)` mit `kind` bomber, stealth, fighter, recon und `dir` 0–7 (Osten, Südosten, … im Uhrzeigersinn). Jede Richtung ist aus den Teilen neu gezeichnet, nicht gedreht. Dazu ein Schatten (Schwarz 35 %), gezeichnet 6 Pixel nach rechts unten.
- **Effekte:** `shell`, `explosion(16 | 40)` (6 Bilder), `splash` (3), `sink(pix)` (6), `gold(text)` (Münze und Zahl).

## Bug-Richtung
Im Vorbild zeigt der Bug nicht bei allen Schiffen nach rechts oben: bei Containerschiff, Zerstörer und U-Boot nach links unten (`bow: 'l'`), bei Kutter, Frachter, Schlachtschiff, Träger und Radarschiff nach rechts (`bow: 'r'`), ebenso beim Truppenboot. `SHIPS[k].bow` hält das pro Schiff fest; beim Fahren wird ein Schiff gespiegelt, wenn sein Bug sonst gegen die Fahrtrichtung zeigt (Runde 3).

## Schräge Rümpfe
Schiffe liegen steiler als das Gebäuderaster (etwa 0.7 statt 0.5, wie Zerstörer und Containerschiff). Dafür gibt es `Iso.obox`: ein Kasten in beliebigem Winkel, gezeichnet werden nur die Seiten zum Betrachter, nach links unten hell, nach rechts unten dunkel.

## Nachbesserung 28.11.2026 (nach Durchsicht der ganzen Testseite)
- **Radarschüsseln** (`dish`): eine echte Schüssel in Spielerfarbe wie beim Radarschiff: dicker Rand, oben hell; die Höhlung oben dunkel, unten hell; darunter die Lippe 2 Pixel; davor das Speisehorn an zwei Streben; ein Joch auf dem Mast. Die offene Seite zeigt schräg nach oben (flaches Oval). Vorher eine flache graue Scheibe auf einem Stiel, sie sah aus wie ein Lolli oder eine Strassenlampe.
- **Radar D und E:** Masten nur an den Ecken links und rechts, nie vor Kuppel oder Halle (vorher stach ein Mast mitten durchs Gebäude).
- **Raketenabwehr:** Startgestell aus runden Röhren mit Lücken, Deckel in Spielerfarbe, Stahlrahmen (vorher dünne weisse Stäbe, wie ein Gartenzaun). Das Radar-Panel steht auf einem Anhänger und wird hinten von zwei Streben gehalten (vorher schwebte es).
- **Flugplatz:** dunkles Vorfeld zwischen Hangars und Piste, gelbe Rollmarkierung; Jets 13 × 9 aus Teilen gezeichnet, Seitenleitwerk in Spielerfarbe (vorher ein grauer Fleck von 6 × 7 auf leerem Rasen).
- **Rauch bei «beschädigt»:** eine zusammenhängende Säule, die aus dem Dach steigt, unten dunkel und dicht, oben hell und dünn, mit ein paar Pixeln Feuer (vorher schwebende Wölkchen mit Lücken).
- **Rasen:** ruhiger, nackte Erde nur noch selten (0.8 % statt 2.5 %).
- **Flugzeuge:** jedes Teil oben hell, nur der Rand weg vom Licht dunkel (vorher war das ganze Bild an einer Diagonale geteilt, schräg sah der Bomber aus wie ein verdrehtes X). Hoheitszeichen auf beiden Flügeln und grösser, Seitenleitwerk in Spielerfarbe.
