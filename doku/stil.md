# Pixel-Stil («Langes Spiel»)

Im Modus «Langes Spiel» soll alles auf der Karte aussehen wie im Vorbild 2 (`docs/assets/vorbild2.jpg`, obere Reihe; Vorbild 1 zeigt denselben Stil von der Seite). Klassisches Spiel, «Rohstoffe» und Feldzug bleiben, wie sie sind. Im Code: `PIXEL = !!game.lang` (kommt mit Runde 3).

Stand: Runde 1 mit Nachbesserung (Testseite `docs/pixel-test.html`: Vorbilder, die 8 Schiffe, Truppenboot, Stadt und Fabrik A bis E). Noch nicht im Spiel.

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
- `src/06d_pixart.js`: die Bilder (`city`, `factory`, `boat`, Teile wie `house`, `block`, `tower`, `hall`, `chimney`, `tank`).
- `tools/build.py` baut daraus `build/pixel-test.html`, das nach `docs/pixel-test.html` kopiert wird.

## Bug-Richtung
Im Vorbild zeigt der Bug nicht bei allen Schiffen nach rechts oben: bei Containerschiff, Zerstörer und U-Boot nach links unten (`bow: 'l'`), bei Kutter, Frachter, Schlachtschiff, Träger und Radarschiff nach rechts (`bow: 'r'`), ebenso beim Truppenboot. `SHIPS[k].bow` hält das pro Schiff fest; beim Fahren wird ein Schiff gespiegelt, wenn sein Bug sonst gegen die Fahrtrichtung zeigt (Runde 3).

## Schräge Rümpfe
Schiffe liegen steiler als das Gebäuderaster (etwa 0.7 statt 0.5, wie Zerstörer und Containerschiff). Dafür gibt es `Iso.obox`: ein Kasten in beliebigem Winkel, gezeichnet werden nur die Seiten zum Betrachter, nach links unten hell, nach rechts unten dunkel.
